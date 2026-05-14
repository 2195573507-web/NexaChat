import type { ModuleStage } from '../../shared/types';

const stageLabels: Record<ModuleStage, string> = {
  ready: 'Ready',
  implemented: '已实现',
  planned: '计划中',
  reserved: '预留',
  'environment-limited': '环境受限',
};

export function stageLabel(stage: ModuleStage): string {
  return stageLabels[stage];
}

export function StatusPill({ stage }: { stage: ModuleStage }) {
  return <span className={`status-pill status-${stage}`}>{stageLabels[stage]}</span>;
}
