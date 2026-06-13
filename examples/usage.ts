import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  DataElementClient,
  DataElementSdkError,
  isSdkError,
  ErrorCode,
  Industry,
  OrderStatus,
  ProductStatus,
  UrgencyLevel,
  ScenarioType,
  DataHandlingMethod,
  AuthorizationStatus,
  CredentialFormat,
  SampleCodeLanguage
} from '../src';

const TMP_DIR = path.join(os.tmpdir(), 'de-sdk-demo');
const TMP_FILE = path.join(TMP_DIR, 'custom-credential-file.json');
const TMP_DIR2 = path.join(TMP_DIR, 'as-dir');

function logSection(title: string) {
  const bar = '='.repeat(Math.max(0, 60 - title.length));
  console.log(`\n===== ${title} ${bar}`);
}

async function main() {
  logSection('初始化 SDK');

  const sdk = new DataElementClient({
    baseUrl: process.env.DE_BASE_URL || 'https://data-circulation.example.com',
    appKey: process.env.DE_APP_KEY || 'your_app_key_here',
    appSecret: process.env.DE_APP_SECRET || 'your_app_secret_here',
    timeout: 30000,
    retryTimes: 1,
    debug: false,
    logger: (level, msg) => {
      if (level === 'error') {
        console.error(`[SDK/${level.toUpperCase()}] ${msg}`);
      }
    }
  });

  try {
    console.log(`Industry 常量可用: 金融=${Industry.FINANCE}, 医疗=${Industry.HEALTHCARE}`);
    console.log(`OrderStatus 常量可用: 已通过=${OrderStatus.APPROVED}, 审核中=${OrderStatus.REVIEWING}`);
    console.log(`ProductStatus 常量可用: 已发布=${ProductStatus.PUBLISHED}`);
    console.log(`AuthorizationStatus 常量可用: 已生效=${AuthorizationStatus.ACTIVE}`);
    console.log(`UrgencyLevel 常量可用: 紧急=${UrgencyLevel.URGENT}`);
    console.log(`ScenarioType 常量可用: 风控=${ScenarioType.RISK_CONTROL}`);
    console.log(`DataHandlingMethod 常量可用: API=${DataHandlingMethod.API}`);
    console.log(`CredentialFormat 常量可用: JSON=${CredentialFormat.JSON}, ENV=${CredentialFormat.ENV}`);
    console.log(`SampleCodeLanguage 常量可用: Node.js=${SampleCodeLanguage.NODEJS}`);
    console.log('✅ 所有枚举/常量均已正常导入并可点号访问');

    logSection('【便捷方法】产品检索 - 页面表单一键查询');

    const pageFormResult = await sdk.products.searchFromPageForm({
      keyword: '企业工商',
      industry: Industry.FINANCE,
      tags: '基础信息,注册资本',
      tagLogic: 'or',
      minPrice: 0,
      maxPrice: 10000,
      status: ProductStatus.PUBLISHED,
      pageNum: 1,
      pageSize: 10,
      sortBy: 'orderCount',
      sortOrder: 'desc'
    });
    console.log(`共找到 ${pageFormResult.total} 个产品，当前页 ${pageFormResult.list.length} 个`);
    pageFormResult.list.slice(0, 3).forEach((p, i) => {
      console.log(`  ${i + 1}. [${p.industryName}] ${p.name}`);
      console.log(`     ￥${p.minPrice}/${p.priceUnit} | 状态:${p.statusName} | 订购:${p.orderCount}`);
    });

    let firstProductId: string | null = null;
    let firstPricePlanId: string | null = null;
    if (pageFormResult.list.length > 0) {
      firstProductId = pageFormResult.list[0].id;

      logSection('产品详情与可用接口');
      const detail = await sdk.products.getProductDetail(firstProductId);
      console.log(`产品: ${detail.name}`);
      console.log(`提供商: ${detail.providerName} | 合规: ${detail.complianceInfo?.dataSecurityLevel ?? '-'}`);
      console.log(`价格方案共 ${detail.pricePlans.length} 个:`);
      detail.pricePlans.forEach(plan => {
        console.log(`  - ${plan.name}: ￥${plan.price}/${plan.unit}, 额度 ${plan.quota}`);
      });
      if (detail.pricePlans.length > 0) firstPricePlanId = detail.pricePlans[0].id;

      const apis = await sdk.products.getProductInterfaces(firstProductId);
      console.log(`可用接口共 ${apis.length} 个`);
      apis.slice(0, 3).forEach((api, i) => {
        console.log(`  ${i + 1}. [${api.method}] ${api.path} - ${api.name}`);
      });
    }

    logSection('【便捷方法】订购申请 - 提交页面表单');
    if (firstProductId && firstPricePlanId) {
      try {
        const order = await sdk.orders.submitFromPageForm({
          productId: firstProductId,
          pricePlanId: firstPricePlanId,
          quantity: 1,
          applicant: {
            userId: 'u_10086',
            userName: '张三',
            department: '风险管理部',
            phone: '138-1234-5678',
            email: 'zhangsan@example.com',
            companyName: '某某科技有限公司',
            unifiedSocialCreditCode: '91310000MA1K3XXXX',
            businessLicenseUrl: 'https://cdn.example.com/license/u_10086.pdf'
          },
          scenarios: [
            {
              scenarioType: ScenarioType.RISK_CONTROL,
              scenarioName: '贷前准入风控',
              description: '在信贷业务贷前审批环节，核验申请企业工商注册信息及经营状态，作为授信决策辅助依据。数据仅用于本系统实时查询，不做二次分发。',
              systemName: '智能风控平台',
              systemUrl: 'https://risk.company.com',
              dataHandlingMethod: DataHandlingMethod.API,
              storageLocation: '内部私有云（华北节点）',
              retentionPeriod: 30
            }
          ],
          dataPurpose: '用于小微企业信贷业务贷前准入环节的企业主体信息核验，提升风险识别准确性，保障信贷资金安全。不用于营销目的，不对外提供给第三方。',
          isInternalUse: true,
          relatedProjects: ['PRJ-2024-001'],
          urgencyLevel: UrgencyLevel.URGENT,
          expectedStartDate: '2024-01-01',
          expectedEndDate: '2024-12-31'
        });
        console.log(`✅ 订购申请提交成功`);
        console.log(`   订单号: ${order.orderNo}`);
        console.log(`   当前状态: ${order.statusName}`);
        console.log(`   审批节点: ${order.currentApprovalStep ?? 0}/${order.approvalFlow?.length ?? 0}`);

        const orderId = order.id;

        logSection('查询审批进度');
        const progress = await sdk.orders.getApprovalProgress(orderId);
        console.log(`状态: ${progress.statusName}`);
        progress.approvalFlow?.forEach((n, i) => {
          console.log(`  节点${i + 1}: ${n.role} [${n.statusName}] ${n.approverName ?? '待处理'}${n.opinion ? ` - ${n.opinion}` : ''}`);
        });

        logSection('取消未处理申请');
        if (progress.status === OrderStatus.PENDING || progress.status === OrderStatus.REVIEWING) {
          try {
            const cancel = await sdk.orders.cancelOrder({
              orderId,
              reason: '需求变更，稍后重新申请',
              operatorId: 'u_10086',
              operatorName: '张三'
            });
            console.log(cancel.success ? `✅ 取消成功: ${cancel.message}` : `❌ 取消失败: ${cancel.message}`);
          } catch (e) {
            if (isSdkError(e) && e.code === ErrorCode.ORDER_CANNOT_CANCEL) {
              console.log(`⚠️  当前状态不可取消: ${e.message}`);
            } else {
              throw e;
            }
          }
        } else {
          console.log(`订单状态为 ${progress.statusName}，不可取消`);
        }
      } catch (e) {
        if (isSdkError(e) && e.code === ErrorCode.PARAM_INVALID) {
          console.log('❌ 订购表单校验失败:');
          (e.validationErrors || []).forEach(ve => {
            console.log(`   - ${ve.field}: ${ve.message}`);
          });
        } else {
          throw e;
        }
      }
    } else {
      console.log('⚠️  未获取到可用产品，跳过订购示例');
    }

    logSection('我的订购列表（按 OrderStatus 枚举筛选）');
    const myOrders = await sdk.orders.listOrders(
      {
        status: [OrderStatus.APPROVED, OrderStatus.REVIEWING],
        startDate: '2024-01-01'
      },
      { pageNum: 1, pageSize: 5 }
    );
    console.log(`共 ${myOrders.total} 条，当前页 ${myOrders.list.length} 条`);
    myOrders.list.forEach(o => {
      console.log(`   ${o.orderNo} | ${o.productName} | ${o.statusName} | ${o.createdAt.slice(0, 10)}`);
    });

    logSection('授权聚合看板（一次性拿到首页所有数据）');
    const dashboard = await sdk.authorizations.getUsageDashboard({ daysWithin: 30 });
    console.log(`生成时间: ${dashboard.generatedAt}`);
    console.log(`统计摘要:`);
    console.log(`  - 总授权数: ${dashboard.summary.totalAuthorizations}`);
    console.log(`  - 生效中:   ${dashboard.summary.activeCount}`);
    console.log(`  - 即将到期: ${dashboard.summary.expiringCount}`);
    console.log(`  - 已过期:   ${dashboard.summary.expiredCount}`);
    console.log(`  - 已暂停:   ${dashboard.summary.suspendedCount}`);
    console.log(`  - 可用接口: ${dashboard.summary.totalInterfaceCount} 个`);
    console.log(`  - 告警数量: ${dashboard.summary.alertsCount} 条`);
    console.log(`即将到期提醒（${dashboard.expiringReminders.length}）:`);
    dashboard.expiringReminders.slice(0, 5).forEach(r => {
      console.log(`  [${r.severity.toUpperCase()}] ${r.productName}: ${r.daysRemaining}天后到期`);
    });
    console.log(`我的授权详情（${dashboard.effectiveAuthorizations.length}）:`);
    dashboard.effectiveAuthorizations.slice(0, 3).forEach(a => {
      console.log(`  · ${a.productName}`);
      console.log(`    状态:${a.statusName} | 接口:${a.enabledInterfaceCount}个 | 剩余:${a.daysRemaining}天`);
      if (a.quotaUnit) {
        console.log(`    额度: ${a.quotaUsed}/${a.quotaTotal} ${a.quotaUnit} (${a.quotaUsagePercentage.toFixed(1)}%)`);
      }
    });

    let demoAuthId: string | null = null;
    if (dashboard.effectiveAuthorizations.length > 0) {
      demoAuthId = dashboard.effectiveAuthorizations[0].authorizationId;

      logSection('授权有效性校验');
      const st = await sdk.authorizations.checkAuthorizationStatus(demoAuthId);
      console.log(`   ${st.statusName} | 有效:${st.isValid} | 剩余:${st.daysRemaining}天`);

      logSection('【用量】调用额度检查');
      const { quota, alerts, isExhausted, isWarning } =
        await sdk.usages.checkAndWarnQuota(demoAuthId);
      console.log(`总额度: ${quota.totalQuota} ${quota.quotaUnit}`);
      console.log(`已使用: ${quota.usedQuota} (${quota.usagePercentage.toFixed(1)}%)`);
      console.log(`剩余  : ${quota.remainingQuota}`);
      console.log(isExhausted ? '❌ 额度已用尽' : isWarning ? '⚠️  用量告警' : '✅ 额度充足');
      if (alerts.length > 0) {
        alerts.slice(0, 3).forEach(a => console.log(`   [${a.level}] ${a.message}`));
      }

      logSection('【用量】QPS/日/月限流状态');
      const rateLimits = await sdk.usages.getRateLimitInfo(demoAuthId);
      if (rateLimits.length === 0) {
        console.log('  无（未配置限流规则）');
      } else {
        rateLimits.forEach(rl => {
          console.log(`   ${rl.interfaceName ?? '全局'} [${rl.limitType}]: ${rl.currentValue}/${rl.limitValue} (剩余 ${rl.remainingValue})`);
        });
      }

      logSection('【凭证下载】场景一：下载到指定目录（自动按默认文件名）');
      try {
        fs.rmSync(TMP_DIR2, { recursive: true, force: true });
        const saved = await sdk.authorizations.downloadCredentialToFile(
          {
            authorizationId: demoAuthId,
            format: CredentialFormat.JSON,
            includeSampleCode: true,
            sampleCodeLanguages: [SampleCodeLanguage.NODEJS, SampleCodeLanguage.PYTHON]
          },
          TMP_DIR2
        );
        console.log(`✅ 目录模式: ${saved.filePath}`);
        console.log(`   文件名: ${saved.fileName} | 文件大小: ${saved.fileSize} 字节`);
        console.log(`   文件存在: ${fs.existsSync(saved.filePath)}`);
      } catch (e) {
        if (isSdkError(e)) {
          switch (e.code) {
            case ErrorCode.AUTHORIZATION_NOT_FOUND:
              console.log('❌ 授权记录不存在（可能 ID 有误或该授权已被撤销）');
              break;
            case ErrorCode.CREDENTIAL_NOT_FOUND:
              console.log('❌ 凭证尚未生成：授权可能待生效，或管理员尚未签发凭证，请稍后再试');
              break;
            case ErrorCode.AUTHORIZATION_SUSPENDED:
              console.log('❌ 授权已暂停，无法下载凭证');
              break;
            case ErrorCode.AUTHORIZATION_EXPIRED:
              console.log('❌ 授权已过期，无法下载凭证，请先续费');
              break;
            case ErrorCode.BUSINESS_ERROR:
              console.log(`❌ 服务端保存失败: ${e.message}`);
              break;
            default:
              console.log(`❌ 下载失败 [${e.code}]: ${e.message}`);
          }
          if (e.requestId) console.log(`   requestId: ${e.requestId}`);
          console.log('   验证：错误发生前不会写入任何文件');
          console.log(`   ${TMP_DIR2} 是否存在: ${fs.existsSync(TMP_DIR2) ? '是' : '否'}`);
        } else {
          throw e;
        }
      }

      logSection('【凭证下载】场景二：下载到「指定完整文件名」');
      try {
        if (fs.existsSync(TMP_FILE)) fs.unlinkSync(TMP_FILE);
        const saved = await sdk.authorizations.downloadCredentialToFile(
          {
            authorizationId: demoAuthId,
            format: CredentialFormat.ENV,
            includeSampleCode: false
          },
          TMP_FILE
        );
        console.log(`✅ 指定文件名模式: ${saved.filePath}`);
        console.log(`   预期文件名: credential_${demoAuthId}.env vs 实际: ${saved.fileName}`);
        console.log(`   文件存在: ${fs.existsSync(saved.filePath)}`);
        console.log(`   文件大小: ${saved.fileSize} 字节`);
        if (fs.existsSync(saved.filePath)) {
          const content = fs.readFileSync(saved.filePath, 'utf8');
          console.log(`   文件前 120 字节: ${JSON.stringify(content.slice(0, 120))}`);
        }
      } catch (e) {
        if (isSdkError(e)) {
          console.log(`❌ 指定文件名下载失败 [${e.code}]: ${e.message}`);
          console.log(`   目标文件存在吗: ${fs.existsSync(TMP_FILE) ? '是（不应该，需检查）' : '否（符合预期）'}`);
        } else {
          throw e;
        }
      }

      logSection('【凭证下载】错误处理校验 - 传不存在的授权 ID');
      try {
        await sdk.authorizations.downloadCredentialToFile(
          {
            authorizationId: 'AUTH_NON_EXISTENT_XXXX',
            format: CredentialFormat.JSON
          },
          path.join(TMP_DIR, 'never-write.json')
        );
        console.log('❌ 异常：本应抛出错误却成功了');
      } catch (e) {
        if (isSdkError(e)) {
          console.log(`✅ 正确抛出错误 [code=${e.code}]: ${e.message}`);
          const badFile = path.join(TMP_DIR, 'never-write.json');
          console.log(`   垃圾文件未被写入: ${!fs.existsSync(badFile)}`);
        } else {
          throw e;
        }
      }
    }

    logSection('分类树 & 热门标签');
    const cats = await sdk.products.getCategories();
    console.log(`分类树: 共 ${cats.length} 个一级分类`);
    cats.slice(0, 5).forEach(c => {
      console.log(`  - ${c.name} (产品数: ${c.productCount ?? 0})`);
    });
    const hot = await sdk.products.getHotTags(10, Industry.FINANCE);
    console.log(`金融行业热门标签: ${hot.map(t => '#' + t.name).join(' ')}`);

    logSection('示例执行完毕，清理临时文件');
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
    console.log(`临时目录 ${TMP_DIR} 已清理`);
    console.log('\n✅ 所有示例场景均通过类型检查并按预期执行');
  } catch (err) {
    logSection('SDK 统一错误处理');
    if (isSdkError(err)) {
      console.error(`错误码: ${err.code}`);
      console.error(`错误信息: ${err.message}`);
      if (err.requestId) console.error(`请求ID: ${err.requestId}`);
      if (err.httpStatus) console.error(`HTTP状态: ${err.httpStatus}`);
      if (err.validationErrors && err.validationErrors.length > 0) {
        console.error(`字段校验错误共 ${err.validationErrors.length} 项:`);
        err.validationErrors.forEach(ve => console.error(`  ${ve.field}: ${ve.message}`));
      }
      switch (err.code) {
        case ErrorCode.AUTH_FAILED:
        case ErrorCode.AUTH_EXPIRED:
          console.error('→ 请检查 appKey/appSecret 是否正确或重新登录获取新令牌');
          break;
        case ErrorCode.QUOTA_EXCEEDED:
          console.error('→ 调用额度已用尽，请申请扩容或续费');
          break;
        case ErrorCode.RATE_LIMITED:
          console.error('→ 请求过于频繁，请降低调用频率');
          break;
        case ErrorCode.SDK_TIMEOUT:
          console.error('→ 网络超时，请检查网络或增大 timeout 配置');
          break;
        default:
          console.error(`→ 参考错误码文档: https://docs.example.com/error-codes#${err.code}`);
      }
      process.exit(1);
    } else {
      console.error('未预期的异常:', err);
      process.exit(2);
    }
  } finally {
    sdk.destroy();
    console.log('\n🛑 SDK 已正确销毁，连接池清理完毕');
  }
}

main().catch(e => {
  console.error('示例执行失败:', e);
  process.exit(3);
});
