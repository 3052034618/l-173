import { HttpClient } from '../core/httpClient';
import { createError, ErrorCode } from '../core/errors';
import {
  ProductSummary,
  ProductDetail,
  ProductFilterParams,
  PaginationResult,
  PageRequest,
  CategoryTreeNode,
  ProductTag,
  ProductInterface,
  Industry,
  IndustryMap,
  ProductStatus,
  ProductStatusMap,
  PriceUnit
} from '../types';

export interface ProductSearchForm {
  keyword?: string;
  industry?: Industry | string;
  tags?: string | string[];
  tagLogic?: 'and' | 'or';
  categoryId?: string;
  providerId?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: ProductStatus | string;
  pageNum?: number;
  pageSize?: number;
  sortBy?: 'orderCount' | 'minPrice' | 'rating' | 'publishedAt' | 'viewCount' | string;
  sortOrder?: 'asc' | 'desc';
}

export class ProductClient {
  constructor(private readonly http: HttpClient) {}

  public async searchFromPageForm(
    form: ProductSearchForm = {}
  ): Promise<PaginationResult<ProductSummary>> {
    const filter: ProductFilterParams = {
      keyword: form.keyword,
      industry: form.industry,
      tags: typeof form.tags === 'string' ? form.tags.split(/[,，\s]+/).filter(Boolean) : form.tags,
      tagLogic: form.tagLogic || 'or',
      categoryId: form.categoryId,
      providerId: form.providerId,
      status: form.status
    };
    if (form.minPrice !== undefined || form.maxPrice !== undefined) {
      filter.priceRange = { min: form.minPrice, max: form.maxPrice };
    }
    return this.searchProducts(filter, {
      pageNum: form.pageNum || 1,
      pageSize: form.pageSize || 20,
      field: form.sortBy || 'orderCount',
      order: form.sortOrder || 'desc'
    });
  }

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
      throw createError(ErrorCode.PARAM_MISSING, 'productId 不能为空');
    }
    const resp = await this.http.get<ProductDetail>(`/api/v1/products/${encodeURIComponent(productId)}`);
    return this.enrichDetail(resp.data);
  }

  public async getProductBatch(productIds: string[]): Promise<ProductDetail[]> {
    if (!productIds || productIds.length === 0) {
      return [];
    }
    if (productIds.length > 50) {
      throw createError(ErrorCode.PARAM_INVALID, '单次批量查询不能超过 50 个产品');
    }
    const resp = await this.http.post<ProductDetail[]>('/api/v1/products/batch', { productIds });
    return resp.data.map(item => this.enrichDetail(item));
  }

  public async getCategories(): Promise<CategoryTreeNode[]> {
    const resp = await this.http.get<CategoryTreeNode[]>('/api/v1/products/categories');
    return resp.data;
  }

  public async getHotTags(limit: number = 20, industry?: Industry | string): Promise<ProductTag[]> {
    const params: Record<string, unknown> = { limit };
    if (industry) params.industry = industry;
    const resp = await this.http.get<ProductTag[]>('/api/v1/products/tags/hot', params);
    return resp.data;
  }

  public async getSimilarProducts(productId: string, limit: number = 10): Promise<ProductSummary[]> {
    if (!productId) throw createError(ErrorCode.PARAM_MISSING, 'productId 不能为空');
    const resp = await this.http.get<ProductSummary[]>(
      `/api/v1/products/${encodeURIComponent(productId)}/similar`,
      { limit }
    );
    return resp.data.map(item => this.enrichSummary(item));
  }

  public async getRecommendedProducts(limit: number = 10, industry?: Industry | string): Promise<ProductSummary[]> {
    const params: Record<string, unknown> = { limit };
    if (industry) params.industry = industry;
    const resp = await this.http.get<ProductSummary[]>('/api/v1/products/recommended', params);
    return resp.data.map(item => this.enrichSummary(item));
  }

  public async getProductInterfaces(productId: string): Promise<ProductInterface[]> {
    if (!productId) throw createError(ErrorCode.PARAM_MISSING, 'productId 不能为空');
    const resp = await this.http.get<ProductInterface[]>(
      `/api/v1/products/${encodeURIComponent(productId)}/interfaces`
    );
    return resp.data;
  }

  private enrichSummary(summary: ProductSummary): ProductSummary {
    const industryKey = typeof summary.industry === 'string' ? summary.industry : summary.industry as unknown as string;
    const statusKey = typeof summary.status === 'string' ? summary.status : summary.status as unknown as string;
    return {
      ...summary,
      industryName: summary.industryName || IndustryMap[industryKey as Industry] || industryKey,
      statusName: summary.statusName || ProductStatusMap[statusKey as ProductStatus] || statusKey
    };
  }

  private enrichDetail(detail: ProductDetail): ProductDetail {
    const enriched = this.enrichSummary(detail) as ProductDetail;
    if (enriched.pricePlans && enriched.pricePlans.length > 0) {
      enriched.pricePlans = enriched.pricePlans.map(plan => ({
        ...plan,
        unit: plan.unit as unknown as PriceUnit
      }));
    }
    return enriched;
  }
}
