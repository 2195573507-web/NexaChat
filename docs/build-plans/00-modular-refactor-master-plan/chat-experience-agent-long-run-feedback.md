# Chat Experience and Agent Long-Run Feedback

## Scope

This document is the single long-term feedback file for the 2026-05-17 Chat and Models experience long-run test.

This round did not implement Chat streaming, did not fix UI issues, did not refactor, and did not modify source code, package files, TypeScript config, Vite config, Electron config, database schema, or IPC contracts.

The tested product direction is chat-first:

- Current first-level modules: Chat, Models, Knowledge Base, Tools, Gateway, Data, Settings.
- Current root route: `/chat/conversations`.
- Chat is the core focus of this round.
- Models is the second focus.
- Knowledge Base, Tools, Gateway, Data, and Settings were checked for entry clarity, boundary copy, state feedback, and workflow breaks.
- Workspace / Dashboard-first language is historical context only and was not treated as the current main entry.

## User Original Improvement Requests

The user currently mainly uses Chat and Models.

The user believes the current Chat module experience is not good enough. The core issues and expectations are:

1. 用户发送问题后需要等待很久。
2. 等待期间反馈不足，用户不知道系统是在连接模型、等待响应、生成中，还是卡住了。
3. 当前答案会突然一次性弹出，显得很突兀。
4. 用户希望做成类似 ChatGPT 的逐步生成方式。
5. 回复过程应该是一个个文字或一段段内容自然出现。
6. 生成过程不能太机械，不能像生硬地逐字蹦字。
7. 生成过程应该更流畅、更自然，有“正在生成”的连续感。
8. 用户要求 Codex 创建 Agent，模拟不同用户使用各个模块。
9. Agent 要反馈使用问题与改进建议。
10. 本轮先不要 Codex 改代码。
11. 本轮只进行 Agent 长线测试 App、高强度测试 App、反馈问题。
12. Agent 反馈回来的问题也必须写入同一个文件。
13. Agent 测试最起码要持续 1 小时以上。

## No-Code-Change Statement

No source code was modified by this round.

Initial `git status --short` already showed existing uncommitted changes before this test began:

- `src/main/ipc.ts`
- `src/main/services/openAiCompatibleAdapter.ts`
- `src/main/services/store.ts`
- `src/preload/index.ts`
- `src/renderer/mockApi.ts`
- `src/renderer/modules/ModelsPage.tsx`
- `src/shared/api.ts`
- `src/shared/i18n.ts`
- `src/shared/ipc.ts`
- `src/shared/securityRuntime.ts`
- `src/shared/types.ts`
- `tests/app.test.tsx`
- `tests/ipc-contract.test.ts`
- `tests/provider-store-integration.test.ts`

Those files were treated as pre-existing dirty work. They were not edited, staged, reverted, or included in this round.

Files intentionally created or updated by this round:

- `docs/build-plans/00-modular-refactor-master-plan/chat-experience-agent-long-run-feedback.md`
- `PROJECT_PROGRESS.md`

Runtime artifacts under ignored `test-results/` were produced by existing smoke/Playwright/Electron verification paths and were not treated as deliverables.

## Test Time Record

| Item | Value |
|---|---|
| Test started at | 2026-05-17 00:20:35 local time |
| Test ended at | 2026-05-17 01:22:05 local time |
| Total duration | 61.5 minutes |
| Minimum required duration | 60 minutes |
| Requirement satisfied | Yes |
| Execution mode | hybrid / static-plus-runtime |
| GUI launched | Yes |
| Evidence collected | build logs / test logs / dev server logs / browser mock Playwright observations / Electron smoke and isolated Electron long-run output / static source and docs review / Agent notes |
| Source code modified | No |

## Execution Mode

The test used a hybrid mode:

- CLI verification: `git`, `node`, `npm.cmd`, `rg`, PowerShell, typecheck, unit tests, build, UI smoke, Electron smoke.
- Browser GUI automation: existing Vite renderer with `VITE_NEXACHAT_BROWSER_MOCK=1` on `127.0.0.1:5174`.
- Electron GUI automation: Playwright Electron launch with isolated user data under `test-results/electron-long-run-user-data`.
- Static source and docs review: used only for capability boundaries and for paths that could not be safely or meaningfully exercised in the available runtime.
- Simulated user Agents: 8 roles, with 6 parallel subagents and 2 replacement subagents after thread capacity was freed.

Not executed:

- Manual human-operated GUI testing through the Codex in-app browser. The Browser plugin connection timed out twice.
- Production provider streaming with a real upstream model. This round explicitly did not implement or repair streaming and no real API key/provider was introduced.

## App Runtime / GUI Availability

Runtime results:

- `npm.cmd run typecheck`: passed.
- `npm.cmd run test`: passed, 20 files / 69 tests.
- `npm.cmd run build`: passed.
- `npm.cmd run test:ui-smoke`: passed, 7 Playwright tests.
- `npm.cmd run test:electron-smoke`: passed, Electron shell rendered.
- Plain `npm.cmd run dev` on `127.0.0.1:5173` returned HTTP 200 but the renderer stayed blank because browser mode was missing Electron preload and `VITE_NEXACHAT_BROWSER_MOCK=1`. The page error was: `NexaChat preload API is unavailable. Restart the desktop app or run browser smoke with VITE_NEXACHAT_BROWSER_MOCK=1.`
- Browser mock GUI on `127.0.0.1:5174` launched and rendered 7 modules, Chat-first route, Chat composer, and top tabs.
- Electron isolated GUI launched and rendered with preload API. In that clean isolated user data state, there were no providers or models, so Chat send remained disabled and no messages were created.
- Electron emitted the expected development warning about insecure Content Security Policy; no renderer page errors occurred during the isolated long-run.

## Agent Long-Run Test Goals

Goals executed in this round:

- Confirm whether the current Chat experience gives enough feedback after sending a message.
- Confirm whether answers appear progressively or only after full completion.
- Confirm whether cancel, retry, regenerate, model switching, and route switching are understandable.
- Stress Chat through repeated sends, new conversations, route changes, and module loops.
- Check Models configuration, Provider test behavior, model selection, and error diagnosis support.
- Check Gateway, Knowledge Base, Tools, Data, and Settings for honest boundaries and workflow breaks.
- Record all user requests and Agent findings in this single file.
- Keep source code untouched.
- Continue testing until total duration exceeded 60 minutes.

