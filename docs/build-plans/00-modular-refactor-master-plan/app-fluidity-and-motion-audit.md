# NexaChat App 操作流畅度与 Motion 专项调研

## 1. 调研范围

本轮只做只读调研和报告交付。除本文件外，没有修改源码、配置、样式、测试或其它文档，也没有 commit、push。

调研按两个方向并行推进：

- 方向 A：Renderer / React / CSS / 动画 / 交互反馈，重点看 `src/renderer`、`src/renderer/modules`、`src/renderer/components`、`src/renderer/styles`、`tests/app.test.tsx`、`tests/ui-smoke.spec.ts`。
- 方向 B：Main process / IPC / SQLite / 数据加载 / 后台任务，重点看 `src/main`、`src/preload`、`src/shared`、`src/main/database`、`src/main/repositories`、`tests`、`docs/testing`、`package.json`。

可用工具 / 插件 / skill 检查结果：

- 已按前置要求先读取并使用 `using-superpowers` skill；本机 `using-superpower` 单数路径不存在，`using-superpowers` 存在。
- 相关 UI 调研使用了 `impeccable` skill 的审计原则，但没有执行任何 UI 改造。
- `planning-with-files-zh` 和 `ralph-loop` 也适用于长任务；由于用户要求本轮只允许写入本报告文件，未创建额外计划文件，改用内置计划追踪。
- Codex 插件缓存中可见 `openai-bundled`、`openai-bundled-beta`、`openai-curated`、`openai-primary-runtime`；本轮未打开浏览器做视觉改造。
- MCP resource / template 查询结果为空。

## 2. 当前 Git 信息

真实项目根目录通过命令确认：

```powershell
$root = git rev-parse --show-toplevel
Set-Location $root
```

结果：

- Repo root：`D:/NexaChat`
- 初始 `git status --short`：无输出，工作区干净
- 当前分支：`main`
- 当前 HEAD：`1813d12f4a52ef04c20fc93cfc42493c20d71e18`

本报告写入前再次确认 `git status --short` 仍无输出。

## 3. 当前验证命令结果

| 命令 | 结果 | 关键输出 |
|---|---:|---|
| `git rev-parse --show-toplevel` | 通过 | `D:/NexaChat` |
| `git status --short` | 通过 | 初始无输出 |
| `git branch --show-current` | 通过 | `main` |
| `git rev-parse HEAD` | 通过 | `1813d12f4a52ef04c20fc93cfc42493c20d71e18` |
| `npm.cmd run typecheck` | 通过 | `tsc --noEmit` 无错误 |
| `npm.cmd run test` | 通过 | `22 passed`, `81 passed` |
| `npm.cmd run build` | 通过 | renderer CSS `24.90 kB`, JS `432.00 kB`, main build 通过 |
| `npm.cmd run test:ui-smoke` | 通过 | Playwright `7 passed` |
| `npm.cmd run test:electron-smoke` | 通过 | `Electron smoke rendered the NexaChat shell.` |

注意：`npm.cmd run test` 输出了多条 `node:sqlite` ExperimentalWarning，这是运行时警告，不是失败。

## 4. Renderer / React 流畅度问题

### 4.1 页面切换与重渲染边界

当前不是“所有模块同时渲染”的模式。`src/renderer/App.tsx` 通过 `modulePageRegistry[activeModuleId]` 只渲染当前一级模块页面，Shell 由 `AppFrame` 固定承载。

但是页面切换仍会触发：

- `App.tsx:20-23` 根组件持有 `snapshot`、`navigationState`、`busy`、`notice`。
- `App.tsx:136-144` 每次 render 都重新创建 `ActivePage` 元素，并把完整 `snapshot` 传入页面。
- `App.tsx:69-80` 所有 `onAction` 完成后都会 `await refresh()`，也就是重新拉全量 `api.getSnapshot()` 并 `setSnapshot()`。
- `src/renderer/components/AppFrame.tsx:112-185` Shell 组件也吃完整 `snapshot`，因此每次 snapshot 更新都会重渲染 rail、top tabs、command bar 和当前模块。

结论：模块页面之间没有同时渲染，但一个小操作会导致 `App`、`AppFrame`、当前模块页面一起重渲染。随着 snapshot 增大，这会成为操作手感瓶颈。

### 4.2 一级导航 / 二级导航 / Shell 边界

当前边界相对清楚：

- 一级导航：`src/renderer/components/AppFrame.tsx` 的 `.module-rail`。
- 二级导航：同文件 `.top-tabs`。
- 顶部栏：`.command-bar`。
- 主内容：`.module-page` 内部只挂载当前 `ActivePage`。
- 路由权威：`src/shared/navigation.ts`，测试也断言 7 个一级模块。

问题在于边界清楚但数据边界不清。`AppFrame` 与所有页面共享同一个大 `AppSnapshot`，导致 Shell 与业务页面的更新粒度没有隔离。

### 4.3 状态变化扩大化

明显扩大化位置：

