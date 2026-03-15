import assert from 'node:assert/strict';
import test from 'node:test';

import { ACCEPTABLE_USE_STATEMENT, CIVILIAN_USE_STATEMENT, renderPolicyFooterHtml, renderPolicyPanelHtml } from './policy.ts';

test('policy panel and footer render canonical civilian-use copy', () => {
  const panel = renderPolicyPanelHtml();
  const footer = renderPolicyFooterHtml();

  assert.ok(panel.includes('About / Usage / Terms'));
  assert.ok(panel.includes(CIVILIAN_USE_STATEMENT));
  assert.ok(panel.includes(ACCEPTABLE_USE_STATEMENT));
  assert.ok(footer.includes(CIVILIAN_USE_STATEMENT));
});
