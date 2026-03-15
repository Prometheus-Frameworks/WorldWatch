import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';

import type { QueryableDb } from '../ingestion/types.ts';
import type { RunWorldWatchCycleResult } from '../jobs/runWorldWatchCycle.ts';
import {
  getFeed,
  getLatestCycleStatus,
  getOpsHealth,
  getOpsSummary,
  getRecentFailures,
  getRegionDetail,
  getRegionHistory,
  getRegionSummaries,
  getSourceFreshness,
} from './queries.ts';

export interface ApiCycleControl {
  runCycle: () => Promise<RunWorldWatchCycleResult>;
  isCycleRunning?: () => boolean;
}

export function createWorldWatchApiServer(db: QueryableDb, cycleControl?: ApiCycleControl) {
  let manualCycleInFlight: Promise<RunWorldWatchCycleResult> | null = null;

  const isCycleRunning = (): boolean => {
    if (manualCycleInFlight) return true;
    return cycleControl?.isCycleRunning?.() ?? false;
  };

  const runManualCycle = async (): Promise<RunWorldWatchCycleResult> => {
    if (!cycleControl?.runCycle) {
      throw new Error('manual_cycle_unavailable');
    }

    if (isCycleRunning()) {
      throw new Error('cycle_overlap');
    }

    manualCycleInFlight = cycleControl.runCycle();
    try {
      return await manualCycleInFlight;
    } finally {
      manualCycleInFlight = null;
    }
  };

  return createServer(async (req, res) => {
    try {
      await routeRequest(db, req, res, { runManualCycle, isCycleRunning });
    } catch (error) {
      sendJson(res, 500, { error: 'internal_error', message: error instanceof Error ? error.message : String(error) });
    }
  });
}

async function routeRequest(
  db: QueryableDb,
  req: IncomingMessage,
  res: ServerResponse,
  cycleHandlers: { runManualCycle: () => Promise<RunWorldWatchCycleResult>; isCycleRunning: () => boolean },
): Promise<void> {
  const method = req.method ?? 'GET';
  const requestUrl = new URL(req.url ?? '/', 'http://localhost');
  const path = requestUrl.pathname;

  if (method === 'GET' && (path === '/' || path === '/ops')) {
    sendHtml(res, 200, buildOpsConsoleHtml());
    return;
  }

  if (method === 'POST' && path === '/api/ops/cycle/run') {
    try {
      const result = await cycleHandlers.runManualCycle();
      sendJson(res, 200, { state: 'completed', cycle: result });
      return;
    } catch (error) {
      if (error instanceof Error && error.message === 'manual_cycle_unavailable') {
        sendJson(res, 501, { error: 'not_implemented', message: 'Manual cycle trigger unavailable.' });
        return;
      }
      if (error instanceof Error && error.message === 'cycle_overlap') {
        sendJson(res, 409, { error: 'cycle_in_flight', state: 'running' });
        return;
      }
      throw error;
    }
  }

  if (method !== 'GET') {
    sendJson(res, 405, { error: 'method_not_allowed' });
    return;
  }

  if (path === '/api/regions') {
    sendJson(res, 200, await getRegionSummaries(db));
    return;
  }

  if (path === '/api/feed') {
    sendJson(res, 200, await getFeed(db));
    return;
  }

  if (path === '/api/ops/health') {
    sendJson(res, 200, await getOpsHealth(db));
    return;
  }

  if (path === '/api/ops/cycle/latest') {
    const latestCycle = await getLatestCycleStatus(db);
    if (!latestCycle) {
      sendJson(res, 404, { error: 'not_found' });
      return;
    }
    sendJson(res, 200, latestCycle);
    return;
  }

  if (path === '/api/ops/source-freshness') {
    sendJson(res, 200, await getSourceFreshness(db));
    return;
  }

  if (path === '/api/ops/failures') {
    const limitRaw = requestUrl.searchParams.get('limit');
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 20;
    sendJson(res, 200, await getRecentFailures(db, Number.isFinite(limit) ? limit : 20));
    return;
  }

  if (path === '/api/ops/summary') {
    sendJson(res, 200, await getOpsSummary(db));
    return;
  }

  const detailMatch = path.match(/^\/api\/regions\/([^/]+)$/);
  if (detailMatch) {
    const result = await getRegionDetail(db, decodeURIComponent(detailMatch[1]));
    if (!result) {
      sendJson(res, 404, { error: 'not_found' });
      return;
    }
    sendJson(res, 200, result);
    return;
  }

  const historyMatch = path.match(/^\/api\/history\/([^/]+)$/);
  if (historyMatch) {
    const result = await getRegionHistory(db, decodeURIComponent(historyMatch[1]));
    if (!result) {
      sendJson(res, 404, { error: 'not_found' });
      return;
    }
    sendJson(res, 200, result);
    return;
  }

  sendJson(res, 404, { error: 'not_found' });
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('content-length', Buffer.byteLength(body));
  res.end(body);
}

