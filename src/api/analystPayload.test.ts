import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveTriageNotes, toTriageInput } from './analystPayload.ts';

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
