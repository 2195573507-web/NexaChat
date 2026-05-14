import type { ModuleId, ModuleStage, NavModule, NavTab } from './types.js';

type ChildOptions = {
  default?: boolean;
  permission?: string;
  icon?: string;
  status?: ModuleStage;
  featureBoundary: string;
};

type ModuleDefinition = {
  id: ModuleId;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  children: Array<{
    id: string;
    label: string;
    description: string;
    icon: string;
    featureBoundary: string;
    default?: boolean;
    permission?: string;
    status?: ModuleStage;
  }>;
};

export function getTabRoute(moduleId: ModuleId, tabId: string) {
  return `/${moduleId}/${tabId}`;
}

function child(moduleId: ModuleId, id: string, label: string, description: string, options: ChildOptions): NavTab {
  const status = options.status ?? 'implemented';
  return {
    id,
    label,
    title: label,
    stage: status,
    status,
    description,
    default: options.default,
    route: getTabRoute(moduleId, id),
    permission: options.permission,
    icon: options.icon,
    featureBoundary: options.featureBoundary,
    labelKey: `nav.${moduleId}.${id}.label`,
    descriptionKey: `nav.${moduleId}.${id}.description`,
  };
}

function defineModule(definition: ModuleDefinition): NavModule {
  const tabs = definition.children.map((item) =>
    child(definition.id, item.id, item.label, item.description, {
      default: item.default,
      permission: item.permission,
      icon: item.icon,
      status: item.status,
      featureBoundary: item.featureBoundary,
    }),
  );
  const defaultRoute = (tabs.find((candidate) => candidate.default) ?? tabs[0]).route ?? getTabRoute(definition.id, tabs[0].id);
  return {
    id: definition.id,
    moduleId: definition.id,
    label: definition.label,
    moduleName: definition.label,
    shortLabel: definition.shortLabel,
    description: definition.description,
    moduleDescription: definition.description,
    labelKey: `module.${definition.id}.label`,
    shortLabelKey: `module.${definition.id}.shortLabel`,
    descriptionKey: `module.${definition.id}.description`,
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
    label: '工作台',
    shortLabel: '工作台',
    description: '总览、最近活动、本地状态、快速入口和待处理事项；不承载具体配置表单。',
    icon: 'gauge',
    children: [
      {
        id: 'overview',
        label: '工作台首页',
        description: '工作区、默认模型、网关状态、今日用量、待处理事项和常用入口。',
        icon: 'layout-dashboard',
        default: true,
        featureBoundary: '只汇总状态和提供跳转入口，不直接编辑 Provider、Gateway Key、知识文件或安全设置。',
      },
      {
        id: 'activity',
        label: '最近活动',
        description: '最近会话、请求日志、审计事件和网关事件的只读聚合。',
        icon: 'history',
        featureBoundary: '只展示近期活动，不执行配置、导入或清理动作。',
      },
      {
        id: 'health',
        label: '本地状态',
        description: '本地应用、SQLite 数据、网关、Provider、Model 和知识索引状态。',
        icon: 'activity',
        featureBoundary: '只展示健康状态和缺口，不替代模型、网关或数据模块的配置页面。',
      },
    ],
  }),
  defineModule({
    id: 'chat',
    label: '对话',
    shortLabel: '对话',
    description: '会话、消息、模型选择、上下文策略和聊天运行状态。',
    icon: 'message-square-text',
    children: [
      {
        id: 'conversations',
        label: '会话管理',
        description: '会话列表、置顶、收藏、归档和本地历史状态。',
        icon: 'messages-square',
        default: true,
        featureBoundary: '只管理会话和本地历史，不配置 Provider、Gateway Key 或知识文件。',
      },
      {
        id: 'playground',
        label: '聊天运行',
        description: '聊天主界面、消息发送、模型选择和本地持久化。',
        icon: 'send',
        featureBoundary: '只运行 Chat -> Router -> 本地响应闭环，不编辑 Provider 密钥或网关 Key。',
      },
      {
        id: 'context',
        label: '上下文策略',
        description: '当前会话上下文策略、消息范围、知识引用线索和运行状态。',
        icon: 'braces',
        featureBoundary: '只说明和选择上下文策略，不伪装完整 RAG、Artifacts 或多模型对比。',
      },
    ],
  }),
  defineModule({
    id: 'models',
    label: '模型',
    shortLabel: '模型',
    description: 'Provider、Model、Router、健康测试、模型能力和默认模型策略。',
    icon: 'server-cog',
    children: [
      {
        id: 'providers',
        label: 'Provider 管理',
        description: 'Provider 创建、API Key 保存、secret_ref、Base URL 和连接测试。',
        icon: 'server',
        default: true,
        permission: 'secret:write',
        featureBoundary: '只管理 Provider 和 Provider API Key，不管理 Gateway API Key。',
      },
      {
        id: 'catalog',
        label: '模型目录',
        description: '模型创建、模型列表、能力展示、上下文窗口和健康状态。',
        icon: 'boxes',
        featureBoundary: '只管理模型元数据和能力，不展示聊天记录或网关请求日志。',
      },
      {
        id: 'router',
        label: 'Router 策略',
        description: 'Router 决策、默认模型、fallback 边界和模型健康测试入口。',
        icon: 'route',
        featureBoundary: '只展示当前可用路由和默认策略；规则编辑器尚未作为可执行功能开放。',
      },
    ],
  }),
  defineModule({
    id: 'knowledge',
    label: '知识库',
    shortLabel: '知识',
    description: '知识文件、chunk、索引状态、检索预览和引用来源。',
    icon: 'brain-circuit',
    children: [
      {
        id: 'files',
        label: '知识文件',
        description: '知识文件记录、文本类文件写入、解析状态和重试。',
        icon: 'book-open',
        default: true,
        featureBoundary: '只处理知识文件记录和文本 lexical fallback，不执行 PDF/OCR/vector 假导入。',
      },
      {
        id: 'chunks',
        label: 'Chunk 状态',
        description: 'chunk 数量、lexical fallback、失败原因和重试结果。',
        icon: 'file-text',
        featureBoundary: '只展示已有 chunk/fallback 状态，不伪装向量索引或 rerank。',
      },
      {
        id: 'retrieval',
        label: '检索预览',
        description: '检索预览、引用来源说明和 embedding/vector/rerank 限制。',
        icon: 'search-check',
        status: 'environment-limited',
        featureBoundary: '当前仅展示 lexical fallback 来源，不提供未接入的向量检索执行按钮。',
      },
    ],
  }),
  defineModule({
    id: 'tools',
    label: '工具与 Agent',
    shortLabel: '工具',
    description: 'MCP Server、Agent 定义、dry-run 和执行状态边界。',
    icon: 'bot',
    children: [
      {
        id: 'mcp',
        label: 'MCP Server',
        description: 'MCP Server 注册、transport、授权、拒绝和状态。',
        icon: 'plug-zap',
        default: true,
        permission: 'mcp:manage',
        featureBoundary: '只注册和授权 MCP，不执行未授权工具或危险动作。',
      },
      {
        id: 'agents',
        label: 'Agent 定义',
        description: 'Agent 定义保存、目标、审批策略和 dry-run 入口。',
        icon: 'bot',
        featureBoundary: '只保存 Agent 定义并生成 dry-run，不启动自治后台任务。',
      },
      {
        id: 'runs',
        label: '执行预览',
        description: 'Agent dry-run 记录和未来执行记录边界说明。',
        icon: 'history',
        status: 'environment-limited',
        featureBoundary: '只显示 dry-run 和执行边界，不提供假执行、trace replay 或 workflow canvas。',
      },
    ],
  }),
  defineModule({
    id: 'gateway',
    label: '本地网关',
    shortLabel: '网关',
    description: 'OpenAI-compatible 网关状态、Gateway API Key、端点、请求日志和安全说明。',
    icon: 'key-round',
    children: [
      {
        id: 'overview',
        label: '网关总览',
        description: '监听地址、端点状态、启停控制和 OpenAI-compatible 说明。',
        icon: 'gauge',
        default: true,
        featureBoundary: '只管理本地网关状态和端点，不编辑模型 Provider 密钥。',
      },
      {
        id: 'keys',
        label: 'Gateway Keys',
        description: 'Gateway API Key 生成、一次性显示、撤销、scope 和配额状态。',
        icon: 'key-round',
        permission: 'gateway:key:manage',
        featureBoundary: '只管理外部调用网关 Key，不管理 Provider API Key。',
      },
      {
        id: 'logs',
        label: '请求日志',
        description: '请求日志、错误、用量、网关事件和脱敏详情。',
        icon: 'scroll-text',
        featureBoundary: '只展示网关和请求观测数据，不混入模型配置表单。',
      },
      {
        id: 'docs',
        label: '调用说明',
        description: '本地调用示例、端点说明、scope 校验和安全说明。',
        icon: 'brackets',
        featureBoundary: '只说明如何调用本地 Gateway，不提供 CCS/sub2api 假导入按钮。',
      },
    ],
  }),
  defineModule({
    id: 'data',
    label: '数据配置',
    shortLabel: '数据',
    description: '导入、快照、恢复预检、诊断导出和安全清理说明。',
    icon: 'database',
    children: [
      {
        id: 'import',
        label: '导入预检',
        description: '导入清单预检、无效导入拒绝、ready 计划确认。',
        icon: 'file-check',
        default: true,
        featureBoundary: '只执行 manifest 预检和确认记录，不静默覆盖 Provider、Model 或 secrets。',
      },
      {
        id: 'snapshots',
        label: '快照恢复',
        description: '脱敏快照、快照列表和恢复预检。',
        icon: 'camera',
        featureBoundary: '只创建快照和恢复预检，不直接覆盖本地数据。',
      },
      {
        id: 'diagnostics',
        label: '诊断导出',
        description: '脱敏诊断导出预览、日志路径和故障排查入口。',
        icon: 'triangle-alert',
        featureBoundary: '只生成诊断预览和打开日志，不泄露 secrets。',
      },
      {
        id: 'cleanup',
        label: '安全清理',
        description: '数据清理风险说明、预检依赖和禁用的危险动作。',
        icon: 'trash-2',
        status: 'environment-limited',
        featureBoundary: '只显示安全说明；破坏性清理未实现前不显示可执行按钮。',
      },
    ],
  }),
  defineModule({
    id: 'settings',
    label: '设置与安全',
    shortLabel: '设置',
    description: '主题、语言、密度、字体、减少动效、安全存储、审计日志和运行说明。',
    icon: 'settings',
    children: [
      {
        id: 'preferences',
        label: '界面偏好',
        description: '主题、语言、密度、字体和减少动效。',
        icon: 'sliders-horizontal',
        default: true,
        featureBoundary: '只管理 UI 偏好，不混入业务功能管理。',
      },
      {
        id: 'security',
        label: '安全说明',
        description: 'secret 存储、preload 隔离、IPC 边界、脱敏和 Key 状态。',
        icon: 'shield-check',
        permission: 'security:read',
        featureBoundary: '只说明安全边界和查看脱敏状态，不编辑 Provider 或 Gateway 业务配置。',
      },
      {
        id: 'audit',
        label: '审计日志',
        description: '审计日志、敏感操作、MCP 权限和导入/诊断事件。',
        icon: 'scroll-text',
        permission: 'audit:read',
        featureBoundary: '只展示审计事件，不执行业务动作。',
      },
      {
        id: 'about',
        label: '关于环境',
        description: '版本、路径、运行环境、快捷方式状态和本地限制。',
        icon: 'settings',
        status: 'environment-limited',
        featureBoundary: '只展示当前运行环境和桌面入口状态，不提供不可验证的快捷方式修复按钮。',
      },
    ],
  }),
];