- `App.tsx:69-80` 的 `runAction()` 是全局 busy + 全量刷新。
- `App.tsx:20` 的 `snapshot` 是一个大对象，任何局部写入都会替换整个对象。
- `App.tsx:142` 把 `onAction={(label, action) => runAction(label, action)}` 作为 inline function 传给页面。
- `ChatPage.tsx:84-91` Chat 页面自身也有大量局部 state，但消息、会话、模型、知识库、MCP 等数据仍从全局 snapshot 读取。

用户感知后果：

- Provider 测试、知识库导入、Gateway 开关、数据备份、审计校验等动作只改变一个区域，却会刷新整个当前模块和 Shell。
- 全局 `busy` 只显示顶层 notice，按钮和具体行没有统一 pending 状态。

### 4.4 memo / useMemo / useCallback / 组件拆分

当前项目几乎没有 memo 化边界：

- 搜索结果显示没有 `React.memo`、`memo(`、`useCallback`、`useDeferredValue`、`startTransition`、`Suspense/lazy`。
- 仅少量 `useMemo`：`AppFrame.tsx:121`、`ChatPage.tsx:103`、`KnowledgePage.tsx:19`、`ModelsPage.tsx:34-39`。
- 大页面文件明显偏大：`ChatPage.tsx` 约 25 KB，`ModelsPage.tsx` 约 18 KB，`GatewayPage.tsx` 约 18 KB，`SettingsPage.tsx` 约 18 KB，`AppFrame.tsx` 约 16 KB。

结论：现在的结构适合早期快速交付，但不适合后续追求细粒度流畅度。优先拆 container / view / row component / service hook。

## 5. CSS / 动画 / Motion 问题

### 5.1 是否有统一动画系统

当前没有统一 motion token 或 motion system。

证据：

- `src/renderer/styles/tokens.css` 定义颜色、字体、间距、半径、阴影和 rail 宽度，但没有 `--motion-*`、`--duration-*`、`--ease-*`。
- `src/renderer/styles/base.css:36` 只有全局 button transition：`background 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out, transform 150ms ease-out`。
- 全仓没有 `@keyframes` 或 CSS `animation:`。
- `src/renderer/modules/progressiveReveal.ts` 是聊天内容的 JS 分段显示，不是统一 UI motion 系统。

### 5.2 动画散落程度

当前动画很少，不是“过多过花”的问题，而是“缺统一反馈和过渡”的问题。

已有动效：

- 按钮 hover / active，`base.css:36-45`。
- `ChatPage.tsx:210-214` 消息区自动滚动使用 `behavior: 'smooth'`。
- `ChatPage.tsx:172-183` 通过 `setTimeout` 做 renderer-side progressive reveal。

缺失动效：

- 页面切换没有过渡。
- 弹窗/抽屉当前基本不是主形态，Chat detail panel 直接条件渲染，没有进出过渡。
- 列表项进入、消息生成、toast / notice、loading / pending、菜单、状态反馈没有统一 motion 规范。

### 5.3 Reduced motion

UI 偏好里有 reduced motion：

- 类型：`src/shared/types.ts` 的 `UiPreferences.reducedMotion`。
- 设置页：`src/renderer/modules/SettingsPage.tsx:261-264`。
- mock 默认值：`src/renderer/mockApi.ts:473`。
- UI smoke 只选择了 reduced：`tests/ui-smoke.spec.ts:253`。

但没有实际执行：

- `AppFrame.tsx:140` 的 className 包含 theme / density / font / mode，没有 `reduced-motion` class。
- CSS 没有 `@media (prefers-reduced-motion: reduce)`。
- `ChatPage.tsx:210-211` smooth scroll 不看 reduced motion。
- `progressiveReveal.ts` 的 delay 不看 reduced motion。

结论：当前 reduced motion 是持久化偏好，不是行为约束。

### 5.4 CSS 性能风险

整体 CSS 比之前的 glass/blur 方向更轻，但仍有几个风险：

- `.chat-main` 使用 `box-shadow: var(--shadow-panel)`，token 为 `0 16px 44px`，在大区域滚动容器上有一定绘制成本。
- `.module-page`、`.message-timeline`、`.conversation-groups`、`.conversation-scroll` 都是滚动区域，但没有虚拟化配合。
- `.chat-first-layout.detail-open` 改变 `grid-template-columns`。目前没有动画，风险不大；未来如果动画化，不应直接动画 grid/width。
- `textarea { resize: vertical; }` 和 chat composer 可变高度会引起 layout，但属于可控交互。
- 没有 `backdrop-filter`、复杂 blur、大面积 CSS animation，这是好的。

## 6. Chat 交互与流式输出问题

### 6.1 发送消息后的状态流转

Renderer：

1. `ChatPage.tsx:350` ChatInput `onSend` 进入 `onAction(t('chat.toast.sent'), sendCurrentMessage)`。
2. `App.tsx:69-80` 设置全局 `busy=true`。
3. `ChatPage.tsx:132-146` 创建 `clientRequestId`，设置本地 `generation.phase='queued'`，清空 draft。
4. `ChatPage.tsx:148` 切到 `sending`。
5. `ChatPage.tsx:149-155` 调 `api.sendMessage(...)`。
6. IPC 完成后 `ChatPage.tsx:162-163` 切到 `generating`，执行 `revealResponse()`。
7. `ChatPage.tsx:172-183` 按 `progressiveReveal.ts` 的 frame 用 `setTimeout` 显示内容。
8. `App.tsx:74` `runAction()` 在 action 完成后再全量 `refresh()`。

