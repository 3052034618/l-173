import {
  DataElementClient,
  DataElementSdkError,
  isSdkError,
  ErrorCode,
  Industry,
  OrderStatus
} from '../src';

async function main() {
  const sdk = new DataElementClient({
    baseUrl: 'https://data-circulation.example.com',
    appKey: process.env.DE_APP_KEY || 'your_app_key_here',
    appSecret: process.env.DE_APP_SECRET || 'your_app_secret_here',
    timeout: 30000,
    retryTimes: 2,
    debug: true,
    logger: (level, msg, data) => {
      const ts = new Date().toISOString();
      console.log(`[${ts}] [${level.toUpperCase()}] ${msg}`, data ?? '');
    }
  });

  try {
    console.log('===== 1. 产品检索 - 按行业和标签筛选 =====');
    const searchResult = await sdk.products.searchProducts(
      {
        keyword: '企业工商',
        industry: Industry.FINANCE,
        tags: ['基础信息', '注册资本'],
        tagLogic: 'or',
        status: 'published'
      },
      { pageNum: 1, pageSize: 10, field: 'orderCount', order: 'desc' }
    );
    console.log(`共找到 ${searchResult.total} 个产品，当前页 ${searchResult.list.length} 个`);
    searchResult.list.forEach((p, i) => {
      console.log(`  ${i + 1}. [${p.industryName}] ${p.name} - ￥${p.minPrice}/${p.priceUnit}, 评分: ${p.rating ?? '-'}`);
    });

    if (searchResult.list.length > 0) {
      const firstProductId = searchResult.list[0].id;
      console.log(`\n===== 2. 产品详情读取 =====`);
      const detail = await sdk.products.getProductDetail(firstProductId);
      console.log(`产品名称: ${detail.name}`);
      console.log(`提供商: ${detail.providerName}`);
      console.log(`数据源: ${detail.dataSource}`);
      console.log(`合规等级: ${detail.complianceInfo?.dataSecurityLevel ?? '未设置'}`);
      console.log(`价格方案共 ${detail.pricePlans.length} 个:`);
      detail.pricePlans.forEach(plan => {
        console.log(`  - ${plan.name}: ￥${plan.price} / ${plan.unit}, 额度 ${plan.quota}`);
      });

      console.log(`\n===== 3. 产品可用接口清单 =====`);
      const interfaces = await sdk.products.getProductInterfaces(firstProductId);
      interfaces.forEach((api, i) => {
        console.log(`  ${i + 1}. [${api.method}] ${api.path} - ${api.name}`);
        console.log(`      QPS上限: ${api.qps ?? '-'}, 平均延迟: ${api.latency ?? '-'}ms`);
      });

      console.log(`\n===== 4. 提交订购申请 =====`);
      const selectedPlan = detail.pricePlans[0];
      try {
        const order = await sdk.orders.createOrder({
          productId: detail.id,
          pricePlanId: selectedPlan.id,
          quantity: 1,
          applicant: {
            userId: 'u_10086',
            userName: '张三',
            department: '风险管理部',
            phone: '138****8888',
            email: 'zhangsan@company.com',
            companyName: '某某科技有限公司',
            unifiedSocialCreditCode: '91310000MA1K3XXXX',
            businessLicenseUrl: 'https://cdn.example.com/license/u_10086.pdf'
          },
          usageScenarios: [
            {
              scenarioType: 'risk_control',
              scenarioName: '贷前准入风控',
              description: '在信贷业务贷前审批环节，核验申请企业工商注册信息及经营状态，作为授信决策辅助依据。数据仅用于本系统实时查询，不做二次分发。',
              systemName: '智能风控平台',
              systemUrl: 'https://risk.company.com',
              dataHandlingMethod: 'api',
              storageLocation: '内部私有云（华北节点）',
              retentionPeriod: 30
            }
          ],
          dataPurpose: '用于小微企业信贷业务贷前准入环节的企业主体信息核验，提升风险识别准确性，保障信贷资金安全。不用于营销目的，不对外提供给第三方。',
          isInternalUse: true,
          relatedProjects: ['PRJ-2024-001', 'PRJ-2024-008'],
          remarks: '项目紧急，请尽快审批。',
          urgencyLevel: 'urgent',
          expectedStartDate: new Date().toISOString().slice(0, 10),
          expectedEndDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)
        });
        console.log(`订购申请提交成功，订单号: ${order.orderNo}, 状态: ${order.statusName}`);
        console.log(`审批进度: ${order.currentApprovalStep ?? 0}/${order.approvalFlow?.length ?? 0}`);
        order.approvalFlow?.forEach(node => {
          console.log(`  步骤${node.step} [${node.statusName}]: ${node.role} - ${node.approverName ?? '待指定'}${node.opinion ? `, 意见: ${node.opinion}` : ''}`);
        });

        const orderId = order.id;

        console.log(`\n===== 5. 查询审批进度 =====`);
        const progress = await sdk.orders.getApprovalProgress(orderId);
        console.log(`当前状态: ${progress.statusName}`);
        console.log(`已流转步骤: ${progress.approvalFlow?.filter(n => n.status === 'approved').length ?? 0} 步`);

        console.log(`\n===== 6. 取消未处理申请 =====`);
        if (progress.status === 'pending' || progress.status === 'reviewing') {
          try {
            const cancelResult = await sdk.orders.cancelOrder({
              orderId,
              reason: '需求变更，暂不需要此数据产品，稍后重新申请。',
              operatorId: 'u_10086',
              operatorName: '张三'
            });
            console.log(`取消${cancelResult.success ? '成功' : '失败'}: ${cancelResult.message}`);
          } catch (e) {
            if (isSdkError(e) && e.code === ErrorCode.ORDER_CANNOT_CANCEL) {
              console.log(`当前订单状态不可取消: ${e.message}`);
            } else {
              throw e;
            }
          }
        } else {
          console.log(`订单当前状态为 ${progress.statusName}，不可取消`);
        }
      } catch (e) {
        if (isSdkError(e) && e.code === ErrorCode.PARAM_INVALID) {
          console.log(`订购参数校验失败: ${e.message}`);
          if (e.validationErrors) {
            e.validationErrors.forEach(ve => console.log(`  ${ve.field}: ${ve.message}`));
          }
        } else {
          throw e;
        }
      }
    }

    console.log(`\n===== 7. 我的订购列表 =====`);
    const myOrders = await sdk.orders.listOrders(
      {
        status: [OrderStatus.APPROVED, OrderStatus.REVIEWING],
        startDate: '2024-01-01'
      },
      { pageNum: 1, pageSize: 20 }
    );
    console.log(`共 ${myOrders.total} 条申请`);
    myOrders.list.forEach(o => {
      console.log(`  ${o.orderNo} | ${o.productName} | ${o.statusName} | 提交: ${o.createdAt.slice(0, 10)}`);
    });

    console.log(`\n===== 8. 授权列表 & 到期提醒 =====`);
    const [authList, reminders] = await Promise.all([
      sdk.authorizations.listAuthorizations({ expiresWithinDays: 90 }, { pageSize: 50 }),
      sdk.authorizations.getExpiryReminders(30)
    ]);
    console.log(`有效授权数: ${authList.total}, 30天内到期的有 ${reminders.length} 个`);
    reminders.forEach(r => {
      console.log(`  [${r.severity.toUpperCase()}] ${r.productName}: 还有 ${r.daysRemaining} 天到期 (${r.expiresAt.slice(0, 10)})`);
      console.log(`      建议: ${r.suggestedAction === 'renew' ? '在线续费' : r.suggestedAction === 'apply_new' ? '重新申请' : '联系管理员'}`);
    });

    if (authList.list.length > 0) {
      const auth = authList.list[0];

      console.log(`\n===== 9. 拉取可用接口清单 =====`);
      const authorizedIfs = await sdk.authorizations.getAuthorizedInterfaces(auth.id);
      console.log(`产品 "${auth.productName}" 授权接口共 ${authorizedIfs.length} 个:`);
      authorizedIfs.forEach(api => {
        console.log(`  ${api.isEnabled ? '✓' : '✗'} [${api.method}] ${api.path} - ${api.name}`);
        if (api.dailyQpsLimit) console.log(`      日QPS限制: ${api.dailyQpsLimit}, 月QPS限制: ${api.monthlyQpsLimit ?? '-'}`);
      });

      console.log(`\n===== 10. 检查调用额度 & 使用量统计 =====`);
      const { quota, alerts } = await sdk.usages.checkAndWarnQuota(auth.id);
      console.log(`总额度: ${quota.totalQuota} ${quota.quotaUnit}`);
      console.log(`已使用: ${quota.usedQuota} (${quota.usagePercentage.toFixed(1)}%)`);
      console.log(`剩余:   ${quota.remainingQuota}`);
      if (quota.isExhausted) {
        console.log('⚠️  额度已用尽！');
      } else if (quota.isWarning) {
        console.log(`⚠️  用量超过阈值 ${quota.warningThreshold}%，请关注`);
      }
      if (alerts.length > 0) {
        console.log(`额度告警 ${alerts.length} 条:`);
        alerts.forEach(a => console.log(`  [${a.level}] ${a.message} @ ${a.triggeredAt}`));
      }

      const today = new Date();
      const stats = await sdk.usages.getUsageStatistics({
        authorizationId: auth.id,
        granularity: 'day',
        startDate: new Date(today.getTime() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        endDate: today.toISOString().slice(0, 10),
        groupBy: 'interface'
      });
      console.log(`\n近30天调用总览:`);
      console.log(`  总调用: ${stats.totalCalls}, 错误: ${stats.totalErrors}, 成功率: ${stats.totalSuccessRate.toFixed(2)}%`);
      if (stats.avgLatencyMs) console.log(`  平均延迟: ${stats.avgLatencyMs}ms`);
      if (stats.interfaceBreakdown && stats.interfaceBreakdown.length > 0) {
        console.log(`  按接口分布:`);
        stats.interfaceBreakdown.slice(0, 3).forEach(ib => {
          console.log(`    ${ib.interfaceName}: ${ib.callCount}次 (${ib.percentage.toFixed(1)}%), 成功率 ${ib.successRate.toFixed(2)}%`);
        });
      }

      console.log(`\n===== 11. 限流状态检查 =====`);
      const rateLimits = await sdk.usages.getRateLimitInfo(auth.id);
      rateLimits.forEach(rl => {
        console.log(`  ${rl.interfaceName ?? '全局'} [${rl.limitType}]: ${rl.currentValue}/${rl.limitValue} (剩余 ${rl.remainingValue})`);
      });

      console.log(`\n===== 12. 下载授权凭证 =====`);
      try {
        const saved = await sdk.authorizations.downloadCredentialToFile(
          {
            authorizationId: auth.id,
            format: 'json',
            includeSampleCode: true,
            sampleCodeLanguages: ['nodejs', 'python']
          },
          './tmp'
        );
        console.log(`凭证已保存至: ${saved.filePath} (${saved.fileSize} 字节)`);
      } catch (e) {
        if (isSdkError(e) && e.code === ErrorCode.AUTHORIZATION_NOT_FOUND) {
          console.log('授权不存在或凭证尚未生成');
        } else if (isSdkError(e) && e.code === ErrorCode.CREDENTIAL_NOT_FOUND) {
          console.log('凭证尚未生成，请稍后再试');
        } else {
          throw e;
        }
      }

      console.log(`\n===== 13. 授权有效性校验 =====`);
      const status = await sdk.authorizations.checkAuthorizationStatus(auth.id);
      console.log(`授权ID: ${status.authorizationId}`);
      console.log(`状态: ${status.statusName}, 是否有效: ${status.isValid ? '是' : '否'}`);
      console.log(`到期日: ${status.expiresAt.slice(0, 10)}, 剩余天数: ${status.daysRemaining}`);
    }

    console.log(`\n===== 14. 批量工具示例 =====`);
    const categories = await sdk.products.getCategories();
    const printCategory = (nodes: any[], depth = 0) => {
      for (const node of nodes) {
        console.log(`${'  '.repeat(depth)}├ ${node.name} (产品数: ${node.productCount ?? 0})`);
        if (node.children) printCategory(node.children, depth + 1);
      }
    };
    console.log('分类树:');
    printCategory(categories);

    console.log('\n热门标签:');
    const hotTags = await sdk.products.getHotTags(10, Industry.FINANCE);
    hotTags.forEach(t => console.log(`  #${t.name}${t.category ? ` [${t.category}]` : ''}`));
  } catch (err) {
    if (isSdkError(err)) {
      console.error(`\n===== SDK 错误处理示例 =====`);
      console.error(`错误码: ${err.code}`);
      console.error(`错误信息: ${err.message}`);
      if (err.requestId) console.error(`请求ID: ${err.requestId}`);
      if (err.httpStatus) console.error(`HTTP状态: ${err.httpStatus}`);
      if (err.validationErrors && err.validationErrors.length > 0) {
        console.error(`字段校验错误:`);
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
    console.log('\nSDK 已清理');
  }
}

main().catch(e => {
  console.error('示例执行失败:', e);
  process.exit(3);
});
