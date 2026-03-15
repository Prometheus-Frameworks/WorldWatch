import assert from 'node:assert/strict';
import test from 'node:test';

import { loadRuntimeConfig } from './config.ts';

test('loadRuntimeConfig includes deployment posture defaults', () => {
  const config = loadRuntimeConfig({
    DATABASE_URL: 'postgres://example',
    ACLED_URL: 'https://acled.local',
    GDELT_URL: 'https://gdelt.local',
    IMF_PORTWATCH_URL: 'https://imf.local',
    EIA_URL: 'https://eia.local',
    UNHCR_URL: 'https://unhcr.local',
    NASA_FIRMS_URL: 'https://firms.local',
  });

  assert.equal(config.deployment.posture, 'internal');
  assert.ok(config.deployment.bannerText.length > 0);
  assert.ok(config.deployment.subtitleText.length > 0);
});

test('loadRuntimeConfig reads deployment posture overrides', () => {
  const config = loadRuntimeConfig({
    DATABASE_URL: 'postgres://example',
    ACLED_URL: 'https://acled.local',
    GDELT_URL: 'https://gdelt.local',
    IMF_PORTWATCH_URL: 'https://imf.local',
    EIA_URL: 'https://eia.local',
    UNHCR_URL: 'https://unhcr.local',
    NASA_FIRMS_URL: 'https://firms.local',
    DEPLOYMENT_POSTURE: 'invite_only',
    DEPLOYMENT_BANNER_TEXT: 'Invite-only workspace',
    DEPLOYMENT_SUBTITLE_TEXT: 'For approved civilian analyst users.',
  });

  assert.equal(config.deployment.posture, 'invite_only');
  assert.equal(config.deployment.bannerText, 'Invite-only workspace');
  assert.equal(config.deployment.subtitleText, 'For approved civilian analyst users.');
});
