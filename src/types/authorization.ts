export enum AuthorizationStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  EXPIRING = 'expiring',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked'
}

export const AuthorizationStatusMap: Record<AuthorizationStatus, string> = {
  [AuthorizationStatus.ACTIVE]: '已生效',
  [AuthorizationStatus.PENDING]: '待生效',
  [AuthorizationStatus.EXPIRING]: '即将到期',
  [AuthorizationStatus.EXPIRED]: '已过期',
  [AuthorizationStatus.SUSPENDED]: '已暂停',
  [AuthorizationStatus.REVOKED]: '已撤销'
};

export enum CredentialFormat {
  JSON = 'json',
  YAML = 'yaml',
  INI = 'ini',
  ENV = 'env',
  PDF = 'pdf'
}

export enum SampleCodeLanguage {
  NODEJS = 'nodejs',
  PYTHON = 'python',
  JAVA = 'java',
  GO = 'go',
  CSHARP = 'csharp'
}

export interface AuthorizationCredential {
  id: string;
  appKey: string;
  appSecret?: string;
  accessToken?: string;
  tokenExpiresAt?: string;
  gatewayUrl?: string;
  protocol?: 'http' | 'https' | 'sdk' | 'dubbo';
  signatureAlgorithm?: 'HMAC-SHA256' | 'RSA2048' | 'SM2';
  ipWhitelist?: string[];
  encryptionKey?: string;
}

export interface AuthorizationDetail {
  id: string;
  orderId: string;
  orderNo: string;
  productId: string;
  productName: string;
  pricePlanId: string;
  pricePlanName: string;
  status: AuthorizationStatus | string;
  statusName: string;
  quantity: number;
  effectiveAt: string;
  expiresAt: string;
  daysRemaining?: number;
  credentials: AuthorizationCredential[];
  enabledInterfaces: AuthorizedInterface[];
  grantScope?: GrantScope;
  suspends?: AuthorizationSuspendRecord[];
  renewals?: AuthorizationRenewalRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthorizedInterface {
  id: string;
  name: string;
  method: string;
  path: string;
  description: string;
  isEnabled: boolean;
  dailyQpsLimit?: number;
  monthlyQpsLimit?: number;
}

export interface GrantScope {
  dataScope?: 'full' | 'partial' | 'aggregated';
  regionRestriction?: string[];
  fieldRestriction?: string[];
  timeRangeRestriction?: {
    startDate?: string;
    endDate?: string;
  };
}

export interface AuthorizationSuspendRecord {
  id: string;
  reason: string;
  operatedBy: string;
  suspendedAt: string;
  resumedAt?: string;
}

export interface AuthorizationRenewalRecord {
  id: string;
  originalExpiresAt: string;
  newExpiresAt: string;
  renewalOrderId?: string;
  renewedAt: string;
}

export interface ExpiryReminder {
  authorizationId: string;
  productName: string;
  expiresAt: string;
  daysRemaining: number;
  severity: 'warning' | 'danger' | 'critical';
  suggestedAction: 'renew' | 'apply_new' | 'contact_admin';
  canRenewOnline: boolean;
}

export interface AuthorizationFilterParams {
  status?: AuthorizationStatus | AuthorizationStatus[] | string | string[];
  productId?: string;
  keyword?: string;
  expiresWithinDays?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface CredentialDownloadRequest {
  authorizationId: string;
  credentialId?: string;
  format?: CredentialFormat | string;
  includeSampleCode?: boolean;
  sampleCodeLanguages?: (SampleCodeLanguage | string)[];
  fileName?: string;
}

export interface CredentialDownloadResult {
  fileName: string;
  fileContent: string;
  contentType: string;
  fileSize: number;
  expireAt?: string;
  downloadUrl?: string;
}

export interface AuthorizationStatistics {
  total: number;
  active: number;
  expiring: number;
  expired: number;
  suspended: number;
}

export interface UsageDashboardOverview {
  effectiveAuthorizations: Array<{
    authorizationId: string;
    productId: string;
    productName: string;
    status: AuthorizationStatus | string;
    statusName: string;
    expiresAt: string;
    daysRemaining: number;
    enabledInterfaceCount: number;
    quotaTotal: number;
    quotaUsed: number;
    quotaRemaining: number;
    quotaUnit: string;
    quotaUsagePercentage: number;
  }>;
  expiringReminders: ExpiryReminder[];
  summary: {
    totalAuthorizations: number;
    activeCount: number;
    expiringCount: number;
    expiredCount: number;
    suspendedCount: number;
    totalInterfaceCount: number;
    alertsCount: number;
  };
  generatedAt: string;
}
