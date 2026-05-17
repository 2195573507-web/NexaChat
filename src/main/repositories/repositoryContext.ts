import type { DatabaseSync } from 'node:sqlite';
import { AuditRepository } from './auditRepository.js';
import { ChatRepository } from './chatRepository.js';
import { DataRepository } from './dataRepository.js';
import { GatewayRepository } from './gatewayRepository.js';
import { KnowledgeRepository } from './knowledgeRepository.js';
import { ModelRepository } from './modelRepository.js';
import { ObservabilityRepository } from './observabilityRepository.js';
import { ProviderRepository } from './providerRepository.js';
import { SecurityRepository } from './securityRepository.js';
import { SettingsRepository } from './settingsRepository.js';
import { ToolRepository } from './toolRepository.js';

export interface RepositoryContext {
  audit: AuditRepository;
  chat: ChatRepository;
  data: DataRepository;
  gateway: GatewayRepository;
  knowledge: KnowledgeRepository;
  model: ModelRepository;
  observability: ObservabilityRepository;
  provider: ProviderRepository;
  security: SecurityRepository;
  settings: SettingsRepository;
  tool: ToolRepository;
}

export function createRepositoryContext(db: DatabaseSync): RepositoryContext {
  return {
    audit: new AuditRepository(db),
    chat: new ChatRepository(db),
    data: new DataRepository(db),
    gateway: new GatewayRepository(db),
    knowledge: new KnowledgeRepository(db),
    model: new ModelRepository(db),
    observability: new ObservabilityRepository(db),
    provider: new ProviderRepository(db),
    security: new SecurityRepository(db),
    settings: new SettingsRepository(db),
    tool: new ToolRepository(db),
  };
}
