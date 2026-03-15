import assert from 'node:assert/strict';
import test from 'node:test';

import { getDeploymentPostureConfig, parseDeploymentPosture, renderPostureBannerHtml } from './posture.ts';

test('deployment posture parser defaults unknown values to internal', () => {
  assert.equal(parseDeploymentPosture(undefined), 'internal');
  assert.equal(parseDeploymentPosture('invalid'), 'internal');
  assert.equal(parseDeploymentPosture('invite_only'), 'invite_only');
  assert.equal(parseDeploymentPosture('public_read_only'), 'public_read_only');
});

test('deployment posture config supports explicit copy overrides', () => {
  const config = getDeploymentPostureConfig({
    DEPLOYMENT_POSTURE: 'public_read_only',
    DEPLOYMENT_BANNER_TEXT: 'Read-only external visibility',
    DEPLOYMENT_SUBTITLE_TEXT: 'Public can read outputs without analyst controls.',
  });

  assert.equal(config.posture, 'public_read_only');
  assert.equal(config.bannerText, 'Read-only external visibility');
  assert.equal(config.subtitleText, 'Public can read outputs without analyst controls.');
});

test('deployment posture banner html includes posture and copy', () => {
  const html = renderPostureBannerHtml({
    posture: 'invite_only',
    bannerText: 'Invite-only analyst workspace',
    subtitleText: 'Use approved access paths only.',
  });

  assert.ok(html.includes('Deployment posture:'));
  assert.ok(html.includes('invite only'));
  assert.ok(html.includes('Invite-only analyst workspace'));
  assert.ok(html.includes('Use approved access paths only.'));
});
