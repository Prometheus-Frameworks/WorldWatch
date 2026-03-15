import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDetailExplainabilityGroups,
  deriveDetailExplainabilitySummary,
  deriveTriageNotes,
  toTriageInput,
} from './analystPayload.ts';

test('deriveTriageNotes returns deterministic triage notes from score bands and deltas', () => {
  const notes = deriveTriageNotes(toTriageInput({
    composite_score: 80,
    status_band: 'high',
    confidence_band: 'low',
    freshness_state: 'stale',
    delta_24h: 8,
    delta_7d: 15,
  }));

  assert.deepEqual(notes.map((note) => note.title), [
    'Top mover (24h)',
    'Sustained weekly acceleration',
    'Stale high-risk pattern',
  ]);
});

test('deriveTriageNotes returns stable no-flag fallback', () => {
  const notes = deriveTriageNotes(toTriageInput({
    composite_score: 40,
    status_band: 'elevated',
    confidence_band: 'high',
    freshness_state: 'fresh',
    delta_24h: 1,
    delta_7d: 2,
  }));

  assert.equal(notes.length, 1);
  assert.equal(notes[0].title, 'No immediate triage flags');
});

test('deriveDetailExplainabilitySummary returns deterministic state copy', () => {
  assert.deepEqual(
    deriveDetailExplainabilitySummary({
      freshness_state: 'stale',
      confidence_band: 'low',
      evidence_state: 'mixed',
    }),
    {
      freshness_state: 'stale',
      freshness_copy: 'Freshness is degraded because key contributing evidence is outside the aging recency window.',
      confidence_band: 'low',
      confidence_copy: 'Confidence is low: multiple reliable domains do not yet agree strongly enough for high confidence.',
      evidence_state: 'mixed',
      evidence_copy: 'Evidence is mixed: reliable indicators disagree on movement direction.',
    },
  );
});

test('buildDetailExplainabilityGroups shapes factor payload into dashboard-ready groups', () => {
  const groups = buildDetailExplainabilityGroups([
    { signalType: 'conflict.fatalities', source: 'acled', domain: 'conflictPressure', normalizedValue: 85, recencyMinutes: 70, sourceReliability: 0.9, movement: 'up' },
    { signalType: 'chokepoint.delay_hours', source: 'imf-portwatch', domain: 'chokepointStress', normalizedValue: 78, recencyMinutes: 50, sourceReliability: 0.8, movement: 'up' },
    { signalType: 'oil.price_volatility', source: 'eia', domain: 'oilShockRisk', normalizedValue: 67, recencyMinutes: 900, sourceReliability: 0.95, movement: 'down' },
    { signalType: 'oil.price_usd', source: 'eia', domain: 'oilShockRisk', normalizedValue: 62, recencyMinutes: 940, sourceReliability: 0.95, movement: 'up' },
  ]);

  assert.equal(groups.top_contributing_factors[0]?.factor_label, 'Conflict fatalities');
  assert.equal(groups.freshest_contributing_sources[0]?.source, 'imf-portwatch');
  assert.equal(groups.stale_high_impact_sources[0]?.source, 'eia');
  assert.deepEqual(groups.mixed_signal_indicators, [{ domain: 'oilShockRisk', directions: ['down', 'up'] }]);
});
