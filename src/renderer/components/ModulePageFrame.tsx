import type { ReactNode } from 'react';
import type { NavModule, NavTab } from '../../shared/types';
import { StatusPill } from './StatusPill';
import { ModuleSubNav } from './ModuleSubNav';

interface ModulePageFrameProps {
  activeModule: NavModule;
  activeTab: NavTab;
  activeRoute: string;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
}

export function ModulePageFrame({
  activeModule,
  activeTab,
  activeRoute,
  onTabChange,
  children,
}: ModulePageFrameProps) {
  return (
    <>
      <div className="module-header">
        <div>
          <h1>{activeModule.label}</h1>
          <p>{activeTab.description ?? activeModule.description ?? activeTab.label}</p>
          <span className="route-chip">当前路径 {activeRoute}</span>
        </div>
        <StatusPill stage={activeModule.stage} />
      </div>

      <ModuleSubNav module={activeModule} activeTab={activeTab} onTabChange={onTabChange} />

      {children}
    </>
  );
}
