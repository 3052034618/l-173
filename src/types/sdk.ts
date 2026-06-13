export interface SdkConfig {
  baseUrl: string;
  appKey: string;
  appSecret: string;
  timeout?: number;
  retryTimes?: number;
  retryDelay?: number;
  enableSignature?: boolean;
  signatureAlgorithm?: 'HMAC-SHA256' | 'MD5';
  debug?: boolean;
  logger?: (level: 'info' | 'warn' | 'error', message: string, data?: unknown) => void;
  customHeaders?: Record<string, string>;
  proxy?: {
    host: string;
    port: number;
    auth?: {
      username: string;
      password: string;
    };
  };
}

export interface RequestOptions {
  timeout?: number;
  retryTimes?: number;
  customHeaders?: Record<string, string>;
  skipAuth?: boolean;
}

export interface InternalHttpRequest {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  params?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  responseType?: 'json' | 'text' | 'blob' | 'stream';
}