## Agent Role Matrix

| Agent | Simulated identity | Main focus | Execution mode |
|---|---|---|---|
| Agent 1 | 新手用户 Agent | First-day understanding of Chat, Models, Gateway, Knowledge Base | Parallel read-only source/docs review |
| Agent 2 | 普通聊天用户 Agent | ChatGPT-like send/wait/retry/regenerate/cancel experience | Parallel read-only source/test review plus main-thread GUI evidence |
| Agent 3 | 多模型用户 Agent | Provider, Model, OpenAI-compatible Base URL, API key, Chat model selection | Parallel read-only source/test review plus main-thread GUI evidence |
| Agent 4 | 本地网关用户 Agent | Gateway API key, local OpenAI-compatible endpoints, logs, `/v1/responses` boundary | Parallel read-only source/docs review plus main-thread GUI evidence |
| Agent 5 | 知识库用户 Agent | Text import, unsupported PDF/Office/OCR boundary, retrieval preview, citations | Parallel read-only source/docs review plus main-thread GUI evidence |
| Agent 6 | 工具 / Agent 用户 Agent | Tools, MCP, Agent dry-run, approvals, trace, experimental boundary | Parallel read-only source/docs review plus main-thread GUI evidence |
| Agent 7 | 数据安全用户 Agent | Data import/export/backup/restore, Settings security/audit/privacy | Replacement read-only subagent plus main-thread GUI evidence |
| Agent 8 | 高压使用用户 Agent | Rapid Chat use, repeated sends, route switching, cancellation, residue states | Replacement read-only subagent plus main-thread GUI pressure tests |

## Module Coverage

| Module | Coverage |
|---|---|
| Chat | Core focus. Tested normal send path, long prompt, 5 follow-ups, high-pressure repeated sends, new conversations, route switching, Electron no-model state, and long module loops. |
| Models | Second focus. Checked Provider form, Provider list, Catalog, Router, Chat model selector, invalid base URL save behavior, Provider test wording, and Router fallback boundary. |
| Knowledge Base | Checked files, retrieval preview, lexical boundary, unsupported PDF/Office/OCR copy, citation display gap, and retrieval trace visibility. |
| Tools | Checked MCP registration, grant/deny wording, fixture execution, Agent dry-run boundary, approval and trace copy. |
| Gateway | Checked overview, keys, docs, logs/usage surface, default `127.0.0.1:8787`, available endpoints, reserved `/v1/responses`, and Gateway/Models/Chat relationship. |
| Data | Checked import preflight, apply confirmation, backup, restore preflight, rollback wording, diagnostics, and safety confirmation patterns. |
| Settings | Checked preferences, security, audit, feedback/evals/observability boundaries, role/permission visibility, and audit integrity copy. |

## Long-Run Test Timeline

| Phase | Started | Ended | Duration | Execution mode | Content | Observations | Issues | Evidence |
|---|---:|---:|---:|---|---|---|---|---|
| Stage 1: startup and baseline runnability | 00:20:35 | 00:27:56 | 7.35 min | CLI + smoke | Confirmed root, git status, branch, remotes, package scripts, docs dirs. Ran typecheck, tests, build, UI smoke, Electron smoke. | Baseline passed. Pre-existing source/test dirty state existed. | Existing dirty code files were present before this round; no source edits made here. | `typecheck` passed; `test` 20 files / 69 tests passed; `build` passed; `test:ui-smoke` 7 passed; `test:electron-smoke` passed. |
| Stage 2: Chat ordinary path and GUI setup | 00:27:56 | 00:34:35 | 6.65 min | Browser mock GUI + source review | Plain Vite failed to render without preload/mock. Browser mock launched. Sent short question, long question, and 5 follow-ups. | Messages appeared after action completion; no visible `connecting`, `thinking`, or `generating`; no streaming class. | Chat lacks assistant placeholder, layered status, and streaming-like progressive output. | Browser mock route `/chat/conversations`; 15 messages after 7 user sends; `status-streaming` count 0. |
| Stage 3: Chat high-pressure path | 00:34:35 | 00:42:51 | 8.28 min | Browser mock GUI | 84 sends, 21 new conversations, 28 Chat/Models switches, 12 rapid double-send attempts. | No console errors, no horizontal overflow, no route leak. The active conversation often showed only the current conversation, not all sent prompts, which is expected but can feel confusing during rapid creation. | Still no connecting/thinking/generating; high-pressure cancel and real in-flight state not visible. | Stage output recorded sends, conversation creates, route switches, and all checkpoints. |
| Stage 4: Models and Chat linkage | 00:43:09 | 00:45:16 | 2.12 min | Browser mock GUI + source review | Checked Provider page, invalid base URL attempt, Catalog, Chat model selector, Router. | Provider page had fields and secret note. Attempted invalid save via first primary button navigated to Chat due the selected control path, so the invalid save was not proven as applied through GUI. Static evidence confirms base URL is validated later by adapter, not at form save. | Models feedback does not clearly diagnose wrong API key/base URL/model selection at the point of action. | Provider fields count 3; Chat selector had `NexaChat Mock`; Router showed environment-limited policy. |
| Stage 5: other module horizontal pass | 00:45:16 | 00:46:20 | 1.07 min | Browser mock GUI | Checked Knowledge retrieval, Gateway overview/docs, Tools MCP/runs, Data backup/import/restore, Settings security/audit/preferences. | Boundaries were generally honest. Some attempted primary-button actions hit "Open Chat" because the global top button was first in DOM; those actions are recorded as not executed. | Knowledge citations, Gateway aliases, Data confirmation, Settings permission detail still need work. | Cross-module samples recorded Gateway endpoints, reserved `/v1/responses`, Tools fixture-only text, Data import confirmation text. |
| Stage 6: Electron preload long-run | 00:46:46 | 00:56:48 | 10.03 min | Electron GUI automation | Isolated Electron user data, 19 send attempts, 4 new chats, 8 module switches. | Electron rendered and preload API worked. Clean user data had 0 providers and 0 models, so Chat send stayed disabled and no messages were created. | No-model first-run state makes Chat feel stuck without stronger guidance. | Preload snapshot showed conversations increasing from 1 to 5, messages stayed 0, providers/models stayed 0. |
| Stage 7: supplemental regression and state residue observation | 00:58:09 | 01:10:09 | 12.01 min | Browser mock GUI | 720 route visits, 66 Chat sends, 65 preference saves across Chat, Models, Gateway, Knowledge, Tools, Data, Settings. | No route leak, no horizontal overflow, no console/page errors. Chat still had no connecting/thinking/generating status. | Long-run stability acceptable in mock, but streaming/status feedback gap remained constant. | Checkpoints every 10 visits; all routeLeak false, overflow false. |
| Stage 8: final sustained module loop | 01:10:55 | 01:21:56 | 11.02 min | Browser mock GUI | 583 actions, 73 Gateway toggles, 73 Provider tests, 73 retrieval runs, 73 tool runs, repeated returns to Chat. | No console/page errors. Chat remained stable but still lacked in-flight status and progressive output. | Reinforced Chat status/streaming gap and Models/Gateway/Data boundary issues. | 72 cycles observed; `chatStreaming`, `chatDraft`, `chatFailed` all 0 in Chat checkpoints. |

