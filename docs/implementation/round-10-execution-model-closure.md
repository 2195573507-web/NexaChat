# Round 10 Agent, MCP, Tools And Workflow Closure

Date: 2026-05-16

Status: Completed as implementation, verification, and remote delivery.

## Root-Cause And Chain Review

Round 10 addressed the execution-model gap where Agent dry-run records were stored as `config_snapshots(cleanup-preview)`. That path could not safely represent Agent runs, Tool calls, MCP tool calls, Workflow nodes, approvals, trace events, sandbox boundaries, or recovery without creating duplicate task systems.

Implemented chain:

- User action -> shared `executionRuntime` authority -> preload/IPC -> Store.
- Store -> permission and fixture policy -> `execution_runs`.
- Run -> ordered `execution_steps` -> `execution_trace_events`.
- Approval-required fixture -> `approval_requests` -> approve/deny decision -> run completion or cancellation.
- Agent preview -> same execution run model with read-only status fixture.
- Tools UI -> one Run Center for Agent, Tool, MCP, and Workflow boundaries, without a fake workflow canvas.

Only safe fixtures are executable in this round. MCP grant still does not mean tool execution, and no dangerous system command or external MCP call is run.

## Main Changes

- Added `src/shared/executionRuntime.ts` for run statuses, step statuses, trace event names, run kinds, fixture tool IDs, and input normalization.
- Added shared types for `ToolDefinition`, `ExecutionRun`, `ExecutionStep`, `ExecutionTraceEvent`, `ApprovalRequest`, `ExecutionStartInput`, and `ApprovalDecisionInput`.
- Added `tools`, `execution_runs`, `execution_steps`, `execution_trace_events`, and `approval_requests` schema/migration support.
- Added mappers and Store readers for tools, runs, steps, trace events, and approvals.
- Replaced Agent dry-run's production path from `config_snapshots` to `execution_runs`.
- Added safe status-read and echo fixtures. Echo requires approval; status-read is read-only.
- Added `startExecutionRun` and `decideApproval` AppApi/IPC/preload/main handlers.
- Updated Tools Run Center UI to show runs, steps, approvals, trace events, and approval actions.
- Updated browser mock parity for execution runs, trace events, and approval decisions.
- Added `tests/execution-runtime.test.ts` and extended IPC, app, and UI smoke coverage.

## Deleted Or Replaced Old Links

- Replaced `previewAgentRun -> config_snapshots(cleanup-preview)` as the production Agent dry-run path.
- Kept `config_snapshots` for import/export/snapshot behavior only.
- Replaced the planned-only Run Center placeholder with a real execution model view.
- Workflow remains represented as an execution kind without a fake canvas.
- MCP registration and permission remain separated from execution.

## Verification

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run test -- tests/execution-runtime.test.ts tests/ipc-contract.test.ts tests/i18n-authority.test.ts` | Passed, 3 files / 8 tests |
| `npm.cmd run test` | Passed, 12 files / 37 tests |
| `npm.cmd run test:ui-smoke` | Passed, 13 Playwright tests |
| `npm.cmd run build` | Passed |
| `npm.cmd run verify` | Passed, including typecheck, full unit test suite, and build |
| `npm.cmd run test:electron-smoke` | Passed, Electron shell rendered |
| `git diff --check` | Passed with LF/CRLF conversion warnings only |

Desktop shortcut check:

- `C:/Users/至亲/Desktop/NexaChat.lnk` exists.
- TargetPath: `D:/NexaChat/node_modules/electron/dist/electron.exe`.
- Arguments: `"D:/NexaChat"`.
- WorkingDirectory: `D:/NexaChat`.
- IconLocation: `D:/NexaChat/assets/app-icon.ico,0`.
- No shortcut was modified.

## Acceptance Result

Passed at the Round 10 boundary. Agent preview, safe tool fixtures, trace events, approval requests, approval decisions, and cancellation/completion states now share one execution model. MCP and Workflow are connected to the same model as boundaries without exposing unsafe execution or fake canvas behavior.

## Commit

- Delivery commit hash: `ddab2066c67044c367e7c28cf8126e450d2a074d`.
- Closeout commit hash: `3f267dca0d0a7ec67272e3e7e800e01b7ca440cd`.
- Push result: delivery and closeout commits pushed; `origin/main` confirmed at `3f267dca0d0a7ec67272e3e7e800e01b7ca440cd`.
- Remaining issues: None for Round 10. Round 11 owns stronger identity, RBAC/ACL, main-process permission enforcement, and audit hash-chain hardening.
