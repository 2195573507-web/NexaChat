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
          <h1>{activeModule.label}</h1>
          <p>{activeTab.description ?? activeModule.description ?? activeTab.label}</p>
        </div>
        <StatusPill stage={activeModule.stage} />
      </div>

      {children}
    </>
  );
}
