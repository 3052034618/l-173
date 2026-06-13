export enum ErrorCode {
  SUCCESS = 0,
  PARAM_INVALID = 40001,
  PARAM_MISSING = 40002,
  AUTH_REQUIRED = 40101,
  AUTH_FAILED = 40102,
  AUTH_EXPIRED = 40103,
  PERMISSION_DENIED = 40301,
  RESOURCE_NOT_FOUND = 40401,
  PRODUCT_NOT_FOUND = 40402,
  ORDER_NOT_FOUND = 40403,
  AUTHORIZATION_NOT_FOUND = 40404,
  RESOURCE_CONFLICT = 40901,
  QUOTA_EXCEEDED = 42901,
  RATE_LIMITED = 42902,
  BUSINESS_ERROR = 50001,
  ORDER_CANNOT_CANCEL = 50002,
  ORDER_ALREADY_PROCESSED = 50003,
  AUTHORIZATION_EXPIRED = 50004,
  AUTHORIZATION_SUSPENDED = 50005,
  CREDENTIAL_NOT_FOUND = 50006,
  NETWORK_ERROR = 59998,
  UNKNOWN_ERROR = 59999,
  SDK_CONFIG_MISSING = 60001,
  SDK_INVALID_OPTION = 60002,
  SDK_HTTP_ERROR = 60003,
  SDK_TIMEOUT = 60004,
  SDK_PARSE_ERROR = 60005
}

export const ErrorMessage: Record<ErrorCode, string> = {
  [ErrorCode.SUCCESS]: '成功',
  [ErrorCode.PARAM_INVALID]: '参数不合法',
  [ErrorCode.PARAM_MISSING]: '缺少必填参数',
  [ErrorCode.AUTH_REQUIRED]: '请先进行身份认证',
  [ErrorCode.AUTH_FAILED]: '身份认证失败',
  [ErrorCode.AUTH_EXPIRED]: '认证令牌已过期',
  [ErrorCode.PERMISSION_DENIED]: '无权限访问该资源',
  [ErrorCode.RESOURCE_NOT_FOUND]: '资源不存在',
  [ErrorCode.PRODUCT_NOT_FOUND]: '数据产品不存在',
  [ErrorCode.ORDER_NOT_FOUND]: '订购申请不存在',
  [ErrorCode.AUTHORIZATION_NOT_FOUND]: '授权记录不存在',
  [ErrorCode.RESOURCE_CONFLICT]: '资源冲突',
  [ErrorCode.QUOTA_EXCEEDED]: '调用额度已用尽',
  [ErrorCode.RATE_LIMITED]: '请求频率过高，请稍后重试',
  [ErrorCode.BUSINESS_ERROR]: '业务处理异常',
  [ErrorCode.ORDER_CANNOT_CANCEL]: '当前状态下订购申请不可取消',
  [ErrorCode.ORDER_ALREADY_PROCESSED]: '订购申请已处理，无法重复操作',
  [ErrorCode.AUTHORIZATION_EXPIRED]: '授权已过期',
  [ErrorCode.AUTHORIZATION_SUSPENDED]: '授权已暂停',
  [ErrorCode.CREDENTIAL_NOT_FOUND]: '凭证不存在',
  [ErrorCode.NETWORK_ERROR]: '网络连接异常',
  [ErrorCode.UNKNOWN_ERROR]: '未知错误',
  [ErrorCode.SDK_CONFIG_MISSING]: 'SDK 配置项缺失',
  [ErrorCode.SDK_INVALID_OPTION]: 'SDK 选项参数不合法',
  [ErrorCode.SDK_HTTP_ERROR]: 'HTTP 请求异常',
  [ErrorCode.SDK_TIMEOUT]: '请求超时',
  [ErrorCode.SDK_PARSE_ERROR]: '响应数据解析失败'
};

export interface SdkError extends Error {
  code: ErrorCode;
  platformCode?: number | string;
  requestId?: string;
  httpStatus?: number;
  details?: unknown;
  validationErrors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}
