export enum OrderStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  SUPPLIER_APPROVAL = 'supplier_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export const OrderStatusMap: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: '待审核',
  [OrderStatus.REVIEWING]: '审核中',
  [OrderStatus.SUPPLIER_APPROVAL]: '供应商审批中',
  [OrderStatus.APPROVED]: '已通过',
  [OrderStatus.REJECTED]: '已拒绝',
  [OrderStatus.CANCELLED]: '已取消',
  [OrderStatus.EXPIRED]: '已过期'
};

export enum UrgencyLevel {
  NORMAL = 'normal',
  URGENT = 'urgent',
  EMERGENCY = 'emergency'
}

export enum ScenarioType {
  REPORT = 'report',
  ANALYSIS = 'analysis',
  MODEL_TRAINING = 'model_training',
  BUSINESS_SYSTEM = 'business_system',
  RISK_CONTROL = 'risk_control',
  MARKETING = 'marketing',
  OTHER = 'other'
}

export enum DataHandlingMethod {
  API = 'api',
  BULK_DOWNLOAD = 'bulk_download',
  DASHBOARD = 'dashboard',
  OTHER = 'other'
}

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
  scenarioType: ScenarioType | string;
  scenarioName: string;
  description: string;
  systemName?: string;
  systemUrl?: string;
  expectedUsage?: string;
  dataHandlingMethod?: DataHandlingMethod | string;
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
  urgencyLevel?: UrgencyLevel | string;
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
  status: OrderStatus | string;
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
  status?: OrderStatus | OrderStatus[] | string | string[];
  keyword?: string;
  productId?: string;
  startDate?: string;
  endDate?: string;
  urgencyLevel?: UrgencyLevel | string;
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
  newStatus?: OrderStatus | string;
}

export interface SubmitOrderFormData {
  productId: string;
  pricePlanId: string;
  quantity?: number;
  applicant: {
    userId: string;
    userName: string;
    department: string;
    phone?: string;
    email?: string;
    companyName?: string;
    unifiedSocialCreditCode?: string;
    businessLicenseUrl?: string;
  };
  scenarios: Array<{
    scenarioType: ScenarioType | string;
    scenarioName: string;
    description: string;
    systemName?: string;
    systemUrl?: string;
    expectedUsage?: string;
    dataHandlingMethod?: DataHandlingMethod | string;
    storageLocation?: string;
    retentionPeriod?: number;
  }>;
  dataPurpose: string;
  isInternalUse: boolean;
  relatedProjects?: string[];
  remarks?: string;
  urgencyLevel?: UrgencyLevel | string;
  expectedStartDate?: string;
  expectedEndDate?: string;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    fileType?: string;
  }>;
}
