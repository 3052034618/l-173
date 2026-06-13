import * as crypto from 'crypto';

export function generateNonce(length: number = 32): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

export function generateTimestamp(): string {
  return Date.now().toString();
}

export function hmacSha256(message: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

export function md5(message: string): string {
  return crypto.createHash('md5').update(message).digest('hex');
}

export function objectToQueryString(params: Record<string, unknown>): string {
  const keys = Object.keys(params).sort();
  const parts: string[] = [];
  for (const key of keys) {
    const value = params[key];
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
      }
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.join('&');
}

export function buildSignString(options: {
  method: string;
  path: string;
  params?: Record<string, unknown>;
  body?: unknown;
  timestamp: string;
  nonce: string;
  appKey: string;
}): string {
  const { method, path, params, body, timestamp, nonce, appKey } = options;
  const queryStr = params && Object.keys(params).length > 0 ? objectToQueryString(params) : '';
  let bodyStr = '';
  if (body !== undefined && body !== null) {
    if (typeof body === 'string') {
      bodyStr = body;
    } else {
      try {
        bodyStr = JSON.stringify(body);
      } catch {
        bodyStr = String(body);
      }
    }
  }
  const bodyHash = bodyStr ? md5(bodyStr) : '';
  return [method.toUpperCase(), path, queryStr, bodyHash, appKey, timestamp, nonce].filter(Boolean).join('\n');
}

export function signRequest(options: {
  method: string;
  path: string;
  params?: Record<string, unknown>;
  body?: unknown;
  appKey: string;
  appSecret: string;
  algorithm: 'HMAC-SHA256' | 'MD5';
}): { signature: string; timestamp: string; nonce: string } {
  const timestamp = generateTimestamp();
  const nonce = generateNonce();
  const signStr = buildSignString({
    method: options.method,
    path: options.path,
    params: options.params,
    body: options.body,
    timestamp,
    nonce,
    appKey: options.appKey
  });
  let signature: string;
  if (options.algorithm === 'MD5') {
    signature = md5(signStr + options.appSecret).toUpperCase();
  } else {
    signature = hmacSha256(signStr, options.appSecret);
  }
  return { signature, timestamp, nonce };
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}
