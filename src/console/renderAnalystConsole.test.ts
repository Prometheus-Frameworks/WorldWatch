import assert from 'node:assert/strict';
import test from 'node:test';

import { renderAnalystConsole } from './renderAnalystConsole.ts';

test('analyst console bootstrap includes consolidated dashboard endpoint and refresh cadence', () => {
  const html = renderAnalystConsole({
    posture: 'internal',
    bannerText: 'Internal-only workspace',
    subtitleText: 'For internal analyst and operations workflows only.',
  });

  assert.ok(html.includes("analystDashboard: '/api/analyst/dashboard'"));
  assert.ok(html.includes('const dashboardPayload = await fetchJson(endpointMap.analystDashboard, null);'));
  assert.ok(html.includes('setInterval(() => {'));
  assert.ok(html.includes('void loadDashboard();'));
});
