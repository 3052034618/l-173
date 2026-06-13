import { HttpClient } from '../core/httpClient';
import { createError, ErrorCode } from '../core/errors';
import {
  DailyUsageRecord,
  InterfaceUsage,
  QuotaAlert,
  RateLimitInfo,
  UsageQueryParams,
  UsageQuota,
  UsageStatistics
} from '../types';

export class UsageClient {
  constructor(private readonly http: HttpClient) {}

  public async getUsageQuota(authorizationId: string): Promise<UsageQuota> {
    if (!authorizationId) {
      throw createError(ErrorCode.PARAM_MISSING, 'authorizationId 不能为空');
    }
    const resp = await this.http.get<UsageQuota>(
      `/api/v1/usages/${encodeURIComponent(authorizationId)}/quota`
    );
    return this.enrichQuota(resp.data);
  }

  public async getUsageStatistics(params: UsageQueryParams): Promise<UsageStatistics> {
    if (!params.authorizationId) {
      throw createError(ErrorCode.PARAM_MISSING, 'authorizationId 不能为空');
    }
    if (params.startDate && params.endDate) {
      const s = new Date(params.startDate).getTime();
      const e = new Date(params.endDate).getTime();
      if (s > e) {
        throw createError(ErrorCode.PARAM_INVALID, 'startDate 不能晚于 endDate');
      }
    }
    const reqParams: Record<string, unknown> = { ...params };
    const resp = await this.http.get<UsageStatistics>(
      `/api/v1/usages/${encodeURIComponent(params.authorizationId)}/statistics`,
      reqParams
    );
    return resp.data;
  }

  public async getDailyRecords(
    authorizationId: string,
    startDate?: string,
    endDate?: string
  ): Promise<DailyUsageRecord[]> {
    if (!authorizationId) {
      throw createError(ErrorCode.PARAM_MISSING, 'authorizationId 不能为空');
    }
    const params: Record<string, unknown> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const resp = await this.http.get<DailyUsageRecord[]>(
      `/api/v1/usages/${encodeURIComponent(authorizationId)}/daily-records`,
      params
    );
    return resp.data;
  }

  public async getInterfaceBreakdown(
    authorizationId: string,
    startDate?: string,
    endDate?: string
  ): Promise<InterfaceUsage[]> {
    if (!authorizationId) {
      throw createError(ErrorCode.PARAM_MISSING, 'authorizationId 不能为空');
    }
    const params: Record<string, unknown> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const resp = await this.http.get<InterfaceUsage[]>(
      `/api/v1/usages/${encodeURIComponent(authorizationId)}/interface-breakdown`,
      params
    );
    return resp.data;
  }

  public async getQuotaAlerts(
    authorizationId?: string,
    activeOnly: boolean = true
  ): Promise<QuotaAlert[]> {
    const params: Record<string, unknown> = { activeOnly };
    if (authorizationId) params.authorizationId = authorizationId;
    const resp = await this.http.get<QuotaAlert[]>('/api/v1/usages/quota-alerts', params);
    return resp.data;
  }

  public async getRateLimitInfo(
    authorizationId: string,
    interfaceId?: string
  ): Promise<RateLimitInfo[]> {
    if (!authorizationId) {
      throw createError(ErrorCode.PARAM_MISSING, 'authorizationId 不能为空');
    }
    const params: Record<string, unknown> = {};
    if (interfaceId) params.interfaceId = interfaceId;
    const resp = await this.http.get<RateLimitInfo[]>(
      `/api/v1/usages/${encodeURIComponent(authorizationId)}/rate-limit`,
      params
    );
    return resp.data;
  }

  public async batchGetQuota(authorizationIds: string[]): Promise<Map<string, UsageQuota>> {
    if (!authorizationIds || authorizationIds.length === 0) return new Map();
    if (authorizationIds.length > 50) {
      throw createError(ErrorCode.PARAM_INVALID, '批量查询不能超过 50 条');
    }
    const resp = await this.http.post<Array<{ authorizationId: string; quota: UsageQuota }>>(
      '/api/v1/usages/quota/batch',
      { authorizationIds }
    );
    const result = new Map<string, UsageQuota>();
    for (const item of resp.data) {
      result.set(item.authorizationId, this.enrichQuota(item.quota));
    }
    return result;
  }

  public async checkAndWarnQuota(authorizationId: string): Promise<{
    quota: UsageQuota;
    alerts: QuotaAlert[];
    isExhausted: boolean;
    isWarning: boolean;
  }> {
    const [quota, alerts] = await Promise.all([
      this.getUsageQuota(authorizationId),
      this.getQuotaAlerts(authorizationId, true)
    ]);
    return {
      quota,
      alerts,
      isExhausted: quota.isExhausted,
      isWarning: quota.isWarning
    };
  }

  private enrichQuota(quota: UsageQuota): UsageQuota {
    const percentage = quota.totalQuota > 0
      ? Math.round((quota.usedQuota / quota.totalQuota) * 10000) / 100
      : 0;
    const warningThreshold = quota.warningThreshold ?? 80;
    const isWarning = percentage >= warningThreshold && !quota.isExhausted;
    const isExhausted = quota.totalQuota > 0 && quota.usedQuota >= quota.totalQuota;
    return {
      ...quota,
      usagePercentage: quota.usagePercentage !== undefined ? quota.usagePercentage : percentage,
      warningThreshold,
      isWarning: quota.isWarning !== undefined ? quota.isWarning : isWarning,
      isExhausted: quota.isExhausted !== undefined ? quota.isExhausted : isExhausted
    };
  }
}
