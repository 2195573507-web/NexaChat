import type { ModuleStage } from '../../shared/types';
import { useI18n } from '../i18n';
import { StatusPillLite } from './AppFrame';
import { stageLabel, stageState } from './stageStatus';

export function StatusPill({ stage }: { stage: ModuleStage }) {
  const { t } = useI18n();
  return <StatusPillLite label={stageLabel(stage, t)} state={stageState(stage)} />;
}