## Agent Test Results

The following Agent results combine subagent read-only outputs and main-thread runtime evidence. Where a subagent did not execute GUI directly, the "Execution evidence" field says so.

## Agent: 新手用户 Agent

### 身份

Completely new user who does not understand a local AI workbench.

### 测试目标

Check whether Chat, Models, Gateway, and Knowledge Base entry points and purposes are understandable.

### 测试时间段

| Item | Value |
|---|---|
| Started at | 00:21:45 |
| Ended at | 00:27:20 |
| Duration | 5.58 minutes |

### 实际路径

1. Confirmed root route and navigation facts from README/navigation.
2. Reviewed Chat quick actions and first-screen structure.
3. Reviewed Models Provider page and Gateway page.
4. Reviewed Knowledge Base text and lexical boundary.
5. Compared subagent static review with main-thread browser mock route `/chat/conversations`.

### 执行证据

- Execution mode: read-only source/docs review plus main-thread browser mock evidence.
- Commands: `git rev-parse`, `git status --short`, `rg`, `Get-Content`.
- UI/runtime evidence: browser mock confirmed 7 modules and root route `/chat/conversations`.
- Not directly executed by this subagent: GUI clicks, because this subagent stayed read-only. Main thread executed GUI automation.

### 发现的问题

| 编号 | 模块 | 问题 | 复现步骤 | 严重程度 | 影响 | 初步建议 |
|---|---|---|---|---|---|---|
| A1-01 | Knowledge Base | Knowledge wording can overstate embedding/RAG capability while retrieval says lexical fallback. | Open Knowledge Files, then Retrieval Preview. | P1 | New users may expect complete vector RAG. | State text-like import and lexical retrieval more plainly. |
| A1-02 | Chat / Models | Empty no-model state only says not configured and lacks a one-minute next step. | Open isolated Electron user data and enter Chat. | P2 | New users know Chat is first but not how to make it usable. | Add "Add Provider -> Add Model -> return to Chat" path. |
| A1-03 | Models | Provider/Base URL/API Key/Gateway Key terms are too developer-oriented. | Open Models Provider page. | P2 | Users may not know what to fill. | Add short plain-language examples and key distinction. |
| A1-04 | Gateway | Gateway docs do not clearly say normal chatting does not require Gateway. | Open Gateway docs. | P2 | Users may think Gateway is a prerequisite for Chat. | Explain Gateway is for external OpenAI-compatible callers. |
| A1-05 | Chat | Quick actions have too many equal-weight choices. | Open Chat first screen. | P3 | Primary path is diluted. | Visually group primary setup actions above secondary entries. |
| A1-06 | Models / Gateway | Provider API Key and Gateway Key need repeated cross-page distinction. | Compare Models Provider and Gateway Keys. | P3 | Users may paste keys into the wrong place. | Use one consistent explanatory sentence in both pages. |

### 体验总结

The app is clearly Chat-first, but a beginner still needs a stronger first-run path from Chat to Models and back. The largest beginner trust issue is overclaiming or ambiguous wording around Knowledge and technical key concepts.

### 后续建议

- Make Chat empty state actionable.
- Rewrite Provider/Gateway key copy for non-developers.
- Keep Knowledge boundaries honest and visible.

## Agent: 普通聊天用户 Agent

### 身份

User who only wants to chat like ChatGPT.

### 测试目标

Check sending messages, waiting feedback, answer appearance, retry, regenerate, cancel, and follow-up flow.

### 测试时间段

| Item | Value |
|---|---|
| Started at | 00:21:46 |
| Ended at | 00:33:05 |
| Duration | 11.32 minutes |

### 实际路径

1. Reviewed Chat send and message rendering source.
2. Browser mock: sent one short question.
3. Browser mock: sent one long question.
4. Browser mock: sent 5 follow-up questions.
5. Checked message status classes, actions, inline notices, and status words.

### 执行证据

- Execution mode: source review plus browser mock GUI automation.
- Commands: Playwright inline script against `127.0.0.1:5174/chat/conversations`.
- Observed UI/logs: messages increased from 1 to 15; user messages 7; assistant messages 8; `status-streaming` count 0; no page errors.
- Not executed: real upstream slow model with real streaming.

### 发现的问题

| 编号 | 模块 | 问题 | 复现步骤 | 严重程度 | 影响 | 初步建议 |
|---|---|---|---|---|---|---|
| A2-01 | Chat | No assistant placeholder appears immediately for in-flight responses. | Send a message and inspect message timeline immediately. | P1 | User cannot tell whether the answer is being generated. | Insert pending assistant message immediately. |
| A2-02 | Chat | No layered connecting/thinking/generating states are visible. | Send short/long prompt and inspect body text/status classes. | P1 | User cannot distinguish network/model/system wait. | Add explicit state machine and UI copy. |
| A2-03 | Chat | Answer appears only after request completion in tested paths. | Send prompt in browser mock and observe checkpoints. | P1 | Feels abrupt compared with ChatGPT. | Implement real streaming or chunked progressive rendering. |
| A2-04 | Chat | Cancel is not available during normal in-flight wait. | Send slow request or inspect action conditions. | P1 | User cannot stop a bad or slow generation. | Bind cancel to pending requestLogId and AbortController. |
| A2-05 | Chat | Retry/regenerate are visible only after a message exists. | Send prompt, wait completion, inspect actions. | P2 | Recovery is post-hoc, not part of waiting feedback. | Add error/retry path to pending assistant bubble. |

