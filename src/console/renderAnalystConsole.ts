import { getAnalystConsoleClientScript } from './analystClient.ts';
import type { DeploymentPostureConfig } from './posture.ts';
import { renderPostureBannerHtml } from './posture.ts';
import { renderPolicyFooterHtml } from './policy.ts';

export function renderAnalystConsole(posture: DeploymentPostureConfig): string {
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
    .controls button { background: #1f2f45; color: #dcecff; border: 1px solid #4d6d95; border-radius: 4px; padding: 4px 8px; cursor: pointer; }
    .controls button:hover { background: #273a53; }
    .controls-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
    .summary-grid { display: grid; grid-template-columns: repeat(5, minmax(160px, 1fr)); gap: 8px; margin-bottom: 12px; }
    .summary-card { border: 1px solid #33445c; border-radius: 6px; padding: 8px; background: #141c28; }
    .summary-card p { margin: 2px 0; font-size: 12px; }
    .summary-label { color: #9eb7d8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    .summary-value { font-size: 14px; font-weight: 600; }
    .hint { color: #9ca8b7; font-size: 12px; }
    .pin-control { margin-left: 8px; font-size: 11px; }
    .filter-grid { display: grid; grid-template-columns: repeat(3, minmax(120px, 1fr)); gap: 8px; }
    .filter-grid label { font-size: 12px; display: flex; flex-direction: column; gap: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #2f3b4d; padding: 6px; text-align: left; font-size: 12px; }
    th { background: #0f141d; }
    .active-row { background: #1e3148; }
    .hover-row { background: #1a2738; }
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
    .map-region.active { stroke: #ffffff; stroke-width: 2.8; fill-opacity: 0.95; }
    .map-region.hover { stroke: #9ad1ff; stroke-width: 2.2; fill-opacity: 0.88; }
    .map-region.dimmed { fill-opacity: 0.45; }
    .map-tooltip { position: fixed; pointer-events: none; background: #0f141d; border: 1px solid #4d6d95; color: #dcecff; border-radius: 6px; padding: 6px 8px; font-size: 12px; z-index: 20; max-width: 260px; box-shadow: 0 6px 18px rgba(0,0,0,0.35); }
    .posture-banner { border: 1px solid #4d6d95; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; background: #142033; }
    .posture-banner p { margin: 2px 0; }
    .posture-title { font-size: 12px; color: #9eb7d8; text-transform: uppercase; letter-spacing: 0.04em; }
    .posture-copy { font-size: 13px; }
    .detail-header-card { border: 1px solid #33445c; border-radius: 6px; padding: 10px; margin-bottom: 10px; background: #141c28; }
    .detail-kpis { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .detail-kpi { border: 1px solid #3a465d; border-radius: 999px; padding: 2px 8px; font-size: 12px; background: #111722; }
    .detail-section { border: 1px solid #2f3b4d; border-radius: 6px; padding: 10px; background: #111722; }
    .detail-section h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.03em; color: #a9c3e0; }
    .detail-section + .detail-section { margin-top: 0; }
    .state-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 8px; }
    .state-card { border: 1px solid #33445c; border-radius: 6px; padding: 8px; background: #121c2c; }
    .state-card p { margin: 4px 0; font-size: 12px; }
    .state-card strong { display: inline-block; min-width: 88px; }
    .detail-priority-band { border: 1px solid #4d6d95; border-radius: 6px; padding: 10px; margin-bottom: 12px; background: #132033; }
    .detail-priority-band h3 { margin-bottom: 6px; }
    .scan-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; }
    .scan-card { border: 1px solid #3b4f6b; border-radius: 6px; padding: 7px; background: #101a2a; min-height: 92px; }
    .scan-card p { margin: 0; font-size: 12px; }
    .scan-label { color: #9eb7d8; text-transform: uppercase; letter-spacing: 0.04em; font-size: 11px; }
    .scan-value { font-size: 16px; font-weight: 700; margin-top: 4px; }
    .scan-note { color: #b8c9dd; margin-top: 4px; }
    .pinned-empty { color: #9ca8b7; font-size: 12px; margin: 4px 0 0; }
    .pinned-card { border: 1px solid #3a465d; border-radius: 6px; padding: 8px; background: #101723; margin-top: 8px; }
    .pinned-card h4 { margin: 0 0 6px; font-size: 12px; color: #b6ccec; text-transform: uppercase; letter-spacing: 0.03em; }
    .section-pinned-hidden { display: none; }
    .compare-highlights { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; margin-bottom: 8px; }
    .compare-card { border: 1px solid #3a516e; border-radius: 6px; padding: 8px; background: #0f1928; }
    .compare-card p { margin: 0; }
    .compare-card .scan-label { display: block; margin-bottom: 4px; }
    .compare-delta-up { color: #7edb9b; }
    .compare-delta-down { color: #ff9b9b; }
    .compare-delta-flat { color: #c3cfdd; }
    .detail-subtitle { margin: 0 0 8px; font-size: 12px; color: #8ea3bf; }
    .subscore-grid { display: grid; grid-template-columns: 1fr; gap: 7px; }
    .subscore-row { border: 1px solid #2f3b4d; border-radius: 6px; padding: 7px; background: #0f141d; }
    .subscore-row p { margin: 0; display: flex; justify-content: space-between; font-size: 12px; }
    .subscore-bar { margin-top: 6px; height: 6px; border-radius: 999px; background: #1d2a3d; overflow: hidden; }
    .subscore-bar span { display: block; height: 100%; background: linear-gradient(90deg, #4ea4f1, #82d2f7); }
    .triage-notes { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; margin-top: 10px; }
    .triage-note { border: 1px solid #33445c; border-radius: 6px; padding: 8px; background: #121c2c; font-size: 12px; }
    .source-bullets { margin: 0; padding-left: 16px; }
    .source-bullets li { margin: 0 0 4px; }
    .muted-cell { color: #9ca8b7; }
    .map-guidance { margin: 6px 0 0; font-size: 12px; color: #9ca8b7; }
    .policy-footer { margin-top: 16px; border-top: 1px solid #2f3b4d; padding-top: 10px; color: #a7b7cb; font-size: 12px; }
    @media (max-width: 1024px) {
      .grid, .detail-grid, .primary-panel-layout.split, .controls-wrap { grid-template-columns: 1fr; }
      .layout-toggle { margin-left: 0; }
    }
  </style>
</head>
<body>
  ${renderPostureBannerHtml(posture)}

  <div class="topline">
    <h1>WorldWatch Analyst Dashboard</h1>
    <p><a href="/ops">Open system health console →</a> · <a href="/about">About / Usage / Terms →</a></p>
  </div>

  <div class="grid">
    <section class="card">
      <h2>Region dashboard</h2>
      <p class="hint">Table and detail remain the primary workflow. Use split layout only when spatial context helps the current investigation.</p>
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
          <p id="map-interaction-copy" class="map-guidance">Hover for a quick read. Click a region to lock table + detail selection.</p>
          <div id="map-tooltip" class="map-tooltip" hidden></div>
        </section>
      </div>
    </section>

    <section class="card">
      <h2>Momentum feed</h2>
      <div id="feed-cards" class="feed-grid"></div>
    </section>
  </div>

  <section class="card" id="region-detail" hidden>
    <div class="controls" id="detail-mode-controls">
      <label for="detail-mode-select">Detail mode</label>
      <select id="detail-mode-select">
        <option value="focus">Focus mode</option>
        <option value="full">Full detail</option>
      </select>
      <label for="compare-select">Compare</label>
      <select id="compare-select">
        <option value="previous">Latest vs Previous</option>
        <option value="24h-ago">Latest vs 24h-ago</option>
      </select>
      <button id="reset-analyst-layout" type="button">Reset analyst layout</button>
    </div>
    <p id="scan-order-hint" class="hint">Scan order: Escalation posture → Freshness/confidence/evidence → Divergence cue (if active) → Disagreement summary → Stale high-impact sources → Snapshot compare summary</p>
    <div id="detail-header" class="detail-header-card"></div>
    <section id="pinned-sections" class="detail-section" hidden>
      <h3>Pinned sections</h3>
      <p id="pinned-sections-empty" class="pinned-empty"></p>
      <div id="pinned-sections-body"></div>
    </section>
    <section class="detail-priority-band" data-section-key="quick_scan">
      <h3>Explainability quick scan</h3>
      <p class="detail-subtitle">Read escalation posture first, then validate stale high-impact evidence and disagreement before deep factor review.</p>
      <div id="explainability-scan-cards" class="scan-grid"></div>
    </section>
    <section class="detail-section" data-section-key="state_cards">
      <h3>Freshness / confidence / evidence</h3>
      <div id="explainability-state-cards" class="state-grid"></div>
    </section>
    <section class="detail-section" data-section-key="disagreement_summary">
      <h3>Disagreement summary</h3>
      <table id="focus-disagreement-table"></table>
    </section>
    <section class="detail-section" data-section-key="stale_high_impact">
      <h3>Stale high-impact sources</h3>
      <table id="focus-stale-high-impact-table"></table>
    </section>
    <section class="detail-section" data-section-key="compare">
      <h3>Snapshot compare</h3>
      <div id="compare-highlights" class="compare-highlights"></div>
      <table id="compare-summary-table"></table>
      <table id="compare-subscores-table"></table>
      <table id="compare-factors-table"></table>
      <table id="compare-signals-table"></table>
    </section>

    <details class="detail-section collapsible" data-section-key="top_contributing_factors"><summary>Top contributing factors</summary><table id="explainability-factors-table"></table></details>
    <details class="detail-section collapsible" data-section-key="source_contributions"><summary>Source contributions</summary><table id="source-contributions-table"></table></details>
    <details class="detail-section collapsible" data-section-key="source_disagreement"><summary>Source disagreement groups</summary><p class="detail-subtitle">Ordered for first-scan trust: reliability, direction, recency, then disagreement type.</p><table id="source-disagreement-table"></table></details>
    <details class="detail-section collapsible" data-section-key="second_order_effects"><summary>Second-order effects</summary><table id="second-order-table"></table></details>
    <details class="detail-section collapsible" data-section-key="recent_signals"><summary>Recent normalized signals</summary><table id="signals-table"></table></details>
    <details class="detail-section collapsible" data-section-key="explainability_groupings"><summary>Explainability groupings</summary><table id="freshest-sources-table"></table><table id="stale-high-impact-table"></table><table id="mixed-indicators-table"></table></details>
    <details class="detail-section collapsible" data-section-key="history_tables"><summary>History tables</summary><table id="score-history-table"></table><table id="delta-history-table"></table></details>
    <details class="detail-section collapsible" data-section-key="sub_scores"><summary>Sub-scores</summary><p class="detail-subtitle">Largest bars indicate strongest risk pressure.</p><div id="subscores-list" class="subscore-grid"></div></details>
    <div id="triage-notes" class="triage-notes"></div>
  </section>

  ${renderPolicyFooterHtml()}

  <script>${getAnalystConsoleClientScript()}</script>
</body>
</html>`;
}