Main：

1. `src/main/ipc.ts:52` `chat:sendMessage` 调 `store.sendMessage(input)`。
2. `src/main/services/chatService.ts:260` 进入 `sendMessage()`。
3. 先同步写 user message、request log、assistant placeholder、message chunk。
4. `chatService.ts:425` 调 `invokeOpenAiCompatibleChat(providerInput)`。
5. 完成后同步更新 messages、message_chunks、request_logs、usage_records。
6. 返回完整 `ChatResponse`。

### 6.2 是否支持 token / chunk 级 UI 流式输出

底层 provider adapter 支持解析 stream：

- `src/main/adapters/openAiCompatibleAdapter.ts:70` `invokeOpenAiCompatibleChat()`。
- `src/main/adapters/openAiCompatibleAdapter.ts:113` 根据 `stream` 选择 `parseStreamingResponse()`。
- `src/main/adapters/openAiCompatibleAdapter.ts:283` `parseStreamingResponse()` 会读 `response.body.getReader()` 并收集 chunks。
- `tests/provider-adapter.test.ts` 覆盖了 streaming chunks parsing。

但 UI 不支持真正的 token / chunk 级 streaming：

- `src/main/ipc.ts` 只有 `ipcMain.handle()` invoke-response，没有 `webContents.send` / progress event / stream event。
- `src/shared/ipc.ts` 只定义 invoke args，缺少 `chat:chunk`、`chat:progress`、`task:progress` 这类事件契约。
- `ChatService.sendMessage()` 等 provider 完成后才返回完整 `ChatResponse`。
- Renderer 的 progressive reveal 是 `renderer-side-progressive-reveal`，是完成后的视觉模拟，不是后端 chunk 到达。

当前阻塞点在 IPC 和服务契约：stream chunks 被 adapter 收集到了 `result.chunks`，但没有边读边发给 renderer。

### 6.3 当前聊天反馈链路的问题

优点：

- 有本地 generation 状态，慢响应时能显示 `.generation-progress`。
- 支持取消，`clientRequestId` 与 main 的 `activeChatControllers` 能关联。
- 有测试覆盖慢响应取消：`tests/app.test.tsx:95-145`。

问题：

- 用户点击发送后，用户自己的消息没有明确的 optimistic bubble。draft 清空后主要看到 assistant generation bubble，用户输入内容要等 `refresh()` 后才从 snapshot 消息列表出现。
- assistant 真实响应在 IPC 完成后才进入 renderer。所谓逐段生成是完成后的 reveal。
- `revealResponse()` 每个 frame 都 `setGeneration()`，同时 `ChatPage.tsx:210-211` 每个 visibleContent 更新都会 smooth scroll，长回复可能触发频繁滚动动画。
- retry / regenerate / compare models 走 `onAction()`，没有 Chat 专属 generation state。
- compare models 在 `chatService.ts:204-214` 顺序 `for...of await sendMessage()`，没有并发和每模型进度。

## 7. 数据加载与长列表问题

### 7.1 当前列表是否分页

没有真正的分页 API。部分 repository 有硬编码 LIMIT，部分无上限。

无上限或高风险：

- `src/main/repositories/chatRepository.ts:24` conversations 全量。
- `chatRepository.ts:31-35` messages 全量，未传 conversationId 时读取所有未删除 messages。
- `src/main/repositories/knowledgeRepository.ts:20` knowledge files 全量。
- `src/main/repositories/securityRepository.ts` users / roles / sessions / acl grants 全量。
- `src/main/repositories/modelRepository.ts` models 全量。
- `src/main/repositories/providerRepository.ts` providers 全量。

有限但不是分页：

- `message_chunks` 默认 `LIMIT 500`。
- `message_attachments` 默认 `LIMIT 200`。
- `gateway_logs` `LIMIT 100`。
- `request_logs` / `usage_records` / `feedback_items` `LIMIT 200`。
- `audit_logs` `LIMIT 100`。
- data jobs / backups / migrations 等 `LIMIT 50/100`。

Renderer 多处只是先拿全量 snapshot，再 `slice()` 展示，例如 Gateway logs/usage `slice(0,12)`、Knowledge chunks `slice(0,16)`、Settings audit `slice(0,14)`。

### 7.2 哪些页面最可能卡顿

- Chat：conversation 全量、messages 全量、message bubble 无虚拟化，搜索按 snapshot conversations 过滤。
- Knowledge：files 全量，chunks 默认 500，retrieval 结果和 citations 全在 snapshot 内。
- Gateway / Settings：usage/request/audit logs 有 LIMIT，但 snapshot 仍每次重拉，趋势图和 filter 在 renderer 做。
- Data：jobs/backups/rollback/conflict 列表按硬编码 LIMIT，但加密备份和 restore preflight 的主进程 CPU 工作更重。
- Tools：execution steps/events 默认 300，后续真实 Agent 执行会放大。

