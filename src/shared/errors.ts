export interface Diagnosis {
  code: string;
  title: string;
  reason: string;
  suggestions: string[];
}

export const diagnoses: Diagnosis[] = [
  {
    code: '401',
    title: 'API Key 不可用',
    reason: 'API Key 缺失、失效、过期，或供应商拒绝了当前凭证。',
    suggestions: ['更新 API Key', '检查账户状态', '在供应商详情中重新测试连接'],
  },
  {
    code: '403',
    title: '权限被拒绝',
    reason: '当前 Key 或账户没有调用该模型、端点或区域的权限。',
    suggestions: ['检查模型权限', '切换供应商或模型', '确认代理和组织配置'],
  },
  {
    code: '404',
    title: '端点或模型不存在',
    reason: 'Base URL、路径或模型名称不匹配，常见于重复填写 /v1。',
    suggestions: ['检查 Base URL', '刷新模型列表', '检查别名映射'],
  },
  {
    code: '429',
    title: '触发限流',
    reason: '供应商额度、速率或并发限制已达到。',
    suggestions: ['稍后重试', '切换模型或供应商', '降低并发请求'],
  },
  {
    code: '500',
    title: '供应商服务错误',
    reason: '上游服务返回内部错误或临时不可用。',
    suggestions: ['稍后重试', '查看供应商状态页', '切换备用路由'],
  },
  {
    code: 'timeout',
    title: '请求超时',
    reason: '网络、代理、DNS、防火墙或上游延迟导致请求未能及时完成。',
    suggestions: ['测试代理', '延长超时', '切换网络或供应商'],
  },
  {
    code: 'model_not_found',
    title: '模型不可用',
    reason: '当前供应商没有这个模型，或模型列表还没有更新。',
    suggestions: ['刷新模型列表', '选择其他模型', '检查虚拟模型别名'],
  },
  {
    code: 'stream_interrupted',
    title: '流式输出中断',
    reason: '响应流在结束标记前断开，可能只保存了部分内容。',
    suggestions: ['从部分输出继续', '重试', '切换非流式模式'],
  },
  {
    code: 'sqlite_failure',
    title: '本地数据库读取失败',
    reason: '数据库可能被占用、缺失、损坏，或当前进程没有权限。',
    suggestions: ['关闭重复进程', '重试', '从快照恢复', '导出诊断包'],
  },
  {
    code: 'import_failure',
    title: '配置导入失败',
    reason: '文件格式、字段映射、冲突处理或敏感字段审核没有通过。',
    suggestions: ['查看映射步骤', '跳过无效字段', '使用脱敏模板重新导入'],
  },
];
