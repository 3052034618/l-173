import { HttpClient } from '../core/httpClient';
import { createError, ErrorCode, DataElementSdkError } from '../core/errors';
import {
  CreateOrderRequest,
  OrderDetail,
  OrderFilterParams,
  PaginationResult,
  PageRequest,
  CancelOrderRequest,
  OrderActionResult,
  SubmitOrderFormData,
  OrderStatus,
  OrderStatusMap,
  UrgencyLevel,
  ScenarioType,
  DataHandlingMethod,
  ValidationError
} from '../types';

export class OrderClient {
  constructor(private readonly http: HttpClient) {}

  public async submitFromPageForm(form: SubmitOrderFormData): Promise<OrderDetail> {
    const errors: ValidationError[] = [];

    if (!form.productId) errors.push({ field: 'productId', message: '请选择数据产品' });
    if (!form.pricePlanId) errors.push({ field: 'pricePlanId', message: '请选择价格方案' });

    const app = form.applicant || ({} as any);
    if (!app.userId) errors.push({ field: 'applicant.userId', message: '请填写申请人 ID' });
    if (!app.userName || !app.userName.trim()) errors.push({ field: 'applicant.userName', message: '请填写申请人姓名' });
    if (!app.department || !app.department.trim()) errors.push({ field: 'applicant.department', message: '请填写所属部门' });
    if (app.phone && !/^[\d\-+*\s]{6,}$/.test(app.phone.trim())) {
      errors.push({ field: 'applicant.phone', message: '联系电话格式不正确' });
    }
    if (app.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(app.email.trim())) {
      errors.push({ field: 'applicant.email', message: '邮箱格式不正确' });
    }

    if (!form.scenarios || form.scenarios.length === 0) {
      errors.push({ field: 'scenarios', message: '请至少填写一个使用场景' });
    } else {
      form.scenarios.forEach((s, idx) => {
        if (!s.scenarioType) errors.push({ field: `scenarios[${idx}].scenarioType`, message: '请选择使用场景类型' });
        if (!s.scenarioName || !s.scenarioName.trim()) errors.push({ field: `scenarios[${idx}].scenarioName`, message: '请填写使用场景名称' });
        if (!s.description || s.description.trim().length < 10) {
          errors.push({ field: `scenarios[${idx}].description`, message: '场景描述至少 10 个字符' });
        }
        if (s.retentionPeriod !== undefined && (s.retentionPeriod < 0 || s.retentionPeriod > 3650)) {
          errors.push({ field: `scenarios[${idx}].retentionPeriod`, message: '数据保留天数应在 0~3650 之间' });
        }
      });
    }

    if (!form.dataPurpose || form.dataPurpose.trim().length < 10) {
      errors.push({ field: 'dataPurpose', message: '用途说明至少 10 个字符，请详细描述使用目的' });
    }
    if (form.isInternalUse === undefined) {
      errors.push({ field: 'isInternalUse', message: '请明确是否为内部使用' });
    }
    if (form.quantity !== undefined && (!Number.isInteger(form.quantity) || form.quantity <= 0)) {
      errors.push({ field: 'quantity', message: '订购数量必须为正整数' });
    }
    if (form.expectedStartDate && form.expectedEndDate) {
      if (new Date(form.expectedStartDate).getTime() > new Date(form.expectedEndDate).getTime()) {
        errors.push({ field: 'expectedEndDate', message: '使用结束日期不能早于开始日期' });
      }
    }

    if (errors.length > 0) {
      throw new DataElementSdkError(
        ErrorCode.PARAM_INVALID,
        `订购表单校验失败，共 ${errors.length} 项问题`,
        { validationErrors: errors }
      );
    }

    const req: CreateOrderRequest = {
      productId: form.productId,
      pricePlanId: form.pricePlanId,
      quantity: form.quantity,
      applicant: {
        userId: app.userId,
        userName: app.userName.trim(),
        department: app.department.trim(),
        phone: app.phone,
        email: app.email,
        companyName: app.companyName,
        unifiedSocialCreditCode: app.unifiedSocialCreditCode,
        businessLicenseUrl: app.businessLicenseUrl
      },
      usageScenarios: form.scenarios.map(s => ({
        scenarioType: s.scenarioType as ScenarioType | string,
        scenarioName: s.scenarioName.trim(),
        description: s.description.trim(),
        systemName: s.systemName,
        systemUrl: s.systemUrl,
        expectedUsage: s.expectedUsage,
        dataHandlingMethod: s.dataHandlingMethod as DataHandlingMethod | string,
        storageLocation: s.storageLocation,
        retentionPeriod: s.retentionPeriod
      })),
      dataPurpose: form.dataPurpose.trim(),
      isInternalUse: !!form.isInternalUse,
      relatedProjects: form.relatedProjects,
      attachFiles: form.attachments,
      remarks: form.remarks,
      urgencyLevel: form.urgencyLevel || UrgencyLevel.NORMAL,
      expectedStartDate: form.expectedStartDate,
      expectedEndDate: form.expectedEndDate
    };

    return this.createOrder(req);
  }

  public async createOrder(request: CreateOrderRequest): Promise<OrderDetail> {
    this.validateCreateOrder(request);
    const resp = await this.http.post<OrderDetail>('/api/v1/orders', request);
    return this.enrich(resp.data);
  }

