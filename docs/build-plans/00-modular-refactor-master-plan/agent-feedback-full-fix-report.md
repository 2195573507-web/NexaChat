# Agent Feedback Full Fix Report

## 1. 本轮目标

基于 `chat-experience-agent-long-run-feedback.md` 中的长线 Agent 高强度测试反馈，完成全部 P1/P2/P3 问题的归因、分阶段修复、测试验证、文档留痕和 Git 交付闭环。

## 2. 反馈来源

- 来源文件: `docs/build-plans/00-modular-refactor-master-plan/chat-experience-agent-long-run-feedback.md`
- 测试时间: 2026-05-17 00:20:35 到 2026-05-17 01:22:05
- 覆盖模块: Chat, Models, Knowledge Base, Tools, Gateway, Data, Settings
- 初始统计: P1 13, P2 22, P3 11, P0 0

## 3. 既存未提交差异审计

本轮开始前 `git status --short` 已存在 `src/` 和 `tests/` 下未提交差异。审计结论:

| 分类 | 文件 | 处理 |
|---|---|---|
| 有价值且相关 | `src/main/ipc.ts`, `src/preload/index.ts`, `src/shared/api.ts`, `src/shared/ipc.ts`, `src/shared/types.ts` | 已纳入本轮，因为它们补齐 Provider 删除、Provider 模型拉取、Chat cancel/clientRequestId、Gateway 状态等受控 IPC/API 合约。 |
| 有价值且相关 | `src/main/services/openAiCompatibleAdapter.ts`, `src/main/services/store.ts`, `src/shared/securityRuntime.ts` | 已纳入本轮，因为它们直接处理显式缺失模型、Provider 测试、AbortController、Gateway listener truth、Data confirmation、MCP grant 状态等反馈。 |
| 有价值且相关 | `src/renderer/mockApi.ts`, `src/renderer/modules/ModelsPage.tsx`, `tests/app.test.tsx`, `tests/ipc-contract.test.ts`, `tests/provider-store-integration.test.ts` | 已纳入本轮，因为它们覆盖 Models/Provider 反馈并保持浏览器 smoke 与 Electron IPC 行为一致。 |
| 测试产物或误改 | 无 tracked 文件 | 未发现需要还原的 tracked 测试产物。 |
| 无关差异 | 无 tracked 文件 | 未发现需要隔离的无关 tracked 差异。 |

处理原则: 未执行 `git restore`、未大面积格式化、未覆盖用户既存工作。既存差异中与本轮反馈相关的部分被继续完善并纳入同一修复提交。

## 4. 分阶段处理结果

### Phase A: P1

| Issue | 模块 | 结论 | 处理摘要 |
|---|---|---|---|
| I-001 | Chat | fixed | Store 立即创建 assistant placeholder, renderer 立即显示生成气泡。 |
| I-002 | Chat | fixed | Chat 使用 queued/sending/generating/completed/failed/canceled 状态并同步 composer。 |
| I-003 | Chat | fixed | 当前实现为 renderer-side progressive reveal, 不伪装为真实上游 streaming。 |
| I-004 | Chat | fixed | requestLogId 绑定 AbortController, UI 暴露取消按钮。 |
| I-005 | Chat | fixed | 生成期间锁定发送入口并以 clientRequestId 隔离迟到响应。 |
| I-006 | Models / Chat | fixed | 显式指定缺失模型时失败, 不再静默 fallback 到其他 enabled model。 |
| I-007 | Models | fixed | Provider test/fetch 返回结构化成功失败, UI 显示失败详情。 |
| I-008 | Gateway | fixed | `running` 与 listener truth 分离, 新增 listenerState/lastStartError。 |
| I-009 | Knowledge | fixed | Knowledge 文案改为 text-like import 和 lexical retrieval 边界。 |
| I-010 | Knowledge / Chat | fixed | Chat assistant 消息渲染 citations。 |
| I-011 | Data | fixed | 导入应用必须手动输入 `APPLY IMPORT`, UI 和 Store 双重校验。 |
| I-012 | Data | fixed | rollback/restore 兼容路径统一要求确认短语。 |
| I-013 | Tools / MCP | fixed | MCP grant 改为 authorized/unchecked, 不再标记为 healthy。 |

