export function getAnalystConsoleClientScript(): string {
  return String.raw`
    const endpointMap = {
      regions: '/api/regions',
      feed: '/api/feed',
      regionDetail: (slug) => '/api/regions/' + encodeURIComponent(slug),
      regionHistory: (slug) => '/api/history/' + encodeURIComponent(slug),
    };

    const timeFmt = new Intl.DateTimeFormat('en', { dateStyle: 'short', timeStyle: 'medium' });
    let regions = [];
    let activeRegionSlug = null;

    function formatTimestamp(value) {
      if (!value) return '-';
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? String(value) : timeFmt.format(date);
    }

    function formatNum(value, digits = 2) {
      return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '-';
    }

    function sortRegions(rows) {
      const key = document.getElementById('region-sort').value;
      const dir = document.getElementById('region-sort-direction').value === 'asc' ? 1 : -1;
      return [...rows].sort((a, b) => {
        const left = Number(a[key] ?? 0);
        const right = Number(b[key] ?? 0);
        if (left === right) return String(a.slug).localeCompare(String(b.slug));
        return (left - right) * dir;
      });
    }

    function renderRegionsTable(rows) {
      const table = document.getElementById('regions-table');
      if (!Array.isArray(rows) || rows.length === 0) {
        table.innerHTML = '<tr><td>No region snapshots yet</td></tr>';
        return;
      }

      const sorted = sortRegions(rows);
      const header = '<tr>' + [
        'Region', 'Score', 'Status', 'Confidence', 'Freshness', 'Evidence', 'Δ 24h', 'Δ 7d', 'Snapshot'
      ].map((value) => '<th>' + value + '</th>').join('') + '</tr>';

      const body = sorted.map((row) => {
        const isActive = row.slug === activeRegionSlug;
        return '<tr data-region="' + row.slug + '"' + (isActive ? ' class="active-row"' : '') + '>' +
          '<td><button class="region-link" data-region="' + row.slug + '">' + row.name + '</button></td>' +
          '<td>' + formatNum(row.composite_score, 1) + '</td>' +
          '<td><span class="pill">' + row.status_band + '</span></td>' +
          '<td>' + row.confidence_band + '</td>' +
          '<td>' + row.freshness_state + '</td>' +
          '<td>' + row.evidence_state + '</td>' +
          '<td>' + formatNum(row.delta_24h, 1) + '</td>' +
          '<td>' + formatNum(row.delta_7d, 1) + '</td>' +
          '<td>' + formatTimestamp(row.snapshot_time) + '</td>' +
        '</tr>';
      }).join('');

      table.innerHTML = header + body;
    }

    function renderFeed(feed) {
      const container = document.getElementById('feed-cards');
      if (!Array.isArray(feed) || feed.length === 0) {
        container.innerHTML = '<p>No feed entries yet.</p>';
        return;
      }

      const cards = feed.slice(0, 30).map((row) => {
        return '<article class="feed-card">' +
          '<h3>' + row.name + '</h3>' +
          '<p><strong>Score:</strong> ' + formatNum(row.composite_score, 1) + ' <span class="pill">' + row.status_band + '</span></p>' +
          '<p><strong>Delta:</strong> 24h ' + formatNum(row.delta_24h, 1) + ' · 7d ' + formatNum(row.delta_7d, 1) + '</p>' +
          '<p><strong>Snapshot:</strong> ' + formatTimestamp(row.snapshot_time) + '</p>' +
          '<p><button class="region-link" data-region="' + row.slug + '">Inspect region</button></p>' +
        '</article>';
      }).join('');

      container.innerHTML = cards;
    }

    function renderHistoryTable(id, rows, columns) {
      const table = document.getElementById(id);
      if (!Array.isArray(rows) || rows.length === 0) {
        table.innerHTML = '<tr><td>No history available</td></tr>';
        return;
      }
      const header = '<tr>' + columns.map((col) => '<th>' + col.header + '</th>').join('') + '</tr>';
      const body = rows.map((row) => {
        const cells = columns.map((col) => {
          const raw = row[col.key];
          const value = col.render ? col.render(raw, row) : raw;
          return '<td>' + String(value ?? '-') + '</td>';
        }).join('');
        return '<tr>' + cells + '</tr>';
      }).join('');
      table.innerHTML = header + body;
    }

    function renderDetail(detail, history) {
      const container = document.getElementById('region-detail');
      if (!detail || !detail.latest_score) {
        container.innerHTML = '<p>Select a region to inspect score composition and history.</p>';
        return;
      }

      const latest = detail.latest_score;
      const subscores = [
        ['Conflict pressure', latest.conflict_score],
        ['Chokepoint stress', latest.chokepoint_score],
        ['Oil shock risk', latest.oil_score],
        ['Displacement acceleration', latest.displacement_score],
        ['Narrative heat', latest.narrative_score],
      ];

      document.getElementById('detail-header').innerHTML =
        '<h2>' + latest.name + '</h2>' +
        '<p><strong>Composite:</strong> ' + formatNum(latest.composite_score, 1) +
        ' · <strong>Δ24h:</strong> ' + formatNum(detail.latest_delta?.delta_24h, 1) +
        ' · <strong>Δ7d:</strong> ' + formatNum(detail.latest_delta?.delta_7d, 1) + '</p>' +
        '<p><strong>Status:</strong> ' + latest.status_band +
        ' · <strong>Confidence:</strong> ' + latest.confidence_band +
        ' · <strong>Freshness:</strong> ' + latest.freshness_state +
        ' · <strong>Evidence:</strong> ' + latest.evidence_state + '</p>' +
        '<p><strong>Snapshot:</strong> ' + formatTimestamp(latest.snapshot_time) + '</p>';

      document.getElementById('subscores-list').innerHTML = subscores
        .map(([label, value]) => '<li><strong>' + label + ':</strong> ' + formatNum(Number(value), 1) + '</li>')
        .join('');

      const factors = Array.isArray(detail.factor_payload) ? detail.factor_payload : [];
      renderHistoryTable('factors-table', factors, [
        { key: 'signalType', header: 'Signal' },
        { key: 'source', header: 'Source' },
        { key: 'value', header: 'Raw', render: (v) => formatNum(Number(v), 2) },
        { key: 'normalizedValue', header: 'Normalized', render: (v) => formatNum(Number(v), 1) },
        { key: 'eventTime', header: 'Event time', render: (v) => formatTimestamp(v) },
      ]);

      const secondOrder = Array.isArray(detail.second_order_effects) ? detail.second_order_effects : [];
      renderHistoryTable('second-order-table', secondOrder, [
        { key: 'effectType', header: 'Effect' },
        { key: 'description', header: 'Description' },
        { key: 'confidence', header: 'Confidence' },
      ]);

      renderHistoryTable('signals-table', detail.recent_signals, [
        { key: 'event_time', header: 'Event time', render: (v) => formatTimestamp(v) },
        { key: 'signal_type', header: 'Signal' },
        { key: 'source_name', header: 'Source' },
        { key: 'value', header: 'Value', render: (v) => formatNum(Number(v), 2) },
        { key: 'unit', header: 'Unit' },
      ]);

      renderHistoryTable('score-history-table', history, [
        { key: 'snapshot_time', header: 'Snapshot', render: (v) => formatTimestamp(v) },
        { key: 'composite_score', header: 'Composite', render: (v) => formatNum(Number(v), 1) },
        { key: 'status_band', header: 'Status' },
        { key: 'confidence_band', header: 'Confidence' },
      ]);

      renderHistoryTable('delta-history-table', history, [
        { key: 'snapshot_time', header: 'Snapshot', render: (v) => formatTimestamp(v) },
        { key: 'delta_24h', header: 'Δ 24h', render: (v) => formatNum(Number(v), 1) },
        { key: 'delta_7d', header: 'Δ 7d', render: (v) => formatNum(Number(v), 1) },
        { key: 'rank_movement', header: 'Rank Δ', render: (v) => formatNum(Number(v), 0) },
      ]);

      container.hidden = false;
    }

    async function fetchJson(url, fallback) {
      const response = await fetch(url);
      if (!response.ok) {
        if (fallback !== undefined) return fallback;
        throw new Error('Failed request: ' + url);
      }
      return response.json();
    }

    async function loadDashboard() {
      const [regionsPayload, feedPayload] = await Promise.all([
        fetchJson(endpointMap.regions, []),
        fetchJson(endpointMap.feed, []),
      ]);
      regions = Array.isArray(regionsPayload) ? regionsPayload : [];
      renderRegionsTable(regions);
      renderFeed(feedPayload);

      if (!activeRegionSlug && regions.length > 0) {
        activeRegionSlug = regions[0].slug;
      }
      if (activeRegionSlug) {
        await loadRegion(activeRegionSlug);
      }
    }

    async function loadRegion(slug) {
      activeRegionSlug = slug;
      renderRegionsTable(regions);
      const [detail, history] = await Promise.all([
        fetchJson(endpointMap.regionDetail(slug), null),
        fetchJson(endpointMap.regionHistory(slug), []),
      ]);
      renderDetail(detail, history);
    }

    document.getElementById('region-sort').addEventListener('change', () => renderRegionsTable(regions));
    document.getElementById('region-sort-direction').addEventListener('change', () => renderRegionsTable(regions));
    document.body.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains('region-link')) return;
      const slug = target.getAttribute('data-region');
      if (!slug) return;
      event.preventDefault();
      void loadRegion(slug);
    });

    void loadDashboard();
    setInterval(loadDashboard, 30000);
  `;
}
