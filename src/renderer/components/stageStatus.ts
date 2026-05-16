import type { ModuleStage } from '../../shared/types';
import type { Translate } from '../i18n';

const stageLabelKeys: Record<ModuleStage, Parameters<Translate>[0]> = {
  ready: 'stage.ready',
  implemented: 'stage.implemented',
  planned: 'stage.planned',
  reserved: 'stage.reserved',
  'environment-limited': 'stage.environment-limited',
};

export function stageLabel(stage: ModuleStage, t: Translate): string {
  return t(stageLabelKeys[stage]);
}

export function stageState(stage: ModuleStage): 'ready' | 'warning' | 'danger' | 'info' | 'muted' {
  if (stage === 'implemented' || stage === 'ready') {
    return 'ready';
  }
  if (stage === 'environment-limited') {
    return 'info';
  }
  if (stage === 'reserved') {
    return 'muted';
  }
  return 'warning';
}
