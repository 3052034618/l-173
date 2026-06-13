import { SdkConfig } from '../types';
import { createError, ErrorCode } from './errors';

const DEFAULT_CONFIG: Partial<SdkConfig> = {
  timeout: 30000,
  retryTimes: 2,
  retryDelay: 500,
  enableSignature: true,
  signatureAlgorithm: 'HMAC-SHA256',
  debug: false
};

export class ConfigManager {
  private config: SdkConfig;

  constructor(config: SdkConfig) {
    this.config = this.mergeWithDefaults(config);
    this.validateConfig(this.config);
  }

  private mergeWithDefaults(config: SdkConfig): SdkConfig {
    return {
      ...DEFAULT_CONFIG,
      ...config,
      customHeaders: {
        ...(DEFAULT_CONFIG.customHeaders || {}),
        ...(config.customHeaders || {})
      }
    };
  }

  private validateConfig(config: SdkConfig): void {
    if (!config.baseUrl || typeof config.baseUrl !== 'string' || config.baseUrl.trim().length === 0) {
      throw createError(ErrorCode.SDK_CONFIG_MISSING, '配置项 baseUrl 不能为空');
    }
    try {
      new URL(config.baseUrl);
    } catch {
      throw createError(ErrorCode.SDK_INVALID_OPTION, `配置项 baseUrl 不是合法的 URL: ${config.baseUrl}`);
    }
    if (!config.appKey || typeof config.appKey !== 'string' || config.appKey.trim().length === 0) {
      throw createError(ErrorCode.SDK_CONFIG_MISSING, '配置项 appKey 不能为空');
    }
    if (!config.appSecret || typeof config.appSecret !== 'string' || config.appSecret.trim().length === 0) {
      throw createError(ErrorCode.SDK_CONFIG_MISSING, '配置项 appSecret 不能为空');
    }
    if (config.timeout !== undefined && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      throw createError(ErrorCode.SDK_INVALID_OPTION, '配置项 timeout 必须为正整数');
    }
    if (config.retryTimes !== undefined && (typeof config.retryTimes !== 'number' || config.retryTimes < 0)) {
      throw createError(ErrorCode.SDK_INVALID_OPTION, '配置项 retryTimes 必须为非负整数');
    }
  }

  public getConfig(): SdkConfig {
    return { ...this.config };
  }

  public get baseUrl(): string {
    return this.config.baseUrl.replace(/\/$/, '');
  }

  public get appKey(): string {
    return this.config.appKey;
  }

  public get appSecret(): string {
    return this.config.appSecret;
  }

  public get timeout(): number {
    return this.config.timeout!;
  }

  public get retryTimes(): number {
    return this.config.retryTimes!;
  }

  public get retryDelay(): number {
    return this.config.retryDelay!;
  }

  public get enableSignature(): boolean {
    return this.config.enableSignature!;
  }

  public get signatureAlgorithm(): 'HMAC-SHA256' | 'MD5' {
    return this.config.signatureAlgorithm!;
  }

  public get debug(): boolean {
    return this.config.debug!;
  }

  public get customHeaders(): Record<string, string> {
    return { ...this.config.customHeaders };
  }

  public update(patch: Partial<SdkConfig>): void {
    const merged = this.mergeWithDefaults({ ...this.config, ...patch });
    this.validateConfig(merged);
    this.config = merged;
  }

  public log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    if (this.config.logger) {
      try {
        this.config.logger(level, message, data);
      } catch {
        return;
      }
    }
    if (this.debug && level !== 'error') {
      const prefix = `[DataElementSDK:${level.toUpperCase()}]`;
      if (data !== undefined) {
        console.log(prefix, message, data);
      } else {
        console.log(prefix, message);
      }
    }
    if (level === 'error' && this.config.logger === undefined) {
      const prefix = '[DataElementSDK:ERROR]';
      if (data !== undefined) {
        console.error(prefix, message, data);
      } else {
        console.error(prefix, message);
      }
    }
  }
}