  public async getOrderDetail(orderId: string): Promise<OrderDetail> {
    if (!orderId) {
      throw createError(ErrorCode.PARAM_MISSING, 'orderId 不能为空');
    }
    const resp = await this.http.get<OrderDetail>(`/api/v1/orders/${encodeURIComponent(orderId)}`);
    return this.enrich(resp.data);
  }

  public async getOrderByNo(orderNo: string): Promise<OrderDetail> {
    if (!orderNo) {
      throw createError(ErrorCode.PARAM_MISSING, 'orderNo 不能为空');
    }
    const resp = await this.http.get<OrderDetail>(`/api/v1/orders/byNo/${encodeURIComponent(orderNo)}`);
    return this.enrich(resp.data);
  }

  public async listOrders(
    filter: OrderFilterParams = {},
    pagination: PageRequest = { pageNum: 1, pageSize: 20 }
  ): Promise<PaginationResult<OrderDetail>> {
    const params: Record<string, unknown> = {
      ...this.serializeFilter(filter),
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
      sortField: pagination.field || 'createdAt',
      sortOrder: pagination.order || 'desc'
    };
    const resp = await this.http.get<PaginationResult<OrderDetail>>('/api/v1/orders', params);
    resp.data.list = resp.data.list.map(o => this.enrich(o));
    return resp.data;
  }

  public async cancelOrder(request: CancelOrderRequest): Promise<OrderActionResult> {
    if (!request.orderId) {
      throw createError(ErrorCode.PARAM_MISSING, 'orderId 不能为空');
    }
    if (!request.reason || request.reason.trim().length === 0) {
      throw createError(ErrorCode.PARAM_MISSING, '取消原因不能为空');
    }
    const resp = await this.http.post<OrderActionResult>(
      `/api/v1/orders/${encodeURIComponent(request.orderId)}/cancel`,
      {
        reason: request.reason,
        operatorId: request.operatorId,
        operatorName: request.operatorName
      }
    );
    return resp.data;
  }

  public async getApprovalProgress(orderId: string): Promise<OrderDetail> {
    if (!orderId) {
      throw createError(ErrorCode.PARAM_MISSING, 'orderId 不能为空');
    }
    const resp = await this.http.get<OrderDetail>(
      `/api/v1/orders/${encodeURIComponent(orderId)}/approval-progress`
    );
    return this.enrich(resp.data);
  }

  public async batchGetOrders(orderIds: string[]): Promise<OrderDetail[]> {
    if (!orderIds || orderIds.length === 0) return [];
    if (orderIds.length > 50) {
      throw createError(ErrorCode.PARAM_INVALID, '批量查询不能超过 50 条');
    }
    const resp = await this.http.post<OrderDetail[]>('/api/v1/orders/batch', { orderIds });
    return resp.data.map(o => this.enrich(o));
  }

  private enrich(order: OrderDetail): OrderDetail {
    const s = typeof order.status === 'string' ? order.status : (order.status as unknown as string);
    return {
      ...order,
      statusName: order.statusName || OrderStatusMap[s as OrderStatus] || s
    };
  }

  private validateCreateOrder(request: CreateOrderRequest): void {
    if (!request.productId) {
      throw createError(ErrorCode.PARAM_MISSING, 'productId 不能为空');
    }
    if (!request.pricePlanId) {
      throw createError(ErrorCode.PARAM_MISSING, 'pricePlanId 不能为空');
    }
    if (!request.applicant) {
      throw createError(ErrorCode.PARAM_MISSING, 'applicant 申请人信息不能为空');
    }
    const a = request.applicant;
    if (!a.userId || !a.userName || !a.department) {
      throw createError(ErrorCode.PARAM_MISSING, '申请人信息中 userId、userName、department 为必填');
    }
    if (!request.usageScenarios || request.usageScenarios.length === 0) {
      throw createError(ErrorCode.PARAM_MISSING, '至少需要填写一个使用场景 usageScenarios');
    }
    request.usageScenarios.forEach((s, idx) => {
      if (!s.scenarioType || !s.description) {
        throw createError(ErrorCode.PARAM_INVALID, `第 ${idx + 1} 个使用场景的 scenarioType 和 description 为必填`);
      }
    });
    if (!request.dataPurpose || request.dataPurpose.trim().length < 10) {
      throw createError(ErrorCode.PARAM_INVALID, '用途说明 dataPurpose 长度不能少于 10 个字符');
    }
    if (request.quantity !== undefined && request.quantity <= 0) {
      throw createError(ErrorCode.PARAM_INVALID, '订购数量必须为正整数');
    }
    if (request.expectedStartDate && request.expectedEndDate) {
      if (new Date(request.expectedStartDate).getTime() > new Date(request.expectedEndDate).getTime()) {
        throw createError(ErrorCode.PARAM_INVALID, '使用开始日期不能晚于结束日期');
      }
    }
  }

  private serializeFilter(filter: OrderFilterParams): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    if (filter.status !== undefined) {
      const arr = Array.isArray(filter.status) ? filter.status : [filter.status];
      params.status = arr.map(s => (typeof s === 'string' ? s : (s as unknown as string))).join(',');
    }
    if (filter.keyword) params.keyword = filter.keyword;
    if (filter.productId) params.productId = filter.productId;
    if (filter.startDate) params.startDate = filter.startDate;
    if (filter.endDate) params.endDate = filter.endDate;
    if (filter.urgencyLevel) params.urgencyLevel = filter.urgencyLevel;
    return params;
  }
}
