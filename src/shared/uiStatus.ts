import type { ModuleStage, UiStatusState } from './types.js';

export type UiStatusTone = 'success' | 'warning' | 'error' | 'info' | 'muted';

export type UiStatusDefinition = {
  state: UiStatusState;
  labelKey:
    | 'status.ready'
    | 'status.empty'
    | 'status.loading'
    | 'status.error'
    | 'status.preview'
    | 'status.planned'
    | 'status.unavailable';
  tone: UiStatusTone;
};

export const UI_STATUS_DEFINITIONS: Record<UiStatusState, UiStatusDefinition> = {
  ready: { state: 'ready', labelKey: 'status.ready', tone: 'success' },
  empty: { state: 'empty', labelKey: 'status.empty', tone: 'muted' },
  loading: { state: 'loading', labelKey: 'status.loading', tone: 'info' },
  error: { state: 'error', labelKey: 'status.error', tone: 'error' },
  preview: { state: 'preview', labelKey: 'status.preview', tone: 'info' },
  planned: { state: 'planned', labelKey: 'status.planned', tone: 'warning' },
  unavailable: { state: 'unavailable', labelKey: 'status.unavailable', tone: 'muted' },
};

export function uiStateFromModuleStage(stage: ModuleStage): UiStatusState {
  if (stage === 'planned' || stage === 'reserved') return 'planned';
  if (stage === 'environment-limited') return 'preview';
  return 'ready';
}

export function uiToneForModuleStage(stage: ModuleStage): UiStatusTone {
  return UI_STATUS_DEFINITIONS[uiStateFromModuleStage(stage)].tone;
}
