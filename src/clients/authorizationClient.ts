import { HttpClient } from '../core/httpClient';
import { createError, ErrorCode } from '../core/errors';
import * as fs from 'fs';
import * as path from 'path';
import {
  AuthorizationDetail,
  AuthorizationFilterParams,
  AuthorizationStatistics,
  AuthorizedInterface,
  CredentialDownloadRequest,
  CredentialDownloadResult,
  ExpiryReminder,
  PaginationResult,
  PageRequest,
  AuthorizationStatus,
  AuthorizationStatusMap,
  UsageDashboardOverview,
  UsageQuota
} from '../types';

export class AuthorizationClient {
  constructor(
    private readonly http: HttpClient,
    private readonly quotaFetcher?: (authorizationId: string) => Promise<UsageQuota>
  ) {}

  public async getAuthorizationDetail(authorizationId: string): Promise<AuthorizationDetail> {
    if (!authorizationId) {
      throw createError(ErrorCode.PARAM_MISSING, 'authorizationId 不能为空');
    }
    const resp = await this.http.get<AuthorizationDetail>(
      `/api/v1/authorizations/${encodeURIComponent(authorizationId)}`
    );
    return this.enrich(resp.data);
  }

  public async getByOrderId(orderId: string): Promise<AuthorizationDetail | null> {
    if (!orderId) {
      throw createError(ErrorCode.PARAM_MISSING, 'orderId 不能为空');
    }
    try {
      const resp = await this.http.get<AuthorizationDetail>(
        `/api/v1/authorizations/byOrder/${encodeURIComponent(orderId)}`
      );
      return this.enrich(resp.data);
    } catch (err) {
      if ((err as { code?: ErrorCode }).code === ErrorCode.RESOURCE_NOT_FOUND) {
        return null;
      }
      throw err;
    }
  }

  public async listAuthorizations(
    filter: AuthorizationFilterParams = {},
    pagination: PageRequest = { pageNum: 1, pageSize: 20 }
  ): Promise<PaginationResult<AuthorizationDetail>> {
    const params: Record<string, unknown> = {
      ...this.serializeFilter(filter),
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
      sortField: pagination.field || 'createdAt',
      sortOrder: pagination.order || 'desc'
    };
    const resp = await this.http.get<PaginationResult<AuthorizationDetail>>('/api/v1/authorizations', params);
    resp.data.list = resp.data.list.map(a => this.enrich(a));
    return resp.data;
  }

  public async getStatistics(): Promise<AuthorizationStatistics> {
    const resp = await this.http.get<AuthorizationStatistics>('/api/v1/authorizations/statistics');
    return resp.data;
  }

  public async getExpiryReminders(daysWithin: number = 30): Promise<ExpiryReminder[]> {
    if (daysWithin <= 0) {
      throw createError(ErrorCode.PARAM_INVALID, 'daysWithin 必须为正整数');
    }
    const resp = await this.http.get<ExpiryReminder[]>('/api/v1/authorizations/expiry-reminders', {
      daysWithin
    });
    return resp.data.map(r => this.withSeverity(r));
  }

  public async getAuthorizedInterfaces(authorizationId: string): Promise<AuthorizedInterface[]> {
    if (!authorizationId) {
      throw createError(ErrorCode.PARAM_MISSING, 'authorizationId 不能为空');
    }
    const resp = await this.http.get<AuthorizedInterface[]>(
      `/api/v1/authorizations/${encodeURIComponent(authorizationId)}/interfaces`
    );
    return resp.data;
  }

  public async checkAuthorizationStatus(authorizationId: string): Promise<{
    authorizationId: string;
    status: string;
    statusName: string;
    isValid: boolean;
    expiresAt: string;
    daysRemaining: number;
  }> {
    if (!authorizationId) {
      throw createError(ErrorCode.PARAM_MISSING, 'authorizationId 不能为空');
    }
    const resp = await this.http.get<{
      authorizationId: string;
      status: string;
      statusName: string;
      isValid: boolean;
      expiresAt: string;
      daysRemaining: number;
    }>(`/api/v1/authorizations/${encodeURIComponent(authorizationId)}/status`);
    return resp.data;
  }

