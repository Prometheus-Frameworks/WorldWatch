import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getDetailSignature,
  getFeedSignature,
  getMapSignature,
  getSummarySignature,
  getTableSignature,
} from './analystClientSignatures.ts';

test('table and map signatures change when active or hovered region changes', () => {
  const rows = [
    { slug: 'a', status_band: 'high', composite_score: 88, delta_24h: 1, delta_7d: 4, confidence_band: 'medium', snapshot_time: '2025-01-01' },
  ];

  assert.ok(getTableSignature(rows, 'a', null) !== getTableSignature(rows, null, null));
  assert.ok(getMapSignature(rows, 'a', null) !== getMapSignature(rows, 'a', 'b'));
});

test('feed signature uses first 30 entries and ignores overflow noise', () => {
  const base = Array.from({ length: 31 }, (_, idx) => ({
    slug: `r-${idx}`,
    snapshot_time: `2025-01-${String(idx + 1).padStart(2, '0')}`,
    composite_score: idx,
    delta_24h: idx,
    delta_7d: idx,
    status_band: 'high',
    confidence_band: 'medium',
    freshness_state: 'fresh',
    evidence_state: 'good',
  }));

  const changedTail = [...base];
  changedTail[30] = { ...changedTail[30], composite_score: 999 };
  assert.equal(getFeedSignature(base), getFeedSignature(changedTail));
});

test('summary and detail signatures stay stable for unchanged payloads', () => {
  const summary = { cards: { stale_high_risk_count: 2 } };
  assert.equal(getSummarySignature(summary), getSummarySignature({ cards: { stale_high_risk_count: 2 } }));

  const detail = {
    latest_score: { snapshot_time: '2025-01-01T00:00:00Z', composite_score: 72 },
    latest_delta: { delta_24h: 3, delta_7d: 6 },
    history: [{ snapshot_time: '2025-01-01T00:00:00Z', composite_score: 72 }],
    factor_payload: [{ id: 1 }],
    second_order_effects: [{ id: 1 }],
    recent_signals: [{ id: 1 }],
    triage_notes: [{ title: 'watch', copy: 'note' }],
  };

  assert.equal(getDetailSignature(detail), getDetailSignature(structuredClone(detail)));
  assert.ok(getDetailSignature(detail) !== getDetailSignature({ ...detail, latest_delta: { delta_24h: 4, delta_7d: 6 } }));
});


test('map signature changes when tooltip-relevant triage fields change', () => {
  const baseRows = [
    { slug: 'a', status_band: 'high', composite_score: 88, delta_24h: 1, confidence_band: 'medium', freshness_state: 'fresh', evidence_state: 'strong' },
  ];
  const changedRows = [
    { ...baseRows[0], confidence_band: 'low' },
  ];

  assert.ok(getMapSignature(baseRows, 'a', null) !== getMapSignature(changedRows, 'a', null));
});
