#!/usr/bin/env node
/**
 * Generates presentation.pdf from index.html using Chrome headless.
 * Usage: node scripts/generate-pdf.mjs
 */

import { spawn, execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 5174; // separate port to avoid conflicts with running dev server
const OUT = path.join(ROOT, 'presentation.pdf');

if (!existsSync(CHROME)) {
  console.error('Google Chrome not found at:', CHROME);
  process.exit(1);
}

// ── Start vite dev server ──
console.log('Starting dev server on port', PORT, '...');
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  cwd: ROOT,
  stdio: ['ignore', 'pipe', 'pipe'],
});

function killServer() {
  try { server.kill('SIGTERM'); } catch (_) {}
}
process.on('exit', killServer);
process.on('SIGINT', () => { killServer(); process.exit(1); });

// ── Wait for server ready ──
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Server did not start in time')), 20000);
  server.stdout.on('data', (d) => {
    const s = d.toString();
    if (s.includes('localhost') || s.includes('Local:')) {
      clearTimeout(timeout);
      setTimeout(resolve, 1500); // extra pause for fonts
    }
  });
  server.stderr.on('data', (d) => {
    const s = d.toString();
    if (s.includes('localhost') || s.includes('Local:')) {
      clearTimeout(timeout);
      setTimeout(resolve, 1500);
    }
  });
  server.on('error', reject);
});

console.log('Server ready. Launching Chrome headless...');

// ── Run Chrome headless ──
try {
  execSync(
    `"${CHROME}" \
      --headless=new \
      --disable-gpu \
      --no-sandbox \
      --disable-web-security \
      --run-all-compositor-stages-before-draw \
      --virtual-time-budget=4000 \
      --print-to-pdf="${OUT}" \
      --no-pdf-header-footer \
      --window-size=1280,720 \
      "http://127.0.0.1:${PORT}/"`,
    { stdio: 'inherit', cwd: ROOT }
  );
  console.log('\n✓ PDF saved to:', OUT);
} catch (err) {
  console.error('Chrome failed:', err.message);
  process.exitCode = 1;
} finally {
  killServer();
}
