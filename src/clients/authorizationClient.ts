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
  PageRequest
} from '../types';

export class AuthorizationClient {
  constructor(private readonly http: HttpClient) {}

  public async getAuthorizationDetail(authorizationId: string): Promise<AuthorizationDetail> {
    if (!authorizationId) {
      throw createError(ErrorCode.PARAM_MISSING, 'authorizationId 不能为空');
    }
    const resp = await this.http.get<AuthorizationDetail>(
      `/api/v1/authorizations/${encodeURIComponent(authorizationId)}`
    );
    return resp.data;
  }

  public async getByOrderId(orderId: string): Promise<AuthorizationDetail | null> {
    if (!orderId) {
      throw createError(ErrorCode.PARAM_MISSING, 'orderId 不能为空');
    }
    try {
      const resp = await this.http.get<AuthorizationDetail>(
        `/api/v1/authorizations/byOrder/${encodeURIComponent(orderId)}`
      );
      return resp.data;
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
    if (request.sampleCodeLanguages) params.sampleCodeLanguages = request.sampleCodeLanguages.join(',');

    const downloaded = await this.http.download(
      `/api/v1/authorizations/${encodeURIComponent(request.authorizationId)}/credential/download`,
      params
    );

    const fileName = this.extractFilename(downloaded.headers) || request.fileName ||
      `credential_${request.authorizationId}.${this.extensionOf(format)}`;

    return {
      fileName,
      fileContent: downloaded.content,
      contentType: downloaded.contentType,
      fileSize: Buffer.byteLength(downloaded.content, 'utf8'),
      downloadUrl: undefined
    };
  }

  public async downloadCredentialToFile(
    request: CredentialDownloadRequest,
    savePath: string
  ): Promise<{ filePath: string; fileName: string; fileSize: number }> {
    const result = await this.downloadCredential(request);
    const dir = path.dirname(savePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    let filePath = savePath;
    try {
      const stat = fs.statSync(savePath);
      if (stat.isDirectory()) {
        filePath = path.join(savePath, result.fileName);
      }
    } catch {
      if (!path.extname(savePath)) {
        if (!fs.existsSync(savePath)) {
          fs.mkdirSync(savePath, { recursive: true });
        }
        filePath = path.join(savePath, result.fileName);
      }
    }
    fs.writeFileSync(filePath, result.fileContent, 'utf8');
    return {
      filePath,
      fileName: result.fileName,
      fileSize: result.fileSize
    };
  }

  private serializeFilter(filter: AuthorizationFilterParams): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    if (filter.status !== undefined) {
      params.status = Array.isArray(filter.status) ? filter.status.join(',') : filter.status;
    }
    if (filter.keyword) params.keyword = filter.keyword;
    if (filter.productId) params.productId = filter.productId;
    if (filter.expiresWithinDays) params.expiresWithinDays = filter.expiresWithinDays;
    if (filter.effectiveFrom) params.effectiveFrom = filter.effectiveFrom;
    if (filter.effectiveTo) params.effectiveTo = filter.effectiveTo;
    return params;
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
