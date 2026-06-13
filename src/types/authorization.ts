export type AuthorizationStatus =
  | 'active'
  | 'pending'
  | 'expiring'
  | 'expired'
  | 'suspended'
  | 'revoked';

export const AuthorizationStatusMap: Record<AuthorizationStatus, string> = {
  active: '已生效',
  pending: '待生效',
  expiring: '即将到期',
  expired: '已过期',
  suspended: '已暂停',
  revoked: '已撤销'
};

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
  status: AuthorizationStatus;
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
  status?: AuthorizationStatus | AuthorizationStatus[];
  productId?: string;
  keyword?: string;
  expiresWithinDays?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface CredentialDownloadRequest {
  authorizationId: string;
  credentialId?: string;
  format?: 'json' | 'yaml' | 'ini' | 'env' | 'pdf';
  includeSampleCode?: boolean;
  sampleCodeLanguages?: ('nodejs' | 'python' | 'java' | 'go' | 'csharp')[];
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
