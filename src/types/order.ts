export type OrderStatus =
  | 'pending'
  | 'reviewing'
  | 'supplier_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'expired';

export const OrderStatusMap: Record<OrderStatus, string> = {
  pending: '待审核',
  reviewing: '审核中',
  supplier_approval: '供应商审批中',
  approved: '已通过',
  rejected: '已拒绝',
  cancelled: '已取消',
  expired: '已过期'
};

export interface OrderApplicant {
  userId: string;
  userName: string;
  department: string;
  phone?: string;
  email?: string;
  companyName?: string;
  unifiedSocialCreditCode?: string;
  businessLicenseUrl?: string;
}

export interface UsageScenario {
  scenarioType: 'report' | 'analysis' | 'model_training' | 'business_system' | 'risk_control' | 'marketing' | 'other';
  scenarioName: string;
  description: string;
  systemName?: string;
  systemUrl?: string;
  expectedUsage?: string;
  dataHandlingMethod?: 'api' | 'bulk_download' | 'dashboard' | 'other';
  storageLocation?: string;
  retentionPeriod?: number;
  internalProcessDocUrl?: string;
}

export interface CreateOrderRequest {
  productId: string;
  pricePlanId: string;
  quantity?: number;
  applicant: OrderApplicant;
  usageScenarios: UsageScenario[];
  dataPurpose: string;
  isInternalUse: boolean;
  relatedProjects?: string[];
  attachFiles?: OrderAttachment[];
  remarks?: string;
  urgencyLevel?: 'normal' | 'urgent' | 'emergency';
  expectedStartDate?: string;
  expectedEndDate?: string;
}

export interface OrderAttachment {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  fileType?: string;
}

export interface OrderDetail {
  id: string;
  orderNo: string;
  productId: string;
  productName: string;
  pricePlanId: string;
  pricePlanName: string;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  statusName: string;
  applicant: OrderApplicant;
  usageScenarios: UsageScenario[];
  dataPurpose: string;
  isInternalUse: boolean;
  relatedProjects?: string[];
  attachFiles?: OrderAttachment[];
  remarks?: string;
  urgencyLevel: string;
  approvalFlow?: ApprovalNode[];
  currentApprovalStep?: number;
  expectedStartDate?: string;
  expectedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
  rejectedReason?: string;
  cancelledReason?: string;
}

export interface ApprovalNode {
  step: number;
  role: string;
  approverName?: string;
  approverId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_progress';
  statusName: string;
  opinion?: string;
  operatedAt?: string;
  attachmentUrls?: string[];
}

export interface OrderFilterParams {
  status?: OrderStatus | OrderStatus[];
  keyword?: string;
  productId?: string;
  startDate?: string;
  endDate?: string;
  urgencyLevel?: string;
}

export interface CancelOrderRequest {
  orderId: string;
  reason: string;
  operatorId?: string;
  operatorName?: string;
}

export interface OrderActionResult {
  orderId: string;
  success: boolean;
  message: string;
  newStatus?: OrderStatus;
}
