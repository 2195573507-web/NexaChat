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

const RegistryBase = ObservabilityService(SettingsService(AuditService(SecurityService(DataService(ToolService(KnowledgeService(GatewayService(ChatService(ModelService(ProviderService(DashboardService(ServiceContext))))))))))));

export class NexaServiceRegistry extends RegistryBase {}

export const serviceRegistry = new NexaServiceRegistry();
