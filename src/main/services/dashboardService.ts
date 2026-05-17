import { translate } from '../../shared/i18n.js';
import type { AppSnapshot, DashboardSummary } from '../../shared/types.js';
import { ServiceContext, type ServiceConstructor } from './serviceContext.js';

const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('zh-CN', key, params);



export function DashboardService<TBase extends ServiceConstructor<ServiceContext>>(Base: TBase) {
  return class DashboardService extends Base {
  getSnapshot(): AppSnapshot {
    const conversations = this.listConversations({ limit: 30 });
    const activeConversationId = conversations.items[0]?.id;
    return {
      dashboard: this.getDashboardSummary(),
      conversations: conversations.items,
      messages: activeConversationId ? this.listMessages({ conversationId: activeConversationId, limit: 60 }).items : [],
      messageChunks: this.getMessageChunks().slice(0, 120),
      messageAttachments: activeConversationId ? this.getMessageAttachments(activeConversationId).slice(0, 50) : [],
      promptTemplates: this.getPromptTemplates(),
      conversationExports: this.getConversationExports(),
      providers: this.getProviders(),
      models: this.getModels(),
      requestLogs: this.getRequestLogs().slice(0, 30),
      gatewayLogs: this.listGatewayLogs({ limit: 30 }).items,
      usageRecords: this.getUsageRecords().slice(0, 30),
      providerHealthRecords: this.getProviderHealthRecords().slice(0, 30),
      feedbackItems: this.getFeedbackItems().slice(0, 30),
      evalSets: this.getEvalSets(),
      evalResults: this.getEvalResults().slice(0, 30),
      observability: this.queryObservability(),
      gatewayKeys: this.getGatewayKeys(),
      knowledgeFiles: this.listKnowledgeFiles({ limit: 30 }).items,
      knowledgeChunks: this.listKnowledgeChunks({ limit: 60 }).items,
      knowledgeRetrievals: this.getKnowledgeRetrievalTraces().slice(0, 30),
      knowledgeCitations: this.getKnowledgeCitations().slice(0, 30),
      mcpServers: this.getMcpServers(),
      agents: this.getAgents(),
      tools: this.getTools(),
      executionRuns: this.getExecutionRuns().slice(0, 30),
      executionSteps: this.getExecutionSteps().slice(0, 60),
      executionTraceEvents: this.getExecutionTraceEvents().slice(0, 80),
      approvalRequests: this.getApprovalRequests(),
      importExportResults: this.getImportExportResults().slice(0, 30),
      dataMobilityJobs: this.getDataMobilityJobs().slice(0, 30),
      dataConflicts: this.getDataConflicts().slice(0, 30),
      dataBackups: this.getDataBackups().slice(0, 30),
      migrationRuns: this.getMigrationRuns().slice(0, 30),
      rollbackRecords: this.getRollbackRecords().slice(0, 30),
      auditLogs: this.listAuditLogs({ limit: 30 }).items,
      security: this.getSecurityState(),
      auditIntegrity: this.verifyAuditIntegrity({ persistAudit: false }),
      uiPreferences: this.getUiPreferences(),
    };
  }


  getDashboardSummary(): DashboardSummary {
    const workspace = this.getDefaultWorkspace();
    const providers = this.getProviders();
    const models = this.getModels();
    const usage = this.getUsageTrend({ since: todayStartOfDay(), bucketMs: 24 * 60 * 60 * 1000, limit: 1 });
    const setupGaps: string[] = [];
    if (providers.length === 0) setupGaps.push(t('dashboard.setup.providerMissing'));
    if (models.length === 0) setupGaps.push(t('dashboard.setup.modelMissing'));
    if (this.getGatewayKeys().length === 0) setupGaps.push(t('dashboard.setup.gatewayKeyMissing'));
    if (this.getConversations().length === 0) setupGaps.push(t('dashboard.setup.conversationMissing'));

    return {
      workspace,
      recentConversations: this.getConversations().slice(0, 5),
      providers,
      models,
      gatewayStatus: this.getGatewayStatus(),
      usageToday: {
        requests: usage[0]?.requestCount ?? 0,
        inputTokens: usage[0]?.inputTokens ?? 0,
        outputTokens: usage[0]?.outputTokens ?? 0,
        costEstimate: usage[0]?.costEstimate ?? 0,
      },
      setupGaps,
    };
  }

  };
}

function todayStartOfDay(): number {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return todayStart.getTime();
}
