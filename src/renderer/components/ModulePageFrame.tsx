import type { ReactNode } from 'react';
import type { NavModule, NavTab } from '../../shared/types';
import { StatusPill } from './StatusPill';

interface ModulePageFrameProps {
  activeModule: NavModule;
  activeTab: NavTab;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
}

export function ModulePageFrame({
  activeModule,
  activeTab,
  onTabChange,
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

      <nav className="module-subnav-panel" aria-label={`${activeModule.label} 二级导航`}>
        <div className="module-subnav-summary">
          <span>二级导航</span>
          <strong>{activeTab.label}</strong>
          <p>{activeTab.featureBoundary ?? activeTab.description ?? activeModule.description}</p>
        </div>
        <div className="module-tabs" role="tablist" aria-label={`${activeModule.label} 功能页面`}>
          {activeModule.tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              role="tab"
              aria-selected={tab.id === activeTab.id}
              aria-controls={`panel-${activeModule.id}-${tab.id}`}
              className={tab.id === activeTab.id ? 'is-active' : undefined}
              onClick={() => onTabChange(tab.id)}
            >
              <span>{tab.label}</span>
              <StatusPill stage={tab.stage} />
            </button>
          ))}
        </div>
      </nav>

      {children}
    </>
  );
}
