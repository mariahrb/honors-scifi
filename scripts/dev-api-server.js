const http = require('http');
const fs = require('fs');
const path = require('path');
const chatHandler = require('../api/chat');

const PORT = Number(process.env.API_PORT || 3001);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const source = fs.readFileSync(filePath, 'utf8');
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.resolve(__dirname, '../.env.local'));
loadEnvFile(path.resolve(__dirname, '../.env'));

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

const server = http.createServer((req, res) => {
  if (!req.url.startsWith('/api/')) {
    return sendJson(res, 404, { error: 'Not found' });
  }

  let rawBody = '';
  req.on('data', (chunk) => {
    rawBody += chunk;
  });

  req.on('end', async () => {
    req.body = rawBody;

    res.status = (code) => {
      res.statusCode = code;
      return res;
    };

    res.json = (payload) => {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
      }
      res.end(JSON.stringify(payload));
      return res;
    };

    try {
      if (req.url === '/api/chat') {
        await chatHandler(req, res);
        return;
      }

      sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
      sendJson(res, 500, {
        error: 'Local API server failure',
        detail: error instanceof Error ? error.message : String(error)
      });
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Local API server listening on http://127.0.0.1:${PORT}`);
});