function sendHtml(res: ServerResponse, statusCode: number, html: string): void {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('content-length', Buffer.byteLength(html));
  res.end(html);
}

function buildOpsConsoleHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WorldWatch Ops Console</title>
  <style>
    body { font-family: monospace; margin: 16px; background: #111; color: #ddd; }
    button { margin: 8px 0 16px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 12px; }
    .card { border: 1px solid #555; padding: 10px; background: #1b1b1b; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #444; padding: 4px; text-align: left; font-size: 12px; }
    h1, h2, h3 { margin: 0 0 8px; }
    pre { margin: 0; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>WorldWatch Internal Ops Console</h1>
  <button id="trigger">Run Cycle</button>
  <span id="trigger-status"></span>

  <div class="grid">
    <section class="card"><h2>Ops summary</h2><pre id="ops-summary">loading...</pre></section>
    <section class="card"><h2>Latest cycle status</h2><pre id="latest-cycle">loading...</pre></section>
    <section class="card"><h2>Alerts/feed</h2><pre id="feed">loading...</pre></section>
  </div>

  <section class="card"><h2>Source freshness</h2><table id="freshness-table"></table></section>
  <section class="card"><h2>Recent failures</h2><table id="failures-table"></table></section>
  <section class="card"><h2>Region summary</h2><table id="regions-table"></table></section>

  <script>
    const endpointMap = {
      summary: '/api/ops/summary',
      latest: '/api/ops/cycle/latest',
      freshness: '/api/ops/source-freshness',
      failures: '/api/ops/failures',
      regions: '/api/regions',
      feed: '/api/feed'
    };

    function renderTable(id, rows) {
      const table = document.getElementById(id);
      if (!Array.isArray(rows) || rows.length === 0) { table.innerHTML = '<tr><td>No data</td></tr>'; return; }
      const headers = Object.keys(rows[0]);
      const head = '<tr>' + headers.map((h) => '<th>' + h + '</th>').join('') + '</tr>';
      const body = rows.map((row) => '<tr>' + headers.map((h) => '<td>' + String(row[h] ?? '') + '</td>').join('') + '</tr>').join('');
      table.innerHTML = head + body;
    }

    async function loadOps() {
      const [summary, latest, freshness, failures, regions, feed] = await Promise.all([
        fetch(endpointMap.summary).then((r) => r.json()),
        fetch(endpointMap.latest).then((r) => r.ok ? r.json() : { status: 'none' }),
        fetch(endpointMap.freshness).then((r) => r.json()),
        fetch(endpointMap.failures).then((r) => r.json()),
        fetch(endpointMap.regions).then((r) => r.json()),
        fetch(endpointMap.feed).then((r) => r.json()),
      ]);

      document.getElementById('ops-summary').textContent = JSON.stringify(summary, null, 2);
      document.getElementById('latest-cycle').textContent = JSON.stringify(latest, null, 2);
      document.getElementById('feed').textContent = JSON.stringify(feed.slice(0, 15), null, 2);
      renderTable('freshness-table', freshness);
      renderTable('failures-table', failures);
      renderTable('regions-table', regions.slice(0, 25));
    }

    document.getElementById('trigger').addEventListener('click', async () => {
      const statusEl = document.getElementById('trigger-status');
      statusEl.textContent = 'running...';
      const response = await fetch('/api/ops/cycle/run', { method: 'POST' });
      const payload = await response.json();
      statusEl.textContent = response.ok ? 'done' : 'error';
      document.getElementById('latest-cycle').textContent = JSON.stringify(payload, null, 2);
      await loadOps();
    });

    void loadOps();
    setInterval(loadOps, 30000);
  </script>
</body>
</html>`;
}
