export type Industry =
  | 'finance'
  | 'healthcare'
  | 'education'
  | 'transportation'
  | 'energy'
  | 'retail'
  | 'manufacturing'
  | 'government'
  | 'media'
  | 'telecom'
  | 'agriculture'
  | 'realestate'
  | 'logistics'
  | 'other';

export const IndustryMap: Record<Industry, string> = {
  finance: '金融',
  healthcare: '医疗健康',
  education: '教育',
  transportation: '交通出行',
  energy: '能源',
  retail: '零售消费',
  manufacturing: '制造业',
  government: '政务',
  media: '文化传媒',
  telecom: '通信',
  agriculture: '农业',
  realestate: '房地产',
  logistics: '物流',
  other: '其他'
};

export interface ProductTag {
  id: string;
  name: string;
  category?: string;
}

export interface ProductFilterParams {
  keyword?: string;
  industry?: Industry;
  tags?: string[];
  tagLogic?: 'and' | 'or';
  categoryId?: string;
  providerId?: string;
  priceRange?: {
    min?: number;
    max?: number;
  };
  status?: ProductStatus;
}

export type ProductStatus = 'published' | 'offline' | 'draft' | 'audit';

export type PriceUnit = 'times' | 'month' | 'year' | 'dataset' | 'rows' | 'gb';

export const PriceUnitMap: Record<PriceUnit, string> = {
  times: '次',
  month: '月',
  year: '年',
  dataset: '数据集',
  rows: '万条',
  gb: 'GB'
};

export interface PricePlan {
  id: string;
  name: string;
  price: number;
  unit: PriceUnit;
  quota: number;
  description?: string;
  features?: string[];
}

export interface ProductSummary {
  id: string;
  name: string;
  shortName?: string;
  description: string;
  industry: Industry;
  industryName?: string;
  tags: ProductTag[];
  categoryId?: string;
  categoryName?: string;
  providerId: string;
  providerName: string;
  thumbnailUrl?: string;
  coverUrl?: string;
  status: ProductStatus;
  statusName?: string;
  minPrice: number;
  priceUnit: PriceUnit;
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
