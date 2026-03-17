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
  assert.ok(html.includes('const signature = getFeedSignature(feed);'));
  assert.ok(html.includes('if (signature === lastFeedSignature) return;'));
});

test('analyst console includes map-table coordination and triage readability affordances', () => {
  const html = renderAnalystConsole({
    posture: 'internal',
    bannerText: 'Internal-only workspace',
    subtitleText: 'For internal analyst and operations workflows only.',
  });

  assert.ok(html.includes('.map-region.hover'));
  assert.ok(html.includes('Hover for a quick read. Click a region to lock table + detail selection.'));
  assert.ok(html.includes('id="triage-notes"'));
  assert.ok(html.includes('Array.isArray(detail.triage_notes) ? detail.triage_notes : []'));
  assert.ok(html.includes('Largest bars indicate strongest risk pressure.'));
  assert.ok(html.includes('id="explainability-scan-cards"'));
  assert.ok(html.includes('Escalation posture'));
  assert.ok(html.includes('Read escalation posture first, then validate stale high-impact evidence and disagreement before deep factor review.'));
  assert.ok(html.includes('id="explainability-factors-table"'));
  assert.ok(html.includes('id="explainability-state-cards"'));
  assert.ok(html.includes('Narrative-vs-physical cue:'));
  assert.ok(html.includes('Narrative-leading signal'));
  assert.ok(html.includes('id="freshest-sources-table"'));
  assert.ok(html.includes('id="source-disagreement-table"'));
  assert.ok(html.includes('Ordered for first-scan trust: reliability, direction, recency, then disagreement type.'));
  assert.ok(html.includes('id="source-contributions-table"'));
  assert.ok(html.includes("source-contributions-table"));
});


test('analyst console includes focus mode, pinning, and snapshot compare controls', () => {
  const html = renderAnalystConsole({
    posture: 'internal',
    bannerText: 'Internal-only workspace',
    subtitleText: 'For internal analyst and operations workflows only.',
  });

  assert.ok(html.includes('id="detail-mode-select"'));
  assert.ok(html.includes('worldwatch.analyst.detail_mode'));
  assert.ok(html.includes('worldwatch.analyst.pins'));
  assert.ok(html.includes('id="compare-select"'));
  assert.ok(html.includes('Scan order: Escalation'));
  assert.ok(html.includes('id="compare-summary-table"'));
  assert.ok(html.includes('data-section-key="source_disagreement"'));
});
