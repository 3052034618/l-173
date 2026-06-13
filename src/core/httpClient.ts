import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import { ConfigManager } from './config';
import { signRequest, generateRequestId } from './signature';
import { createError, wrapHttpError, ErrorCode } from './errors';
import { InternalHttpRequest, ApiResponse, RequestOptions } from '../types';

type HttpResponse<T> = {
  statusCode: number;
  headers: Record<string, string>;
  body: T;
  rawBody: string;
};

export class HttpClient {
  private config: ConfigManager;
  private httpAgent: http.Agent;
  private httpsAgent: https.Agent;

  constructor(config: ConfigManager) {
    this.config = config;
    this.httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
    this.httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });
  }

  private async requestWithJson<T>(req: InternalHttpRequest, options?: RequestOptions): Promise<ApiResponse<T>> {
    const timeout = options?.timeout || this.config.timeout;
    const retryTimes = options?.retryTimes ?? this.config.retryTimes;
    let lastErr: Error | undefined;

    for (let attempt = 0; attempt <= retryTimes; attempt++) {
      try {
        const res = await this.doRequest<T>(req, timeout, options);
        return this.handleApiResponse<T>(res, req);
      } catch (err) {
        lastErr = err as Error;
        if (attempt < retryTimes && this.shouldRetry(err as Error)) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          this.config.log('warn', `请求重试: ${req.method} ${req.url}, 尝试 ${attempt + 1}/${retryTimes}, ${delay}ms 后重试`);
          await this.sleep(delay);
          continue;
        }
        break;
      }
    }

    throw wrapHttpError(lastErr || new Error('请求失败'), {
      url: req.url,
      method: req.method
    });
  }

  private async doRequest<T>(req: InternalHttpRequest, timeout: number, options?: RequestOptions): Promise<HttpResponse<T>> {
    return new Promise<HttpResponse<T>>((resolve, reject) => {
      const parsed = new URL(req.url);
      const isHttps = parsed.protocol === 'https:';
      const agent = isHttps ? this.httpsAgent : this.httpAgent;
      const requestId = generateRequestId();

      let queryStr = '';
      if (req.params && Object.keys(req.params).length > 0) {
        const usp = new URLSearchParams();
        for (const [k, v] of Object.entries(req.params)) {
          if (v === undefined || v === null) continue;
          if (Array.isArray(v)) {
            v.forEach(item => usp.append(k, String(item)));
          } else {
            usp.set(k, String(v));
          }
        }
        queryStr = usp.toString();
      }
      if (queryStr) {
        parsed.search = parsed.search ? `${parsed.search}&${queryStr}` : `?${queryStr}`;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Request-ID': requestId,
        'User-Agent': 'DataElement-Circulation-SDK/1.0.0',
        ...this.config.customHeaders,
        ...(req.headers || {}),
        ...(options?.customHeaders || {})
      };

      if (!options?.skipAuth && this.config.enableSignature) {
        const path = parsed.pathname + (parsed.search || '');
        const sign = signRequest({
          method: req.method,
          path: path,
          params: undefined,
          body: req.body,
          appKey: this.config.appKey,
          appSecret: this.config.appSecret,
          algorithm: this.config.signatureAlgorithm
        });
        headers['X-App-Key'] = this.config.appKey;
        headers['X-Timestamp'] = sign.timestamp;
        headers['X-Nonce'] = sign.nonce;
        headers['X-Signature'] = sign.signature;
        headers['X-Sign-Algorithm'] = this.config.signatureAlgorithm;
      }

      let bodyStr: string | undefined;
      if (req.body !== undefined && req.body !== null) {
        if (typeof req.body === 'string') {
          bodyStr = req.body;
        } else {
          bodyStr = JSON.stringify(req.body);
        }
        headers['Content-Length'] = Buffer.byteLength(bodyStr).toString();
      }

      const requestOptions: https.RequestOptions = {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + (parsed.search || ''),
        method: req.method,
        headers,
        agent,
        timeout
      };

      const lib = isHttps ? https : http;
      const request = lib.request(requestOptions, (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        response.on('end', () => {
          const rawBody = Buffer.concat(chunks).toString('utf8');
          const respHeaders: Record<string, string> = {};
          for (const [k, v] of Object.entries(response.headers)) {
            respHeaders[k] = Array.isArray(v) ? v.join(', ') : (v || '').toString();
          }
          let parsedBody: T | null = null;
          if (rawBody && req.responseType !== 'text' && req.responseType !== 'blob') {
            try {
              parsedBody = JSON.parse(rawBody) as T;
            } catch {
              parsedBody = rawBody as unknown as T;
            }
          } else {
            parsedBody = rawBody as unknown as T;
          }
          resolve({
            statusCode: response.statusCode || 0,
            headers: respHeaders,
            body: parsedBody as T,
            rawBody
          });
        });
        response.on('error', (e) => reject(e));
      });

      request.on('error', (e) => reject(e));
      request.on('timeout', () => {
        request.destroy(new Error(`请求超时 (${timeout}ms)`));
      });

      if (bodyStr !== undefined) {
        request.write(bodyStr);
      }
      request.end();
    });
  }

  private shouldRetry(err: Error): boolean {
    const msg = err.message.toLowerCase();
    return msg.includes('timeout') || msg.includes('econn') || msg.includes('etimedout') || msg.includes('socket hang up');
  }

  private handleApiResponse<T>(res: HttpResponse<T>, req: InternalHttpRequest): ApiResponse<T> {
    const headerRequestId = res.headers['x-request-id'] || res.headers['X-Request-ID'];
    const apiResp = res.body as unknown as ApiResponse<T>;
    if (apiResp && typeof apiResp === 'object' && 'code' in apiResp) {
      if (apiResp.code !== ErrorCode.SUCCESS) {
        throw createError(apiResp.code as ErrorCode, apiResp.message, {
          requestId: apiResp.requestId || headerRequestId,
          httpStatus: res.statusCode,
          platformCode: apiResp.code,
          details: (apiResp as unknown as { data?: unknown }).data
        });
      }
      return {
        ...apiResp,
        requestId: apiResp.requestId || headerRequestId || apiResp.requestId || ''
      };
    }

    if (res.statusCode >= 500) {
      throw createError(ErrorCode.BUSINESS_ERROR, `服务端错误: HTTP ${res.statusCode}`, {
        requestId: headerRequestId,
        httpStatus: res.statusCode,
        details: res.rawBody
      });
    }

    if (res.statusCode === 404) {
      throw createError(ErrorCode.RESOURCE_NOT_FOUND, '请求的资源不存在', {
        requestId: headerRequestId,
        httpStatus: res.statusCode,
        details: { url: req.url }
      });
    }

    if (res.statusCode >= 400) {
      throw createError(ErrorCode.SDK_HTTP_ERROR, `HTTP ${res.statusCode}`, {
        requestId: headerRequestId,
        httpStatus: res.statusCode,
        details: res.rawBody
      });
    }

    return {
      code: ErrorCode.SUCCESS,
      message: 'success',
      data: res.body,
      requestId: headerRequestId || '',
      timestamp: Date.now()
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public buildUrl(path: string): string {
    return `${this.config.baseUrl}${path.startsWith('/') ? path : '/' + path}`;
  }

  public async get<T>(path: string, params?: Record<string, unknown>, options?: RequestOptions): Promise<ApiResponse<T>> {
    const req: InternalHttpRequest = {
      url: this.buildUrl(path),
      method: 'GET',
      params
    };
    return this.requestWithJson<T>(req, options);
  }

  public async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    const req: InternalHttpRequest = {
      url: this.buildUrl(path),
      method: 'POST',
      body
    };
    return this.requestWithJson<T>(req, options);
  }

  public async put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
    const req: InternalHttpRequest = {
      url: this.buildUrl(path),
      method: 'PUT',
      body
    };
    return this.requestWithJson<T>(req, options);
  }

  public async delete<T>(path: string, params?: Record<string, unknown>, options?: RequestOptions): Promise<ApiResponse<T>> {
    const req: InternalHttpRequest = {
      url: this.buildUrl(path),
      method: 'DELETE',
      params
    };
    return this.requestWithJson<T>(req, options);
  }

  public async download(path: string, params?: Record<string, unknown>, options?: RequestOptions): Promise<{
    contentType: string;
    content: string;
    headers: Record<string, string>;
  }> {
    const req: InternalHttpRequest = {
      url: this.buildUrl(path),
      method: 'GET',
      params,
      responseType: 'text'
    };
    const timeout = options?.timeout || this.config.timeout;
    try {
      const res = await this.doRequest<string>(req, timeout, options);

      const headerRequestId = res.headers['x-request-id'] || res.headers['X-Request-ID'];
      let parsed: ApiResponse<unknown> | null = null;
      try {
        parsed = JSON.parse(res.rawBody) as ApiResponse<unknown>;
      } catch {
        parsed = null;
      }

      if (parsed && typeof parsed === 'object' && 'code' in parsed && parsed.code !== ErrorCode.SUCCESS) {
        throw createError(parsed.code as ErrorCode, parsed.message, {
          requestId: parsed.requestId || headerRequestId,
          httpStatus: res.statusCode,
          platformCode: parsed.code,
          details: (parsed as { data?: unknown }).data
        });
      }

      if (res.statusCode >= 400 && !parsed) {
        if (res.statusCode === 404) {
          throw createError(ErrorCode.RESOURCE_NOT_FOUND, '凭证不存在', {
            requestId: headerRequestId,
            httpStatus: res.statusCode,
            details: { url: req.url }
          });
        }
        throw createError(ErrorCode.BUSINESS_ERROR, `凭证下载失败: HTTP ${res.statusCode}`, {
          requestId: headerRequestId,
          httpStatus: res.statusCode,
          details: res.rawBody
        });
      }

      const content = typeof res.body === 'string' ? res.body : res.rawBody;
      if (parsed && parsed.code === ErrorCode.SUCCESS && typeof parsed.data === 'string') {
        return {
          contentType: res.headers['content-type'] || 'application/octet-stream',
          content: parsed.data,
          headers: res.headers
        };
      }

      return {
        contentType: res.headers['content-type'] || 'application/octet-stream',
        content,
        headers: res.headers
      };
    } catch (err) {
      throw wrapHttpError(err as Error, { url: req.url, method: req.method });
    }
  }

  public destroy(): void {
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
  }
}
