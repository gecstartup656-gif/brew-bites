const http = require('node:http');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const HOST = '127.0.0.1';
const PORT = 47051;
let database;
let server;

function json(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(payload));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) reject(new Error('Request is too large'));
    });
    request.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON')); }
    });
    request.on('error', reject);
  });
}

function startLocalServer(app) {
  if (server) return Promise.resolve();
  const databasePath = path.join(app.getPath('userData'), 'brew-bits.sqlite');
  database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  const getState = database.prepare('SELECT value FROM app_state WHERE key = ?');
  const putState = database.prepare(`
    INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  server = http.createServer(async (request, response) => {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' });
      response.end();
      return;
    }
    try {
      if (request.method === 'GET' && request.url === '/api/health') return json(response, 200, { status: 'ok', databasePath });
      if (request.method === 'GET' && request.url === '/api/state') {
        const row = getState.get('pos-data');
        return row ? json(response, 200, { data: JSON.parse(row.value) }) : json(response, 404, { error: 'No POS data yet' });
      }
      if (request.method === 'PUT' && request.url === '/api/state') {
        const data = await readJson(request);
        if (!data || !data.categories || !data.items || !data.currentDay || !data.logs || !data.settings) return json(response, 400, { error: 'Invalid POS data' });
        putState.run('pos-data', JSON.stringify(data), new Date().toISOString());
        return json(response, 200, { ok: true });
      }
      return json(response, 404, { error: 'Not found' });
    } catch (error) {
      return json(response, 500, { error: error instanceof Error ? error.message : 'Server error' });
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(PORT, HOST, () => { server.off('error', reject); resolve(); });
  });
}

function stopLocalServer() {
  if (server) server.close();
  server = undefined;
  if (database) database.close();
  database = undefined;
}

module.exports = { startLocalServer, stopLocalServer };
