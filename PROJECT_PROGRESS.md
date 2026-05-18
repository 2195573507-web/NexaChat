# NexaChat 项目进度

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
