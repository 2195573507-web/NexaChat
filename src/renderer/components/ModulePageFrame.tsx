import type { ReactNode } from 'react';
import type { NavModule, NavTab } from '../../shared/types';
import { StatusPill } from './StatusPill';
import { PageHeader } from './ui';

interface ModulePageFrameProps {
  activeModule: NavModule;
  activeTab: NavTab;
  children: ReactNode;
}

export function ModulePageFrame({
  activeModule,
  activeTab,
  children,
}: ModulePageFrameProps) {
  return (
    <>
      <PageHeader
        className="module-header"
        eyebrow={activeModule.label}
        title={activeTab.label}
        description={activeTab.featureBoundary ?? activeTab.description}
        meta={
          <div className="module-stage-stack" aria-label={`${activeModule.label} ${activeTab.label}`}>
            <StatusPill stage={activeModule.stage} />
            <StatusPill stage={activeTab.stage} />
          </div>
        }
      />

      {children}
    </>
  );
}
