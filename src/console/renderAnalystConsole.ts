import { getAnalystConsoleClientScript } from './analystClient.ts';

export function renderAnalystConsole(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WorldWatch Analyst Dashboard</title>
  <style>
    :root { color-scheme: dark; }
    body { font-family: Inter, system-ui, sans-serif; margin: 16px; background: #12161d; color: #e6e8ec; }
    a { color: #84c7ff; }
    .topline { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
    .card { border: 1px solid #364153; border-radius: 6px; padding: 12px; background: #1a202a; margin-bottom: 12px; }
    .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .feed-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
    .feed-card { border: 1px solid #3a465d; border-radius: 6px; padding: 10px; background: #111722; }
    .controls { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #2f3b4d; padding: 6px; text-align: left; font-size: 12px; }
    th { background: #0f141d; }
    .active-row { background: #1e3148; }
    .pill { border: 1px solid #4d6d95; border-radius: 999px; padding: 1px 7px; font-size: 11px; }
    .region-link { background: none; color: #84c7ff; border: none; cursor: pointer; padding: 0; font: inherit; text-decoration: underline; }
    ul { margin: 8px 0; padding-left: 20px; }
    h1, h2, h3 { margin: 0 0 8px; }
    p { margin: 6px 0; }
    @media (max-width: 1024px) {
      .grid, .detail-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="topline">
    <h1>WorldWatch Analyst Dashboard</h1>
    <p><a href="/ops">Open system health console →</a></p>
  </div>

  <div class="grid">
    <section class="card">
      <h2>Region dashboard</h2>
      <div class="controls">
        <label for="region-sort">Sort by</label>
        <select id="region-sort">
          <option value="composite_score">Composite score</option>
          <option value="delta_24h">24h delta</option>
          <option value="delta_7d">7d delta</option>
        </select>
        <select id="region-sort-direction">
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>
      <table id="regions-table"></table>
    </section>

    <section class="card">
      <h2>Momentum feed</h2>
      <div id="feed-cards" class="feed-grid"></div>
    </section>
  </div>

  <section class="card" id="region-detail" hidden>
    <div id="detail-header"></div>

    <div class="detail-grid">
      <section>
        <h3>Sub-scores</h3>
        <ul id="subscores-list"></ul>
      </section>
      <section>
        <h3>Latest factors</h3>
        <table id="factors-table"></table>
      </section>
    </div>

    <div class="detail-grid">
      <section>
        <h3>Second-order effects</h3>
        <table id="second-order-table"></table>
      </section>
      <section>
        <h3>Recent normalized signals</h3>
        <table id="signals-table"></table>
      </section>
    </div>

    <div class="detail-grid">
      <section>
        <h3>Score history</h3>
        <table id="score-history-table"></table>
      </section>
      <section>
        <h3>Delta history</h3>
        <table id="delta-history-table"></table>
      </section>
    </div>
  </section>

  <script>${getAnalystConsoleClientScript()}</script>
</body>
</html>`;
}
