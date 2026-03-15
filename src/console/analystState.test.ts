import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveNextActiveRegionSlug, deriveNextHoveredRegionSlug } from './analystState.ts';

test('deriveNextActiveRegionSlug keeps active row when still visible', () => {
  assert.equal(deriveNextActiveRegionSlug(['levant', 'black-sea'], 'black-sea'), 'black-sea');
});

test('deriveNextActiveRegionSlug falls back to first visible row when active filtered out', () => {
  assert.equal(deriveNextActiveRegionSlug(['gulf', 'red-sea'], 'black-sea'), 'gulf');
});

test('deriveNextActiveRegionSlug returns null when no rows are visible', () => {
  assert.equal(deriveNextActiveRegionSlug([], 'black-sea'), null);
});

test('deriveNextHoveredRegionSlug keeps hover when visible and distinct from active', () => {
  assert.equal(deriveNextHoveredRegionSlug(['gulf', 'red-sea'], 'gulf', 'red-sea'), 'red-sea');
});

test('deriveNextHoveredRegionSlug clears hover when hovered region becomes active', () => {
  assert.equal(deriveNextHoveredRegionSlug(['gulf', 'red-sea'], 'red-sea', 'red-sea'), null);
});

test('deriveNextHoveredRegionSlug clears hover when hovered region is filtered out', () => {
  assert.equal(deriveNextHoveredRegionSlug(['gulf', 'red-sea'], 'gulf', 'black-sea'), null);
});