  public async downloadCredential(
    request: CredentialDownloadRequest
  ): Promise<CredentialDownloadResult> {
    if (!request.authorizationId) {
      throw createError(ErrorCode.PARAM_MISSING, 'authorizationId 不能为空');
    }
    const format = request.format || 'json';
    const params: Record<string, unknown> = {
      format,
      includeSampleCode: request.includeSampleCode !== undefined ? request.includeSampleCode : true
    };
    if (request.credentialId) params.credentialId = request.credentialId;
    if (request.sampleCodeLanguages) {
      params.sampleCodeLanguages = request.sampleCodeLanguages.map(l => String(l)).join(',');
    }

    const downloaded = await this.http.download(
      `/api/v1/authorizations/${encodeURIComponent(request.authorizationId)}/credential/download`,
      params
    );

    const rawContent = downloaded.content || '';
    if (!rawContent || rawContent.trim().length === 0) {
      throw createError(
        ErrorCode.CREDENTIAL_NOT_FOUND,
        '凭证内容为空，授权可能尚未生效或凭证尚未生成，请稍后再试',
        { details: { authorizationId: request.authorizationId, credentialId: request.credentialId } }
      );
    }

    const fileName = this.extractFilename(downloaded.headers) || request.fileName ||
      `credential_${request.authorizationId}.${this.extensionOf(String(format))}`;

    return {
      fileName,
      fileContent: rawContent,
      contentType: downloaded.contentType,
      fileSize: Buffer.byteLength(rawContent, 'utf8'),
      downloadUrl: undefined
    };
  }

  public async downloadCredentialToFile(
    request: CredentialDownloadRequest,
    savePath: string
  ): Promise<{ filePath: string; fileName: string; fileSize: number }> {
    if (!savePath || !savePath.trim()) {
      throw createError(ErrorCode.PARAM_MISSING, 'savePath 保存路径不能为空');
    }

    const result = await this.downloadCredential(request);
    if (!result.fileContent || result.fileSize === 0) {
      throw createError(ErrorCode.CREDENTIAL_NOT_FOUND, '凭证内容为空，未写入文件');
    }

    const resolved = this.resolveFilePath(savePath, result.fileName);
    const targetDir = resolved.directory;

    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
    } catch (e) {
      throw createError(
        ErrorCode.BUSINESS_ERROR,
        `创建保存目录失败: ${targetDir}`,
        { details: (e as Error).message }
      );
    }

    try {
      fs.writeFileSync(resolved.filePath, result.fileContent, 'utf8');
    } catch (e) {
      throw createError(
        ErrorCode.BUSINESS_ERROR,
        `写入凭证文件失败: ${resolved.filePath}`,
        { details: (e as Error).message }
      );
    }