### 7.3 重复请求 / 重复 DB 读取

`src/main/services/dashboardService.ts:11-51` 的 `getSnapshot()` 每次拉取完整对象，并且 `getDashboardSummary()` 内部又重复调用 providers、models、usage、conversations、gatewayKeys。

`getSnapshot()` 同时包含：

- `dashboard: this.getDashboardSummary()`
- `conversations: this.getConversations()`
- `messages: this.getMessages()`
- `requestLogs: this.getRequestLogs()`
- `observability: this.queryObservability()`
- `auditIntegrity: this.verifyAuditIntegrity({ persistAudit: false })`

这意味着一次普通按钮保存后的 `refresh()` 会触发多组同步 SQLite 查询和审计 hash 计算。

## 8. Electron / IPC / 主进程阻塞风险

### 8.1 IPC 形态

`src/main/ipc.ts:36-39` 使用统一 `ipcMain.handle()`，每个 channel 都是 request-response。

`src/preload/index.ts:33-86` 也只是 `ipcRenderer.invoke(channel, ...args)` 的薄封装。

当前缺少：

- progress event。
- stream event。
- long task id。
- cancel token 通用契约。
- partial update / patch snapshot。

### 8.2 主进程耗时任务位置

当前都在 Electron main process 的服务层执行：

- Provider 测试 / 模型拉取：`providerService.ts`、`modelService.ts` 调 adapter fetch。
- Chat provider 请求：`chatService.ts:425`。
- Knowledge 文件分块 / embedding：`knowledgeService.ts:56`、`knowledgeService.ts:124`，`serviceContext.ts` 的 `lexicalEmbedding`。
- Knowledge retrieval：`serviceContext.ts` 从 chunks 和 embeddings 读出后在 JS 里 scoring。
- 数据备份 / 恢复：`dataService.ts` 调 `createEncryptedBackupPackage()`，`serviceContext.ts:1642` 使用 `pbkdf2Sync`。
- 审计完整性：`auditService.ts:37-72` 读取全部 audit logs 并计算 hash。
- 本地 Gateway：`localGateway.ts` 在主进程 HTTP server 中工作。

这些任务不一定都会阻塞 renderer 线程，但会占用 Electron main process，影响 IPC 响应、窗口事件、取消请求和整体桌面手感。

### 8.3 需要后台任务队列的位置

优先候选：

- Chat streaming：provider stream -> main task -> renderer chunk event。
- Knowledge import/rebuild：parse/chunk/embed 分批处理，发进度。
- Data backup/restore：PBKDF2 / AES / JSON parse/stringify 移到 worker thread。
- Audit verify/export：分批 hash，支持 cancel。
- Gateway logs/query/export：分页查询，支持 request id。
- Eval run / provider test / model fetch：统一 task status。

## 9. SQLite / 查询 / 日志统计风险

### 9.1 现有索引

Schema 已覆盖不少核心索引：

- conversations：`idx_conversations_workspace_updated`、`idx_conversations_status`、`idx_conversations_pinned`。
- messages：`idx_messages_conversation_created`、`idx_messages_conversation_status`、`idx_messages_request_log` 等。
- knowledge chunks：`idx_knowledge_chunks_file_position`、`idx_knowledge_chunks_status`。
- request logs：`idx_request_logs_conversation`、`idx_request_logs_provider_model`、`idx_request_logs_status`。

### 9.2 缺口

高风险缺口：

- `gateway_logs` 当前查询 `ORDER BY created_at DESC LIMIT 100`，schema 未见 `created_at` 索引。
- `usage_records` 当前查询 `ORDER BY created_at DESC LIMIT 200`，schema 未见 `created_at` 或 workspace/date 索引。
- `audit_logs` 当前查询和 verify 依赖 `created_at`，schema 未见明显索引。
- `provider_health_records` 有索引，但全量 snapshot 每次仍取 `LIMIT 200`。
- `getMessages()` 未传 conversationId 时全量 messages，后续应避免全局消息读取。

### 9.3 日志统计风险

`buildUsageTrend(snapshot.usageRecords)` 在 renderer 运行，只基于 snapshot 中最近 200 条。短期够用，长期会出现：

- 趋势统计不完整。
- 大量数据时 main 读取和 renderer 聚合都变重。
- 缺少按时间范围分页 / 聚合查询。

## 10. 用户可感知卡顿点清单

- 首次加载：`App.tsx:25-30` 等完整 `getSnapshot()` 才显示 AppFrame，期间只有 boot screen。
- 普通按钮点击：`runAction()` 设置全局 busy，但按钮本身不一定进入 pending，用户会觉得点击局部控件后反馈不贴近控件。
- Chat 发送：draft 消失，用户消息不是明确 optimistic bubble，assistant reveal 不是真实 streaming。
- Chat 长回复：progressive reveal 多次 setState + smooth scroll，可能造成滚动抖动。
- Provider test / model fetch：catalog 有局部 loading，provider row test 没有 row-local pending。
- Knowledge import/rebuild：可能同步分块和 embedding，UI 只看到全局 busy。
- Data encrypted backup / restore：PBKDF2 同步 CPU 工作在 main process，可能拖慢 IPC。
- Gateway start/stop：只等 invoke 返回后 refresh，缺少启动中状态和失败阶段。
- Audit verify/export：可能扫描全部 audit logs，缺少进度。
- 长列表滚动：Chat messages、conversations、knowledge files 无虚拟化。

