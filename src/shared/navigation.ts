import { translate, type I18nKey } from './i18n.js';
import type { ModuleId, ModuleStage, NavModule, NavTab } from './types.js';

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
  alias('/dashboard', '/workspace/overview', 'workspace', 'Dashboard module was renamed to workspace.'),
  alias('/dashboard/overview', '/workspace/overview', 'workspace', 'Former dashboard overview route.'),
  alias('/dashboard/workspaces', '/workspace/overview', 'workspace', 'Former workspace list route now maps to overview.'),
  alias('/dashboard/activity', '/workspace/activity', 'workspace', 'Former dashboard activity route.'),
  alias('/dashboard/quick-actions', '/workspace/overview', 'workspace', 'Quick actions are now part of workspace overview.'),
  alias('/chat/assistants', '/tools/agents', 'tools', 'Assistants moved under tools and Agent.'),
  alias('/chat/prompt-lab', '/chat/playground', 'chat', 'Prompt lab is folded into chat playground until Round 7.'),
  alias('/chat/comparison', '/chat/context', 'chat', 'Comparison remains planned and is described in context.'),
  alias('/chat/artifacts', '/chat/context', 'chat', 'Artifacts remain planned and are described in context.'),
  alias('/chat/local-history', '/chat/conversations', 'chat', 'Local history moved to conversation management.'),
  alias('/models/models', '/models/catalog', 'models', 'Model list route was renamed to catalog.'),
  alias('/models/capabilities', '/models/providers', 'models', 'Provider capabilities are currently surfaced with provider management.'),
  alias('/models/templates', '/models/router', 'models', 'Parameter templates remain environment-limited under router boundaries.'),
  alias('/models/health', '/models/router', 'models', 'Model health is currently shown with router status.'),
  alias('/knowledge/bases', '/knowledge/files', 'knowledge', 'Knowledge bases are not a separate executable surface yet.'),
  alias('/knowledge/context', '/knowledge/retrieval', 'knowledge', 'Knowledge context maps to retrieval preview.'),
  alias('/knowledge/memory', '/knowledge/retrieval', 'knowledge', 'Memory remains planned under retrieval/context.'),
  alias('/knowledge/maintenance', '/knowledge/chunks', 'knowledge', 'Maintenance maps to chunk status.'),
  alias('/tools/tools', '/tools/runs', 'tools', 'Tool execution remains environment-limited under execution preview.'),
  alias('/tools/workflow', '/tools/runs', 'tools', 'Workflow is reserved under execution preview.'),
  alias('/tools/debug', '/tools/runs', 'tools', 'Debugging maps to execution preview.'),
  alias('/gateway/status', '/gateway/overview', 'gateway', 'Gateway status route was renamed to overview.'),
  alias('/gateway/virtual-models', '/gateway/docs', 'gateway', 'Virtual models are not executable yet and are documented in gateway docs.'),
  alias('/gateway/routes', '/gateway/docs', 'gateway', 'Gateway route examples live in docs until route rules are implemented.'),
  alias('/gateway/integrations', '/data/import', 'data', 'External integration import belongs to data import preflight.'),
  alias('/data/import-export', '/data/import', 'data', 'Import/export maps to the Round 12 data mobility import/export workbench.'),
  alias('/data/snapshots', '/data/backup', 'data', 'Legacy snapshots route now maps to encrypted backup and snapshot history.'),
  alias('/settings/request-logs', '/gateway/logs', 'gateway', 'Request logs moved to gateway logs.'),
  alias('/settings/usage', '/gateway/usage', 'gateway', 'Usage moved to gateway observability usage.'),
  alias('/settings/evals', '/settings/evals', 'settings', 'Evals are now owned by settings observability.'),
  alias('/settings/diagnostics', '/data/diagnostics', 'data', 'Diagnostics moved to data module.'),
  alias('/settings/feedback', '/settings/feedback', 'settings', 'Feedback is now owned by settings observability.'),
  alias('/settings/users', '/settings/security', 'settings', 'Users/RBAC remain planned under security.'),
  alias('/settings/permissions', '/settings/security', 'settings', 'Permissions remain planned under security.'),
  alias('/settings/keys', '/settings/security', 'settings', 'Key security belongs to settings security.'),
  alias('/settings/ui', '/settings/preferences', 'settings', 'UI settings route was renamed to preferences.'),
  alias('/settings/system', '/settings/about', 'settings', 'System info moved to about environment.'),
  alias('/settings/desktop', '/settings/about', 'settings', 'Desktop entry status moved to about environment.'),
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
