# 数据要素流通平台 SDK

面向业务系统内部页面的数据要素流通平台调用 SDK，封装了数据产品的检索、详情读取、订购申请、授权状态查询、用量查询和凭证下载等六大核心能力。

---

## 目录

- [功能特性](#功能特性)
- [环境要求](#环境要求)
- [安装](#安装)
- [快速开始](#快速开始)
- [能力清单](#能力清单)
  - [一、产品检索与详情读取](#一产品检索与详情读取)
  - [二、订购申请提交](#二订购申请提交)
  - [三、授权状态查询](#三授权状态查询)
  - [四、用量与额度查询](#四用量与额度查询)
  - [五、凭证下载](#五凭证下载)
  - [六、页面便捷方法与看板](#六页面便捷方法与看板)
- [运行示例](#运行示例)
- [错误处理](#错误处理)
- [配置项参考](#配置项参考)
- [类型定义索引](#类型定义索引)

---

## 功能特性

- **产品检索**：按行业、标签、关键字、价格区间多维度筛选，支持分类浏览与热门标签
- **详情读取**：完整的产品信息、合规等级、价格方案口径、可用 API 接口清单
- **订购申请**：支持多场景用途说明、使用方信息登记、附件上传与紧急度标记
- **授权状态**：实时审批进度、到期提前提醒、批量授权有效性校验
- **用量查询**：总额度与剩余额度、接口维度分布、QPS 限流状态、每日调用曲线
- **凭证下载**：多格式导出（JSON/YAML/ENV/INI），附带多语言示例代码

---

## 环境要求

- Node.js >= 16.0.0
- TypeScript >= 4.9（使用 TS 时）
- 平台颁发的 appKey / appSecret（在数据要素流通平台控制台「应用管理」中申请）

---

## 安装

```bash
# 使用 npm
npm install data-element-circulation-sdk

# 或 pnpm
pnpm add data-element-circulation-sdk

# 本地源码安装（从当前仓库构建）
npm install
npm run build
```

---

## 快速开始

```typescript
import { DataElementClient, Industry, isSdkError, ErrorCode } from 'data-element-circulation-sdk';

// 1. 初始化客户端
const sdk = new DataElementClient({
  baseUrl: 'https://data-circulation.example.com',
  appKey: 'YOUR_APP_KEY',
  appSecret: 'YOUR_APP_SECRET',
  timeout: 30000,
  retryTimes: 2,
  debug: false
});

// 2. 检索金融行业数据产品
async function example() {
  try {
    const result = await sdk.products.searchProducts(
      { industry: Industry.FINANCE, tags: ['基础信息'] },
      { pageNum: 1, pageSize: 10 }
    );
    console.log(`共找到 ${result.total} 个产品`);
  } catch (err) {
    if (isSdkError(err)) {
      console.error(`[${err.code}] ${err.message}, requestId=${err.requestId}`);
      if (err.code === ErrorCode.AUTH_FAILED) {
        /* 重新获取凭据 */
      }
    }
  } finally {
    sdk.destroy();
  }
}
```

> 💡 **最佳实践**：客户端实例应作为单例在应用生命周期内复用，避免重复创建销毁造成连接资源浪费。

---

## 能力清单

### 一、产品检索与详情读取

SDK 将产品能力封装在 `sdk.products` 命名空间下。

#### 1.1 多条件检索（支持行业/标签筛选）

```typescript
import { Industry } from 'data-element-circulation-sdk';

const page = await sdk.products.searchProducts(
  {
    keyword: '企业工商',
    industry: Industry.FINANCE,           // 行业枚举，见 IndustryMap
    tags: ['注册资本', '股东信息'],       // 标签筛选
    tagLogic: 'and',                      // and:全部命中; or:任一命中
    priceRange: { min: 0, max: 10000 },
    status: 'published'
  },
  { pageNum: 1, pageSize: 20, field: 'orderCount', order: 'desc' }
);

// 返回 PaginationResult<ProductSummary>
// page.total           总数
// page.list[]          产品摘要列表
// page.list[i].industryName / priceUnit / statusName 已自动中文化
```

**行业枚举（`Industry`）**：

| 枚举值 | 中文 | 枚举值 | 中文 |
|---|---|---|---|
| `finance` | 金融 | `manufacturing` | 制造业 |
| `healthcare` | 医疗健康 | `government` | 政务 |
| `education` | 教育 | `retail` | 零售消费 |
| `transportation` | 交通出行 | `telecom` | 通信 |
| `energy` | 能源 | `agriculture` | 农业 |
| `logistics` | 物流 | `realestate` | 房地产 |

#### 1.2 读取产品详情（含价格口径与接口清单）

```typescript
const detail = await sdk.products.getProductDetail('PROD_001');

// 价格方案
detail.pricePlans.forEach(plan => {
  // plan.name        方案名称
  // plan.price       价格（元）
  // plan.unit        价格单位: times/month/year/dataset/rows/gb
  // plan.quota       额度
  // plan.features    包含功能点
});

// 合规信息
detail.complianceInfo.dataSecurityLevel;   // public/internal/sensitive/confidential
detail.complianceInfo.certification;       // 已获取的合规认证列表

// 接口清单
detail.interfaceList.forEach(api => {
  // api.method, api.path, api.description
  // api.requestParams[], api.responseParams[]
  // api.qps, api.latency
});
```

#### 1.3 辅助接口

```typescript
// 分类树
const tree = await sdk.products.getCategories();

// 行业热门标签
const tags = await sdk.products.getHotTags(20, Industry.FINANCE);

// 相似产品推荐
const similar = await sdk.products.getSimilarProducts('PROD_001', 10);

// 个性化推荐
const rec = await sdk.products.getRecommendedProducts(10, Industry.HEALTHCARE);

// 只取接口清单（比详情更轻量）
const apis = await sdk.products.getProductInterfaces('PROD_001');

// 批量获取产品
const details = await sdk.products.getProductBatch(['PROD_001', 'PROD_002']);
```

---

### 二、订购申请提交

能力位于 `sdk.orders` 命名空间。

#### 2.1 提交订购申请（用途说明 + 使用方信息）

```typescript
const order = await sdk.orders.createOrder({
  productId: 'PROD_001',
  pricePlanId: 'PLAN_MONTHLY_1000',
  quantity: 1,

  // 使用方信息
  applicant: {
    userId: 'u_10086',
    userName: '张三',
    department: '风险管理部',
    phone: '138****8888',
    email: 'zhangsan@company.com',
    companyName: '某某科技有限公司',
    unifiedSocialCreditCode: '91310000MA1K3XXXX',   // 统一社会信用代码
    businessLicenseUrl: 'https://cdn.example.com/license.pdf'
  },

  // 使用场景（可多条）
  usageScenarios: [
    {
      scenarioType: 'risk_control',          // report/analysis/model_training/business_system/risk_control/marketing/other
      scenarioName: '贷前准入风控',
      description: '在信贷业务贷前审批环节，核验申请企业工商注册信息及经营状态。',
      systemName: '智能风控平台',
      systemUrl: 'https://risk.company.com',
      dataHandlingMethod: 'api',            // api/bulk_download/dashboard/other
      storageLocation: '内部私有云（华北节点）',
      retentionPeriod: 30                   // 数据保留天数
    }
  ],

  // 用途说明（≥10 字）
  dataPurpose: '用于小微企业信贷业务贷前准入环节的企业主体信息核验，提升风险识别准确性。',
  isInternalUse: true,
  relatedProjects: ['PRJ-2024-001'],

  urgencyLevel: 'urgent',                    // normal/urgent/emergency
  expectedStartDate: '2024-01-01',
  expectedEndDate: '2024-12-31',
  remarks: '项目紧急，请尽快审批',
  attachFiles: [{ fileName: '需求说明.pdf', fileUrl: 'https://...' }]
});

// order.id / order.orderNo      订单 ID 与编号
// order.status / statusName     当前状态
// order.approvalFlow[]          审批流节点
```

> ⚠️ **校验规则**：SDK 会在请求发出前做参数合法性校验（用途说明 ≥ 10 字、日期先后关系、必填项等），失败会抛出 `PARAM_INVALID` / `PARAM_MISSING` 错误。

#### 2.2 审批进度查询 & 取消未处理申请

```typescript
// 实时查看审批节点完成情况
const progress = await sdk.orders.getApprovalProgress('ORD_001');
progress.approvalFlow.forEach(node => {
  // node.step            步骤序号
  // node.role            审批角色
  // node.status          pending/in_progress/approved/rejected
  // node.approverName    审批人
  // node.opinion         意见
});

// 取消仍处于「待审核 / 审核中」的申请
const result = await sdk.orders.cancelOrder({
  orderId: 'ORD_001',
  reason: '需求变更，稍后重新申请',
  operatorId: 'u_10086',
  operatorName: '张三'
});
// result.success / result.message / result.newStatus
```

#### 2.3 列表 / 批量查询

```typescript
const list = await sdk.orders.listOrders(
  {
    status: ['reviewing', 'approved'],       // 可传数组
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    keyword: '风控'
  },
  { pageNum: 1, pageSize: 20 }
);

// 按订单号精确查询
const byNo = await sdk.orders.getOrderByNo('DE-20240101-00001');

// 批量按 ID
const batch = await sdk.orders.batchGetOrders(['ORD_001', 'ORD_002']);
```

---

### 三、授权状态查询

能力位于 `sdk.authorizations` 命名空间。

#### 3.1 授权列表与状态

```typescript
const page = await sdk.authorizations.listAuthorizations(
  {
    status: 'active',                         // 或数组
    expiresWithinDays: 30,                    // 只看 N 天内到期的
    productId: 'PROD_001'
  },
  { pageSize: 50 }
);

const auth = page.list[0];
// auth.status / statusName        active/pending/expiring/expired/suspended/revoked
// auth.credentials[]              凭证（appKey/accessToken/gatewayUrl 等）
// auth.enabledInterfaces[]        启用的接口
// auth.daysRemaining              剩余天数

// 快速校验有效性
const status = await sdk.authorizations.checkAuthorizationStatus('AUTH_001');
// status.isValid / status.daysRemaining / status.expiresAt
```

#### 3.2 到期提醒

```typescript
// 拉取未来 N 天内到期的授权及建议
const reminders = await sdk.authorizations.getExpiryReminders(30);
reminders.forEach(r => {
  // r.severity           warning(>7d) / danger(3~7d) / critical(≤3d)
  // r.daysRemaining
  // r.suggestedAction    renew / apply_new / contact_admin
  // r.canRenewOnline     是否可自助在线续费
});

// 全局统计
const stats = await sdk.authorizations.getStatistics();
// stats.total / active / expiring / expired / suspended
```

#### 3.3 可用接口清单

```typescript
const interfaces = await sdk.authorizations.getAuthorizedInterfaces('AUTH_001');
interfaces.forEach(api => {
  // api.isEnabled              是否已启用
  // api.dailyQpsLimit          日 QPS 上限
  // api.monthlyQpsLimit        月 QPS 上限
});
```

---

### 四、用量与额度查询

能力位于 `sdk.usages` 命名空间。

#### 4.1 调用额度检查

```typescript
// 简单版：一步获取额度+告警
const { quota, alerts, isExhausted, isWarning } =
  await sdk.usages.checkAndWarnQuota('AUTH_001');

// quota.totalQuota / quota.usedQuota / quota.remainingQuota
// quota.usagePercentage (%)
// quota.isWarning (>=80%) / quota.isExhausted (100%)

// 仅额度
const q = await sdk.usages.getUsageQuota('AUTH_001');

// 批量查额度
const map = await sdk.usages.batchGetQuota(['AUTH_001', 'AUTH_002']);
map.get('AUTH_001');   // UsageQuota
```

#### 4.2 使用量统计（按天 / 按接口 / 按错误码）

```typescript
const stats = await sdk.usages.getUsageStatistics({
  authorizationId: 'AUTH_001',
  granularity: 'day',                                  // day/week/month
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  groupBy: 'interface'                                 // day/interface/error
});

// stats.totalCalls / stats.totalErrors / stats.totalSuccessRate
// stats.avgLatencyMs
// stats.dailyRecords[]                每日明细
// stats.interfaceBreakdown[]          按接口分布（需 groupBy=interface）
// stats.errorBreakdown[]              按错误码分布（需 groupBy=error）

// 单独查每日曲线 / 接口 TopN
const daily = await sdk.usages.getDailyRecords('AUTH_001', '2024-01-01', '2024-01-31');
const topN = await sdk.usages.getInterfaceBreakdown('AUTH_001');
```

#### 4.3 限流状态与告警

```typescript
const limits = await sdk.usages.getRateLimitInfo('AUTH_001');
limits.forEach(rl => {
  // rl.limitType        qps / daily / monthly
  // rl.currentValue / rl.limitValue / rl.remainingValue
  // rl.resetAt          重置时间点（日/月维度）
});

const alerts = await sdk.usages.getQuotaAlerts('AUTH_001', true);
// 仅活跃告警；类型：threshold（阈值）/ exhausted（耗尽）/ rate_limit（限流）
```

---

### 五、凭证下载

能力位于 `sdk.authorizations` 命名空间，与授权属同一业务域。

#### 5.1 内存中获取凭证内容

```typescript
const result = await sdk.authorizations.downloadCredential({
  authorizationId: 'AUTH_001',
  credentialId: 'CRED_001',                    // 可选，多凭证时指定
  format: 'json',                              // json / yaml / ini / env / pdf
  includeSampleCode: true,                     // 附带多语言示例代码
  sampleCodeLanguages: ['nodejs', 'python', 'java', 'go', 'csharp']
});

// result.fileName
// result.fileContent        字符串形式的文件内容
// result.contentType
// result.fileSize           字节数
```

#### 5.2 直接落盘到本地文件

```typescript
const saved = await sdk.authorizations.downloadCredentialToFile(
  {
    authorizationId: 'AUTH_001',
    format: 'env',
    includeSampleCode: false
  },
  '/path/to/save'                              // 传目录则按默认文件名存入
);
// saved.filePath / saved.fileName / saved.fileSize
```

**导出格式说明**：

| 格式 | 适用场景 | 示例片段 |
|---|---|---|
| `json` | 程序读取、自动化配置 | `{ "appKey": "...", "gatewayUrl": "..." }` |
| `yaml` | 运维脚本、K8s ConfigMap | `sdk:\n  appKey: ...` |
| `env` | 进程环境变量 | `DE_APP_KEY=...\nDE_GATEWAY=...` |
| `ini` | 传统应用配置 | `[sdk]\napp_key = ...` |
| `pdf` | 合规存档、审批附件 | 含水印与签名的正式凭证 |

> ⚠️ **写入安全性**：`downloadCredentialToFile` 采用「先完整下载并校验内容 → 再写文件」的两阶段流程。服务端返回 4xx/5xx、凭证为空、授权过期/暂停、目录创建失败、文件写入失败等任何异常**均不会留下残留或空文件**，调用方只需按 `isSdkError(err)` 分支处理即可。

```typescript
import { isSdkError, ErrorCode, CredentialFormat, SampleCodeLanguage } from 'data-element-circulation-sdk';

// 用法 1：传目录，按默认文件名自动写入（推荐批量归档）
try {
  const saved = await sdk.authorizations.downloadCredentialToFile(
    {
      authorizationId: 'AUTH_001',
      format: CredentialFormat.JSON,
      includeSampleCode: true,
      sampleCodeLanguages: [SampleCodeLanguage.NODEJS, SampleCodeLanguage.PYTHON]
    },
    './credentials'   // 目录不存在会自动创建
  );
  console.log(`已保存到 ${saved.filePath}, ${saved.fileSize} 字节`);
} catch (err) {
  if (isSdkError(err)) {
    switch (err.code) {
      case ErrorCode.AUTHORIZATION_NOT_FOUND:
        console.log('授权不存在，请确认 ID');
        break;
      case ErrorCode.CREDENTIAL_NOT_FOUND:
        console.log('凭证尚未生成，通常是授权仍待生效，请稍后再试');
        break;
      case ErrorCode.AUTHORIZATION_SUSPENDED:
      case ErrorCode.AUTHORIZATION_EXPIRED:
        console.log('授权已暂停或过期，无法下载');
        break;
      default:
        console.log(`下载失败 [${err.code}]: ${err.message}`);
    }
  }
}

// 用法 2：传完整文件路径（精确控制文件名）
const saved = await sdk.authorizations.downloadCredentialToFile(
  { authorizationId: 'AUTH_001', format: CredentialFormat.ENV, includeSampleCode: false },
  './config/.env.data-element'
);
```

---

## 六、页面便捷方法与看板

### 6.1 产品检索：页面表单一键查询

面向内部页面的筛选表单，直接把前端输入塞进 `searchFromPageForm` 即可，SDK 会把逗号分隔的标签字符串、价格区间、分页排序等统一转换为底层参数。

```typescript
import { Industry, ProductStatus } from 'data-element-circulation-sdk';

const page = await sdk.products.searchFromPageForm({
  keyword: '企业工商',                       // 搜索框
  industry: Industry.FINANCE,                // 行业下拉（或直接传 'finance' 字符串）
  tags: '基础信息, 注册资本',                // 标签文本框（英文/中文逗号或空格分隔，自动拆分）
  tagLogic: 'or',
  minPrice: 0,                               // 价格区间
  maxPrice: 10000,
  status: ProductStatus.PUBLISHED,
  pageNum: 1,
  pageSize: 20,
  sortBy: 'orderCount',                      // orderCount | minPrice | rating | publishedAt | viewCount
  sortOrder: 'desc'
});
```

对应接口类型：`ProductSearchForm`。

### 6.2 订购申请：直接提交页面表单

`submitFromPageForm` 内置字段级校验，失败时通过 `validationErrors` 返回每个字段的中文提示，页面可以直接在输入框下方显示：

```typescript
import {
  UrgencyLevel, ScenarioType, DataHandlingMethod,
  isSdkError, ErrorCode
} from 'data-element-circulation-sdk';

try {
  const order = await sdk.orders.submitFromPageForm({
    productId: 'PROD_001',
    pricePlanId: 'PLAN_001',
    quantity: 1,
    applicant: {
      userId: 'u_10086',
      userName: '张三',
      department: '风险管理部',
      phone: '138-1234-5678',
      email: 'zhangsan@company.com',
      companyName: '某某科技有限公司',
      unifiedSocialCreditCode: '91310000MA1K3XXXX'
    },
    scenarios: [
      {
        scenarioType: ScenarioType.RISK_CONTROL,
        scenarioName: '贷前准入风控',
        description: '在信贷业务贷前审批环节，核验申请企业工商注册信息及经营状态……',
        systemName: '智能风控平台',
        systemUrl: 'https://risk.company.com',
        dataHandlingMethod: DataHandlingMethod.API,
        storageLocation: '内部私有云（华北节点）',
        retentionPeriod: 30
      }
    ],
    dataPurpose: '用于小微企业信贷业务贷前准入环节的企业主体信息核验，提升风险识别准确性……',
    isInternalUse: true,
    urgencyLevel: UrgencyLevel.URGENT,
    expectedStartDate: '2024-01-01',
    expectedEndDate: '2024-12-31'
  });
  console.log(`申请已提交，订单号 ${order.orderNo}`);
} catch (err) {
  if (isSdkError(err) && err.code === ErrorCode.PARAM_INVALID) {
    // 页面可遍历 validationErrors 给对应输入框展示错误
    for (const ve of err.validationErrors!) {
      console.log(`${ve.field}: ${ve.message}`);
    }
  }
}
```

已内置的校验规则：
- 申请人 `userId / userName / department` 为必填
- 手机号、邮箱格式校验（存在时校验）
- 场景 `scenarioType / description` 必填，描述 ≥ 10 字
- 数据保留天数 0~3650
- `dataPurpose` 用途说明 ≥ 10 字
- 订购数量为正整数
- 开始日期 ≤ 结束日期
- `isInternalUse` 必须显式声明

### 6.3 首页聚合看板：一次性拉取所有概览数据

给业务系统首页或个人中心提供聚合接口，一次调用返回：授权汇总、生效中授权（含剩余额度与可用接口数、到期提醒、告警数。

> 🛡️ **使用方数据隔离：`getUsageDashboard` 支持传 `userId / userName / department` 作为过滤条件，内部把使用方维度分别传给 listAuthorizations、getStatistics、getExpiryReminders 三个 API 的参数，服务端按使用方返回数据，不同使用方看到各自首页看板互不混在一起。返回的 `dashboard.filter` 字段回显本次调用的过滤条件，便于页面显示"当前查看人校验和调试时核对。

```typescript
// 张三登录后的首页：传 userId 保证只看到张三自己的授权
const dashboardForZhangsan = await sdk.authorizations.getUsageDashboard({
  userId: 'u_10086',
  userName: '张三',
  daysWithin: 30,
  includeAlerts: true
});
// dashboardForZhangsan.filter → { applicantUserId: 'u_10086', applicantUserName: '张三' }
// 李四的看板（不同 userId 得到的 activeCount / totalInterfaceCount 完全独立
const dashboardForLisi = await sdk.authorizations.getUsageDashboard({
  userId: 'u_20001',
  department: '市场营销部'
});

// 不传 userId 时拉取当前调用方可查看的所有授权（管理员或全局视角
const globalDashboard = await sdk.authorizations.getUsageDashboard({
  daysWithin: 30,
  includeAlerts: true
});

// dashboard.summary.totalAuthorizations / activeCount / expiringCount / expiredCount / suspendedCount
// dashboard.summary.totalInterfaceCount    // 可用接口总数（各授权已启用接口之和）
// dashboard.summary.alertsCount            // 额度告警 + 高优先级到期提醒合计

// dashboard.effectiveAuthorizations[]      // 每个授权一行，方便直接渲染列表
//   · authorizationId / productName / statusName / daysRemaining
//   · enabledInterfaceCount                // 已启用接口数
//   · quotaTotal / quotaUsed / quotaRemaining / quotaUnit / quotaUsagePercentage

// dashboard.expiringReminders[]            // 到期提醒（已按严重等级填充 severity）
// dashboard.generatedAt                // 本次看板生成时间
```

---

## 运行示例

```bash
# 方式一：仅做类型检查（不发请求，适合接入前验证常量导入是否正常）
npm run example:check

# 方式二：运行完整示例（会按 baseUrl 发请求，可先用默认的 mock baseUrl 观察日志结构）
npm run example

# 方式三：带上真实环境变量
$env:DE_BASE_URL="https://data-circulation.example.com"
$env:DE_APP_KEY="your_app_key"
$env:DE_APP_SECRET="your_app_secret"
npm run example
```

> 🎯 示例特点：所有行业、订单状态、紧急度、凭证格式等常量均通过 `Industry`、`OrderStatus`、`UrgencyLevel`、`CredentialFormat`、`SampleCodeLanguage` 等枚举点号访问，无需手写字符串，完全避免拼写错误；并覆盖了产品检索、订购申请、授权看板、凭证下载两种保存方式、凭证下载错误处理等完整接入场景。

---

## 错误处理

SDK 所有错误均抛出 `DataElementSdkError` 实例，可通过 `isSdkError(err)` 进行类型收窄：

```typescript
import { isSdkError, ErrorCode, ErrorMessage } from 'data-element-circulation-sdk';

try {
  await sdk.products.getProductDetail('NOT_EXIST');
} catch (err) {
  if (isSdkError(err)) {
    console.error(`错误码: ${err.code}`);                // SDK 标准错误码（ErrorCode 枚举）
    console.error(`平台原始码: ${err.platformCode}`);    // 平台返回的原始业务码（如 50003、40402）
    console.error(`错误信息: ${err.message}`);
    console.error(`请求ID: ${err.requestId}`);             // 平台链路追踪 ID，排查问题必备
    console.error(`HTTP码: ${err.httpStatus}`);
    console.error(`校验细节: ${err.validationErrors}`);  // 参数不合法时

    // 推荐基于「平台原始码分支（更贴近平台侧的分支：
    switch (err.platformCode) {
      case 50003: /* 订单已处理 */ break;
      case 40402: /* 产品不存在 */ break;
    }
    // 或者按 SDK 标准错误码分支：
    if (err.code === ErrorCode.PRODUCT_NOT_FOUND) {
      console.log(`requestId: ${err.requestId}，请拿着这个找平台运营确认是否被下架`);
    }
    if (err.code === ErrorCode.ORDER_ALREADY_PROCESSED) { /* 隐藏取消按钮 */ }
    if (err.code === ErrorCode.ORDER_CANNOT_CANCEL) { ... }
    if (err.code === ErrorCode.QUOTA_EXCEEDED) { ... }
    if (err.code === ErrorCode.AUTH_EXPIRED) { ... }
    if (err.code === ErrorCode.SDK_TIMEOUT) { /* 重试或放大超时 */ }
  } else {
    // 非 SDK 预期错误（如语法错误）
  }
}
```

> 🔑 **关键约定**：无论 HTTP 状态码是 200、404 还是 500，只要响应体符合平台标准格式 `{ code, message, requestId, data }` 且 `code != 0`，SDK **优先按 body 里的业务码抛出错误**，并把平台原始码挂在 `platformCode` 上，供接入方做更细粒度的分支（取消已处理订单、查询不存在的产品等）。只有当响应体无法解析为标准 JSON 时，才会退化为按 HTTP 状态码映射。

### 凭证下载 · 三种失败场景验收（**失败时不创建任何目录或文件**）：

```typescript
import * as fs from 'fs';
const targetDir = './tmp-credentials';
const targetFile = './credentials/specific-cred.json';

// 场景 1：传不存在的授权 ID → 抛出 AUTHORIZATION_NOT_FOUND → 目录不会被创建
try {
  await sdk.authorizations.downloadCredentialToFile(
    { authorizationId: 'AUTH_NOT_EXIST_XXXX', format: CredentialFormat.JSON },
    targetDir
  );
} catch (e) {
  if (isSdkError(e) && e.code === ErrorCode.AUTHORIZATION_NOT_FOUND) {
    console.log(`✅ 正确抛错，目录未创建: ${!fs.existsSync(targetDir)}`);
  }
}

// 场景 2：授权存在但凭证尚未生成 → 抛出 CREDENTIAL_NOT_FOUND → 文件不会被创建
try {
  await sdk.authorizations.downloadCredentialToFile(
    { authorizationId: 'AUTH_PENDING', format: CredentialFormat.JSON },
    targetFile
  );
} catch (e) {
  if (isSdkError(e) && e.code === ErrorCode.CREDENTIAL_NOT_FOUND) {
    console.log(`✅ 凭证未生成时不写文件: ${!fs.existsSync(targetFile)}`);
  }
}

// 场景 3：服务端返回 5xx 或业务错误 → 抛出 BUSINESS_ERROR → 不创建任何路径
try {
  await sdk.authorizations.downloadCredentialToFile({ authorizationId: 'AUTH_001' }, targetDir);
} catch (e) {
  if (isSdkError(e)) {
    console.log(`[${e.code}] ${e.message}，requestId=${e.requestId}`);
    console.log(`✅ 服务端失败不留下任何残留: ${!fs.existsSync(targetDir)}`);
  }
}
```

**核心错误码速查**（详见 `ErrorCode` 枚举定义）：

| 错误码 | 含义 | 处理建议 |
|---|---|---|
| `40001 / 40002` | 参数不合法 / 缺失 | 检查传入字段，参考 `validationErrors` |
| `40101 ~ 40103` | 认证失败 / 过期 | 核对 appKey/appSecret；刷新令牌 |
| `40301` | 无权限 | 确认订购状态或联系产品提供方 |
| `40401 ~ 40404` | 资源不存在 | 检查 ID 是否正确 |
| `42901 / 42902` | 额度用尽 / 限流 | 扩容 / 降低调用频率 |
| `50002` | 订单不可取消 | 只允许「待审核 / 审核中」状态取消 |
| `50004 / 50005` | 授权过期 / 暂停 | 续费 / 联系管理员解除 |
| `60001 ~ 60005` | SDK 内部错误 | 检查配置、网络、或升级 SDK 版本 |

---

## 配置项参考

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `baseUrl` | `string` | ✅ | - | 平台网关地址，如 `https://data.example.com` |
| `appKey` | `string` | ✅ | - | 在控制台申请的应用 Key |
| `appSecret` | `string` | ✅ | - | 应用密钥（请勿提交到代码仓库） |
| `timeout` | `number` | - | `30000` | 单次请求超时时间（毫秒） |
| `retryTimes` | `number` | - | `2` | 网络错误自动重试次数（指数退避） |
| `retryDelay` | `number` | - | `500` | 首次重试延迟基数（毫秒） |
| `enableSignature` | `boolean` | - | `true` | 是否启用请求签名 |
| `signatureAlgorithm` | `HMAC-SHA256 \| MD5` | - | `HMAC-SHA256` | 签名算法 |
| `debug` | `boolean` | - | `false` | 打印调试日志 |
| `logger` | `Function` | - | - | 自定义日志，覆盖默认 `console` |
| `customHeaders` | `Record<string,string>` | - | `{}` | 附加到所有请求的自定义头 |
| `proxy` | `{ host, port, auth? }` | - | - | HTTP 代理配置 |

**运行时动态更新配置**：

```typescript
sdk.updateConfig({
  timeout: 60000,
  customHeaders: { 'X-Forwarded-User': 'user@corp.com' }
});
```

---

## 类型定义索引

所有类型通过顶层入口导出，可直接引用：

| 能力域 | 核心类型 |
|---|---|
| 通用 | `PaginationResult`, `PageRequest`, `ApiResponse<T>` |
| 产品 | `ProductSummary`, `ProductDetail`, `ProductFilterParams`, `ProductSearchForm`, `PricePlan`, `ProductInterface`, `CategoryTreeNode` |
| 产品枚举 | `Industry`, `ProductStatus`, `PriceUnit` (+ 对应 `*Map` 中文映射) |
| 订购 | `CreateOrderRequest`, `SubmitOrderFormData`, `OrderDetail`, `OrderApplicant`, `UsageScenario`, `ApprovalNode`, `CancelOrderRequest` |
| 订购枚举 | `OrderStatus`, `UrgencyLevel`, `ScenarioType`, `DataHandlingMethod` (+ 对应 `*Map`) |
| 授权 | `AuthorizationDetail`, `AuthorizationCredential`, `ExpiryReminder`, `CredentialDownloadRequest`, `CredentialDownloadResult`, `AuthorizedInterface`, `UsageDashboardOverview` |
| 授权枚举 | `AuthorizationStatus`, `CredentialFormat`, `SampleCodeLanguage` (+ 对应 `*Map`) |
| 用量 | `UsageQuota`, `UsageStatistics`, `DailyUsageRecord`, `InterfaceUsage`, `RateLimitInfo`, `QuotaAlert` |
| 错误 | `ErrorCode`, `ErrorMessage`, `SdkError`, `ValidationError` |
| 配置 | `SdkConfig`, `RequestOptions` |

---

## License

MIT