## 11. 建议引入的统一 Motion 规范

建议先做轻量 motion，不引入重型 JS animation 库。

Token：

```css
:root {
  --motion-fast: 90ms;
  --motion-base: 140ms;
  --motion-slow: 220ms;
  --ease-out-standard: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-standard: cubic-bezier(0.32, 0, 0.67, 0);
}

.motion-reduced,
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 1ms !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

使用原则：

- 页面切换：只对内容区做 `opacity + transform: translateY(4px)`，不动 Shell。
- 列表项：新增/删除用 `opacity + transform`，不要动画 height。
- Chat chunk：真实 chunk 到达时只更新 text，不做复杂 layout animation。
- 按钮：保留 90-140ms hover/active，active 用 transform 1px 即可。
- Notice / toast：140ms fade/slide，最多 220ms。
- Sidebar/detail panel：优先固定宽度切换或 overlay，动画 transform，不动画 grid-template-columns。
- reduced motion：关闭 smooth scroll 和 progressive reveal delay。

## 12. 建议引入的交互反馈规范

建议给所有异步动作统一四层反馈：

1. Immediate：点击 0-100ms 内按钮进入 pressed / pending，局部区域出现状态。
2. Pending：超过 250ms 显示 spinner/skeleton/progress text。
3. Progress：超过 1s 的任务必须有阶段，例如 parsing / indexing / embedding / saving / verifying。
4. Completion：成功或失败必须贴近操作位置，并同步全局 notice。

具体规范：

- Chat：立即显示 user optimistic bubble，再显示 assistant pending bubble。
- Provider test / model fetch：row-local pending，显示 endpoint、elapsed、cancel/timeout。
- Knowledge import：显示 file read、chunking、embedding、indexed count。
- Data backup/restore：显示加密、生成、校验、写入阶段，可 cancel。
- Gateway toggle：显示 starting / listening / failed / stopped。
- Audit/log query：显示查询条件、结果数量、耗时。
- Long list：初次进入显示 skeleton，不要等全量 snapshot 完整后才出现局部内容。

## 13. P0 / P1 / P2 优先级路线图

### P0-1：全局 snapshot refresh 导致小操作大范围重渲染

1. 问题位置：`src/renderer/App.tsx:20-80`，`src/main/services/dashboardService.ts:11-51`，`src/renderer/components/AppFrame.tsx:112-185`。
2. 当前现象：所有 `onAction()` 成功后都 `api.getSnapshot()`，并把完整 snapshot 传给 Shell 和当前页面。
3. 为什么影响流畅度：一个局部按钮会重拉全量数据并重渲染 Shell + 当前模块，数据变大后点击反馈会变迟钝。
4. 建议怎么改：先引入局部 action result patch，至少 Chat / Provider / Gateway / Knowledge 不必每次全量 refresh；AppFrame 只接收 shell 所需 summary。
5. 改动风险：中等，可能造成局部状态和 snapshot 不一致。
6. 测试：新增 renderer action patch 测试，断言 Provider test 只更新 provider health 区域；保留 `test:ui-smoke`。
7. 是否可能影响现有功能：会影响所有 `onAction` 路径，需要分批改。
8. 验收标准：点击 Provider test / Gateway toggle / pin conversation 时 100ms 内有局部 pending；操作完成后不依赖整页闪烁式刷新。

### P0-2：Chat 发送不是真实 optimistic + streaming 体验

1. 问题位置：`src/renderer/modules/ChatPage.tsx:132-183`，`src/main/services/chatService.ts:260-579`，`src/main/ipc.ts:52`，`src/shared/ipc.ts:33-143`。
2. 当前现象：Renderer 先显示 assistant generation bubble，真实 assistant 内容等 IPC 完成后才 renderer-side progressive reveal；用户消息不是明确 optimistic bubble。
3. 为什么影响流畅度：用户会感觉“发送后输入消失，回答突然开始”，不像 ChatGPT 的即时消息落位和首 chunk 到达。
4. 建议怎么改：新增 chat request task contract，renderer 立即插入 optimistic user message 和 assistant pending message；main 通过 chunk/progress event 推送真实 chunks。
5. 改动风险：高，涉及 IPC、ChatService、adapter、message persistence、cancel、tests。
6. 测试：新增 `chat:stream` IPC contract test、renderer 首 chunk test、cancel in-flight stream test、provider stream integration test。
7. 是否可能影响现有功能：会影响 send/retry/regenerate/compare/export 和 request logs。
8. 验收标准：点击发送后 100ms 内用户 bubble 出现；真实首个 assistant chunk 到达即显示；取消后不再追加 late chunks。

### P0-3：reduced motion 设置没有实际约束

1. 问题位置：`src/renderer/modules/SettingsPage.tsx:261-264`，`src/renderer/components/AppFrame.tsx:140`，`src/renderer/modules/ChatPage.tsx:210-211`，`src/renderer/modules/progressiveReveal.ts`。
2. 当前现象：偏好可保存，但没有 CSS class、没有 media query、smooth scroll 和 reveal delay 不受影响。
3. 为什么影响流畅度：用户选择减少动效后仍会 smooth scroll 和分段 reveal，体验不一致，也影响敏感用户。
4. 建议怎么改：AppFrame 加 `motion-reduced` class；CSS 加 `prefers-reduced-motion`；Chat auto-scroll 在 reduced 下用 instant；reveal delay 置 0 或最小。
5. 改动风险：低到中，主要影响视觉节奏。
6. 测试：扩展 `tests/ui-smoke.spec.ts`，选择 reduced 后断言 `.app-frame.motion-reduced`；新增 progressive reveal reduced test。
7. 是否可能影响现有功能：不会影响业务数据，只影响动画和滚动。
8. 验收标准：reduced motion 下无 smooth scroll，无多帧 reveal，无超过 1ms 的 transition。

### P0-4：慢操作缺少贴近控件的 pending / progress

1. 问题位置：`src/renderer/App.tsx:69-80`，`ModelsPage.tsx:126-145`，`KnowledgePage.tsx:108-197`，`GatewayPage.tsx:162`，`DataPage.tsx:31-172`，`SettingsPage.tsx:32-204`。
2. 当前现象：多数动作只通过全局 busy/notice 表示，只有模型拉取有局部 `modelFetchState`。
3. 为什么影响流畅度：用户点击 row/button 后，局部控件不变，容易误以为没点到。
4. 建议怎么改：引入 `useAsyncAction(key)` 或 action registry，每个按钮/行有 `pendingKey`，长任务显示阶段。
5. 改动风险：中等，需要统一 action API，不宜一次性重写全部页面。
6. 测试：为 Provider test、Gateway toggle、Knowledge import、Data backup 增加 pending 状态测试。
7. 是否可能影响现有功能：可能改变按钮 disabled 时机和重复点击行为。
8. 验收标准：所有超过 250ms 的操作都有局部 pending；重复点击被抑制；失败贴近原控件展示。

### P0-5：IPC 缺少 progress / cancel / partial update 通用契约

1. 问题位置：`src/shared/ipc.ts:33-143`，`src/preload/index.ts:33-86`，`src/main/ipc.ts:36-108`。
2. 当前现象：所有通道是 invoke-response，只有 chat cancel 是另一个 invoke；没有 event subscription。
3. 为什么影响流畅度：长任务只能等完成后一次性回传，renderer 不能自然显示进度。
4. 建议怎么改：增加 typed event channels，例如 `task:progress`、`chat:chunk`、`task:completed`，preload 暴露 subscribe/unsubscribe。
5. 改动风险：高，需要保证 preload 安全边界和 event cleanup。
6. 测试：IPC authority test 增加 event channel 唯一性、payload schema、unsubscribe 行为。
7. 是否可能影响现有功能：新增路径可兼容旧 invoke，但重构任务时会影响多模块。
8. 验收标准：Knowledge import / Chat stream / Data backup 至少一个真实任务可边执行边推 progress。

### P1-1：Chat conversations/messages 无分页且无虚拟化

1. 问题位置：`src/main/repositories/chatRepository.ts:24-35`，`src/renderer/modules/ChatPage.tsx:99-104`，`src/renderer/modules/ChatPage.tsx:268-316`。
2. 当前现象：conversations 和 messages 可全量读入 snapshot；renderer 对 messages 直接 map。
3. 为什么影响流畅度：长历史会拖慢 snapshot、renderer diff 和滚动。
4. 建议怎么改：按 conversation 分页读取 messages，conversation list 分页；引入轻量虚拟列表。
5. 改动风险：中等，涉及默认选中会话和搜索。
6. 测试：构造 1000 conversations / 5000 messages 的分页测试，新增 scroll window smoke。
7. 是否可能影响现有功能：会影响消息搜索、会话切换、导出。
8. 验收标准：进入 Chat 首屏不加载非当前会话所有 messages；长列表滚动无明显掉帧。

### P1-2：Snapshot 包含大量 renderer 只展示 slice 的数据

1. 问题位置：`dashboardService.ts:11-51`，`GatewayPage.tsx:84-96`，`KnowledgePage.tsx:38-46`，`SettingsPage.tsx:65-83`。
2. 当前现象：main 拉较大列表，renderer 再 `slice(0,n)`。
3. 为什么影响流畅度：浪费 IPC payload、序列化和 renderer 内存。
4. 建议怎么改：为每个列表增加 `limit/offset/cursor` 查询 API，snapshot 只包含首屏 summary。
5. 改动风险：中等，会改变 AppSnapshot 契约。
6. 测试：AppSnapshot contract test，断言列表首屏数量和分页 API 返回。
7. 是否可能影响现有功能：可能影响页面初始计数和 empty 状态。
8. 验收标准：Gateway logs、audit logs、usage records、knowledge chunks 不再通过全局 snapshot 承载完整展示源。

### P1-3：主进程同步 CPU 任务会拖慢 IPC

1. 问题位置：`serviceContext.ts:1642`、`serviceContext.ts:1668`、`auditService.ts:37-72`、`knowledgeService.ts:56/124`。
2. 当前现象：PBKDF2、audit hash、knowledge chunk/embedding 都在 main process 同步执行。
3. 为什么影响流畅度：main process 忙时 IPC、窗口事件、取消请求都会变慢。
4. 建议怎么改：worker thread 或后台任务队列，任务分片并发送 progress。
5. 改动风险：高，需要处理 worker lifecycle、错误、取消、DB 写入边界。
6. 测试：worker task unit test、cancel test、large input perf guard。
7. 是否可能影响现有功能：影响 backup/restore/knowledge/audit。
8. 验收标准：大备份和大知识文件处理期间，窗口仍可点击，取消/导航可响应。

### P1-4：日志 / usage / audit 查询索引和统计契约不足

1. 问题位置：`src/main/database/schema.ts`，`gatewayRepository.ts:17`，`observabilityRepository.ts:22-36`，`auditRepository.ts:10`。
2. 当前现象：`gateway_logs`、`usage_records`、`audit_logs` 按 `created_at DESC` 查，但未见对应 created_at 索引。
3. 为什么影响流畅度：日志增长后查询会变慢，Gateway / Settings 页面首屏受影响。
4. 建议怎么改：增加 `created_at`、`workspace_id + created_at`、`status + created_at` 等索引；趋势统计下沉到 SQL 聚合。
5. 改动风险：中等，涉及 schema migration。
6. 测试：database migration test 增加索引存在断言；大日志查询性能 smoke。
7. 是否可能影响现有功能：索引一般不改业务语义，但迁移顺序要谨慎。
8. 验收标准：10k logs 下 Gateway logs 和 Usage 首屏查询仍在目标耗时内。

### P1-5：compare models 串行且无逐模型反馈

1. 问题位置：`src/main/services/chatService.ts:204-214`，`ChatPage.tsx:387-388`。
2. 当前现象：多模型对比按模型顺序 await `sendMessage()`。
3. 为什么影响流畅度：多个模型时总耗时叠加，UI 只有全局 busy。
4. 建议怎么改：引入 compare run task，支持 per-model pending/completed/failed；可并发或有限并发。
5. 改动风险：中高，影响 request logs、usage records、取消逻辑。
6. 测试：三模型中一个失败时，其它结果仍显示；逐模型进度事件测试。
7. 是否可能影响现有功能：会影响 compareModels 返回结构。
8. 验收标准：每个模型都有独立状态，最快完成的模型先显示。

### P2-1：建立 motion token 和组件级过渡规范

1. 问题位置：`src/renderer/styles/tokens.css`，`base.css`，`components.css`，`pages.css`。
2. 当前现象：只有 button transition，没有统一 token。
3. 为什么影响流畅度：后续新增 motion 容易风格不一。
4. 建议怎么改：新增 `--motion-*` 和 `--ease-*`，统一按钮、notice、page panel、list item。
5. 改动风险：低。
6. 测试：theme token authority test 扩展 motion token 白名单。
7. 是否可能影响现有功能：主要影响视觉，不改数据。
8. 验收标准：所有 transition 使用 token，reduced motion 可一键关闭。

### P2-2：大页面拆分为 container / view / service hook / pure row

1. 问题位置：`ChatPage.tsx`、`ModelsPage.tsx`、`GatewayPage.tsx`、`SettingsPage.tsx`。
2. 当前现象：数据获取、状态处理、UI 渲染、交互逻辑混在同一个页面文件。
3. 为什么影响流畅度：难以 memo 化，局部变更容易重渲染整页。
4. 建议怎么改：拆 `ChatContainer`、`ConversationList`、`MessageTimeline`、`ProviderRow`、`GatewayKeyRow` 等纯组件。
5. 改动风险：中等，容易打破测试 locator。
6. 测试：保持现有 UI smoke，新增 pure component props tests。
7. 是否可能影响现有功能：不应改变业务，但可能影响 DOM 结构。
8. 验收标准：页面入口文件明显变薄，row 组件可 memo，关键列表更新不重渲染整页。

### P2-3：加入轻量 performance mark / measure

1. 问题位置：`src/renderer/App.tsx`、`src/renderer/modules/ChatPage.tsx`、`src/main/ipc.ts`、测试脚本。
2. 当前现象：没有 `performance.mark` / `measure`。
3. 为什么影响流畅度：缺少可回归的耗时指标。
4. 建议怎么改：记录启动到可交互、Chat 首屏、点击发送到 user bubble、首 chunk、Provider test 首反馈、Gateway logs query。
5. 改动风险：低。
6. 测试：Playwright 读取 performance entries，设置宽松阈值。
7. 是否可能影响现有功能：不会，注意生产日志开关。
8. 验收标准：CI 或 smoke 输出关键交互耗时，不因视觉回归变慢而无感。

### P2-4：整理状态局部化和全局化边界

1. 问题位置：`App.tsx`、`src/shared/types.ts` 的 `AppSnapshot`、各 module page。
2. 当前现象：全局 snapshot 同时承载 Shell、Chat、Models、Knowledge、Logs、Settings。
3. 为什么影响流畅度：状态过大，更新粒度粗。
4. 建议怎么改：Shell summary 全局化；当前 conversation、current logs、forms、pending states 局部化；用 hooks 读模块数据。
5. 改动风险：中高，影响 API surface。
6. 测试：store-boundaries、renderer-api-boundary、新模块 hooks tests。
7. 是否可能影响现有功能：会影响几乎所有页面数据入口。
8. 验收标准：打开 Gateway 不需要加载全量 messages；打开 Chat 不需要加载 audit logs。

### P2-5：补齐交互反馈回归测试

1. 问题位置：`tests/app.test.tsx`、`tests/ui-smoke.spec.ts`、`docs/testing/future-test-plan.md`。
2. 当前现象：已有 route/overflow/theme/chat generation state 测试，但缺少流畅度和 reduced motion 行为测试。
3. 为什么影响流畅度：体验回归不一定导致功能测试失败。
4. 建议怎么改：新增 interaction latency smoke、long-list smoke、reduced motion smoke、pending-state smoke。
5. 改动风险：低到中，性能阈值可能 flaky。
6. 测试：本条本身就是测试计划。
7. 是否可能影响现有功能：不会改业务，但会提高 CI 约束。
8. 验收标准：关键路径回归有明确失败信号。

## 14. 后续 Codex 修复命令草案

后续进入修复轮时建议按小批次执行，不在本轮执行：

```powershell
$root = git rev-parse --show-toplevel
Set-Location $root
git status --short
npm.cmd run typecheck
npm.cmd run test
npm.cmd run test:ui-smoke
npm.cmd run test:electron-smoke
```

建议修复顺序：

1. P0-3 reduced motion 最小闭环。
2. P0-4 action pending 状态规范。
3. P0-2 Chat optimistic bubble + streaming IPC 设计。
4. P1-1 Chat messages 分页和虚拟化。
5. P1-3 后台任务队列。

## 15. 风险与回滚策略

本轮风险：

- 运行 build/test 可能生成 ignored 目录，如 `dist/`、`dist-electron/`、`test-results/`，但 `git status --short` 写报告前无输出。
- 只新增本报告文件，不改源码。

后续修复风险：

- Streaming IPC 是高风险改动，必须先保留旧 invoke contract 作为 fallback。
- Snapshot 拆分容易导致页面数据不同步，应分模块迁移。
- SQLite schema index 增加要走 migration test，避免 packaged legacy DB 再次启动失败。
- Motion 改动要先接 reduced motion，避免只增加视觉效果。

回滚策略：

- 单批次只改一类问题。
- 每批次保留 `npm.cmd run typecheck && npm.cmd run test && npm.cmd run test:ui-smoke && npm.cmd run test:electron-smoke`。
- 若 streaming 改动失败，保留现有 `api.sendMessage()` 完整响应路径。
- 若分页改动失败，保留 snapshot 首屏 fallback。

## 16. 验收标准

后续流畅度专项的建议验收指标：

- app 启动到可交互：记录 performance measure。
- 进入 Chat 首屏：不加载非当前会话全部消息。
- 点击会话到消息渲染：有 skeleton 或 pending，不阻塞 Shell。
- 点击发送到用户消息出现：小于 100ms。
- 点击发送到首个 assistant chunk 出现：真实 chunk 到达即显示，不等待完整响应。
- Provider 测试反馈出现：按钮 100ms 内 pending，250ms 内显示测试中。
- Gateway 日志查询完成：分页查询，显示查询耗时和数量。
- 大列表滚动：Chat 和日志列表长数据下无明显掉帧。
- Reduced motion：关闭 smooth scroll、reveal delay、页面/notice 动画。

## 17. 本轮未做事项

- 未修改源码、配置、样式、测试。
- 未实现任何动画、motion token、streaming IPC、分页、虚拟化。
- 未 commit，未 push。
- 未进行真实性能 profiling，只做源码级风险调研和 smoke/build/test 验证。
- 未启动人工长时间 GUI 测试。

## 18. 最终结论

NexaChat 当前的功能验证状态健康：typecheck、unit tests、build、UI smoke、Electron smoke 全部通过，当前 chat-first shell 的路由、模块边界和基础布局守卫是稳定的。

流畅度主要问题不是“动画太花”，而是三类结构性问题：

1. Renderer 状态粒度过粗：全局 `AppSnapshot` + 全局 `runAction()` refresh 让小操作触发大范围重渲染。
2. Chat 体验还不是真 streaming：provider adapter 能解析 stream，但 IPC 和 renderer 只拿最终响应，当前逐段显示是 renderer-side reveal。
3. 长任务和长列表缺少流畅度契约：IPC 没有 progress event，主进程同步任务较多，列表没有分页/虚拟化，reduced motion 没有实际约束。

建议后续不要先做大面积 UI 重写。优先从 P0 的即时反馈、reduced motion、Chat optimistic + streaming contract、局部 pending 和 snapshot 拆分开始，先让用户每次点击都“马上有反应”，再处理长列表和后台任务队列。