### 体验总结

The basic Chat loop works in browser mock, including follow-ups and visible retry/regenerate actions after completion. It does not feel like a live assistant yet because the timeline gives no progressive in-flight feedback.

### 后续建议

- Implement real streaming first.
- If streaming is delayed, still add pending assistant state and natural non-streaming transition.
- Add cancel/retry behavior to the request itself, not only completed messages.

## Agent: 多模型用户 Agent

### 身份

User who frequently switches Provider and Model.

### 测试目标

Check Provider/Model lists, OpenAI-compatible configuration, API key feedback, Provider test results, Chat model selection, and failure diagnosis.

### 测试时间段

| Item | Value |
|---|---|
| Started at | 00:21:46 |
| Ended at | 00:44:58 |
| Duration | 23.2 minutes |

### 实际路径

1. Reviewed Models Provider, Catalog, Router source.
2. Reviewed OpenAI-compatible adapter and store provider chain.
3. Browser mock opened Models Provider/Catalog/Router and Chat model selector.
4. Attempted invalid Provider input path; UI action path moved back to Chat due selected primary button, so invalid save was not counted as proven through GUI.

### 执行证据

- Execution mode: read-only source review plus browser mock GUI.
- Commands: `rg`, `Get-Content`, inline Playwright.
- Observed UI/logs: Provider page had 3 inputs and 1 select; Chat model options included `NexaChat Mock`; Router showed environment-limited policy.
- Unable to fully execute real invalid API key/base URL against upstream because no real provider was configured and this round did not add one.

### 发现的问题

| 编号 | 模块 | 问题 | 复现步骤 | 严重程度 | 影响 | 初步建议 |
|---|---|---|---|---|---|---|
| A3-01 | Chat / Models | Missing explicit `modelId` can fall back to another enabled model. | Send with a missing model id in store path. | P1 | User may believe one model was used while another was called. | Fail explicit missing model unless auto-route was selected. |
| A3-02 | Models | Provider test may resolve action and show success-style toast even after error health is recorded. | Test provider with bad API key/base URL. | P1 | User may misread failed connection as recorded success. | Return structured `{ ok, error }` and render failure notice. |
| A3-03 | Models | Base URL is not fully validated before provider save. | Enter invalid base URL and save provider. | P2 | Error appears later, away from the cause. | Validate `http://` or `https://` at form and store boundary. |
| A3-04 | Models | API key field is not cleared after save. | Save Provider with key. | P2 | Secret feedback is less trustworthy. | Clear input after save and show secret_ref preview only. |
| A3-05 | Models | Provider row does not show enough last-error detail. | Test failing Provider and inspect Provider row. | P3 | User must go elsewhere to diagnose. | Add inline last status, HTTP code, and next action. |

### 体验总结

The Provider -> Model -> Chat chain exists and has tests, but the experience still needs stronger certainty. Multi-model users need to know exactly which model was used and exactly why a Provider test failed.

### 后续建议

- Make explicit model selection strict.
- Convert Provider tests to structured success/failure results.
- Surface Provider health details on the Provider row.

## Agent: 本地网关用户 Agent

### 身份

User focused on API keys, model mapping, and local OpenAI-compatible Gateway calls.

### 测试目标

Check Gateway status, key lifecycle, local endpoints, logs, model mapping, and `/v1/responses` reservation.

### 测试时间段

| Item | Value |
|---|---|
| Started at | 00:21:47 |
| Ended at | 00:45:54 |
| Duration | 24.12 minutes |

### 实际路径

1. Reviewed `gatewayRuntime`, `localGateway`, Store Gateway methods, Gateway page, and Gateway docs.
2. Browser mock opened Gateway overview and docs.
3. Verified available endpoints and reserved endpoint copy.

### 执行证据

- Execution mode: read-only source/docs review plus browser mock GUI.
- Observed Gateway docs codes: `/v1/models`, `/v1/chat/completions`, `/v1/embeddings`.
- Observed reserved notice: `/v1/responses`.
- Gateway key generation click was not counted in one cross-module run because the first primary button was the global Chat action; this was recorded as not executed for that attempt.

### 发现的问题

| 编号 | 模块 | 问题 | 复现步骤 | 严重程度 | 影响 | 初步建议 |
|---|---|---|---|---|---|---|
| A4-01 | Gateway | `running` and `enabled` can be treated as equivalent in Store/UI status. | Inspect `getGatewayStatus` and restart scenarios. | P1 | UI may say running when listener is not actually alive. | Split enabled, listening, and lastStartError. |
| A4-02 | Gateway | Model alias/mapping exists in data layer but lacks clear user entry. | Inspect Gateway UI and `model_aliases` path. | P2 | External callers do not know which model names are accepted. | Add model alias/mapping section. |
| A4-03 | Gateway | Gateway key policy editing is incomplete in UI. | Open Gateway Keys. | P2 | Admin cannot adjust quota/rate/expiry easily. | Expose active/disable/quota/rate/expires editing. |
| A4-04 | Gateway | Docs mainly show one chat curl example. | Open Gateway Docs. | P3 | External integration requires inference. | Add `/v1/models`, `/v1/embeddings`, and `/v1/responses -> 501` examples. |
| A4-05 | Gateway | Log detail is sparse. | Open Gateway logs. | P3 | Harder to diagnose key/scope/provider failures. | Expand log rows with key preview, scope, error code, provider/model. |

### 体验总结

Gateway is honest about local endpoints and reserved `/v1/responses`. The biggest weakness is operational clarity: external callers need model alias guidance, listener truth, and richer logs.

### 后续建议

- Split Gateway runtime status.
- Add model alias UI.
- Expand Gateway docs and logs.

## Agent: 知识库用户 Agent

### 身份

