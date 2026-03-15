import { getOpsConsoleClientScript } from './client.ts';

export function renderOpsConsole(): string {
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
  </style>
</head>
<body>
  <h1>WorldWatch Internal Ops Console</h1>
  <button id="trigger">Run Cycle</button>
  <span id="trigger-status"></span>

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
  <section class="card"><h2>Region summary</h2><table id="regions-table"></table></section>
  <section class="card"><h2>Alerts/feed</h2><table id="feed-table"></table></section>

  <script>${getOpsConsoleClientScript()}</script>
</body>
</html>`;
}
