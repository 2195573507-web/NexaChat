import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const electronBin = process.platform === 'win32'
  ? join(process.cwd(), 'node_modules', 'electron', 'dist', 'electron.exe')
  : join(process.cwd(), 'node_modules', 'electron', 'dist', 'Electron.app', 'Contents', 'MacOS', 'Electron');

const child = spawn(electronBin, ['.'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    ELECTRON_ENABLE_LOGGING: '1',
  },
});

let output = '';
let exited = false;
let stopping = false;

child.stdout.on('data', (chunk) => {
  output += chunk.toString();
});

child.stderr.on('data', (chunk) => {
  output += chunk.toString();
});

child.on('exit', (code) => {
  exited = true;
  if (stopping) {
    return;
  }
  if (code && code !== 0) {
    console.error(output);
    process.exitCode = code;
  }
});

await delay(8000);

if (exited) {
  if (process.exitCode) {
    process.exit(process.exitCode);
  }
  console.error('Electron exited before the smoke window timeout.');
  process.exit(1);
}

stopping = true;
child.kill();
await delay(1000);
console.log('Electron smoke launched and was stopped after startup window check.');