User who wants to import files and ask questions over them.

### 测试目标

Check text import, unsupported PDF/Office/OCR boundary, indexing, retrieval preview, citations, and whether capability is exaggerated.

### 测试时间段

| Item | Value |
|---|---|
| Started at | 00:21:47 |
| Ended at | 00:45:54 |
| Duration | 24.12 minutes |

### 实际路径

1. Reviewed Knowledge source/runtime/store/i18n.
2. Browser mock opened Knowledge retrieval.
3. Ran retrieval preview in browser mock.
4. Compared retrieval preview with Chat message citation visibility.

### 执行证据

- Execution mode: read-only review plus browser mock GUI.
- Observed retrieval notice: lexical fallback and need for embedding/vector/rerank.
- Observed retrieval result: file name and lexical score.
- Not fully executed: real file picker for PDF/Office/OCR because the current UI path is paste/text-oriented in this tested surface.

### 发现的问题

| 编号 | 模块 | 问题 | 复现步骤 | 严重程度 | 影响 | 初步建议 |
|---|---|---|---|---|---|---|
| A5-01 | Knowledge / Chat | Backend citation records exist, but Chat bubble does not render citation sources. | Ask with Knowledge context and inspect Chat response. | P1 | User cannot verify where answer came from. | Render citations under assistant messages. |
| A5-02 | Knowledge | Retrieval preview shows thin information. | Run retrieval preview. | P2 | User sees a match but not enough snippet/chunk detail. | Show citation id, chunk index, snippet, and score. |
| A5-03 | Knowledge | UI feels like pasted text creation, not file import. | Open Knowledge Files. | P2 | File import expectations are not met. | Add text-file picker while keeping type restrictions. |
| A5-04 | Knowledge | Unsupported PDF/Office/OCR failure is hard to trigger in the main UI. | Try to import unsupported file through current form. | P2 | Boundary copy exists, but failure flow is not visible. | Add explicit unsupported-file rejection path. |
| A5-05 | Knowledge | File row does not show detailed errorMessage. | Force or inspect failed import path. | P3 | Troubleshooting is harder. | Show error reason near failed file row. |

### 体验总结

Knowledge boundaries are mostly honest, but visible evidence is weaker than backend structure. The user needs citation display in Chat and richer retrieval preview to trust Knowledge answers.

### 后续建议

- Render citations in Chat first.
- Improve retrieval preview detail.
- Add honest unsupported-file UI path.

## Agent: 工具 / Agent 用户 Agent

### 身份

User focused on Tools, MCP, Agent dry-run, permissions, approvals, and trace.

### 测试目标

Check whether experimental function boundaries are clear and whether UI implies real arbitrary MCP/code execution.

### 测试时间段

| Item | Value |
|---|---|
| Started at | 00:21:47 |
| Ended at | 00:45:54 |
| Duration | 24.12 minutes |

### 实际路径

1. Reviewed execution runtime, MCP server handling, Agent definition path, IPC permission mapping, and Tools UI.
2. Browser mock opened Tools MCP and Tools Runs.
3. Ran fixture status-read flow in browser mock.

### 执行证据

- Execution mode: read-only source review plus browser mock GUI.
- Observed Tools copy: dry-run, fixture-only sandbox, approval.
- Observed no arbitrary MCP or code sandbox execution path.

### 发现的问题

| 编号 | 模块 | 问题 | 复现步骤 | 严重程度 | 影响 | 初步建议 |
|---|---|---|---|---|---|---|
| A6-01 | Tools / MCP | MCP grant can mark status healthy although it only means authorized. | Authorize MCP server and inspect status. | P1 | User may believe real MCP is connected and callable. | Use `authorized_unchecked` or equivalent state. |
| A6-02 | Tools | `mcp-tool` and `workflow` run kinds exist, but implementation remains fixture-only. | Inspect execution runtime and run center. | P2 | API shape looks more complete than capability. | Hide or hard-label reserved run kinds. |
| A6-03 | Tools | Seed filesystem MCP example may imply real filesystem MCP execution. | Open Tools MCP. | P2 | User may overtrust example. | Label as non-running example registration. |
| A6-04 | Tools | MCP form label "Transport" mixes endpoint/command meaning. | Open Tools MCP form. | P3 | Small confusion when registering. | Rename field to endpoint/command. |
| A6-05 | Docs | Some progress docs show mojibake. | Open progress entries. | P3 | Boundary notes look less trustworthy. | Clean doc encoding in a separate docs pass. |

### 体验总结

The Tools boundary is mostly honest: it reads like a dry-run/fixture execution model, not a full sandbox. The status labels are the main risk.

### 后续建议

- Tighten MCP status language.
- Keep fixture-only execution visibly marked.
- Avoid status terms that imply real health checks.

## Agent: 数据安全用户 Agent

### 身份

User focused on backups, restore, import/export, Settings security, audit, privacy, and recovery.

### 测试目标

Check dangerous operation confirmations, clarity, traceability, and recovery paths.

### 测试时间段

| Item | Value |
|---|---|
| Started at | 00:30:55 |
| Ended at | 00:45:15 |
| Duration | 14.33 minutes |

### 实际路径

1. Replacement subagent reviewed Data and Settings source/test paths.
2. Main thread opened Data backup/import/restore, Settings security/audit/preferences in browser mock.
3. Compared UI confirmation patterns with Store-level confirmation checks.

### 执行证据

- Execution mode: read-only source/test review plus browser mock GUI.
- Observed Data import page displaying `APPLY IMPORT`, backup/restore pages, Settings security/audit pages.
- Not executed: real destructive import/rollback against user data. This round did not perform destructive data operations.

### 发现的问题

