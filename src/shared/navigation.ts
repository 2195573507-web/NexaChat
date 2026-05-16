import { translate, type I18nKey } from './i18n.js';
import type { ModuleId, ModuleStage, NavModule, NavTab } from './types.js';
import { uiStateFromModuleStage } from './uiStatus.js';

type ChildOptions = {
  default?: boolean;
  permission?: string;
  icon?: string;
  status?: ModuleStage;
};

type ModuleDefinition = {
  id: ModuleId;
  icon: string;
  children: Array<{
    id: string;
    icon: string;
    default?: boolean;
    permission?: string;
    status?: ModuleStage;
  }>;
};

export function getTabRoute(moduleId: ModuleId, tabId: string) {
  return `/${moduleId}/${tabId}`;
}

function child(moduleId: ModuleId, id: string, options: ChildOptions): NavTab {
  const status = options.status ?? 'implemented';
  const labelKey = `nav.${moduleId}.${id}.label` as I18nKey;
  const descriptionKey = `nav.${moduleId}.${id}.description` as I18nKey;
  const featureBoundaryKey = `nav.${moduleId}.${id}.boundary` as I18nKey;
  return {
    id,
    label: translate('zh-CN', labelKey),
    title: translate('zh-CN', labelKey),
    stage: status,
    status,
    uiState: uiStateFromModuleStage(status),
    description: translate('zh-CN', descriptionKey),
    default: options.default,
    route: getTabRoute(moduleId, id),
    permission: options.permission,
    icon: options.icon,
    featureBoundary: translate('zh-CN', featureBoundaryKey),
    labelKey,
    descriptionKey,
    featureBoundaryKey,
  };
}

function defineModule(definition: ModuleDefinition): NavModule {
  const tabs = definition.children.map((item) =>
    child(definition.id, item.id, {
      default: item.default,
      permission: item.permission,
      icon: item.icon,
      status: item.status,
    }),
  );
  const defaultRoute = (tabs.find((candidate) => candidate.default) ?? tabs[0]).route ?? getTabRoute(definition.id, tabs[0].id);
  const labelKey = `nav.${definition.id}.label` as I18nKey;
  const shortLabelKey = `nav.${definition.id}.shortLabel` as I18nKey;
  const descriptionKey = `nav.${definition.id}.description` as I18nKey;
  return {
    id: definition.id,
    moduleId: definition.id,
    label: translate('zh-CN', labelKey),
    moduleName: translate('zh-CN', labelKey),
    shortLabel: translate('zh-CN', shortLabelKey),
    description: translate('zh-CN', descriptionKey),
    moduleDescription: translate('zh-CN', descriptionKey),
    labelKey,
    shortLabelKey,
    descriptionKey,
    icon: definition.icon,
    route: defaultRoute,
    defaultRoute,
    stage: 'implemented',
    status: 'implemented',
    uiState: uiStateFromModuleStage('implemented'),
    tabs,
    children: tabs,
  };
}

