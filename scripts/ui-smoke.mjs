import { spawn } from 'node:child_process';

function run(command, args, options = {}) {
  return spawn(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...options.env,
    },
    shell: false,
    stdio: options.stdio ?? 'inherit',
    windowsHide: true,
  });
}

async function waitForServer(url, timeoutMs = 60_000) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = new Error(`Unexpected status ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function terminate(child) {
  if (!child.pid || child.killed) {
    return;
  }

  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/F', '/T', '/PID', String(child.pid)], {
      shell: false,
      stdio: 'ignore',
      windowsHide: true,
    });
    await new Promise((resolve) => {
      killer.on('exit', () => resolve(undefined));
      killer.on('error', () => resolve(undefined));
    });
    return;
  }

  child.kill('SIGTERM');
  await new Promise((resolve) => {
    child.on('exit', () => resolve(undefined));
    setTimeout(resolve, 2_000);
  });
}

const server = run('node', ['./node_modules/vite/bin/vite.js', '--host', '127.0.0.1'], {
  env: {
    VITE_NEXACHAT_BROWSER_MOCK: '1',
  },
  stdio: 'pipe',
});

server.stdout.on('data', (chunk) => process.stdout.write(chunk));
server.stderr.on('data', (chunk) => process.stderr.write(chunk));

server.once('exit', (code) => {
  if (code !== 0 && process.exitCode === undefined) {
    process.exitCode = code ?? 1;
  }
});

try {
  await waitForServer('http://127.0.0.1:5173');
  const playwright = run('node', ['./node_modules/@playwright/test/cli.js', 'test', 'tests/ui-smoke.spec.ts', '--config=playwright.config.ts']);
  const exitCode = await new Promise((resolve) => {
    playwright.on('exit', (code) => resolve(code ?? 1));
    playwright.on('error', () => resolve(1));
  });
  process.exitCode = exitCode;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  const exitCode = process.exitCode ?? 0;
  await terminate(server);
  process.exit(exitCode);
}