| 编号 | 模块 | 问题 | 复现步骤 | 严重程度 | 影响 | 初步建议 |
|---|---|---|---|---|---|---|
| A7-01 | Data | Apply import passes the confirmation phrase programmatically; user does not type it. | Data Import -> ready preflight -> apply. | P1 | Misclick risk for data-changing action. | Require typed `APPLY IMPORT` and verify in Store. |
| A7-02 | Data | Legacy `restoreSnapshot(... rollback ...)` path can allow rollback without a missing phrase. | Call compatible API path without confirmation. | P1 | Confirmation boundary is inconsistent. | Require exact rollback phrase for every rollback path. |
| A7-03 | Data | Backup passphrase length rule appears only at backend. | Enter short passphrase and click backup. | P2 | User learns rule late. | Add UI-side length validation and helper copy. |
| A7-04 | Data | Restore wrong-passphrase recovery guidance is thin. | Restore with wrong passphrase. | P2 | User may not know local data stayed unchanged. | Explain safe failure and next steps. |
| A7-05 | Settings | Role permissions are summarized but not listed as a matrix. | Settings Security. | P2 | User cannot audit dangerous permissions. | Add role/permission matrix. |
| A7-06 | Settings | Audit UI only shows a limited recent slice. | Settings Audit. | P2 | Older dangerous events are harder to inspect. | Add paging/export explanation. |
| A7-07 | Settings | Feedback can submit low-value default content. | Settings Feedback -> Create without edits. | P3 | Low-quality feedback records. | Require edited content or empty placeholder. |

### 体验总结

Data has a stronger backend safety model than the UI shows. Confirmation is inconsistent: rollback has a typed phrase in one path, but import apply does not force the user to type it.

### 后续建议

- Standardize typed confirmation phrases for import and rollback.
- Add UI validation for backup/restore passphrases.
- Make role permissions explicit.

## Agent: 高压使用用户 Agent

### 身份

Power user who sends often, switches conversations, retries, cancels, and switches modules while waiting.

### 测试目标

Check UI residue, duplicate sends, loading leftovers, ghost generation, route switching, model switching, and input/scroll behavior.

### 测试时间段

| Item | Value |
|---|---|
| Started at | 00:30:55 |
| Ended at | 01:21:56 |
| Duration | 51.02 minutes |

### 实际路径

1. Replacement subagent reviewed Chat high-pressure source paths.
2. Main thread ran Stage 3 browser mock pressure test.
3. Main thread ran Stage 7 regression loop.
4. Main thread ran Stage 8 sustained module loop.

### 执行证据

- Stage 3: 84 sends, 21 new conversations, 28 Models/Chat switches, 12 rapid double-send attempts, no console/page errors.
- Stage 7: 720 route visits, 66 Chat sends, 65 preference saves, no route leak or overflow.
- Stage 8: 583 actions, 73 Gateway toggles, 73 Provider tests, 73 retrieval runs, 73 tool runs, no console/page errors.
- Not executed: true slow upstream provider in-flight cancellation. No real upstream slow model was configured in this no-code-change round.

### 发现的问题

| 编号 | 模块 | 问题 | 复现步骤 | 严重程度 | 影响 | 初步建议 |
|---|---|---|---|---|---|---|
| A8-01 | Chat | No visible assistant loading/streaming placeholder during wait. | Send prompt and inspect immediately. | P1 | User misreads slow wait as stuck. | Add in-flight assistant bubble. |
| A8-02 | Chat | Send button is not tied to a per-request pending state. | Rapid double-click or Enter. | P1 | Duplicate request risk. | Lock composer per request and clear/hold draft intentionally. |
| A8-03 | Chat | Cancel cannot stop normal in-flight production call from UI. | Send slow request and look for cancel. | P1 | User cannot stop costly or wrong generation. | Add abortable request registry and UI cancel. |
| A8-04 | Chat | Browser mock and production cancel semantics may diverge. | Compare mock cancel with production SQL status filters. | P2 | Smoke tests may miss production mismatch. | Align mock and production state machine. |
| A8-05 | Chat | Retry/regenerate can look like duplicate messages. | Retry/regenerate same assistant. | P2 | User cannot track branches. | Mark regenerated/retried lineage. |
| A8-06 | Chat / Models | Model switch during or after send lacks request-level clarity. | Send, switch model, return to Chat. | P2 | User may not know which model answered. | Show model snapshot on pending and final message. |
| A8-07 | Chat | Active conversation fallback can drift after list changes. | Rapid create/filter/switch. | P3 | Minor selection mismatch risk. | Resync active id if it disappears. |
| A8-08 | Chat | No clear bottom-follow behavior was observed or proven. | Long conversation then send. | P2 | User may not see new answer. | Add bottom sentinel and "back to latest". |
| A8-09 | Chat | New conversation action is not scoped against other busy actions. | Create chats while sending/switching. | P2 | Notices can compete and state feels unreliable. | Scope busy state by action/request. |
| A8-10 | Tests | High-pressure tests are missing from permanent suite. | Inspect existing UI/unit tests. | P2 | Regressions may return. | Add slow-response and route-switch smoke later. |

### 体验总结

The app stayed stable under high browser-mock route pressure, but the core Chat wait-state problem persisted through every loop. Stability is better than responsiveness: the UI does not crash, but it does not feel alive while generating.

### 后续建议

- Add long-running Chat smoke automation after the implementation round starts.
- Build a real state machine before polishing Chat visuals.
- Keep browser mock and production state semantics aligned.

## Chat Streaming Experience Findings

| Topic | Finding |
|---|---|
| Waiting feedback after send | Insufficient. Browser mock and source review show no immediate assistant placeholder in normal flow. |
| Long blank wait | In real Electron isolated no-model state, sending is disabled; in browser mock, mock replies are fast. Source review indicates slow real provider calls would wait without a timeline-level in-flight assistant message. |
| Sudden full answer | Tested browser mock inserts completed response after send action completes. It does not show progressive generation. |
| Loading / thinking / generating state | No visible `connecting`, `thinking`, or `generating` text was found in repeated GUI loops. |
| Cancel / retry / regenerate clarity | Retry/regenerate are visible after completion. Cancel is not available for normal pending response in tested paths. |
| Long answer naturalness | Long prompt still produced completed full response; no chunk pacing or natural append behavior observed. |
| Markdown/code block appearance | No streaming Markdown/code rendering was exercised because current tested responses were non-streaming mock text. Risk remains for future implementation. |
| Conversation switching stability | Browser mock route loops did not show route leak or overflow. Request-level in-flight ownership is still unclear for real slow provider calls. |
| Slow model progress | No user-perceivable provider progress state was observed. Models health exists but is not integrated into Chat waiting feedback. |
| Need for real streaming | Yes. This is the first implementation priority. |
| If streaming is delayed | Add UI-side transition feedback: immediate assistant placeholder, status timeline, elapsed time, cancel, and retry. |
| Avoid mechanical character drip | Future streaming should use chunk merging, throttling, and natural block/paragraph append rather than one-character output. |

