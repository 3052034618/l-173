import { ErrorCode, ErrorMessage, SdkError, ValidationError } from '../types';

export { ErrorCode, ErrorMessage };
export type { SdkError, ValidationError };

export class DataElementSdkError extends Error implements SdkError {
  public readonly code: ErrorCode;
  public readonly requestId?: string;
  public readonly httpStatus?: number;
  public readonly details?: unknown;
  public readonly validationErrors?: ValidationError[];

  constructor(
    code: ErrorCode,
    message?: string,
    options: {
      requestId?: string;
      httpStatus?: number;
      details?: unknown;
      validationErrors?: ValidationError[];
      cause?: Error;
    } = {}
  ) {
    const finalMessage = message || ErrorMessage[code] || '未知错误';
    super(finalMessage);
    this.name = 'DataElementSdkError';
    this.code = code;
    this.requestId = options.requestId;
    this.httpStatus = options.httpStatus;
    this.details = options.details;
    this.validationErrors = options.validationErrors;
    if (options.cause) {
      (this as unknown as { cause: Error }).cause = options.cause;
    }
    Object.setPrototypeOf(this, DataElementSdkError.prototype);
  }

  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      requestId: this.requestId,
      httpStatus: this.httpStatus,
      details: this.details,
      validationErrors: this.validationErrors,
      stack: this.stack
    };
  }

  public toString(): string {
    const parts: string[] = [`[${this.name}] code=${this.code}`, `message=${this.message}`];
    if (this.requestId) parts.push(`requestId=${this.requestId}`);
    if (this.httpStatus) parts.push(`httpStatus=${this.httpStatus}`);
    return parts.join(', ');
  }
}

export function createError(
  code: ErrorCode,
  message?: string,
  options: {
    requestId?: string;
    httpStatus?: number;
    details?: unknown;
    cause?: Error;
  } = {}
): DataElementSdkError {
  return new DataElementSdkError(code, message, options);
}

export function throwError(
  code: ErrorCode,
  message?: string,
  options: {
    requestId?: string;
    httpStatus?: number;
    details?: unknown;
    cause?: Error;
  } = {}
): never {
  throw createError(code, message, options);
}

export function isSdkError(err: unknown): err is DataElementSdkError {
  return err instanceof DataElementSdkError;
}

export function wrapHttpError(
  err: Error,
  requestInfo: {
    url: string;
    method: string;
    requestId?: string;
  }
): DataElementSdkError {
  const message = `HTTP请求失败: ${requestInfo.method} ${requestInfo.url} - ${err.message}`;
  if ((err as { code?: string }).code === 'ETIMEDOUT' || (err as { name?: string }).name === 'TimeoutError') {
    return createError(ErrorCode.SDK_TIMEOUT, message, {
      requestId: requestInfo.requestId,
      cause: err
    });
  }
  return createError(ErrorCode.SDK_HTTP_ERROR, message, {
    requestId: requestInfo.requestId,
    cause: err,
    details: { url: requestInfo.url, method: requestInfo.method }
  });
}
