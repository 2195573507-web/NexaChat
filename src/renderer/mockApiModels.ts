import type { AppApi } from '../shared/api';
import type { Conversation, Model, ModelInput, Provider, Workspace } from '../shared/types';

export interface MockModelDomainState {
  workspace: Workspace;
  providers: Provider[];
  models: Model[];
  conversations: Conversation[];
}

export interface MockModelDomainContext {
  state: MockModelDomainState;
  now: () => number;
  createId: (prefix: string) => string;
  clone: <T>(value: T) => T;
  findById: <T extends { id: string }>(items: T[], id: string, label: string) => T;
  pushAudit: (action: string, targetType: string, targetId: string | null, details?: unknown) => void;
  touchWorkspace: () => void;
}

export type MockModelApi = Pick<AppApi, 'createModel' | 'updateModel' | 'disableModel' | 'enableModel' | 'deleteModel'>;

export function createMockModelApi({
  state,
  now,
  createId,
  clone,
  findById,
  pushAudit,
  touchWorkspace,
}: MockModelDomainContext): MockModelApi {
  const setMockModelAvailability = (modelId: string, enabled: boolean, deleted: boolean): Model => {
    const model = findById(state.models, modelId, 'Model');
    const provider = findById(state.providers, model.providerId, 'Provider');
    if (enabled && (!provider.enabled || model.deletedAt)) {
      throw new Error(`Model cannot be enabled: ${modelId}`);
    }
    const timestamp = now();
    const previousHealth = model.healthStatus;
    model.enabled = enabled;
    model.deletedAt = deleted ? timestamp : null;
    model.healthStatus = enabled ? previousHealth : 'unknown';
    model.latencyMs = enabled ? model.latencyMs : null;
    model.updatedAt = timestamp;
    if (!enabled) {
      if (state.workspace.defaultModelId === model.id) {
        state.workspace.defaultModelId = null;
      }
      state.conversations.forEach((conversation) => {
        if (conversation.defaultModelId === model.id) {
          conversation.defaultModelId = null;
          conversation.updatedAt = timestamp;
        }
      });
      touchWorkspace();
    }
    pushAudit(deleted ? 'model.deleted' : enabled ? 'model.enabled' : 'model.disabled', 'model', model.id, { providerId: model.providerId });
    return model;
  };

  return {
    async createModel(input: ModelInput) {
      const provider = findById(state.providers, input.providerId, 'Provider');
      if (!provider.enabled) {
        throw new Error(`Provider is disabled: ${input.providerId}`);
      }

      const timestamp = now();
      const model: Model = {
        id: createId('model'),
        providerId: input.providerId,
        name: input.name.trim() || 'mock-model',
        displayName: input.displayName?.trim() || input.name.trim() || 'Mock Model',
        modelNameSnapshot: input.name.trim() || 'mock-model',
        contextWindow: input.contextWindow ?? 8192,
        supportsStreaming: input.supportsStreaming ?? true,
        supportsTools: input.supportsTools ?? false,
        supportsVision: input.supportsVision ?? false,
        supportsEmbeddings: input.supportsEmbeddings ?? false,
        inputPrice: 0,
        outputPrice: 0,
        healthStatus: 'unknown',
        latencyMs: null,
        enabled: true,
        deletedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      state.models.unshift(model);
      if (!state.workspace.defaultModelId) {
        state.workspace.defaultModelId = model.id;
      }
      touchWorkspace();
      pushAudit('model.create', 'model', model.id, { providerId: model.providerId });
      return clone(model);
    },

    async updateModel(input) {
      const model = findById(state.models, input.modelId, 'Model');
      if (model.deletedAt) {
        throw new Error(`Model is deleted: ${input.modelId}`);
      }
      const timestamp = now();
      model.name = input.name?.trim() || model.name;
      model.displayName = input.displayName?.trim() || model.displayName;
      model.contextWindow = input.contextWindow ?? model.contextWindow;
      model.supportsStreaming = input.supportsStreaming ?? model.supportsStreaming;
      model.supportsTools = input.supportsTools ?? model.supportsTools;
      model.supportsVision = input.supportsVision ?? model.supportsVision;
      model.supportsEmbeddings = input.supportsEmbeddings ?? model.supportsEmbeddings;
      model.updatedAt = timestamp;
      pushAudit('model.update', 'model', model.id, { providerId: model.providerId });
      return clone(model);
    },

    async disableModel(input) {
      return clone(setMockModelAvailability(input.modelId, false, false));
    },

    async enableModel(input) {
      return clone(setMockModelAvailability(input.modelId, true, false));
    },

    async deleteModel(input) {
      return clone(setMockModelAvailability(input.modelId, false, true));
    },
  };
}