Required follow-up recommendations:

1. Prioritize real streaming.
2. Renderer should not wait for the complete answer before displaying assistant output.
3. Assistant placeholder message should appear immediately.
4. Token/chunk data should be merged and throttled so output appears naturally.
5. Loading state should be layered: `idle`, `sending`, `connecting`, `thinking`, `generating`, `saving`, `done`, `error`, `canceled`.
6. Cancel must be supported.
7. Switching conversations must not leave ghost loading.
8. Historical messages should not replay streaming.
9. Errors must be retryable.
10. Models Provider test results should help users tell whether Chat is slow because of model latency, network latency, wrong configuration, or app hang.

## Models Experience Findings

| Topic | Finding |
|---|---|
| Provider list | Present and understandable for technical users; still jargon-heavy for new users. |
| Model list | Present in Catalog; browser mock read 3 options and showed 1 configured model. |
| Add Provider flow | Present, but invalid Base URL feedback is not immediate enough. |
| OpenAI-compatible config | Fields exist, but example/explanation should be clearer for beginners. |
| API key save feedback | Secret note exists, but API key input persistence after save is a UX/security concern. |
| Provider test result | Health is recorded, but action-level success/failure feedback can be ambiguous. |
| Add Model flow | Present and tied to Provider model fetch. |
| Chat model switch | Chat model select exists and uses configured model options. |
| Provider failure in Chat | Source supports failed assistant messages, but Chat needs clearer diagnosis linked to Provider test results. |
| Wrong Base URL | Adapter can report invalid Base URL, but the user should know earlier at form time. |
| Wrong API key | Adapter/test path can surface failure, but UI should show exact failure at Provider row. |
| Slow cause diagnosis | Incomplete. Models does not yet close the loop for "model slow vs network slow vs config wrong vs app stuck." |

## Cross-Module Experience Findings

- Knowledge Base is honest about lexical fallback in retrieval, but some text can still sound like complete embedding/RAG.
- Gateway docs correctly reserve `/v1/responses`, but model alias and listener truth need more user-facing clarity.
- Tools/MCP/Agent is mostly honest about dry-run/fixture-only, but "healthy" status after MCP grant is too strong.
- Data has real safety concepts, but UI confirmation is inconsistent across import and rollback.
- Settings has useful security/audit surfaces, but permission detail and audit depth are too summarized.
- Long browser-mock loops showed no route leak and no horizontal overflow at tested sizes.
- Plain browser dev without mock/preload produces a blank renderer with a clear page error; this is useful for smoke boundaries but poor for ad hoc browser testing.

## Issue Severity Definition

| Severity | Definition |
|---|---|
| P0 阻断 | Causes a core workflow to be impossible or unsafe to continue. |
| P1 严重 | Core experience visibly fails, reports wrong state, or can mislead users in important workflows. |
| P2 中等 | Affects understanding, efficiency, trust, or diagnosis but has a workaround. |
| P3 轻微 | Copy, layout, terminology, or detail-level experience issue. |

## Consolidated Issue Backlog