export const navModules: NavModule[] = [
  defineModule({
    id: 'workspace',
    icon: 'gauge',
    children: [
      {
        id: 'overview',
        icon: 'layout-dashboard',
        default: true,
      },
      {
        id: 'activity',
        icon: 'history',
      },
      {
        id: 'health',
        icon: 'activity',
      },
    ],
  }),
  defineModule({
    id: 'chat',
    icon: 'message-square-text',
    children: [
      {
        id: 'conversations',
        icon: 'messages-square',
        default: true,
      },
      {
        id: 'playground',
        icon: 'send',
      },
      {
        id: 'context',
        icon: 'braces',
      },
    ],
  }),
  defineModule({
    id: 'models',
    icon: 'server-cog',
    children: [
      {
        id: 'providers',
        icon: 'server',
        default: true,
        permission: 'secret:write',
      },
      {
        id: 'catalog',
        icon: 'boxes',
      },
      {
        id: 'router',
        icon: 'route',
      },
    ],
  }),
  defineModule({
    id: 'knowledge',
    icon: 'brain-circuit',
    children: [
      {
        id: 'files',
        icon: 'book-open',
        default: true,
      },
      {
        id: 'chunks',
        icon: 'file-text',
      },
      {
        id: 'retrieval',
        icon: 'search-check',
        status: 'environment-limited',
      },
    ],
  }),
  defineModule({
    id: 'tools',
    icon: 'bot',
    children: [
      {
        id: 'mcp',
        icon: 'plug-zap',
        default: true,
        permission: 'mcp:manage',
      },
      {
        id: 'agents',
        icon: 'bot',
      },
      {
        id: 'runs',
        icon: 'history',
        status: 'environment-limited',
      },
    ],
  }),
  defineModule({
    id: 'gateway',
    icon: 'key-round',
    children: [
      {
        id: 'overview',
        icon: 'gauge',
        default: true,
      },
      {
        id: 'keys',
        icon: 'key-round',
        permission: 'gateway:key:manage',
      },
      {
        id: 'logs',
        icon: 'scroll-text',
      },
      {
        id: 'usage',
        icon: 'activity',
      },
      {
        id: 'docs',
        icon: 'brackets',
      },
    ],
  }),
  defineModule({
    id: 'data',
    icon: 'database',
    children: [
      {
        id: 'import',
        icon: 'file-check',
        default: true,
      },
      {
        id: 'backup',
        icon: 'archive',
      },
      {
        id: 'restore',
        icon: 'rotate-ccw',
      },
      {
        id: 'rollback',
        icon: 'history',
      },
      {
        id: 'diagnostics',
        icon: 'triangle-alert',
      },
      {
        id: 'cleanup',
        icon: 'trash-2',
        status: 'environment-limited',
      },
    ],
  }),
  defineModule({
    id: 'settings',
    icon: 'settings',
    children: [
      {
        id: 'preferences',
        icon: 'sliders-horizontal',
        default: true,
      },
      {
        id: 'security',
        icon: 'shield-check',
        permission: 'security:read',
      },
      {
        id: 'audit',
        icon: 'scroll-text',
        permission: 'audit:read',
      },
      {
        id: 'feedback',
        icon: 'message-square-text',
        permission: 'observability:write',
      },
      {
        id: 'evals',
        icon: 'activity',
        permission: 'observability:write',
      },
      {
        id: 'observability',
        icon: 'shield-check',
        permission: 'observability:read',
      },
      {
        id: 'about',
        icon: 'settings',
        status: 'environment-limited',
      },
    ],
  }),
];

export const moduleRegistry = navModules;

export type RouteAliasOwner = ModuleId | 'root';

export type RouteAliasEntry = {
  from: string;
  target: string;
  owner: RouteAliasOwner;
  deleteAfterMilestone: string;
  reason: string;
};

const aliasDeleteAfterMilestone = 'round-15-quality-gates';

function alias(from: string, target: string, owner: RouteAliasOwner, reason: string): RouteAliasEntry {
  return {
    from,
    target,
    owner,
    deleteAfterMilestone: aliasDeleteAfterMilestone,
    reason,
  };
}

export const routeAliasRegistry: RouteAliasEntry[] = [
  alias('/', '/workspace/overview', 'root', 'Root path opens the default workspace overview.'),
];

export const routeAliases = Object.fromEntries(routeAliasRegistry.map((entry) => [entry.from, entry.target])) as Record<string, string>;

function cleanPath(pathname: string) {
  const pathOnly = pathname.split(/[?#]/)[0] || '/';
  const normalized = pathOnly === '/' ? '/' : `/${pathOnly.replace(/^\/+/, '').replace(/\/+$/, '')}`;
  return routeAliases[normalized] ?? normalized;
}

export function getDefaultTab(module: NavModule) {
  return module.tabs.find((candidate) => candidate.default) ?? module.tabs[0];
}

export function resolveNavigation(pathname: string) {
  const originalPath = pathname.split(/[?#]/)[0] || '/';
  const normalizedPath = cleanPath(pathname);
  const [moduleSegment, tabSegment] = normalizedPath.replace(/^\/+/, '').split('/');
  const module = navModules.find((candidate) => candidate.id === moduleSegment) ?? navModules[0];
  const defaultTab = getDefaultTab(module);
  const tab = module.tabs.find((candidate) => candidate.id === tabSegment) ?? defaultTab;
  const route = tab.route ?? getTabRoute(module.id, tab.id);
  return {
    module,
    tab,
    route,
    replaced: originalPath !== route || normalizedPath !== route,
  };
}
