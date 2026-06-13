export interface PaginationParams {
  pageNum?: number;
  pageSize?: number;
}

export interface PaginationResult<T> {
  list: T[];
  total: number;
  pageNum: number;
  pageSize: number;
  pages: number;
}

export type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
  requestId: string;
  timestamp: number;
};

export interface SortParams {
  field?: string;
  order?: 'asc' | 'desc';
}

export interface PageRequest extends PaginationParams, SortParams {}