| 编号 | 优先级 | 模块 | 问题摘要 | 证据/复现路径 | 建议处理方式 | 是否需要改代码 |
|---|---|---|---|---|---|---|
| I-001 | P1 | Chat | No immediate assistant placeholder after send. | Browser mock Stage 2/3/7/8; source `sendMessage` inserts assistant after provider result. | Add pending assistant message immediately. | Yes |
| I-002 | P1 | Chat | No visible connecting/thinking/generating state. | Repeated GUI observations all false for these states. | Add layered Chat state machine. | Yes |
| I-003 | P1 | Chat | Answer appears as completed response, not progressive output. | Browser mock responses completed with `status-streaming` count 0. | Implement real streaming with chunk display. | Yes |
| I-004 | P1 | Chat | Cancel is unavailable for normal in-flight waits. | Message actions and Agent 8 review. | Bind cancel to requestLogId and abort controller. | Yes |
| I-005 | P1 | Chat | Rapid send can risk duplicate pending requests. | Agent 8 source review and pressure attempts. | Add scoped pending lock and draft handling. | Yes |
| I-006 | P1 | Models / Chat | Explicit missing model can fallback to another enabled model. | Agent 3 Store review. | Fail explicit missing model unless auto route selected. | Yes |
| I-007 | P1 | Models | Provider test action feedback can look successful even after failed health. | Agent 3 Store/App review. | Return structured success/failure. | Yes |
| I-008 | P1 | Gateway | `running` can equal `enabled` instead of listener truth. | Agent 4 Store review. | Split enabled/listening/lastStartError. | Yes |
| I-009 | P1 | Knowledge | Knowledge copy can overstate embedding/RAG completeness. | Agent 1/5 review and retrieval boundary. | Tighten wording to text-like + lexical. | Yes |
| I-010 | P1 | Knowledge / Chat | Citations are recorded but not rendered under Chat messages. | Agent 5 source review. | Render citations under assistant message. | Yes |
| I-011 | P1 | Data | Import apply uses phrase programmatically instead of typed confirmation. | Agent 7 DataPage/Store review. | Require typed `APPLY IMPORT` and Store check. | Yes |
| I-012 | P1 | Data | Legacy rollback-compatible path can miss strict phrase requirement. | Agent 7 Store review. | Enforce rollback phrase in every rollback path. | Yes |
| I-013 | P1 | Tools / MCP | MCP grant can mark status healthy although real MCP is not checked. | Agent 6 Store review. | Rename state to authorized/unchecked. | Yes |
| I-014 | P2 | Chat / Models | No-model Chat state lacks clear one-minute setup path. | Electron isolated run: models/providers 0, messages 0. | Add first-run Provider/Model setup guidance. | Yes |
| I-015 | P2 | Models | Provider/Base URL/API Key language is too technical. | Agent 1 Models review. | Add plain examples and tooltips. | Yes |
| I-016 | P2 | Gateway | Gateway purpose is unclear for beginners. | Agent 1 Gateway review. | Say ordinary Chat does not require Gateway. | Yes |
| I-017 | P2 | Knowledge | Retrieval preview lacks snippet/chunk/citation detail. | Browser mock retrieval and Agent 5. | Expand preview rows. | Yes |
| I-018 | P2 | Knowledge | UI import feels like pasted text, not file import. | Agent 5 UI review. | Add text-file picker. | Yes |
| I-019 | P2 | Knowledge | Unsupported PDF/Office/OCR failure path is not visible enough. | Agent 5 review. | Add explicit unsupported file rejection. | Yes |
| I-020 | P2 | Tools | Reserved `mcp-tool`/`workflow` run kinds look more complete than fixture-only runtime. | Agent 6 execution review. | Hide or hard-label reserved kinds. | Yes |
| I-021 | P2 | Tools | Seed filesystem MCP example may imply real execution. | Agent 6 Tools review. | Label as example registration only. | Yes |
| I-022 | P2 | Data | Backup passphrase validation is backend-only. | Agent 7 Data review. | Add UI validation and helper copy. | Yes |
| I-023 | P2 | Data | Restore wrong-passphrase recovery guidance is thin. | Agent 7 review. | Explain safe failure and retry path. | Yes |
| I-024 | P2 | Settings | Role permissions lack a readable matrix. | Settings Security review. | Add role/permission table. | Yes |
| I-025 | P2 | Settings | Audit view shows limited recent slice without depth explanation. | Agent 7 review. | Add paging/export explanation. | Yes |
| I-026 | P2 | Models | Base URL is not validated early enough. | Agent 3 adapter/form review. | Validate at form/store boundary. | Yes |
| I-027 | P2 | Models | API key field may remain after save. | Agent 3 UI review. | Clear input and show secret_ref preview. | Yes |
| I-028 | P2 | Gateway | Model alias/mapping has no clear user entry. | Agent 4 review. | Add alias/mapping page or panel. | Yes |
| I-029 | P2 | Gateway | Gateway key policy editing is incomplete in UI. | Agent 4 review. | Add enable/disable/quota/rate/expiry editing. | Yes |
| I-030 | P2 | Chat | Retry/regenerate lineage can look like duplicate messages. | Agent 8 review. | Mark lineage or add branch/replace strategy. | Yes |
| I-031 | P2 | Chat / Models | Request-level model snapshot is not obvious during switching. | Agent 8 and Stage 3/7 loops. | Show pending/final model snapshot. | Yes |
| I-032 | P2 | Chat | Bottom-follow behavior is not clearly implemented/proven. | Agent 8 source review. | Add bottom sentinel and "back to latest". | Yes |
| I-033 | P2 | Chat | New conversation and other actions share broad busy/notice behavior. | Agent 8 source review. | Scope busy state by action. | Yes |
| I-034 | P2 | Tests | Permanent high-pressure Chat tests are missing. | Agent 8 test review. | Add slow-response and route-switch smoke later. | Yes |
| I-035 | P2 | Runtime / Testing | Plain browser dev is blank without preload/mock. | Stage 2 plain Vite page error. | Document dev mode or provide explicit browser mock script. | Yes |
| I-036 | P3 | Chat | Quick actions are too equal-weight. | Agent 1 review. | Group primary and secondary actions. | Yes |
| I-037 | P3 | Models / Gateway | Provider Key vs Gateway Key distinction should repeat across pages. | Agent 1 review. | Add consistent cross-page copy. | Yes |
| I-038 | P3 | Models | Provider row lacks enough last-error detail. | Agent 3 review. | Expand health detail. | Yes |
| I-039 | P3 | Gateway | Gateway docs need more examples. | Agent 4 review. | Add models/embeddings/responses examples. | Yes |
| I-040 | P3 | Gateway | Gateway logs are sparse. | Agent 4 review. | Expand detail rows. | Yes |
| I-041 | P3 | Tools | MCP label "Transport" is unclear. | Agent 6 review. | Rename to endpoint/command. | Yes |
| I-042 | P3 | Docs | Some progress text contains mojibake. | Agent 6/7 observations. | Separate doc encoding cleanup. | No for this round |
| I-043 | P3 | Knowledge | Failed file row does not show `errorMessage`. | Agent 5 review. | Show error reason in row. | Yes |
| I-044 | P3 | Settings | Default feedback text can be submitted. | Agent 7 review. | Require edited feedback or empty placeholder. | Yes |
| I-045 | P3 | Chat | Active conversation id fallback edge can drift. | Agent 8 review. | Resync active id when missing. | Yes |
| I-046 | P3 | Testing | Cross-module script hit global primary actions first in some routes. | Stage 5 observation. | Use scoped selectors in future automation. | No for app, Yes for future test script |

| Priority | Count |
|---|---:|
| P0 | 0 |
| P1 | 13 |
| P2 | 22 |
| P3 | 11 |

## Recommended Next Implementation Order

1. Chat real streaming chain design and implementation.
2. Chat generation state machine: `idle` / `sending` / `connecting` / `thinking` / `generating` / `saving` / `done` / `error` / `canceled`.
3. Immediate assistant placeholder message.
4. Cancel / retry / regenerate state repair.
5. Models Provider test result and Chat error feedback linkage.
6. Long-answer scroll behavior and Markdown rendering throttling.
7. Agent long-run UI smoke automation entry.
8. Unified module copy and capability boundary cleanup.
9. Chat and Models error diagnosis loop.
10. Formal automated Agent testing system design.

## Final Conclusion

The long-run test ran for 61.5 minutes and satisfied the minimum 60-minute requirement.

The application is stable enough to render and survive repeated browser-mock route switching, Chat sends, Gateway toggles, Provider tests, retrieval runs, and Tools fixture runs. The current Chat experience still does not satisfy the user's requested ChatGPT-like generation feel. The most important product gap is not visual polish; it is the missing streaming/state model: users need immediate assistant presence, visible connection/thinking/generation progress, cancel, retry, and provider-aware error diagnosis.

Models is functional enough for current Provider/Model management, but it needs stricter model selection, clearer Provider test results, earlier Base URL validation, and better feedback in Chat when configuration or upstream health causes slow or failed responses.

This round only recorded findings and did not modify source code.
