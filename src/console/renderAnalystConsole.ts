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
    .primary-panel-layout { display: grid; grid-template-columns: 1fr; gap: 12px; }
    .primary-panel-layout.split { grid-template-columns: 1.1fr 0.9fr; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .feed-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
    .feed-card { border: 1px solid #3a465d; border-radius: 6px; padding: 10px; background: #111722; }
    .controls { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
    .controls-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
    .summary-grid { display: grid; grid-template-columns: repeat(5, minmax(160px, 1fr)); gap: 8px; margin-bottom: 12px; }
    .summary-card { border: 1px solid #33445c; border-radius: 6px; padding: 8px; background: #141c28; }
    .summary-card p { margin: 2px 0; font-size: 12px; }
    .summary-label { color: #9eb7d8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    .summary-value { font-size: 14px; font-weight: 600; }
    .hint { color: #9ca8b7; font-size: 12px; }
    .filter-grid { display: grid; grid-template-columns: repeat(3, minmax(120px, 1fr)); gap: 8px; }
    .filter-grid label { font-size: 12px; display: flex; flex-direction: column; gap: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #2f3b4d; padding: 6px; text-align: left; font-size: 12px; }
    th { background: #0f141d; }
    .active-row { background: #1e3148; }
    .pill { border: 1px solid #4d6d95; border-radius: 999px; padding: 1px 7px; font-size: 11px; }
    .region-link { background: none; color: #84c7ff; border: none; cursor: pointer; padding: 0; font: inherit; text-decoration: underline; }
    ul { margin: 8px 0; padding-left: 20px; }
    h1, h2, h3 { margin: 0 0 8px; }
    p { margin: 6px 0; }
    .layout-toggle { margin-left: auto; }
    .map-card { margin-bottom: 0; }
    .map-shell { border: 1px solid #2f3b4d; border-radius: 6px; background: #0f141d; overflow: hidden; }
    #analyst-map { width: 100%; height: 420px; display: block; }
    .map-legend { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; font-size: 12px; color: #9ca8b7; }
    .map-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; }
    .map-hidden { display: none; }
    @media (max-width: 1024px) {
      .grid, .detail-grid, .primary-panel-layout.split, .controls-wrap { grid-template-columns: 1fr; }
      .layout-toggle { margin-left: 0; }
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
      <div id="summary-cards" class="summary-grid"></div>

      <div class="controls-wrap">
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
        <div class="controls">
          <label for="region-search">Search</label>
          <input id="region-search" placeholder="Region name" />
          <label><input type="checkbox" id="top-movers-only" /> Top movers only</label>
        </div>
      </div>

      <div class="controls">
        <label for="analyst-layout">Layout</label>
        <select id="analyst-layout" class="layout-toggle">
          <option value="table">Table-first</option>
          <option value="split">Split (table + map)</option>
        </select>
      </div>

      <div class="filter-grid">
        <label>Status band
          <select id="filter-status-band"><option value="all">All</option></select>
        </label>
        <label>Confidence band
          <select id="filter-confidence-band"><option value="all">All</option></select>
        </label>
        <label>Freshness state
          <select id="filter-freshness-state"><option value="all">All</option></select>
        </label>
        <label>Evidence state
          <select id="filter-evidence-state"><option value="all">All</option></select>
        </label>
      </div>
      <p class="hint">Rows can be filtered by status/confidence/freshness/evidence, top movers, and region search.</p>

      <div id="primary-panel-layout" class="primary-panel-layout">
        <div>
          <table id="regions-table"></table>
        </div>
        <section id="analyst-map-card" class="card map-card map-hidden">
          <h3>Spatial context (internal)</h3>
          <div class="map-shell">
            <svg id="analyst-map" viewBox="0 0 960 480" role="img" aria-label="Internal region geometry map"></svg>
          </div>
          <div class="map-legend" id="map-legend"></div>
        </section>
      </div>
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
