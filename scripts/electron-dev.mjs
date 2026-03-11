import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const npmExecPath = process.env.npm_execpath;
const electronCliPath = path.join(projectRoot, 'node_modules', 'electron', 'cli.js');

if (!npmExecPath) {
  throw new Error('npm_execpath is missing; cannot start the Vite dev server from npm.');
}

const viteProcess = spawn(process.execPath, [npmExecPath, 'run', 'dev'], {
  env: {
    ...process.env,
    BROWSER: 'none',
  },
  stdio: ['inherit', 'pipe', 'pipe'],
});

let electronProcess;
let rendererUrlResolved = false;

function shutdown(exitCode = 0) {
  if (electronProcess && !electronProcess.killed) {
    electronProcess.kill();
  }
  if (!viteProcess.killed) {
    viteProcess.kill();
  }
  process.exit(exitCode);
}

function startElectron(rendererUrl) {
  if (rendererUrlResolved) return;
  rendererUrlResolved = true;

  electronProcess = spawn(
    process.execPath,
    [electronCliPath, '.'],
    {
      env: {
        ...process.env,
        ELECTRON_RENDERER_URL: rendererUrl,
      },
      stdio: 'inherit',
    },
  );

  electronProcess.on('exit', (code) => {
    shutdown(code ?? 0);
  });
}

viteProcess.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);

  const localUrlMatch = text.match(/Local:\s+(http:\/\/(?:localhost|127\.0\.0\.1):\d+\/)/);
  if (localUrlMatch?.[1]) {
    startElectron(localUrlMatch[1]);
  }
});

viteProcess.stderr.on('data', (chunk) => {
  process.stderr.write(chunk.toString());
});

viteProcess.on('exit', (code) => {
  shutdown(code ?? 0);
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
