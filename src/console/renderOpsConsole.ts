import { getOpsConsoleClientScript } from './client.ts';
import type { DeploymentPostureConfig } from './posture.ts';
import { isReadOnlyPosture, renderPostureBannerHtml } from './posture.ts';
import { renderPolicyFooterHtml } from './policy.ts';

export function renderOpsConsole(posture: DeploymentPostureConfig): string {
  const manualTriggerDisabled = isReadOnlyPosture(posture);
  const triggerButtonAttrs = manualTriggerDisabled ? 'disabled aria-disabled="true"' : '';
  const triggerNotice = manualTriggerDisabled
    ? '<p class="posture-note" id="posture-note">Manual cycle trigger is disabled in public_read_only posture.</p>'
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WorldWatch Ops Console</title>
  <style>
    body { font-family: monospace; margin: 16px; background: #111; color: #ddd; }
    button { margin: 8px 0 16px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 12px; }
    .card { border: 1px solid #555; padding: 10px; background: #1b1b1b; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #444; padding: 4px; text-align: left; font-size: 12px; }
    h1, h2 { margin: 0 0 8px; }
    p { margin: 6px 0; }
    pre { margin: 0; white-space: pre-wrap; max-height: 220px; overflow: auto; }
    a { color: #7ec8ff; }
    .posture-banner { border: 1px solid #5d7ea6; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; background: #182433; }
    .posture-banner p { margin: 2px 0; }
    .posture-title { font-size: 12px; color: #b6cae3; text-transform: uppercase; letter-spacing: 0.04em; }
    .posture-copy { font-size: 13px; }
    .policy-footer { margin-top: 16px; border-top: 1px solid #333; padding-top: 10px; color: #b2b2b2; font-size: 12px; }
    .posture-note { color: #f0cf83; font-size: 12px; margin: 0 0 12px; }
  </style>
</head>
<body>
  ${renderPostureBannerHtml(posture)}

  <h1>WorldWatch Internal Ops Console</h1>
  <p><a href="/">Open analyst world-state dashboard →</a></p>
  <p><a href="/about">Open About / Usage / Terms →</a></p>
  <button id="trigger" data-manual-trigger-disabled="${manualTriggerDisabled}" ${triggerButtonAttrs}>Run Cycle</button>
  <span id="trigger-status"></span>
  ${triggerNotice}

  <div class="grid">
    <section class="card">
      <h2>Latest cycle</h2>
      <div id="latest-cycle-card">loading...</div>
    </section>
    <section class="card">
      <h2>Ops summary</h2>
      <pre id="ops-summary">loading...</pre>
    </section>
  </div>

  <section class="card"><h2>Recent cycle runs</h2><table id="cycle-runs-table"></table></section>
  <section class="card"><h2>Recent source runs</h2><table id="source-runs-table"></table></section>
  <section class="card"><h2>Source freshness</h2><table id="freshness-table"></table></section>
  <section class="card"><h2>Recent failures</h2><table id="failures-table"></table></section>

  ${renderPolicyFooterHtml()}

  <script>${getOpsConsoleClientScript()}</script>
</body>
</html>`;
}