### Phase B: P2

| Issue | 模块 | 结论 | 处理摘要 |
|---|---|---|---|
| I-014 | Chat / Models | fixed | No-model empty state 提供 Add Provider -> Add Model -> return to Chat 的直接入口。 |
| I-015 | Models | fixed | Provider/Base URL/API Key 加入更明确的普通用户说明。 |
| I-016 | Gateway | fixed | Gateway 页明确普通 Chat 不需要 Gateway。 |
| I-017 | Knowledge | fixed | Retrieval preview 显示 citation/snippet/score。 |
| I-018 | Knowledge | fixed | Knowledge import 增加文本文件选择器。 |
| I-019 | Knowledge | fixed | 明确 PDF/Office/OCR/vector 不属于当前支持范围。 |
| I-020 | Tools | fixed | reserved `mcp-tool`/`workflow` 被硬标记为 reserved/fixture-only 边界。 |
| I-021 | Tools | fixed | MCP 示例注册不再暗示真实执行健康。 |
| I-022 | Data | fixed | 备份 passphrase 增加 UI 长度校验和提示。 |
| I-023 | Data | fixed | 恢复预检提示 safe failure, 说明本地数据未被修改。 |
| I-024 | Settings | fixed | Settings Security 增加 role/permission matrix。 |
| I-025 | Settings | fixed | Audit 页说明当前是 recent slice, 深度排查走导出。 |
| I-026 | Models | fixed | Provider base URL 在 Store 创建边界提前校验。 |
| I-027 | Models | fixed | API key 保存后 renderer 不保留明文, 使用 secret_ref 反馈。 |
| I-028 | Gateway | fixed | Gateway docs/overview 增加 alias/mapping 边界说明。 |
| I-029 | Gateway | fixed | Gateway Keys 页面可编辑启用状态、quota 和 rate limit。 |
| I-030 | Chat | fixed | Retry/regenerate metadata 标记 action/lineage, 避免误读为普通重复消息。 |
| I-031 | Chat / Models | fixed | pending/final message 显示 model snapshot。 |
| I-032 | Chat | fixed | 消息 timeline 自动滚动到底部并保留 jsdom fallback。 |
| I-033 | Chat | fixed | Chat 生成状态按 requestLogId 作用域隔离, 与其他 action notice 分离。 |
| I-034 | Tests | fixed | 增加慢响应取消、迟到响应隔离和跨模块 smoke 边界断言。 |
| I-035 | Runtime / Testing | fixed | 继续以 `test:ui-smoke` 的 browser mock 模式验证, 报告中记录 plain browser 必须有 preload/mock 边界。 |

### Phase C: P3

| Issue | 模块 | 结论 | 处理摘要 |
|---|---|---|---|
| I-036 | Chat | fixed | Quick actions 区分 primary setup 和 secondary entries。 |
| I-037 | Models / Gateway | fixed | Provider Key 与 Gateway Key 区分文案在 Models/Gateway 重复出现。 |
| I-038 | Models | fixed | Provider row 显示 last error/health detail, Provider test 反馈更明确。 |
| I-039 | Gateway | fixed | Gateway docs 显示 models/chat/embeddings 可用端点和 `/v1/responses` reserved。 |
| I-040 | Gateway | fixed | Gateway logs/usage 显示请求、tokens、recentError 和日志范围说明。 |
| I-041 | Tools | fixed | MCP 字段和 copy 改为 endpoint/command 含义, 避免泛化 Transport。 |
| I-042 | Docs | deferred | 历史 `PROJECT_PROGRESS.md` 中仍有 mojibake。它是历史记录清理任务, 本轮避免大面积重写历史文档。 |
| I-043 | Knowledge | fixed | Knowledge failed file row 显示 errorMessage。 |
| I-044 | Settings | fixed | Feedback 默认文本不可直接提交, 必须编辑。 |
| I-045 | Chat | fixed | active conversation 消失时自动 resync 到可用会话。 |
| I-046 | Testing | fixed | UI smoke 使用 scoped locators, 避免命中全局 primary action。 |

## 5. 处理数量

| Priority | fixed | already-covered | deferred | invalid |
|---|---:|---:|---:|---:|
| P1 | 13 | 0 | 0 | 0 |
| P2 | 22 | 0 | 0 | 0 |
| P3 | 10 | 0 | 1 | 0 |

