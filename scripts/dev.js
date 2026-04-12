const net = require('net');
const { spawn } = require('child_process');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];

function start(name, args, env) {
  const child = spawn(npmCmd, args, {
    stdio: 'inherit',
    env
  });

  child.on('exit', (code, signal) => {
    if (signal || code) {
      process.exitCode = code || 1;
    }
    shutdown();
  });

  children.push(child);
}

function shutdown() {
  while (children.length) {
    const child = children.pop();
    if (child && !child.killed) {
      child.kill('SIGTERM');
    }
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '127.0.0.1');
  });
}

async function findOpenPort(startPort, attempts = 20) {
  for (let port = startPort; port < startPort + attempts; port += 1) {
    if (await isPortFree(port)) return port;
  }

  throw new Error(`No free port found starting at ${startPort}`);
}

async function main() {
  const apiPort = await findOpenPort(Number(process.env.API_PORT || 3001));
  const env = {
    ...process.env,
    API_PORT: String(apiPort)
  };

  console.log(`Using API port ${apiPort}`);
  start('api', ['run', 'dev:api'], env);
  start('web', ['run', 'dev:web'], env);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
