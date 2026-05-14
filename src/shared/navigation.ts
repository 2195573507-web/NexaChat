import type { NavModule } from './types.js';

type TabOptions = {
  default?: boolean;
  labelKey?: string;
  descriptionKey?: string;
  permission?: string;
  icon?: string;
};

function tab(moduleId: NavModule['id'], id: string, label: string, stage: NavModule['stage'], description: string, options: TabOptions = {}) {
  return {
    id,
    label,
    stage,
    description,
    default: options.default,
    route: getTabRoute(moduleId, id),
    permission: options.permission,
    icon: options.icon,
    labelKey: options.labelKey ?? `nav.${moduleId}.${id}.label`,
    descriptionKey: options.descriptionKey ?? `nav.${moduleId}.${id}.description`,
  };
}
function moduleRoute(moduleId: NavModule['id'], defaultTabId: string) {
  return `/${moduleId}/${defaultTabId}`;
}

export const navModules: NavModule[] = [
  {
    id: 'dashboard',
    label: '工作台',
    shortLabel: '工作台',
    description: '关键指标、待办、最近活动和常用入口。',
    labelKey: 'module.dashboard.label',
    shortLabelKey: 'module.dashboard.shortLabel',
    descriptionKey: 'module.dashboard.description',
    icon: 'gauge',
    route: moduleRoute('dashboard', 'overview'),
    stage: 'implemented',
    tabs: [
      tab('dashboard', 'overview', '总览', 'implemented', '启动缺口、默认工作区/模型、网关状态与今日用量。', { default: true, icon: 'layout-dashboard' }),
      tab('dashboard', 'workspaces', '待办', 'implemented', '待处理任务、异常提醒、构建进度和工作区默认值。', { icon: 'list-checks' }),
      tab('dashboard', 'activity', '最近活动', 'implemented', '最近会话、请求日志、审计事件和网关事件。', { icon: 'history' }),
      tab('dashboard', 'quick-actions', '快捷操作', 'implemented', '新会话、添加 Provider、导入配置、上传文件和诊断入口。', { icon: 'zap' }),
    ],
  },
  {
    id: 'chat',
    label: '对话',
    shortLabel: '对话',
    description: '会话、助手、Prompt Lab、本地历史和对比/Artifacts 预留。',
    labelKey: 'module.chat.label',
    shortLabelKey: 'module.chat.shortLabel',
    descriptionKey: 'module.chat.description',
    icon: 'message-square-text',
    route: moduleRoute('chat', 'conversations'),
    stage: 'implemented',
    tabs: [
      tab('chat', 'conversations', '会话', 'implemented', '三栏聊天、消息时间线、模型和上下文控制。', { default: true, icon: 'messages-square' }),
      tab('chat', 'assistants', '助手', 'implemented', '助手定义、默认模型、允许的工具/知识和审批策略。', { icon: 'bot' }),
      tab('chat', 'prompt-lab', 'Prompt Lab', 'implemented', 'Prompt 模板预览和现有模型路由测试入口。', { icon: 'braces' }),
      tab('chat', 'comparison', '多模型对比', 'planned', '等待多请求 fan-out、并发取消和对比记录落库。', { icon: 'columns-3' }),
      tab('chat', 'artifacts', 'Artifacts', 'planned', '等待生成文件、预览和编辑器数据模型。', { icon: 'file-box' }),
      tab('chat', 'local-history', '本地历史', 'implemented', '本地会话搜索、收藏/归档筛选和导出说明。', { icon: 'archive' }),
    ],
  },
  {
    id: 'models',
    label: '模型',
    shortLabel: '模型',
    description: 'Provider、模型列表、密钥、路由规则和健康检查。',
    labelKey: 'module.models.label',
    shortLabelKey: 'module.models.shortLabel',
    descriptionKey: 'module.models.description',
    icon: 'server-cog',
    route: moduleRoute('models', 'providers'),
    stage: 'implemented',
    tabs: [
      tab('models', 'providers', '提供商', 'implemented', 'OpenAI、DeepSeek、本地模型等提供商配置。', { default: true, icon: 'server' }),
      tab('models', 'models', '模型列表', 'implemented', '模型能力、上下文、价格/倍率和可用状态。', { icon: 'boxes' }),
      tab('models', 'capabilities', '密钥管理', 'implemented', 'API Key、secret_ref、本地加密边界和连接测试入口。', { permission: 'secret:read', icon: 'key-round' }),
      tab('models', 'templates', '路由规则', 'environment-limited', '默认模型、备用模型和按任务分流的当前边界。', { icon: 'route' }),
      tab('models', 'health', '健康检查', 'implemented', 'Provider/Model 连通性、延迟、错误率和可用性。', { icon: 'activity' }),
    ],
  },
  {
    id: 'knowledge',
    label: '知识库',
    shortLabel: '知识',
    description: '知识库、提示词、共享记忆、导入导出、检索测试和维护。',
    labelKey: 'module.knowledge.label',
    shortLabelKey: 'module.knowledge.shortLabel',
    descriptionKey: 'module.knowledge.description',
    icon: 'brain-circuit',
    route: moduleRoute('knowledge', 'files'),
    stage: 'implemented',
    tabs: [
      tab('knowledge', 'files', '知识库', 'implemented', '文档、索引、检索状态和重试。', { default: true, icon: 'book-open' }),
      tab('knowledge', 'bases', '提示词库', 'planned', '等待提示词模板、分类和版本数据模型。', { icon: 'file-text' }),
      tab('knowledge', 'retrieval', '检索测试', 'planned', '测试问题、召回结果、评分和 embedding/rerank 真实链路。', { icon: 'search-check' }),
      tab('knowledge', 'context', '导入导出', 'implemented', 'JSON/Markdown/配置导入导出和当前上下文策略说明。', { icon: 'import' }),
      tab('knowledge', 'memory', '共享记忆', 'planned', '等待长期记忆、项目记忆、模块记忆和审计链路。', { icon: 'brain' }),
      tab('knowledge', 'maintenance', '清理维护', 'planned', '等待失效内容清理、重复内容合并和维护审计。', { icon: 'wrench' }),
    ],
  },
  {
    id: 'tools',
    label: '工具与 Agent',
    shortLabel: '工具',
    description: 'Agent、工作流、编排、MCP 工具、运行记录和调试回放。',
    labelKey: 'module.tools.label',
    shortLabelKey: 'module.tools.shortLabel',
    descriptionKey: 'module.tools.description',
    icon: 'bot',
    route: moduleRoute('tools', 'mcp'),
    stage: 'implemented',
    tabs: [
      tab('tools', 'tools', '工作流列表', 'reserved', '工作流模板、搜索和分类预留，不提供假执行。', { icon: 'workflow' }),
      tab('tools', 'mcp', 'MCP 工具', 'implemented', 'MCP server 注册、transport、连接状态和授权审批。', { default: true, permission: 'mcp:manage', icon: 'plug-zap' }),
      tab('tools', 'agents', 'Agent 列表', 'implemented', 'Agent 创建、编辑、启用/禁用和审批策略。', { icon: 'bot' }),
      tab('tools', 'runs', '运行记录', 'planned', '执行历史、trace、输入输出和人工确认队列。', { icon: 'history' }),
      tab('tools', 'workflow', '编排画布', 'reserved', '节点、连线、参数配置和工作流画布预留。', { icon: 'git-branch' }),
      tab('tools', 'debug', '调试与回放', 'planned', '失败重试、步骤回放和日志查看。', { icon: 'bug' }),
    ],
  },
  {
    id: 'gateway',
    label: '本地网关',
    shortLabel: '网关',
    description: '网关总览、API Key、兼容接口、导入、调用日志和安全策略。',
    labelKey: 'module.gateway.label',
    shortLabelKey: 'module.gateway.shortLabel',
    descriptionKey: 'module.gateway.description',
    icon: 'key-round',
    route: moduleRoute('gateway', 'status'),
    stage: 'implemented',
    tabs: [
      tab('gateway', 'status', '网关总览', 'implemented', '网关状态、地址、运行端口、调用量和启停控制。', { default: true, icon: 'gauge' }),
      tab('gateway', 'keys', 'API Key 管理', 'implemented', '生成、禁用、权限、备注、过期时间和配额。', { permission: 'gateway:key:manage', icon: 'key-round' }),
      tab('gateway', 'virtual-models', '兼容接口', 'implemented', 'OpenAI-compatible endpoint、/v1/chat/completions、/v1/responses 等。', { icon: 'brackets' }),
      tab('gateway', 'routes', '安全策略', 'implemented', '限流、IP 限制、敏感信息过滤、审计和路由边界。', { permission: 'security:read', icon: 'shield-check' }),
      tab('gateway', 'integrations', 'CCS/sub2api 导入', 'implemented', '一键导入配置、解析、校验和预览。', { icon: 'import' }),
      tab('gateway', 'logs', '调用日志', 'implemented', '请求、响应、错误、耗时、token 和 request log 关联。', { icon: 'scroll-text' }),
    ],
  },
  {
    id: 'data',
    label: '数据配置',
    shortLabel: '数据',
    description: '智能导入、导入导出、备份恢复、快照和数据清理。',
    labelKey: 'module.data.label',
    shortLabelKey: 'module.data.shortLabel',
    descriptionKey: 'module.data.description',
    icon: 'database',
    route: moduleRoute('data', 'import'),
    stage: 'implemented',
    tabs: [
      tab('data', 'import', '智能导入预检', 'implemented', '导入清单编辑、检测、预览、冲突和确认步骤。', { default: true, icon: 'file-check' }),
      tab('data', 'import-export', '导入导出', 'planned', '等待冲突解决器后开放 provider/model/assistant/prompt/chat 导入导出。', { icon: 'import' }),
      tab('data', 'backup', '备份恢复', 'planned', '等待脱敏备份、加密完整备份和恢复确认链路。', { icon: 'hard-drive-download' }),
      tab('data', 'snapshots', '配置快照', 'implemented', '快照列表、创建快照、恢复预检和脱敏状态。', { icon: 'camera' }),
      tab('data', 'cleanup', '数据清理', 'planned', '等待已审计的破坏性清理预览和确认流程。', { permission: 'data:cleanup', icon: 'trash-2' }),
    ],
  },
  {
    id: 'settings',
    label: '设置与安全',
    shortLabel: '设置',
    description: '用户、权限、审计、安全中心、系统设置、数据维护和桌面入口。',
    labelKey: 'module.settings.label',
    shortLabelKey: 'module.settings.shortLabel',
    descriptionKey: 'module.settings.description',
    icon: 'settings',
    route: moduleRoute('settings', 'request-logs'),
    stage: 'implemented',
    tabs: [
      tab('settings', 'request-logs', '运行监控', 'implemented', '请求量、成功率、延迟和请求日志。', { default: true, icon: 'activity' }),
      tab('settings', 'usage', 'Token 统计', 'implemented', '输入/输出 token、成本和模型占比。', { icon: 'chart-no-axes-column' }),
      tab('settings', 'evals', '评测任务', 'planned', '等待 eval set、评分器和模型对比测试链路。', { icon: 'clipboard-check' }),
      tab('settings', 'diagnostics', '错误中心', 'implemented', '异常聚合、错误详情和修复建议。', { icon: 'triangle-alert' }),
      tab('settings', 'feedback', '用户反馈', 'planned', '反馈列表、标记和处理状态待接入。', { icon: 'message-square-text' }),
      tab('settings', 'users', '用户管理', 'planned', '用户列表、角色、启用/禁用和重置密码待接入。', { permission: 'admin:users', icon: 'users' }),
      tab('settings', 'permissions', '权限管理', 'planned', 'RBAC、资源 ACL 和模块权限待接入。', { permission: 'admin:permissions', icon: 'shield-check' }),
      tab('settings', 'keys', '安全中心', 'implemented', '密钥保护、会话策略、敏感数据检查和 redaction。', { permission: 'security:read', icon: 'shield-check' }),
      tab('settings', 'audit', '审计日志', 'implemented', '登录、权限变更、敏感操作、导出和 MCP 权限审计。', { permission: 'audit:read', icon: 'scroll-text' }),
      tab('settings', 'ui', '系统设置', 'implemented', '语言、主题、字体、启动项和界面偏好。', { icon: 'sliders-horizontal' }),
      tab('settings', 'system', '数据维护', 'implemented', '备份、恢复、清理、迁移和诊断导出。', { permission: 'system:maintain', icon: 'settings' }),
      tab('settings', 'desktop', '桌面入口', 'environment-limited', '快捷方式状态、图标、启动目标检查和重新关联记录。', { permission: 'system:shortcut', icon: 'hard-drive-download' }),
    ],
  },
];

export function getDefaultTab(module: NavModule) {
  return module.tabs.find((candidate) => candidate.default) ?? module.tabs[0];
}

export function getTabRoute(moduleId: NavModule['id'], tabId: string) {
  return `/${moduleId}/${tabId}`;
}

export function resolveNavigation(pathname: string) {
  const [moduleSegment, tabSegment] = pathname.replace(/^\/+/, '').split('/');
  const module = navModules.find((candidate) => candidate.id === moduleSegment) ?? navModules[0];
  const defaultTab = getDefaultTab(module);
  const tab = module.tabs.find((candidate) => candidate.id === tabSegment) ?? defaultTab;
  const route = tab.route ?? getTabRoute(module.id, tab.id);
  return {
    module,
    tab,
    route,
    replaced: moduleSegment !== module.id || pathname !== route,
  };
}