## 6. 修改过的模块

- Main/Store: Provider, Chat generation, Gateway runtime, Data confirmation, MCP permission state。
- Preload/API/IPC: Provider delete/fetch models, Chat cancel/clientRequestId, Gateway key update。
- Renderer: Chat, Models, Knowledge Base, Tools, Gateway, Data, Settings, shared page styles。
- Tests: renderer app tests, runtime tests, IPC contract tests, provider integration tests, UI smoke tests。

## 7. 架构边界说明

- Electron + React + TypeScript + Vite 架构保持不变。
- Renderer 继续只通过 `window.nexachat` 访问受控 AppApi/IPC。
- 未让 renderer 直接访问 SQLite、filesystem 或 raw secrets。
- 一级模块保持 7 个: Chat, Models, Knowledge Base, Tools, Gateway, Data, Settings。
- `/` 仍解析到 `/chat/conversations`。
- `/v1/responses` 仍为 reserved/501, 未写成已完成。
- Knowledge 仍只承诺 text-like import, lexical retrieval, citation preview。PDF, Office, OCR, external vector DB 均保持未支持边界。
- Tools/Agent/MCP 仍是 registration, approval, dry-run, fixture execution, trace event。未承诺任意 MCP executor 或 Agent sandbox。

## 8. Chat 渐进生成说明

当前 Provider/Gateway/IPC 合约还没有真实 SSE 或 IPC chunk event。按照本轮要求, 本次实现的是清晰边界下的非欺骗式渐进渲染:

- Store 立即写入 assistant placeholder 和 `request_logs.status = streaming`。
- Renderer 立即显示 queued/sending/generating 状态、取消按钮和 model snapshot。
- 上游完整响应返回后, renderer 分段显示已有完整响应, 并在 UI 文案和 metadata 中标注 `renderer-side-progressive-reveal`。
- AbortController 与 requestLogId 绑定, cancel 会阻止迟到响应覆盖 UI。
- 未来真实 streaming 入口预留在 Provider `stream: true`, AbortSignal, SSE chunk merge, IPC chunk event 和 message_chunks 合约上。

## 9. Deferred 项

| Issue | 原因 | 前置条件 | 后续模块 | 风险 |
|---|---|---|---|---|
| I-042 | 历史 progress 记录包含较多 mojibake, 本轮目标是处理 Agent 反馈对应的当前产品行为, 大面积重写历史文档会扩大 diff 并可能破坏历史证据。 | 单独的 docs encoding cleanup 计划和历史记录保留策略。 | Docs / PROJECT_PROGRESS | Low, 影响历史可读性, 不影响运行时。 |

## 10. 风险

- Chat 目前是 renderer-side progressive reveal, 不是真实上游 streaming。用户体验已不再空等, 但长文本的真实 token 级反馈仍依赖后续 SSE/IPC chunk 实现。
- Gateway Key 策略编辑使用已有 API 更新 quota/rate/disabled, 但还没有更复杂的 expiry 日期编辑器。
- 历史文档仍有 mojibake, 本轮只在新报告和当前进度条目中保持清晰记录。

## 11. 测试命令和结果

| Command | Result |
|---|---|
| `npm.cmd run typecheck` | passed |
| `npm.cmd run test` | passed, 20 files / 71 tests |
| `npm.cmd run build` | passed |
| `npm.cmd run test:ui-smoke` | passed, 7 Playwright tests |
| `npm.cmd run test:electron-smoke` | passed |

## 12. Commit Hash

- Start HEAD: `fcda00ca47e8d3e8184e09ab99b9749ebd424630`
- Delivery commit: pending until Git commit is created. The final pushed hash is reported in the final response because a commit cannot contain its own final hash before it exists.

## 13. 后续建议

1. 单独规划真实 upstream streaming: SSE parser, chunk merge/throttle, IPC chunk event, persisted chunk status。
2. 单独清理历史 mojibake 文档, 保留历史事实但恢复可读性。
3. 为 Gateway Key expiry 增加日期控件和更完整的 policy editor。
4. 增加真实慢 Provider 的可选 E2E fixture, 用于验证 cancel 与 route switching。
