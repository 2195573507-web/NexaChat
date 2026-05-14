import type { JSX } from 'react';
import type { AppApi } from '../../shared/api';
import type { AppSnapshot, ModuleId, NavTab } from '../../shared/types';
import { ChatPage } from './ChatPage';
import { DashboardPage } from './DashboardPage';
import { DataPage } from './DataPage';
import { GatewayPage } from './GatewayPage';
import { KnowledgePage } from './KnowledgePage';
import { ModelsPage } from './ModelsPage';
import { SettingsPage } from './SettingsPage';
import { ToolsPage } from './ToolsPage';
import type { OpenModuleTarget } from './shared';

export type ModulePageRendererProps = {
  activeTab: NavTab;
  snapshot: AppSnapshot;
  api: AppApi;
  onAction: (label: string, action: () => Promise<unknown>) => void;
  onOpenModule: (target: OpenModuleTarget) => void;
};

export type ModulePageRenderer = (props: ModulePageRendererProps) => JSX.Element;

export const modulePageRegistry: Record<ModuleId, ModulePageRenderer> = {
  workspace: DashboardPage,
  chat: ChatPage,
  models: ModelsPage,
  knowledge: KnowledgePage,
  tools: ToolsPage,
  gateway: GatewayPage,
  data: DataPage,
  settings: SettingsPage,
};

