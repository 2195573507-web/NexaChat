#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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

const SECRET_PATTERN_FILE_ALLOWLIST = new Set([
  'scripts/long-click-test.mjs',
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
  'tests/provider-discovery.test.ts',
  'tests/provider-store-integration.test.ts',
  'tests/redaction.test.ts',
]);

const CHILD_PROCESS_ALLOWLIST = new Set([
  'scripts/create-installer-script.mjs',
  'scripts/desktop-entry.mjs',
  'scripts/installer-smoke.mjs',
  'scripts/long-click-test.mjs',
  'scripts/shortcut-readback.mjs',
  'scripts/shortcut-update.mjs',
  'scripts/ui-smoke.mjs',
  'scripts/quality-gates.mjs',
]);

const PACKAGER_FORBIDDEN_COPY_ITEMS = [
  "'src'",
  "'tests'",
  "'docs/build-plans'",
  "'.git'",
  "'.env'",
  "'test-results'",
];

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

function collectObjectValues(source, exportName) {
  const declaration = new RegExp(`export\\s+const\\s+${exportName}\\s*=\\s*\\{([\\s\\S]*?)\\}\\s+as\\s+const`, 'm').exec(source);
  if (!declaration) {
    throw new Error(`Unable to find exported const object ${exportName}.`);
  }
  return [...declaration[1].matchAll(/:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
}

function collectArrayValues(source, exportName) {
  const declaration = new RegExp(`export\\s+const\\s+${exportName}\\s*=\\s*\\[([\\s\\S]*?)\\]`, 'm').exec(source);
  if (!declaration) {
    throw new Error(`Unable to find exported const array ${exportName}.`);
  }
  return [...declaration[1].matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
}

function collectNavigationFacts() {
  const navigationSource = read('src/shared/navigation.ts');
  const moduleIds = [...navigationSource.matchAll(/defineModule\(\{\s*id:\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  const routes = [];
  for (const moduleId of moduleIds) {
    const modulePattern = new RegExp(`defineModule\\(\\{\\s*id:\\s*['"]${moduleId}['"][\\s\\S]*?children:\\s*\\[([\\s\\S]*?)\\]\\s*,?\\s*\\}\\)`, 'm');
    const moduleMatch = modulePattern.exec(navigationSource);
    if (!moduleMatch) {
      throw new Error(`Unable to parse navigation module ${moduleId}.`);
    }
    for (const childMatch of moduleMatch[1].matchAll(/id:\s*['"]([^'"]+)['"]/g)) {
      routes.push(`/${moduleId}/${childMatch[1]}`);
    }
  }
  const routeAliasSources = [...navigationSource.matchAll(/alias\(\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  const routeAliasTargets = [...navigationSource.matchAll(/alias\(\s*['"][^'"]+['"]\s*,\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  return { moduleIds, routes, routeAliasSources, routeAliasTargets };
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
  const apiMethods = collectArrayValues(read('src/shared/api.ts'), 'APP_API_METHODS');
  const { moduleIds, routes, routeAliasSources, routeAliasTargets } = collectNavigationFacts();
  const gatewaySource = read('src/shared/gatewayRuntime.ts');
  const packageJson = JSON.parse(read('package.json'));

  assertUnique(collectObjectValues(read('src/shared/ipc.ts'), 'IPC_CHANNELS'), 'IPC channel');
  assertUnique(apiMethods, 'App API method');
  assertUnique(moduleIds, 'Navigation module id');
  assertUnique(routes, 'Navigation route');
  assertUnique(routeAliasSources, 'Route alias source');
  assertUnique(routeAliasTargets, 'Route alias target');
  assertUnique(collectObjectValues(gatewaySource, 'GATEWAY_ENDPOINT'), 'Gateway endpoint');
  assertUnique(collectArrayValues(gatewaySource, 'GATEWAY_SCOPES'), 'Gateway scope');
  assertUnique(Object.keys(packageJson.scripts ?? {}), 'Package script');

  const mockSource = read('src/renderer/mockApi.ts');
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
      if (SECRET_VALUE_PATTERN.test(line) && !rel.endsWith('.md') && !TEST_SECRET_ALLOWLIST.has(rel) && !SECRET_PATTERN_FILE_ALLOWLIST.has(rel)) {
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
  if (!mainSource.includes('content-security-policy') || !mainSource.includes('CONTENT_SECURITY_POLICY')) {
    unsafeViolations.push('src/main/index.ts: missing nexachat:// Content-Security-Policy');
  }
  if (!mainSource.includes('setPermissionRequestHandler')) {
    unsafeViolations.push('src/main/index.ts: missing default-deny permission request handler');
  }
  if (!mainSource.includes('sandbox: false')) {
    unsafeViolations.push('src/main/index.ts: missing explicit sandbox compatibility decision');
  }
  if (!preloadSource.includes('contextBridge.exposeInMainWorld')) {
    unsafeViolations.push('src/preload/index.ts: missing contextBridge bridge');
  }
  if (/exposeInMainWorld\([^)]*ipcRenderer/s.test(preloadSource)) {
    unsafeViolations.push('src/preload/index.ts: raw ipcRenderer exposed through preload');
  }
  fail('Potential raw secret values', secretViolations);
  fail('Unsafe renderer/main security patterns', unsafeViolations);
  fail('Raw shell execution in runtime source', shellViolations);
}

async function scanReleaseSafety() {
  const violations = [];
  if (process.env.NEXACHAT_ALLOW_INSECURE_SECRET_STORAGE === '1') {
    violations.push('environment: NEXACHAT_ALLOW_INSECURE_SECRET_STORAGE=1 is forbidden for release safety checks');
  }
  if (process.env.NEXACHAT_RELEASE_PROFILE === '1' && process.env.NEXACHAT_ELECTRON_SMOKE === '1') {
    violations.push('environment: NEXACHAT_ELECTRON_SMOKE=1 cannot be used as proof of release secret storage');
  }
  const installerGenerator = read('scripts/create-installer-script.mjs');
  if (!installerGenerator.includes('Assert-SafeInstallRoot')) {
    violations.push('scripts/create-installer-script.mjs: missing Assert-SafeInstallRoot');
  }
  if (/Get-ChildItem\s+-LiteralPath\s+\$resolvedInstall[\s\S]{0,120}Remove-Item\s+-Recurse\s+-Force/.test(installerGenerator)) {
    violations.push('scripts/create-installer-script.mjs: contains blanket InstallRoot child delete');
  }
  for (const required of [
    'InstallRoot cannot be a drive root',
    'Desktop, Documents, Downloads',
    'not a verified NexaChat install directory',
    'Refusing to remove path outside InstallRoot',
  ]) {
    if (!installerGenerator.includes(required)) {
      violations.push(`scripts/create-installer-script.mjs: missing guard text "${required}"`);
    }
  }

  const packager = read('scripts/package-win-unpacked.mjs');
  for (const item of PACKAGER_FORBIDDEN_COPY_ITEMS) {
    if (packager.includes(item)) {
      violations.push(`scripts/package-win-unpacked.mjs: forbidden package copy item ${item}`);
    }
  }
  for (const required of [
    'desktopEntry.relativePaths.rendererDist',
    'desktopEntry.relativePaths.mainDist',
    "'assets'",
    'packagedManifest',
  ]) {
    if (!packager.includes(required)) {
      violations.push(`scripts/package-win-unpacked.mjs: missing expected allowlisted package source ${required}`);
    }
  }
  fail('Release safety gaps', violations);
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
    'NexaChat 是本地优先的多模型 AI 桌面对话工作台。',
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
    '`/v1/responses` 当前提供 basic text',
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
    /docs\/iteration-plans/i,
    /task_plan\.md/i,
    /progress\.md/i,
    /findings\.md/i,
    /README\.zh-CN\.md/i,
    /完整\s*PDF\/Office\/OCR\/vector DB RAG/,
    /生产级\s*PDF\/Office\/OCR\/vector DB RAG.*已实现/,
  ];
  for (const pattern of forbiddenReadmePatterns) {
    if (pattern.test(readme)) {
      violations.push(`README.md: forbidden stale or overstated text matched ${pattern}`);
    }
  }

  const removedArtifacts = [
    'README.zh-CN.md',
    'task_plan.md',
    'progress.md',
    'findings.md',
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

async function scanCurrentDocs() {
  const violations = [];
  const readmePath = join(repoRoot, 'README.md');
  if (!existsPath(readmePath)) {
    violations.push('README.md: missing');
    fail('Docs freshness gaps', violations);
    return;
  }

  const readme = read('README.md');
  const requiredText = [
    'NexaChat 是本地优先、聊天优先的多模型 AI 桌面工作台。',
    'Chat',
    'Models',
    'Knowledge Base',
    'Tools',
    'Gateway',
    'Data',
    'Settings',
    '当前根路由 `/` 解析到 `/chat/conversations`',
    'Electron',
    'React 19',
    'TypeScript',
    'Vite',
    'SQLite / `node:sqlite`',
    '默认本地 Gateway 地址：`127.0.0.1:8787`',
    'Knowledge Base 当前支持 text-like 导入',
    '`/v1/responses` 当前提供 basic text',
    'Tools / Agent / MCP 当前支持注册、权限、dry-run、fixture execution、approval、trace/logging',
    'npm.cmd run typecheck',
    'npm.cmd run scan:quality',
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
    /8\s*个顶层模块/,
    /docs\/iteration-plans/i,
    /task_plan\.md/i,
    /progress\.md/i,
    /findings\.md/i,
    /README\.zh-CN\.md/i,
    /完整\s*PDF\/Office\/OCR\/vector DB RAG/,
    /生产级\s*PDF\/Office\/OCR\/vector DB RAG.*已实现/,
  ];
  for (const pattern of forbiddenReadmePatterns) {
    if (pattern.test(readme)) {
      violations.push(`README.md: forbidden stale or overstated text matched ${pattern}`);
    }
  }

  const requiredDocs = [
    'docs/architecture/current-architecture.md',
    'docs/testing/validation-checklist.md',
    'docs/design/ui-product-boundary.md',
  ];
  for (const rel of requiredDocs) {
    if (!existsPath(join(repoRoot, rel))) {
      violations.push(`${rel}: missing current source-of-truth doc`);
    }
  }

  const removedArtifacts = [
    'README.zh-CN.md',
    'task_plan.md',
    'progress.md',
    'findings.md',
    'docs/iteration-plans',
    'docs/implementation',
  ];
  for (const rel of removedArtifacts) {
    if (existsPath(join(repoRoot, rel))) {
      violations.push(`${rel}: stale planning/process artifact should not be present`);
    }
  }
  fail('Docs freshness gaps', violations);
}

async function scanCurrentDocsV2() {
  const violations = [];
  const readmePath = join(repoRoot, 'README.md');
  if (!existsPath(readmePath)) {
    violations.push('README.md: missing');
    fail('Docs freshness gaps', violations);
    return;
  }

  const readme = read('README.md');
  const requiredText = [
    'NexaChat 是本地优先、聊天优先的多模型 AI 桌面工作台。',
    '当前根路由 `/` 解析到 `/chat/conversations`',
    'Chat',
    'Models',
    'Knowledge Base',
    'Tools',
    'Gateway',
    'Data',
    'Settings',
    'React 19',
    'SQLite / `node:sqlite`',
    '默认本地 Gateway 地址：`127.0.0.1:8787`',
    'Knowledge Base 当前支持 text-like 导入',
    '`/v1/responses` 当前提供 basic text',
    'Tools / Agent / MCP 当前支持注册、权限、dry-run、fixture execution、approval、trace/logging',
    'npm.cmd run typecheck',
    'npm.cmd run scan:quality',
    'npm.cmd run test',
    'npm.cmd run test:ui-smoke',
    'npm.cmd run test:electron-smoke',
    'scan:release-safety',
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
    /8\s*个顶层模块/,
    /docs\/iteration-plans/i,
    /task_plan\.md/i,
    /progress\.md/i,
    /findings\.md/i,
    /README\.zh-CN\.md/i,
    /完整\s*PDF\/Office\/OCR\/vector DB RAG/,
    /生产级\s*PDF\/Office\/OCR\/vector DB RAG.*已实现/,
    /已签名.*installer/i,
    /auto-update.*已完成/i,
  ];
  for (const pattern of forbiddenReadmePatterns) {
    if (pattern.test(readme)) {
      violations.push(`README.md: forbidden stale or overstated text matched ${pattern}`);
    }
  }

  const requiredDocs = [
    'docs/architecture/current-architecture.md',
    'docs/testing/validation-checklist.md',
    'docs/design/ui-product-boundary.md',
  ];
  for (const rel of requiredDocs) {
    if (!existsPath(join(repoRoot, rel))) {
      violations.push(`${rel}: missing current source-of-truth doc`);
    }
  }

  const removedArtifacts = [
    'README.zh-CN.md',
    'task_plan.md',
    'progress.md',
    'findings.md',
    'docs/iteration-plans',
    'docs/implementation',
  ];
  for (const rel of removedArtifacts) {
    if (existsPath(join(repoRoot, rel))) {
      violations.push(`${rel}: stale planning/process artifact should not be present`);
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
    case 'release-safety':
      await scanReleaseSafety();
      break;
    case 'dead-links':
      await scanDeadLinks();
      break;
    case 'docs':
      await scanCurrentDocsV2();
      break;
    case 'all-scans':
      await scanHardcode();
      await scanDuplicates();
      await scanSecurity();
      await scanReleaseSafety();
      await scanDeadLinks();
      await scanCurrentDocsV2();
      break;
    case 'release':
      await runCommandGate('npm.cmd', ['run', 'typecheck']);
      await runCommandGate('npm.cmd', ['run', 'test']);
      await runCommandGate('npm.cmd', ['run', 'build']);
      await runCommandGate('npm.cmd', ['run', 'test:ui-smoke']);
      await runCommandGate('npm.cmd', ['run', 'test:electron-smoke']);
      await scanReleaseSafety();
      await runCommandGate('npm.cmd', ['run', 'package:release']);
      await runCommandGate('npm.cmd', ['run', 'test:desktop-entry']);
      await scanHardcode();
      await scanDuplicates();
      await scanSecurity();
      await scanReleaseSafety();
      await scanDeadLinks();
      await scanCurrentDocsV2();
      await runCommandGate('git', ['diff', '--check']);
      break;
    default:
      console.log('Usage: node scripts/quality-gates.mjs <hardcode|duplicates|security|release-safety|dead-links|docs|all-scans|release>');
      process.exit(gate ? 1 : 0);
  }

  if (process.exitCode) {
    process.exit(process.exitCode);
  }
  console.log(`Quality gate passed: ${gate}`);
}

await main();
