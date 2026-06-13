import { HttpClient } from '../core/httpClient';
import {
  ProductSummary,
  ProductDetail,
  ProductFilterParams,
  PaginationResult,
  PageRequest,
  CategoryTreeNode,
  ProductTag,
  ProductInterface
} from '../types';

export class ProductClient {
  constructor(private readonly http: HttpClient) {}

  public async searchProducts(
    filter: ProductFilterParams = {},
    pagination: PageRequest = { pageNum: 1, pageSize: 20 }
  ): Promise<PaginationResult<ProductSummary>> {
    const params: Record<string, unknown> = {
      ...filter,
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
      sortField: pagination.field,
      sortOrder: pagination.order
    };
    const resp = await this.http.get<PaginationResult<ProductSummary>>('/api/v1/products/search', params);
    const data = resp.data;
    data.list = data.list.map(item => this.enrichSummary(item));
    return data;
  }

  public async getProductDetail(productId: string): Promise<ProductDetail> {
    if (!productId) {
      throw new Error('productId 不能为空');
    }
    const resp = await this.http.get<ProductDetail>(`/api/v1/products/${encodeURIComponent(productId)}`);
    return this.enrichDetail(resp.data);
  }

  public async getProductBatch(productIds: string[]): Promise<ProductDetail[]> {
    if (!productIds || productIds.length === 0) {
      return [];
    }
    if (productIds.length > 50) {
      throw new Error('单次批量查询不能超过 50 个产品');
    }
    const resp = await this.http.post<ProductDetail[]>('/api/v1/products/batch', { productIds });
    return resp.data.map(item => this.enrichDetail(item));
  }

  public async getCategories(): Promise<CategoryTreeNode[]> {
    const resp = await this.http.get<CategoryTreeNode[]>('/api/v1/products/categories');
    return resp.data;
  }

  public async getHotTags(limit: number = 20, industry?: string): Promise<ProductTag[]> {
    const params: Record<string, unknown> = { limit };
    if (industry) params.industry = industry;
    const resp = await this.http.get<ProductTag[]>('/api/v1/products/tags/hot', params);
    return resp.data;
  }

  public async getSimilarProducts(productId: string, limit: number = 10): Promise<ProductSummary[]> {
    if (!productId) throw new Error('productId 不能为空');
    const resp = await this.http.get<ProductSummary[]>(
      `/api/v1/products/${encodeURIComponent(productId)}/similar`,
      { limit }
    );
    return resp.data.map(item => this.enrichSummary(item));
  }

  public async getRecommendedProducts(limit: number = 10, industry?: string): Promise<ProductSummary[]> {
    const params: Record<string, unknown> = { limit };
    if (industry) params.industry = industry;
    const resp = await this.http.get<ProductSummary[]>('/api/v1/products/recommended', params);
    return resp.data.map(item => this.enrichSummary(item));
  }

  public async getProductInterfaces(productId: string): Promise<ProductInterface[]> {
    if (!productId) throw new Error('productId 不能为空');
    const resp = await this.http.get<ProductInterface[]>(
      `/api/v1/products/${encodeURIComponent(productId)}/interfaces`
    );
    return resp.data;
  }

  private enrichSummary(summary: ProductSummary): ProductSummary {
    const { IndustryMap, PriceUnitMap } = require('../types/product');
    return {
      ...summary,
      industryName: summary.industryName || (IndustryMap as Record<string, string>)[summary.industry],
      statusName: summary.statusName || this.mapStatusName(summary.status)
    };
  }

  private enrichDetail(detail: ProductDetail): ProductDetail {
    const enriched = this.enrichSummary(detail) as ProductDetail;
    if (enriched.pricePlans && enriched.pricePlans.length > 0) {
      const { PriceUnitMap } = require('../types/product');
      enriched.pricePlans = enriched.pricePlans.map(plan => ({
        ...plan,
        unit: plan.unit
      }));
    }
    return enriched;
  }

  private mapStatusName(status: string): string {
    const map: Record<string, string> = {
      published: '已发布',
      offline: '已下线',
      draft: '草稿',
      audit: '审核中'
    };
    return map[status] || status;
  }
}
