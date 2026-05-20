import { ServiceContext } from './serviceContext.js';
import { DashboardService } from './dashboardService.js';
import { ProviderService } from './providerService.js';
import { ModelService } from './modelService.js';
import { ChatService } from './chatService.js';
import { GatewayService } from './gatewayService.js';
import { KnowledgeService } from './knowledgeService.js';
import { ToolService } from './toolService.js';
import { DataService } from './dataService.js';
import { SecurityService } from './securityService.js';
import { AuditService } from './auditService.js';
import { SettingsService } from './settingsService.js';
import { ObservabilityService } from './observabilityService.js';

const DashboardContext = DashboardService(ServiceContext);
const ProviderContext = ProviderService(DashboardContext);
const ModelContext = ModelService(ProviderContext);
const ChatContext = ChatService(ModelContext);
const GatewayContext = GatewayService(ChatContext);
const KnowledgeContext = KnowledgeService(GatewayContext);
const ToolContext = ToolService(KnowledgeContext);
const DataContext = DataService(ToolContext);
const SecurityContext = SecurityService(DataContext);
const AuditContext = AuditService(SecurityContext);
const SettingsContext = SettingsService(AuditContext);
const RegistryBase = ObservabilityService(SettingsContext);

export class NexaServiceRegistry extends RegistryBase {}

export const serviceRegistry = new NexaServiceRegistry();
