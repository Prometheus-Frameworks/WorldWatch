import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';

import type { QueryableDb } from '../ingestion/types.ts';
import { getFeed, getRegionDetail, getRegionHistory, getRegionSummaries } from './queries.ts';

export function createWorldWatchApiServer(db: QueryableDb) {
  return createServer(async (req, res) => {
    try {
      await routeRequest(db, req, res);
    } catch (error) {
      sendJson(res, 500, { error: 'internal_error', message: error instanceof Error ? error.message : String(error) });
    }
  });
}

async function routeRequest(db: QueryableDb, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = req.method ?? 'GET';
  const requestUrl = new URL(req.url ?? '/', 'http://localhost');
  const path = requestUrl.pathname;

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