export const moduleRegistry = navModules;

const routeAliases: Record<string, string> = {
  '/': '/workspace/overview',
  '/dashboard': '/workspace/overview',
  '/dashboard/overview': '/workspace/overview',
  '/dashboard/workspaces': '/workspace/overview',
  '/dashboard/activity': '/workspace/activity',
  '/dashboard/quick-actions': '/workspace/overview',
  '/chat/assistants': '/tools/agents',
  '/chat/prompt-lab': '/chat/playground',
  '/chat/comparison': '/chat/context',
  '/chat/artifacts': '/chat/context',
  '/chat/local-history': '/chat/conversations',
  '/models/models': '/models/catalog',
  '/models/capabilities': '/models/providers',
  '/models/templates': '/models/router',
  '/models/health': '/models/router',
  '/knowledge/bases': '/knowledge/files',
  '/knowledge/context': '/knowledge/retrieval',
  '/knowledge/memory': '/knowledge/retrieval',
  '/knowledge/maintenance': '/knowledge/chunks',
  '/tools/tools': '/tools/runs',
  '/tools/workflow': '/tools/runs',
  '/tools/debug': '/tools/runs',
  '/gateway/status': '/gateway/overview',
  '/gateway/virtual-models': '/gateway/docs',
  '/gateway/routes': '/gateway/docs',
  '/gateway/integrations': '/data/import',
  '/data/import-export': '/data/import',
  '/data/backup': '/data/snapshots',
  '/settings/request-logs': '/gateway/logs',
  '/settings/usage': '/gateway/logs',
  '/settings/evals': '/models/router',
  '/settings/diagnostics': '/data/diagnostics',
  '/settings/feedback': '/settings/audit',
  '/settings/users': '/settings/security',
  '/settings/permissions': '/settings/security',
  '/settings/keys': '/settings/security',
  '/settings/ui': '/settings/preferences',
  '/settings/system': '/settings/about',
  '/settings/desktop': '/settings/about',
};

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