    const stat = fs.statSync(resolved.filePath);
    return {
      filePath: resolved.filePath,
      fileName: result.fileName,
      fileSize: stat.size
    };
  }

  public async getUsageDashboard(
    options: {
      userId?: string;
      daysWithin?: number;
      includeAlerts?: boolean;
    } = {}
  ): Promise<UsageDashboardOverview> {
    const daysWithin = options.daysWithin ?? 30;
    const includeAlerts = options.includeAlerts ?? true;
    const generatedAt = new Date().toISOString();

    const [authList, reminders, stats] = await Promise.all([
      this.listAuthorizations({ expiresWithinDays: daysWithin }, { pageSize: 200 }),
      this.getExpiryReminders(daysWithin),
      this.getStatistics()
    ]);

    const effectiveAuths = authList.list;
    const ifCounts = new Map<string, number>();
    const quotaMap = new Map<string, UsageQuota>();

    for (const auth of effectiveAuths) {
      try {
        const ifs = await this.getAuthorizedInterfaces(auth.id);
        ifCounts.set(auth.id, ifs.filter(i => i.isEnabled).length);
      } catch {
        ifCounts.set(auth.id, 0);
      }
      if (this.quotaFetcher) {
        try {
          const q = await this.quotaFetcher(auth.id);
          quotaMap.set(auth.id, q);
        } catch {
          quotaMap.set(auth.id, {
            totalQuota: 0,
            usedQuota: 0,
            remainingQuota: 0,
            quotaUnit: '',
            usagePercentage: 0,
            warningThreshold: 80,
            isWarning: false,
            isExhausted: false
          });
        }
      }
    }

    let totalInterfaceCount = 0;
    let alertsCount = 0;

    const dashboardAuths = effectiveAuths.map(auth => {
      const q = quotaMap.get(auth.id);
      const ifCount = ifCounts.get(auth.id) ?? auth.enabledInterfaces?.filter(i => i.isEnabled).length ?? 0;
      totalInterfaceCount += ifCount;
      if (q && (q.isWarning || q.isExhausted)) alertsCount++;
      return {
        authorizationId: auth.id,
        productId: auth.productId,
        productName: auth.productName,
        status: auth.status,
        statusName: auth.statusName,
        expiresAt: auth.expiresAt,
        daysRemaining: auth.daysRemaining ?? this.calcDaysRemaining(auth.expiresAt),
        enabledInterfaceCount: ifCount,
        quotaTotal: q?.totalQuota ?? 0,
        quotaUsed: q?.usedQuota ?? 0,
        quotaRemaining: q?.remainingQuota ?? 0,
        quotaUnit: q?.quotaUnit ?? '',
        quotaUsagePercentage: q?.usagePercentage ?? 0
      };
    });

    if (includeAlerts) {
      alertsCount += reminders.filter(r => r.severity === 'critical' || r.severity === 'danger').length;
    }

    return {
      effectiveAuthorizations: dashboardAuths,
      expiringReminders: reminders,
      summary: {
        totalAuthorizations: stats.total,
        activeCount: stats.active,
        expiringCount: stats.expiring,
        expiredCount: stats.expired,
        suspendedCount: stats.suspended,
        totalInterfaceCount,
        alertsCount
      },
      generatedAt
    };
  }

  private calcDaysRemaining(expiresAt: string): number {
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  private resolveFilePath(savePath: string, fallbackFileName: string): { filePath: string; directory: string } {
    const trimmed = savePath.trim();
    let filePath: string;
    try {
      const stat = fs.statSync(trimmed);
      if (stat.isDirectory()) {
        filePath = path.join(trimmed, fallbackFileName);
      } else {
        filePath = trimmed;
      }
    } catch {
      const hasExt = !!path.extname(trimmed);
      if (hasExt) {
        filePath = trimmed;
      } else {
        filePath = path.join(trimmed, fallbackFileName);
      }
    }
    const directory = path.dirname(filePath);
    return { filePath: path.resolve(filePath), directory: path.resolve(directory) };
  }

  private serializeFilter(filter: AuthorizationFilterParams): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    if (filter.status !== undefined) {
      const arr = Array.isArray(filter.status) ? filter.status : [filter.status];
      params.status = arr.map(s => String(s)).join(',');
    }
    if (filter.keyword) params.keyword = filter.keyword;
    if (filter.productId) params.productId = filter.productId;
    if (filter.expiresWithinDays) params.expiresWithinDays = filter.expiresWithinDays;
    if (filter.effectiveFrom) params.effectiveFrom = filter.effectiveFrom;
    if (filter.effectiveTo) params.effectiveTo = filter.effectiveTo;
    return params;
  }

  private enrich(auth: AuthorizationDetail): AuthorizationDetail {
    const s = String(auth.status);
    return {
      ...auth,
      statusName: auth.statusName || AuthorizationStatusMap[s as AuthorizationStatus] || s
    };
  }

  private withSeverity(reminder: ExpiryReminder): ExpiryReminder {
    let severity = reminder.severity;
    if (!severity) {
      const days = reminder.daysRemaining;
      if (days <= 3) severity = 'critical';
      else if (days <= 7) severity = 'danger';
      else severity = 'warning';
    }
    return { ...reminder, severity };
  }

  private extractFilename(headers: Record<string, string>): string | null {
    const disposition = headers['content-disposition'] || '';
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    if (match) {
      try {
        return decodeURIComponent(match[1].replace(/["']/g, ''));
      } catch {
        return match[1].replace(/["']/g, '');
      }
    }
    return null;
  }

  private extensionOf(format: string): string {
    const extMap: Record<string, string> = {
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      ini: 'ini',
      env: 'env',
      pdf: 'pdf'
    };
    return extMap[format] || format;
  }
}
