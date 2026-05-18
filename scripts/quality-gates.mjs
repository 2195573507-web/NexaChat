#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.css', '.md', '.json']);
const SOURCE_DIRS = ['src', 'tests', 'scripts', 'docs'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-electron', 'release', 'test-results', 'coverage', 'playwright-report', '.git']);
const TOP_LEVEL_ROUTE_PATTERN = /(?<![.\w-])\/(workspace|chat|models|knowledge|tools|gateway|data|settings)\//;
const API_ENDPOINT_PATTERN = /\/v1\/(models|chat\/completions|embeddings|responses)|\/chat\/completions/;
const CJK_PATTERN = /[\u4e00-\u9fff]/;
const MOJIBAKE_PATTERN = /[鎴宸杩叿畬]/;
const SECRET_VALUE_PATTERN = /(sk-[A-Za-z0-9_-]{8,}|nxa_[A-Za-z0-9_-]{8,}|Bearer\s+[A-Za-z0-9._-]+)/;
const UNSAFE_CODE_PATTERN = /\b(eval|new Function)\s*\(|dangerouslySetInnerHTML|nodeIntegration:\s*true|contextIsolation:\s*false/;
const CHILD_PROCESS_IMPORT_PATTERN = /node:child_process|from ['"]child_process['"]/;
const MARKDOWN_LINK_PATTERN = /\[[^\]]+\]\((?!https?:\/\/|mailto:|#)([^)\n]+)\)/g;

const HARD_CODE_FILE_ALLOWLIST = new Set([
  'src/shared/i18n.ts',
  'src/shared/navigation.ts',
  'src/shared/providerRuntime.ts',
  'src/shared/gatewayRuntime.ts',
  'src/shared/desktopEntry.ts',
  'tests/i18n-authority.test.ts',
  'tests/theme-token-authority.test.ts',
  'tests/desktop-entry.test.ts',
  'tests/gateway-provider-chain.test.ts',
  'tests/ui-smoke.spec.ts',
  'scripts/desktop-entry.mjs',
  'scripts/quality-gates.mjs',
]);

const ROUTE_TEXT_ALLOWLIST = new Set([
  'src/shared/gatewayRuntime.ts',
  'src/shared/providerRuntime.ts',
  'src/shared/navigation.ts',
  'src/main/services/localGateway.ts',
  'src/main/services/store.ts',
  'src/renderer/mockApi.ts',
  'src/renderer/modules/GatewayPage.tsx',
  'tests/ui-smoke.spec.ts',
  'scripts/electron-smoke.mjs',
  'scripts/package-smoke.mjs',
  'scripts/installer-smoke.mjs',
  'scripts/quality-gates.mjs',
  'tests/app.test.tsx',
]);

const SECURITY_PATTERN_ALLOWLIST = new Set([
  'scripts/quality-gates.mjs',
]);

const TEST_SECRET_ALLOWLIST = new Set([
  'tests/conversation-runtime.test.ts',
  'tests/data-runtime.test.ts',
  'tests/gateway-provider-chain.test.ts',
  'tests/knowledge-runtime.test.ts',
  'tests/observability-runtime.test.ts',
  'tests/observability-store.test.ts',
  'tests/provider-adapter.test.ts',
  'tests/provider-store-integration.test.ts',
  'tests/redaction.test.ts',
]);

const CHILD_PROCESS_ALLOWLIST = new Set([
  'scripts/create-installer-script.mjs',
  'scripts/desktop-entry.mjs',
  'scripts/installer-smoke.mjs',
  'scripts/shortcut-readback.mjs',
  'scripts/shortcut-update.mjs',
  'scripts/ui-smoke.mjs',
  'scripts/quality-gates.mjs',
]);

function walk(dir) {
  const absoluteDir = join(repoRoot, dir);
  const entries = [];
  for (const item of readdirSync(absoluteDir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(item.name)) {
      continue;
    }
    const absolutePath = join(absoluteDir, item.name);
    const rel = relative(repoRoot, absolutePath).replaceAll('\\', '/');
    if (item.isDirectory()) {
      entries.push(...walk(rel));
    } else if (SOURCE_EXTENSIONS.has(extname(item.name))) {
      entries.push(rel);
    }
  }
  return entries;
}

function read(rel) {
  return readFileSync(join(repoRoot, rel), 'utf8');
}

function getFiles() {
  return SOURCE_DIRS.filter((dir) => existsPath(join(repoRoot, dir))).flatMap((dir) => walk(dir));
}

function fail(title, violations) {
  if (!violations.length) {
    return;
  }
  console.error(`\n${title}`);
  for (const violation of violations.slice(0, 80)) {
    console.error(`- ${violation}`);
  }
  if (violations.length > 80) {
    console.error(`- ... ${violations.length - 80} more`);
  }
  process.exitCode = 1;
}

async function loadModule(relativePath) {
  const moduleUrl = pathToFileURL(join(repoRoot, relativePath)).href;
  return import(moduleUrl);
}

function assertUnique(values, label) {
  const seen = new Map();
  const duplicates = [];
  for (const value of values) {
    const count = seen.get(value) ?? 0;
    seen.set(value, count + 1);
    if (count === 1) {
      duplicates.push(String(value));
    }
  }
  fail(`${label} duplicates`, duplicates);
}

async function scanHardcode() {
  const files = getFiles();
  const cjkViolations = [];
  const routeTextViolations = [];
  const mojibakeViolations = [];
  const rawColorViolations = [];
  for (const rel of files) {
    const source = read(rel);
    const lines = source.split(/\r?\n/);
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (CJK_PATTERN.test(line) && !HARD_CODE_FILE_ALLOWLIST.has(rel) && !rel.endsWith('.md')) {
        cjkViolations.push(`${rel}:${index + 1}: ${trimmed}`);
      }
      if (
        TOP_LEVEL_ROUTE_PATTERN.test(line)
        && !API_ENDPOINT_PATTERN.test(line)
        && !ROUTE_TEXT_ALLOWLIST.has(rel)
        && !rel.endsWith('.md')
      ) {
        routeTextViolations.push(`${rel}:${index + 1}: ${trimmed}`);
      }
      if (MOJIBAKE_PATTERN.test(line) && !HARD_CODE_FILE_ALLOWLIST.has(rel) && !rel.endsWith('.md')) {
        mojibakeViolations.push(`${rel}:${index + 1}: ${trimmed}`);
      }
      if (rel.endsWith('.css') && /#[0-9A-Fa-f]{3,8}|:\s*(white|black)\b/.test(line) && !/^\s*--[\w-]+:\s*.+;\s*$/.test(line)) {
        rawColorViolations.push(`${rel}:${index + 1}: ${trimmed}`);
      }
    });
  }
  fail('CJK hardcoded text outside i18n allowlist', cjkViolations);
  fail('Visible app-route strings outside routing/test allowlist', routeTextViolations);
  fail('Potential mojibake text outside allowlist', mojibakeViolations);
  fail('Raw CSS colors outside token definitions', rawColorViolations);
}

async function scanDuplicates() {
  const [{ IPC_CHANNEL_LIST }, { APP_API_METHODS }, { navModules, routeAliases }, { GATEWAY_ENDPOINT, GATEWAY_SCOPES }] = await Promise.all([
    loadModule('dist-electron/shared/ipc.js'),
    loadModule('dist-electron/shared/api.js'),
    loadModule('dist-electron/shared/navigation.js'),
    loadModule('dist-electron/shared/gatewayRuntime.js'),
  ]);

  assertUnique(IPC_CHANNEL_LIST, 'IPC channel');
  assertUnique(APP_API_METHODS, 'App API method');
  assertUnique(navModules.map((module) => module.id), 'Navigation module id');
  assertUnique(navModules.flatMap((module) => module.tabs.map((tab) => tab.route)), 'Navigation route');
  assertUnique(Object.keys(routeAliases), 'Route alias source');
  assertUnique(Object.values(routeAliases), 'Route alias target');
  assertUnique(Object.values(GATEWAY_ENDPOINT), 'Gateway endpoint');
  assertUnique(GATEWAY_SCOPES, 'Gateway scope');

  const packageJson = JSON.parse(read('package.json'));
  assertUnique(Object.keys(packageJson.scripts ?? {}), 'Package script');

  const mockSource = read('src/renderer/mockApi.ts');
  const apiMethods = APP_API_METHODS;
  const missingMockMethods = apiMethods.filter((method) => !new RegExp(`\\b${method}\\s*[:(]`).test(mockSource));
  fail('Browser mock missing AppApi methods', missingMockMethods);

  const preloadSource = read('src/preload/index.ts');
  const missingPreloadMethods = apiMethods.filter((method) => !new RegExp(`\\b${method}\\s*(?:[:(,]|$)`).test(preloadSource));
  fail('Preload bridge missing AppApi methods', missingPreloadMethods);
}

async function scanSecurity() {
  const files = getFiles();
  const secretViolations = [];
  const unsafeViolations = [];
  const shellViolations = [];
  for (const rel of files) {
    const source = read(rel);
    source.split(/\r?\n/).forEach((line, index) => {
      const trimmed = line.trim();
      if (SECRET_VALUE_PATTERN.test(line) && !rel.endsWith('.md') && !TEST_SECRET_ALLOWLIST.has(rel)) {
        secretViolations.push(`${rel}:${index + 1}: ${trimmed}`);
      }
      if (UNSAFE_CODE_PATTERN.test(line) && !SECURITY_PATTERN_ALLOWLIST.has(rel)) {
        unsafeViolations.push(`${rel}:${index + 1}: ${trimmed}`);
      }
      if ((CHILD_PROCESS_IMPORT_PATTERN.test(line) || /\bexec(Sync|File|FileSync)\s*\(/.test(line)) && !CHILD_PROCESS_ALLOWLIST.has(rel)) {
        shellViolations.push(`${rel}:${index + 1}: ${trimmed}`);
      }
    });
  }
  const mainSource = read('src/main/index.ts');
  const preloadSource = read('src/preload/index.ts');
  if (!mainSource.includes('contextIsolation: true')) {
    unsafeViolations.push('src/main/index.ts: missing contextIsolation: true');
  }
  if (!mainSource.includes('nodeIntegration: false')) {
    unsafeViolations.push('src/main/index.ts: missing nodeIntegration: false');
  }
  if (!preloadSource.includes('contextBridge.exposeInMainWorld')) {
    unsafeViolations.push('src/preload/index.ts: missing contextBridge bridge');
  }
  fail('Potential raw secret values', secretViolations);
  fail('Unsafe renderer/main security patterns', unsafeViolations);
  fail('Raw shell execution in runtime source', shellViolations);
}

async function scanDeadLinks() {
  const files = getFiles().filter((rel) => rel.endsWith('.md'));
  const violations = [];
  for (const rel of files) {
    const source = read(rel);
    let match;
    while ((match = MARKDOWN_LINK_PATTERN.exec(source))) {
      const target = match[1].split(/[?#]/)[0];
      if (!target || target.startsWith('<') || target.startsWith('app://')) {
        continue;
      }
      const resolved = resolve(join(repoRoot, rel, '..'), target);
      if (!resolved.startsWith(repoRoot) || !existsPath(resolved)) {
        violations.push(`${rel}: missing link target ${match[1]}`);
      }
    }
  }
  fail('Dead local Markdown links', violations);
}

function existsPath(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

async function scanDocs() {
  const violations = [];
  const readmePath = join(repoRoot, 'README.md');
  if (!existsPath(readmePath)) {
    violations.push('README.md: missing');
    fail('Docs freshness gaps', violations);
    return;
  }

  const readme = read('README.md');
  const requiredText = [
    'NexaChat 是本地优先、多模型 AI 桌面聊天工作台。',
    'Chat',
    'Models',
    'Knowledge Base',
    'Tools',
    'Gateway',
    'Data',
    'Settings',
    '当前根路由 `/` 解析到：`/chat/conversations`',
    'Electron',
    'React',
    'TypeScript',
    'Vite',
    'SQLite / `node:sqlite`',
    '默认本地 Gateway 地址：`127.0.0.1:8787`',
    'Knowledge Base 当前支持 text-like 文件。',
    '`/v1/responses` 当前为保留端点',
    'Tools / Agent / MCP 是受控实验能力',
    'npm.cmd run typecheck',
    'npm.cmd run test',
    'npm.cmd run build',
    'npm.cmd run test:ui-smoke',
    'npm.cmd run test:electron-smoke',
    '`src/main`',
    '`src/preload`',
    '`src/renderer`',
    '`src/shared`',
    '`tests`',
  ];
  for (const text of requiredText) {
    if (!readme.includes(text)) {
      violations.push(`README.md: missing "${text}"`);
    }
  }

  const forbiddenReadmePatterns = [
    /Workspace-first/i,
    /Dashboard-first/i,
    /\b8[- ]module\b/i,
    /8\s*个模块/,
    /docs\/build-plans/i,
    /docs\/iteration-plans/i,
    /PROJECT_PROGRESS\.md/i,
    /task_plan\.md/i,
    /progress\.md/i,
    /findings\.md/i,
    /README\.zh-CN\.md/i,
    /PDF|Office|OCR|external vector database|外部向量数据库/,
  ];
  for (const pattern of forbiddenReadmePatterns) {
    if (pattern.test(readme)) {
      violations.push(`README.md: forbidden stale or overstated text matched ${pattern}`);
    }
  }

  const removedArtifacts = [
    'README.zh-CN.md',
    'PROJECT_PROGRESS.md',
    'task_plan.md',
    'progress.md',
    'findings.md',
    'docs/build-plans',
    'docs/iteration-plans',
    'docs/design',
    'docs/implementation',
    'docs/testing',
  ];
  for (const rel of removedArtifacts) {
    if (existsPath(join(repoRoot, rel))) {
      violations.push(`${rel}: planning/process artifact should not be present`);
    }
  }
  fail('Docs freshness gaps', violations);
}

async function runCommandGate(command, args) {
  const spawnCommand = process.platform === 'win32' && command.endsWith('.cmd') ? 'cmd.exe' : command;
  const spawnArgs = process.platform === 'win32' && command.endsWith('.cmd') ? ['/d', '/s', '/c', command, ...args] : args;
  const result = spawnSync(spawnCommand, spawnArgs, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
    windowsHide: true,
  });
  if (result.error) {
    console.error(`Failed to start ${command} ${args.join(' ')}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function main() {
  const gate = process.argv[2];
  switch (gate) {
    case 'hardcode':
      await scanHardcode();
      break;
    case 'duplicates':
      await scanDuplicates();
      break;
    case 'security':
      await scanSecurity();
      break;
    case 'dead-links':
      await scanDeadLinks();
      break;
    case 'docs':
      await scanDocs();
      break;
    case 'all-scans':
      await scanHardcode();
      await scanDuplicates();
      await scanSecurity();
      await scanDeadLinks();
      await scanDocs();
      break;
    case 'release':
      await runCommandGate('npm.cmd', ['run', 'typecheck']);
      await runCommandGate('npm.cmd', ['run', 'test']);
      await runCommandGate('npm.cmd', ['run', 'build']);
      await runCommandGate('npm.cmd', ['run', 'test:ui-smoke']);
      await runCommandGate('npm.cmd', ['run', 'test:electron-smoke']);
      await runCommandGate('npm.cmd', ['run', 'package:release']);
      await runCommandGate('npm.cmd', ['run', 'test:desktop-entry']);
      await scanHardcode();
      await scanDuplicates();
      await scanSecurity();
      await scanDeadLinks();
      await scanDocs();
      await runCommandGate('git', ['diff', '--check']);
      break;
    default:
      console.log('Usage: node scripts/quality-gates.mjs <hardcode|duplicates|security|dead-links|docs|all-scans|release>');
      process.exit(gate ? 1 : 0);
  }

  if (process.exitCode) {
    process.exit(process.exitCode);
  }
  console.log(`Quality gate passed: ${gate}`);
}

await main();
