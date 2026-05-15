import type { ModuleStage } from '../../shared/types';
import type { Translate } from '../i18n';
import { useI18n } from '../i18n';

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

export function StatusPill({ stage }: { stage: ModuleStage }) {
  const { t } = useI18n();
  return <span className={`status-pill status-${stage}`}>{stageLabel(stage, t)}</span>;
}
