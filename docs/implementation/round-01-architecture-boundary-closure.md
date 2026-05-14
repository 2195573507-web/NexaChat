# Round 1 Architecture Boundary Closure

Date: 2026-05-14

Status: Completed.

## Root-Cause And Chain Review

Round 1 addressed the first architecture boundary problem found in Round 0: IPC channel names, payload shape assumptions, and preload exposure were duplicated across `src/main/ipc.ts` and `src/preload/index.ts`. The root cause was bootstrap speed during the initial runnable build.

Upstream inputs:

- Renderer calls `AppApi` methods.
- Preload translates `AppApi` methods into IPC invocations.
- Main process receives the channel and payload.

Downstream outputs:

- `NexaStore` methods continue to own current behavior.
- SQLite writes, request logs, gateway logs, audit logs, and renderer snapshot refreshes remain unchanged.

## Main Changes

- Added `src/shared/ipc.ts` as the IPC channel authority and first payload arity guard.
- Replaced raw `ipcMain.handle('...')` and `ipcRenderer.invoke('...')` channel strings with `IPC_CHANNELS`.
- Added `assertIpcPayload()` at the main-process IPC boundary.
- Moved `AppApi` and `Window.nexachat` typing from the broad domain type file into `src/shared/api.ts`.
- Changed renderer browser mock fallback to require explicit test or `VITE_NEXACHAT_BROWSER_MOCK=1` mode.
- Updated Playwright config to use `cross-env VITE_NEXACHAT_BROWSER_MOCK=1` and avoid reusing stale Vite servers.
- Strengthened Electron smoke to verify `window.nexachat.getSnapshot()` works in the real desktop preload.
- Added `docs/architecture/store-facade-boundaries.md` to define what `NexaStore` keeps and what later rounds should extract.
- Added IPC and renderer API boundary tests.

## Deleted Old Links

- Removed duplicate raw IPC channel string usage in main and preload.
- Did not delete `mockApi.ts`; it is now explicit test/browser fallback rather than silent production fallback.
- Did not split `store.ts` behavior in this round; extraction order is documented for later rounds.

## Verification

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` | Passed |
| `npm.cmd run test` | Passed, 3 files / 10 tests |
| `npm.cmd run build` | Passed |
| `npm.cmd run test:ui-smoke` | Passed, 10 Playwright tests |
| `npm.cmd run test:electron-smoke` | Passed, Electron shell and preload API rendered |
| `npm.cmd run verify` | Passed |

Desktop shortcut check:

- `C:/Users/至亲/Desktop/NexaChat.lnk` targets `D:/NexaChat/node_modules/electron/dist/electron.exe`.
- Arguments: `"D:/NexaChat"`.
- WorkingDirectory: `D:/NexaChat`.
- IconLocation: `D:/NexaChat/assets/app-icon.ico,0`.
- No shortcut was modified.

## Acceptance Result

Passed. Domain boundaries are documented, IPC registry is used, renderer/preload/main no longer duplicate IPC channel literals, production renderer no longer silently masks missing preload with the browser mock, and existing flows pass smoke tests.

## Commit

- Commit hash: `284fd50d7b47fe15839243bf29b409b479aae23b`.
- Push result: `origin/main` confirmed at `284fd50d7b47fe15839243bf29b409b479aae23b` using one-time Git proxy `http://127.0.0.1:7890` after direct GitHub HTTPS push timed out.
- Remaining issues: deeper service/repository extraction, migration runner, and endpoint/permission registries are queued to later rounds.
