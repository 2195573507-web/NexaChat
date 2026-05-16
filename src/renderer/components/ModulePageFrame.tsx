import type { ReactNode } from 'react';
import type { NavModule, NavTab } from '../../shared/types';
import { StatusPill } from './StatusPill';

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
      <div className="module-header">
        <div>
          <span className="module-kicker">{activeModule.label}</span>
          <h1>{activeTab.label}</h1>
          <p>{activeTab.featureBoundary ?? activeTab.description}</p>
        </div>
        <div className="module-stage-stack" aria-label={`${activeModule.label} ${activeTab.label}`}>
          <StatusPill stage={activeModule.stage} />
          <StatusPill stage={activeTab.stage} />
        </div>
      </div>

      {children}
    </>
  );
}
