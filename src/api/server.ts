import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';

import type { QueryableDb } from '../ingestion/types.ts';
import type { RunWorldWatchCycleResult } from '../jobs/runWorldWatchCycle.ts';
import {
  getAnalystSummary,
  getFeed,
  getRegionGeo,
  getLatestCycleStatus,
  getOpsHealth,
  getOpsSummary,
  getRecentCycleRuns,
  getRecentFailures,
  getRecentSourceRuns,
  getRegionDetail,
  getRegionHistory,
  getRegionSummaries,
  getSourceFreshness,
} from './queries.ts';
import { renderAnalystConsole } from '../console/renderAnalystConsole.ts';
import { renderOpsConsole } from '../console/renderOpsConsole.ts';
import { renderPolicyPage } from '../console/renderPolicyPage.ts';
import { getDeploymentPostureConfig, type DeploymentPostureConfig } from '../console/posture.ts';

export interface ApiCycleControl {
  runCycle: () => Promise<RunWorldWatchCycleResult>;
  isCycleRunning?: () => boolean;
}

export function createWorldWatchApiServer(
  db: QueryableDb,
  cycleControl?: ApiCycleControl,
  posture: DeploymentPostureConfig = getDeploymentPostureConfig(),
) {
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
      await routeRequest(db, req, res, { runManualCycle, isCycleRunning }, posture);
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
  posture: DeploymentPostureConfig,
): Promise<void> {
  const method = req.method ?? 'GET';
  const requestUrl = new URL(req.url ?? '/', 'http://localhost');
  const path = requestUrl.pathname;

  if (method === 'GET' && (path === '/' || path === '/analyst')) {
    sendHtml(res, 200, renderAnalystConsole(posture));
    return;
  }

  if (method === 'GET' && path === '/ops') {
    sendHtml(res, 200, renderOpsConsole(posture));
    return;
  }

  if (method === 'GET' && path === '/about') {
    sendHtml(res, 200, renderPolicyPage(posture));
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

  if (path === '/api/regions/geo') {
    sendJson(res, 200, await getRegionGeo(db));
    return;
  }

  if (path === '/api/analyst/summary') {
    sendJson(res, 200, await getAnalystSummary(db));
    return;
  }


  if (path === '/api/analyst/dashboard') {
    const [regions, regionsGeo, feed, summary] = await Promise.all([
      getRegionSummaries(db),
      getRegionGeo(db),
      getFeed(db),
      getAnalystSummary(db),
    ]);
    sendJson(res, 200, {
      regions,
      regions_geo: regionsGeo,
      feed,
      summary,
    });
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


  if (path === '/api/ops/cycles') {
    const limitRaw = requestUrl.searchParams.get('limit');
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 20;
    sendJson(res, 200, await getRecentCycleRuns(db, Number.isFinite(limit) ? limit : 20));
    return;
  }

  if (path === '/api/ops/sources/runs') {
    const limitRaw = requestUrl.searchParams.get('limit');
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 50;
    sendJson(res, 200, await getRecentSourceRuns(db, Number.isFinite(limit) ? limit : 50));
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
