import { translate } from '../../shared/i18n.js';
import type { AppSnapshot, DashboardSummary } from '../../shared/types.js';
import { ServiceContext, type ServiceConstructor } from './serviceContext.js';

const t = (key: Parameters<typeof translate>[1], params?: Parameters<typeof translate>[2]) => translate('zh-CN', key, params);



export function DashboardService<TBase extends ServiceConstructor<ServiceContext>>(Base: TBase) {
  return class DashboardService extends Base {
  getSnapshot(): AppSnapshot {
    return {
      dashboard: this.getDashboardSummary(),
      conversations: this.getConversations(),
      messages: this.getMessages(),
      messageChunks: this.getMessageChunks(),
      messageAttachments: this.getMessageAttachments(),
      promptTemplates: this.getPromptTemplates(),
      conversationExports: this.getConversationExports(),
      providers: this.getProviders(),
      models: this.getModels(),
      requestLogs: this.getRequestLogs(),
      gatewayLogs: this.getGatewayLogs(),
      usageRecords: this.getUsageRecords(),
      providerHealthRecords: this.getProviderHealthRecords(),
      feedbackItems: this.getFeedbackItems(),
      evalSets: this.getEvalSets(),
      evalResults: this.getEvalResults(),
      observability: this.queryObservability(),
      gatewayKeys: this.getGatewayKeys(),
      knowledgeFiles: this.getKnowledgeFiles(),
      knowledgeChunks: this.getKnowledgeChunks(),
      knowledgeRetrievals: this.getKnowledgeRetrievalTraces(),
      knowledgeCitations: this.getKnowledgeCitations(),
      mcpServers: this.getMcpServers(),
      agents: this.getAgents(),
      tools: this.getTools(),
      executionRuns: this.getExecutionRuns(),
      executionSteps: this.getExecutionSteps(),
      executionTraceEvents: this.getExecutionTraceEvents(),
      approvalRequests: this.getApprovalRequests(),
      importExportResults: this.getImportExportResults(),
      dataMobilityJobs: this.getDataMobilityJobs(),
      dataConflicts: this.getDataConflicts(),
      dataBackups: this.getDataBackups(),
      migrationRuns: this.getMigrationRuns(),
      rollbackRecords: this.getRollbackRecords(),
      auditLogs: this.getAuditLogs(),
      security: this.getSecurityState(),
      auditIntegrity: this.verifyAuditIntegrity({ persistAudit: false }),
      uiPreferences: this.getUiPreferences(),
    };
  }


  getDashboardSummary(): DashboardSummary {
    const workspace = this.getDefaultWorkspace();
    const providers = this.getProviders();
    const models = this.getModels();
    const usage = this.getUsageRecords();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today = usage.filter((record) => record.createdAt >= todayStart.getTime());
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
        requests: today.length,
        inputTokens: today.reduce((sum, record) => sum + record.inputTokens, 0),
        outputTokens: today.reduce((sum, record) => sum + record.outputTokens, 0),
        costEstimate: today.reduce((sum, record) => sum + record.costEstimate, 0),
      },
      setupGaps,
    };
  }

  };
}
