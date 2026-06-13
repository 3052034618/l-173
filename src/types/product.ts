export enum Industry {
  FINANCE = 'finance',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  TRANSPORTATION = 'transportation',
  ENERGY = 'energy',
  RETAIL = 'retail',
  MANUFACTURING = 'manufacturing',
  GOVERNMENT = 'government',
  MEDIA = 'media',
  TELECOM = 'telecom',
  AGRICULTURE = 'agriculture',
  REALESTATE = 'realestate',
  LOGISTICS = 'logistics',
  OTHER = 'other'
}

export const IndustryMap: Record<Industry, string> = {
  [Industry.FINANCE]: '金融',
  [Industry.HEALTHCARE]: '医疗健康',
  [Industry.EDUCATION]: '教育',
  [Industry.TRANSPORTATION]: '交通出行',
  [Industry.ENERGY]: '能源',
  [Industry.RETAIL]: '零售消费',
  [Industry.MANUFACTURING]: '制造业',
  [Industry.GOVERNMENT]: '政务',
  [Industry.MEDIA]: '文化传媒',
  [Industry.TELECOM]: '通信',
  [Industry.AGRICULTURE]: '农业',
  [Industry.REALESTATE]: '房地产',
  [Industry.LOGISTICS]: '物流',
  [Industry.OTHER]: '其他'
};

export enum ProductStatus {
  PUBLISHED = 'published',
  OFFLINE = 'offline',
  DRAFT = 'draft',
  AUDIT = 'audit'
}

export const ProductStatusMap: Record<ProductStatus, string> = {
  [ProductStatus.PUBLISHED]: '已发布',
  [ProductStatus.OFFLINE]: '已下线',
  [ProductStatus.DRAFT]: '草稿',
  [ProductStatus.AUDIT]: '审核中'
};

export enum PriceUnit {
  TIMES = 'times',
  MONTH = 'month',
  YEAR = 'year',
  DATASET = 'dataset',
  ROWS = 'rows',
  GB = 'gb'
}

export const PriceUnitMap: Record<PriceUnit, string> = {
  [PriceUnit.TIMES]: '次',
  [PriceUnit.MONTH]: '月',
  [PriceUnit.YEAR]: '年',
  [PriceUnit.DATASET]: '数据集',
  [PriceUnit.ROWS]: '万条',
  [PriceUnit.GB]: 'GB'
};

export interface ProductTag {
  id: string;
  name: string;
  category?: string;
}

export interface ProductFilterParams {
  keyword?: string;
  industry?: Industry | string;
  tags?: string[];
  tagLogic?: 'and' | 'or';
  categoryId?: string;
  providerId?: string;
  priceRange?: {
    min?: number;
    max?: number;
  };
  status?: ProductStatus | string;
}

export interface PricePlan {
  id: string;
  name: string;
  price: number;
  unit: PriceUnit | string;
  quota: number;
  description?: string;
  features?: string[];
}

export interface ProductSummary {
  id: string;
  name: string;
  shortName?: string;
  description: string;
  industry: Industry | string;
  industryName?: string;
  tags: ProductTag[];
  categoryId?: string;
  categoryName?: string;
  providerId: string;
  providerName: string;
  thumbnailUrl?: string;
  coverUrl?: string;
  status: ProductStatus | string;
  statusName?: string;
  minPrice: number;
  priceUnit: PriceUnit | string;
  rating?: number;
  orderCount: number;
  viewCount: number;
  publishedAt?: string;
  updatedAt: string;
}

export interface ProductDetail extends ProductSummary {
  longDescription?: string;
  dataSource: string;
  dataFrequency?: string;
  dataUpdateTime?: string;
  coverageRegion?: string;
  sampleData?: string;
  dataFormat?: string[];
  interfaceList?: ProductInterface[];
  pricePlans: PricePlan[];
  complianceInfo?: ComplianceInfo;
  providerInfo?: ProviderInfo;
  reviewCount?: number;
  version?: string;
}

export interface ProductInterface {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  requestParams?: InterfaceParam[];
  responseParams?: InterfaceParam[];
  sampleRequest?: string;
  sampleResponse?: string;
  qps?: number;
  latency?: number;
}

export interface InterfaceParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  example?: string | number | boolean;
}

export interface ComplianceInfo {
  certification?: string[];
  dataSecurityLevel?: 'public' | 'internal' | 'sensitive' | 'confidential';
  desensitizationMethod?: string;
  auditStatus?: 'passed' | 'pending' | 'rejected';
}

export interface ProviderInfo {
  id: string;
  name: string;
  type: 'enterprise' | 'government' | 'individual' | 'institution';
  logoUrl?: string;
  description?: string;
  contactInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  productCount?: number;
}

export type CategoryTreeNode = {
  id: string;
  name: string;
  parentId?: string;
  children?: CategoryTreeNode[];
  productCount?: number;
};
