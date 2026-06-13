import { HttpClient } from '../core/httpClient';
import { createError, ErrorCode } from '../core/errors';
import {
  CreateOrderRequest,
  OrderDetail,
  OrderFilterParams,
  PaginationResult,
  PageRequest,
  CancelOrderRequest,
  OrderActionResult
} from '../types';

export class OrderClient {
  constructor(private readonly http: HttpClient) {}

  public async createOrder(request: CreateOrderRequest): Promise<OrderDetail> {
    this.validateCreateOrder(request);
    const resp = await this.http.post<OrderDetail>('/api/v1/orders', request);
    return resp.data;
  }

  public async getOrderDetail(orderId: string): Promise<OrderDetail> {
    if (!orderId) {
      throw createError(ErrorCode.PARAM_MISSING, 'orderId 不能为空');
    }
    const resp = await this.http.get<OrderDetail>(`/api/v1/orders/${encodeURIComponent(orderId)}`);
    return resp.data;
  }

  public async getOrderByNo(orderNo: string): Promise<OrderDetail> {
    if (!orderNo) {
      throw createError(ErrorCode.PARAM_MISSING, 'orderNo 不能为空');
    }
    const resp = await this.http.get<OrderDetail>(`/api/v1/orders/byNo/${encodeURIComponent(orderNo)}`);
    return resp.data;
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
    return resp.data;
  }

  public async batchGetOrders(orderIds: string[]): Promise<OrderDetail[]> {
    if (!orderIds || orderIds.length === 0) return [];
    if (orderIds.length > 50) {
      throw createError(ErrorCode.PARAM_INVALID, '批量查询不能超过 50 条');
    }
    const resp = await this.http.post<OrderDetail[]>('/api/v1/orders/batch', { orderIds });
    return resp.data;
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
      params.status = Array.isArray(filter.status) ? filter.status.join(',') : filter.status;
    }
    if (filter.keyword) params.keyword = filter.keyword;
    if (filter.productId) params.productId = filter.productId;
    if (filter.startDate) params.startDate = filter.startDate;
    if (filter.endDate) params.endDate = filter.endDate;
    if (filter.urgencyLevel) params.urgencyLevel = filter.urgencyLevel;
    return params;
  }
}
