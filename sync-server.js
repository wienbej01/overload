import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { mergeState } from './src/sync.js';

const DEFAULT_PORT = 8787;
const DEFAULT_FILE = 'sync-data.json';

function parseArgs(argv) {
  const options = {
    port: DEFAULT_PORT,
    file: DEFAULT_FILE
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--port') {
      const next = Number(argv[i + 1]);
      if (!Number.isNaN(next)) options.port = next;
      i += 1;
    }
    if (arg === '--file') {
      if (argv[i + 1]) options.file = argv[i + 1];
      i += 1;
    }
  }
  return options;
}

const { port, file } = parseArgs(process.argv.slice(2));
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(__dirname, file);

async function readState() {
  try {
    const raw = await fs.readFile(dataPath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

async function writeState(state) {
  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  await fs.writeFile(dataPath, JSON.stringify(state, null, 2));
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/sync/state') {
    const state = await readState();
    sendJson(res, 200, { state });
    return;
  }

  if (req.method === 'POST' && req.url === '/sync/push') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) req.destroy();
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const incoming = payload.state ?? null;
        if (!incoming) {
          sendJson(res, 400, { error: 'Missing state payload' });
          return;
        }
        const existing = (await readState()) ?? null;
        const merged = mergeState(existing, incoming);
        await writeState(merged);
        sendJson(res, 200, { state: merged });
      } catch (error) {
        sendJson(res, 500, { error: 'Sync merge failed' });
      }
    });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Sync server listening on http://0.0.0.0:${port}`);
  console.log(`State file: ${dataPath}`);
});
