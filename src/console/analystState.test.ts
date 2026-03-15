import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveNextActiveRegionSlug } from './analystState.ts';

test('deriveNextActiveRegionSlug keeps active row when still visible', () => {
  assert.equal(deriveNextActiveRegionSlug(['levant', 'black-sea'], 'black-sea'), 'black-sea');
});

test('deriveNextActiveRegionSlug falls back to first visible row when active filtered out', () => {
  assert.equal(deriveNextActiveRegionSlug(['gulf', 'red-sea'], 'black-sea'), 'gulf');
});

test('deriveNextActiveRegionSlug returns null when no rows are visible', () => {
  assert.equal(deriveNextActiveRegionSlug([], 'black-sea'), null);
});
