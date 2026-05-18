# NexaChat 项目进度

## 2026-05-18 Provider Smart Add
### 实际根目录
- `D:/NexaChat`

### 已完成
- 在 Models / Providers 区域实现 CCS-style Provider Smart Add：默认只显示 Provider 网站/API 地址、API Key 和“检测 Provider”。
- 检测预览在用户确认前展示规范化 Base URL、兼容性、模型数量、模型示例、Chat/Embedding/Streaming/Usage 能力状态、警告和错误。
- 高级设置默认折叠，保留真实已接线字段：Provider name、Provider type、Base URL、Custom headers JSON、手动保存。
- Renderer 不直接请求外部 Provider；所有探测通过 main process Provider discovery service。
- 保存检测结果时复用现有 `createProvider` 和 `createModel` 路径，继续走 secret_ref、权限、审计和现有模型持久化逻辑。
- 未声称不可验证能力：Embeddings 保持 `not_tested`，Streaming 检测结果保持 `unknown/not_tested`，Token usage 只在轻量 Chat 测试返回 usage 时标记 supported。

### 文件变更
- `src/main/services/providerDiscovery.ts`
- `src/main/services/providerService.ts`
- `src/main/services/serviceContext.ts`
- `src/main/services/storeBoundaries.ts`
- `src/main/ipc.ts`
- `src/preload/index.ts`
- `src/shared/types.ts`
- `src/shared/api.ts`
- `src/shared/ipc.ts`
- `src/shared/securityRuntime.ts`
- `src/shared/i18n.ts`
- `src/renderer/modules/ModelsPage.tsx`
- `src/renderer/styles/pages.css`
- `src/renderer/mockApi.ts`
- `tests/provider-discovery.test.ts`
- `tests/provider-store-integration.test.ts`
- `tests/app.test.tsx`
- `tests/ipc-contract.test.ts`
- `tests/ui-smoke.spec.ts`
- `task_plan.md`
- `findings.md`
- `progress.md`

### 已验证
- `git rev-parse --show-toplevel` -> `D:/NexaChat`
- `git status --short` -> 初始干净
- `npm.cmd run typecheck` -> 通过
- `npm.cmd run test` -> 25 files / 108 tests 通过
- `npm.cmd run build` -> 通过
- `npm.cmd run test:ui-smoke` -> 7 tests 通过
- `npm.cmd run test:electron-smoke` -> 通过
- `git diff --check` -> 通过，仅 Windows 行尾提示
- 脱敏补丁后复验：`npm.cmd run typecheck`、`npm.cmd run test -- tests/provider-discovery.test.ts tests/provider-store-integration.test.ts tests/app.test.tsx`、`git diff --check` -> 通过

### Commit / Push
- 实现提交：`3426c6d88207d0a35ea0e0fecdcb5e5ad29e6e29`
- Push 结果：待推送后确认。

### 遗留风险
- 当前 Provider discovery 只实现 OpenAI-compatible 安全探测；不加入 provider-specific hacks。
- Embeddings upstream detection 未接入现有 Provider adapter，因此预览中保持未测试。
- Streaming 只根据现有 chat adapter 能力边界保守展示，不伪造支持结论。

## 2026-05-18 架构与维护性清理

### 已完成

- 完成全仓库审计，确认当前主线仍为 chat-first 7 模块：Chat、Models、Knowledge Base、Tools、Gateway、Data、Settings。
- 保留根路由 `/ -> /chat/conversations`，未引入旧首页优先或旧 8 模块逻辑。
- 删除未被调用的 `src/main/services/openAiCompatibleAdapter.ts` 兼容 re-export，Provider 运行时入口统一保留在 `src/main/adapters/openAiCompatibleAdapter.ts`。
- 修复 README 中文 mojibake，使项目说明、模块、路由、技术栈和能力边界可读。
- 将 `react`、`react-dom`、`lucide-react` 保留为运行依赖，把 Electron、Vite、测试和构建工具整理为开发依赖，降低 package 运行时依赖面。
- 强化 Electron 主进程外部链接边界：只允许 `https:` 和 `mailto:` 通过 `shell.openExternal`，并阻止非当前页的 renderer 导航。
- 让 `scan:duplicates` 直接分析 TypeScript 源文件，不再要求先生成 `dist-electron`。
- 更新质量门 docs 检查，匹配当前中文 README，并允许保留本长期进度文件。

### 已验证

- `npm.cmd run typecheck`
- `npm.cmd run test`
- `npm.cmd run build`
- `npm.cmd run test:ui-smoke`
- `npm.cmd run test:electron-smoke`
- `npm.cmd run scan:hardcode`
- `npm.cmd run scan:duplicates`
- `npm.cmd run scan:security`
- `npm.cmd run scan:dead-links`
- `npm.cmd run scan:docs`
- `npm.cmd run scan:quality`

### 不存在的可选命令

- `npm.cmd run lint`
- `npm.cmd run format:check`
- `npm.cmd run depcheck`
- `npm.cmd run knip`

### 后续建议

- `src/main/services/serviceContext.ts` 仍是最大主进程聚合层，建议后续以测试护栏为前提继续把共享 helper 和领域服务边界拆薄。
- `src/renderer/mockApi.ts` 仍是较大的浏览器 fallback 文件，但它支撑 UI smoke 和无 preload 浏览器验证，本轮未拆分。
- `src/shared/i18n.ts` 体量较大，且保留历史 `nav.workspace.*` 翻译键；当前未被导航注册使用，后续可在更专门的 i18n 清理轮中安全移除。
