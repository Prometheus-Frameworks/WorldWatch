import type { DeploymentPostureConfig } from './posture.ts';
import { renderPostureBannerHtml } from './posture.ts';
import { renderPolicyFooterHtml } from './policy.ts';

export function renderPublicHome(posture: DeploymentPostureConfig): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WorldWatch Civilian Readiness</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #0f141c; color: #e5ebf3; }
    a { color: #90d3ff; }
    .shell { max-width: 1100px; margin: 0 auto; padding: 16px; }
    .posture-banner { border: 1px solid #4d6d95; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; background: #142033; }
    .posture-banner p { margin: 2px 0; }
    .posture-title { font-size: 12px; color: #9eb7d8; text-transform: uppercase; letter-spacing: 0.04em; }
    .posture-copy { font-size: 13px; }
    .hero { border: 1px solid #2e3b4f; border-radius: 10px; background: #121a26; padding: 16px; }
    .hero h1 { margin: 0 0 10px; font-size: 28px; }
    .hero p { margin: 8px 0; line-height: 1.45; }
    .tagline { color: #a7b7cb; }
    .impact-grid { display: grid; grid-template-columns: repeat(2, minmax(180px, 1fr)); gap: 10px; margin-top: 12px; }
    .impact-card, .card { border: 1px solid #2f3b4d; border-radius: 10px; background: #121a26; padding: 12px; }
    .impact-card h3 { margin: 0 0 6px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.03em; color: #b7cde8; }
    .impact-card p, .card p { margin: 0; font-size: 14px; line-height: 1.4; }
    .section { margin-top: 14px; }
    .section h2 { margin: 0 0 8px; font-size: 20px; }
    .section-note { color: #a8b5c6; font-size: 13px; margin: 0 0 10px; }
    .cards-grid { display: grid; grid-template-columns: repeat(3, minmax(200px, 1fr)); gap: 10px; }
    .mini-label { color: #9eb7d8; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
    .card h3 { margin: 0 0 8px; font-size: 16px; }
    .watch-list { margin: 6px 0 0 16px; padding: 0; }
    .watch-list li { margin: 4px 0; }
    .chart-strip { height: 48px; display: flex; align-items: flex-end; gap: 4px; margin-top: 6px; }
    .chart-bar { flex: 1; min-height: 4px; border-radius: 4px 4px 0 0; background: linear-gradient(180deg, #79c9ff, #32597d); }
    .muted { color: #a6b4c6; }
    .empty { border-style: dashed; color: #a6b4c6; }
    .topline { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 10px; }
    .policy-footer { margin-top: 16px; border-top: 1px solid #2f3b4d; padding-top: 10px; color: #a7b7cb; font-size: 12px; }
    @media (max-width: 860px) {
      .cards-grid { grid-template-columns: 1fr; }
      .impact-grid { grid-template-columns: 1fr; }
      .topline { flex-direction: column; align-items: flex-start; }
      .hero h1 { font-size: 24px; }
    }
  </style>
</head>
<body>
  <main class="shell">
    ${renderPostureBannerHtml(posture)}
    <div class="hero">
      <div class="topline">
        <h1>WorldWatch: Civilian Readiness View</h1>
        <p><a href="/analyst">Analyst console →</a> · <a href="/ops">Ops console →</a> · <a href="/about">Usage + terms →</a></p>
      </div>
      <p class="tagline">WorldWatch tracks open-source geopolitical signals and translates them into plain-language civilian awareness.</p>
      <p>It is built for lawful public-source monitoring: what changed, why it may matter, and what to watch next.</p>
      <div class="impact-grid">
        <article class="impact-card"><h3>Conflict</h3><p>Can shift safety, humanitarian access, migration pressure, and market confidence.</p></article>
        <article class="impact-card"><h3>Energy + Shipping</h3><p>Can affect fuel costs, delivery reliability, and supply continuity.</p></article>
        <article class="impact-card"><h3>Infrastructure stress</h3><p>Can disrupt transport, communications, and local service reliability.</p></article>
        <article class="impact-card"><h3>Information environment</h3><p>Public narrative and reporting shifts can change perception before other signals confirm direction.</p></article>
      </div>
    </div>

    <section class="section card">
      <h2>How to read this page</h2>
      <ul class="watch-list">
        <li><strong>What changed:</strong> strongest observed movement in current regional signals.</li>
        <li><strong>Why it matters:</strong> short civilian impact framing from present dataset fields only.</li>
        <li><strong>What to watch:</strong> next checks for confirmation, freshness, or escalation.</li>
      </ul>
      <p class="muted">If data is stale or incomplete, cards call this out directly instead of guessing.</p>
    </section>

    <section class="section">
      <h2>Civilian summary cards</h2>
      <p class="section-note">Top movers from latest WorldWatch dashboard payload (sorted by absolute 24h movement).</p>
      <div id="civilian-cards" class="cards-grid"></div>
    </section>

    <section class="section">
      <h2>Weekly readiness snapshot</h2>
      <p class="section-note">Read-only digest generated from live API fields; does not add unverified claims.</p>
      <article id="weekly-digest" class="card"></article>
    </section>

    ${renderPolicyFooterHtml()}
  </main>
  <script>
    const endpoints = {
      dashboard: '/api/analyst/dashboard',
      opsSummary: '/api/ops/summary'
    };

    const statusImpactCopy = {
      critical: 'high disruption pressure signs are active',
      high: 'sustained stress signs remain elevated',
      elevated: 'conditions are active but mixed',
      low: 'conditions are relatively stable'
    };

    function toNumber(value) {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : 0;
    }

    function trendBars(items) {
      if (!items.length) return '';
      const values = items.map((row) => Math.abs(toNumber(row.delta_24h)));
      const max = Math.max(...values, 1);
      return '<div class="chart-strip">' + values.map((value) => {
        const height = Math.max(8, Math.round((value / max) * 42));
        return '<span class="chart-bar" style="height:' + height + 'px"></span>';
      }).join('') + '</div>';
    }

    function makeWatchList(region) {
      const freshness = String(region.freshness_state || 'unknown');
      const confidence = String(region.confidence_band || 'unknown');
      const prompts = [];
      prompts.push('Watch next update cycle for ' + region.name + '.');
      if (freshness !== 'fresh') prompts.push('Confirm with fresher source updates before strong conclusions.');
      if (confidence === 'low') prompts.push('Treat this as preliminary until confidence improves.');
      return prompts.slice(0, 2);
    }

    function renderCards(regions) {
      const container = document.getElementById('civilian-cards');
      if (!container) return;
      if (!regions.length) {
        container.innerHTML = '<article class="card empty"><p>No regional change data is currently available.</p></article>';
        return;
      }

      const sortedRegions = [...regions].sort((a, b) => Math.abs(toNumber(b.delta_24h)) - Math.abs(toNumber(a.delta_24h)));

      container.innerHTML = sortedRegions.slice(0, 6).map((region) => {
        const delta24 = toNumber(region.delta_24h);
        const delta7 = toNumber(region.delta_7d);
        const direction = delta24 > 0 ? 'up' : delta24 < 0 ? 'down' : 'flat';
        const impact = statusImpactCopy[String(region.status_band || '').toLowerCase()] || 'monitoring signals are mixed';
        const watch = makeWatchList(region);

        return '<article class="card">'
          + '<p class="mini-label">' + region.status_band + ' · ' + region.confidence_band + ' confidence</p>'
          + '<h3>' + region.name + '</h3>'
          + '<p><strong>What changed:</strong> 24h movement is ' + direction + ' (' + delta24.toFixed(1) + '), 7d movement ' + delta7.toFixed(1) + '.</p>'
          + '<p><strong>Why it matters:</strong> Current status suggests ' + impact + '.</p>'
          + '<p><strong>What to watch:</strong></p>'
          + '<ul class="watch-list"><li>' + watch.join('</li><li>') + '</li></ul>'
          + '</article>';
      }).join('');
    }

    function renderDigest(regions, opsSummary) {
      const digest = document.getElementById('weekly-digest');
      if (!digest) return;

      if (!regions.length) {
        digest.innerHTML = '<p class="muted">Readiness snapshot unavailable because dashboard region data is missing.</p>';
        return;
      }

      const highPressure = regions.filter((row) => ['high', 'critical'].includes(String(row.status_band))).length;
      const stale = regions.filter((row) => String(row.freshness_state) !== 'fresh').length;
      const avgDelta = regions.reduce((sum, row) => sum + Math.abs(toNumber(row.delta_24h)), 0) / regions.length;
      const staleSourceCount = toNumber(opsSummary?.stale_source_count);

      const narrative = [
        'This week\'s snapshot shows ' + highPressure + ' region(s) in high/critical status from current scoring.',
        stale > 0
          ? stale + ' region(s) have non-fresh data states, so updates should be treated as provisional.'
          : 'Most tracked regions currently report fresh signal states.',
        staleSourceCount > 0
          ? staleSourceCount + ' source feed(s) are currently stale at the ops layer.'
          : 'No stale source feeds are currently flagged in ops summary.'
      ];

      digest.innerHTML = '<p>' + narrative.join(' ') + '</p>'
        + '<p class="muted">Average absolute 24h movement: ' + avgDelta.toFixed(2) + ' points across ' + regions.length + ' region(s).</p>'
        + trendBars(regions.slice(0, 10));
    }

    async function bootstrap() {
      const cards = document.getElementById('civilian-cards');
      const digest = document.getElementById('weekly-digest');
      if (cards) cards.innerHTML = '<article class="card"><p class="muted">Loading latest public-source snapshot…</p></article>';
      if (digest) digest.innerHTML = '<p class="muted">Loading digest…</p>';

      try {
        const [dashboardResponse, opsResponse] = await Promise.all([
          fetch(endpoints.dashboard),
          fetch(endpoints.opsSummary),
        ]);

        const dashboard = dashboardResponse.ok ? await dashboardResponse.json() : { regions: [] };
        const ops = opsResponse.ok ? await opsResponse.json() : null;
        const regions = Array.isArray(dashboard.regions) ? dashboard.regions : [];

        renderCards(regions);
        renderDigest(regions, ops);
      } catch {
        if (cards) cards.innerHTML = '<article class="card empty"><p>Public cards are temporarily unavailable because API data could not be loaded.</p></article>';
        if (digest) digest.innerHTML = '<p class="muted">Digest unavailable: unable to load upstream data.</p>';
      }
    }

    bootstrap();
  </script>
</body>
</html>`;
}
