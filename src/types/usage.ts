export interface UsageQuota {
  totalQuota: number;
  usedQuota: number;
  remainingQuota: number;
  quotaUnit: string;
  usagePercentage: number;
  warningThreshold?: number;
  isWarning: boolean;
  isExhausted: boolean;
}

export interface DailyUsageRecord {
  date: string;
  callCount: number;
  errorCount: number;
  successRate: number;
  avgLatencyMs?: number;
  p99LatencyMs?: number;
  trafficBytes?: number;
}

export interface UsageStatistics {
  authorizationId: string;
  productId: string;
  productName: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  quota: UsageQuota;
  dailyRecords: DailyUsageRecord[];
  interfaceBreakdown?: InterfaceUsage[];
  errorBreakdown?: ErrorUsage[];
  totalCalls: number;
  totalErrors: number;
  totalSuccessRate: number;
  avgLatencyMs?: number;
}

export interface InterfaceUsage {
  interfaceId: string;
  interfaceName: string;
  path: string;
  method: string;
  callCount: number;
  errorCount: number;
  successRate: number;
  avgLatencyMs?: number;
  percentage: number;
}

export interface ErrorUsage {
  errorCode: string;
  errorMessage: string;
  count: number;
  percentage: number;
  lastOccurredAt?: string;
}

export interface UsageQueryParams {
  authorizationId: string;
  granularity?: 'day' | 'week' | 'month';
  startDate?: string;
  endDate?: string;
  interfaceId?: string;
  groupBy?: 'day' | 'interface' | 'error';
}

export interface QuotaAlert {
  id: string;
  authorizationId: string;
  productName: string;
  type: 'threshold' | 'exhausted' | 'rate_limit';
  level: 'info' | 'warning' | 'critical';
  message: string;
  currentUsage: number;
  totalQuota: number;
  threshold?: number;
  triggeredAt: string;
}

export interface RateLimitInfo {
  authorizationId: string;
  interfaceId?: string;
  interfaceName?: string;
  limitType: 'qps' | 'daily' | 'monthly';
  currentValue: number;
  limitValue: number;
  remainingValue: number;
  resetAt?: string;
}
