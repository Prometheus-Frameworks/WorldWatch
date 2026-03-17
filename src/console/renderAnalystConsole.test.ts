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
  assert.ok(html.includes('Hover for trust + momentum cues. Click to lock selection, then continue triage in table/detail.'));
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
  assert.ok(html.includes('Scan order: Escalation posture'));
  assert.ok(html.includes('id="compare-summary-table"'));
  assert.ok(html.includes('Score + state changes'));
  assert.ok(html.includes('Trust cue changes'));
  assert.ok(html.includes('id="compare-highlights"'));
  assert.ok(html.includes('Reset analyst layout'));
  assert.ok(html.includes('id="pinned-sections-empty"'));
  assert.ok(html.includes('section-pinned-hidden'));
  assert.ok(html.includes('section-pinned-note'));
  assert.ok(html.includes('data-section-key="source_disagreement"'));
});

test('analyst client script persists compare mode and renders compare/pin readability affordances', () => {
  const html = renderAnalystConsole({
    posture: 'internal',
    bannerText: 'Internal-only workspace',
    subtitleText: 'For internal analyst and operations workflows only.',
  });

  assert.ok(html.includes('worldwatch.analyst.compare_mode'));
  assert.ok(html.includes('persistCompareMode'));
  assert.ok(html.includes('No pinned sections yet.'));
  assert.ok(html.includes('scan order stable while switching regions'));
  assert.ok(html.includes('Snapshot compare summary'));
  assert.ok(html.includes('What changed?'));
  assert.ok(html.includes('Trust direction'));
  assert.ok(html.includes('Composite Δ'));
  assert.ok(html.includes('Narrative-leading divergence'));
});
