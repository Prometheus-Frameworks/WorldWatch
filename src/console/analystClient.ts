export function getAnalystConsoleClientScript(): string {
  return String.raw`
    const endpointMap = {
      regions: '/api/regions',
      feed: '/api/feed',
      analystSummary: '/api/analyst/summary',
      regionDetail: (slug) => '/api/regions/' + encodeURIComponent(slug),
    };

    const timeFmt = new Intl.DateTimeFormat('en', { dateStyle: 'short', timeStyle: 'medium' });
    let regions = [];
    let activeRegionSlug = null;
    let lastDetailSnapshotByRegion = new Map();
    let topMoverSlugs = new Set();

    function formatTimestamp(value) {
      if (!value) return '-';
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? String(value) : timeFmt.format(date);
    }

    function formatNum(value, digits = 2) {
      return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '-';
    }

    function getSelectValue(id) {
      const node = document.getElementById(id);
      return node instanceof HTMLSelectElement ? node.value : 'all';
    }

    function getInputValue(id) {
      const node = document.getElementById(id);
      return node instanceof HTMLInputElement ? node.value : '';
    }

    function getCheckboxValue(id) {
      const node = document.getElementById(id);
      return node instanceof HTMLInputElement ? node.checked : false;
    }

    function populateFilterOptions(rows) {
      const fields = [
        ['filter-status-band', 'status_band'],
        ['filter-confidence-band', 'confidence_band'],
        ['filter-freshness-state', 'freshness_state'],
        ['filter-evidence-state', 'evidence_state'],
      ];

      for (const [id, key] of fields) {
        const select = document.getElementById(id);
        if (!(select instanceof HTMLSelectElement)) continue;
        const values = Array.from(new Set(rows.map((row) => String(row[key] ?? '')).filter(Boolean))).sort();
        const current = select.value || 'all';
        select.innerHTML = '<option value="all">All</option>' + values.map((value) => '<option value="' + value + '">' + value + '</option>').join('');
        if (values.includes(current)) {
          select.value = current;
        } else {
          select.value = 'all';
        }
      }
    }

    function filterRegions(rows) {
      const statusBand = getSelectValue('filter-status-band');
      const confidenceBand = getSelectValue('filter-confidence-band');
      const freshnessState = getSelectValue('filter-freshness-state');
      const evidenceState = getSelectValue('filter-evidence-state');
      const search = getInputValue('region-search').trim().toLowerCase();
      const topMoversOnly = getCheckboxValue('top-movers-only');

      return rows.filter((row) => {
        if (statusBand !== 'all' && row.status_band !== statusBand) return false;
        if (confidenceBand !== 'all' && row.confidence_band !== confidenceBand) return false;
        if (freshnessState !== 'all' && row.freshness_state !== freshnessState) return false;
        if (evidenceState !== 'all' && row.evidence_state !== evidenceState) return false;
        if (search && !String(row.name ?? '').toLowerCase().includes(search)) return false;
        if (topMoversOnly && !topMoverSlugs.has(row.slug)) return false;
        return true;
      });
    }

    function sortRegions(rows) {
      const key = getSelectValue('region-sort');
      const dir = getSelectValue('region-sort-direction') === 'asc' ? 1 : -1;
      return [...rows].sort((a, b) => {
        const left = Number(a[key] ?? 0);
        const right = Number(b[key] ?? 0);
        if (left === right) return String(a.slug).localeCompare(String(b.slug));
        return (left - right) * dir;
      });
    }

    function renderRegionsTable(allRows) {
      const table = document.getElementById('regions-table');
      if (!(table instanceof HTMLTableElement)) return;
      const filtered = filterRegions(Array.isArray(allRows) ? allRows : []);
      if (filtered.length === 0) {
        table.innerHTML = '<tr><td>No regions match the current filters</td></tr>';
        return;
      }

      const sorted = sortRegions(filtered);
      const header = '<tr>' + [
        'Region', 'Composite risk', 'Status band', 'Confidence', 'Freshness', 'Evidence', 'Δ 24h', 'Δ 7d', 'Latest snapshot'
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

    function renderSummaryCards(summary) {
      const container = document.getElementById('summary-cards');
      if (!(container instanceof HTMLElement)) return;
      if (!summary || !summary.cards) {
        container.innerHTML = '<div class="summary-card"><p class="summary-label">Summary</p><p class="summary-value">No summary data</p></div>';
        return;
      }

      const cards = summary.cards;
      const hottest = cards.hottest_region;
      const mover24h = cards.biggest_24h_mover;
      const mover7d = cards.biggest_7d_mover;

      container.innerHTML = [
        '<article class="summary-card"><p class="summary-label">Hottest region</p><p class="summary-value">' + (hottest?.name ?? '—') + '</p><p>Score ' + formatNum(hottest?.composite_score, 1) + '</p></article>',
        '<article class="summary-card"><p class="summary-label">Biggest 24h mover</p><p class="summary-value">' + (mover24h?.name ?? '—') + '</p><p>Δ24h ' + formatNum(mover24h?.delta_24h, 1) + '</p></article>',
        '<article class="summary-card"><p class="summary-label">Biggest 7d mover</p><p class="summary-value">' + (mover7d?.name ?? '—') + '</p><p>Δ7d ' + formatNum(mover7d?.delta_7d, 1) + '</p></article>',
        '<article class="summary-card"><p class="summary-label">Stale + high-risk</p><p class="summary-value">' + String(cards.stale_high_risk_count ?? 0) + '</p><p>status=high and not fresh</p></article>',
        '<article class="summary-card"><p class="summary-label">High score, low confidence</p><p class="summary-value">' + String(cards.high_score_low_confidence_count ?? 0) + '</p><p>triage quality concern</p></article>',
      ].join('');

      const mover24hRows = Array.isArray(summary.top_movers?.by_24h) ? summary.top_movers.by_24h : [];
      const mover7dRows = Array.isArray(summary.top_movers?.by_7d) ? summary.top_movers.by_7d : [];
      const slugs = [...mover24hRows, ...mover7dRows].map((row) => row.slug).filter(Boolean);
      topMoverSlugs = new Set(slugs);
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
          '<p><strong>Composite risk:</strong> ' + formatNum(row.composite_score, 1) + ' <span class="pill">' + row.status_band + '</span></p>' +
          '<p><strong>Momentum:</strong> 24h ' + formatNum(row.delta_24h, 1) + ' · 7d ' + formatNum(row.delta_7d, 1) + '</p>' +
          '<p><strong>Triage:</strong> ' + (row.confidence_band ?? '-') + ' confidence · ' + (row.freshness_state ?? '-') + ' freshness · ' + (row.evidence_state ?? '-') + ' evidence</p>' +
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

    function renderDetail(detail) {
      const container = document.getElementById('region-detail');
      if (!detail || !detail.latest_score) {
        container.innerHTML = '<p>Select a region to inspect score composition and history.</p>';
        return;
      }

      const latest = detail.latest_score;
      const history = Array.isArray(detail.history) ? detail.history : [];
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

    function latestSnapshotFor(slug) {
      const row = regions.find((candidate) => candidate.slug === slug);
      return row?.snapshot_time ?? null;
    }

    async function loadDashboard() {
      const [regionsPayload, feedPayload, summaryPayload] = await Promise.all([
        fetchJson(endpointMap.regions, []),
        fetchJson(endpointMap.feed, []),
        fetchJson(endpointMap.analystSummary, null),
      ]);
      const previousActiveSnapshot = activeRegionSlug ? lastDetailSnapshotByRegion.get(activeRegionSlug) : null;

      regions = Array.isArray(regionsPayload) ? regionsPayload : [];
      populateFilterOptions(regions);
      renderSummaryCards(summaryPayload);
      renderRegionsTable(regions);
      renderFeed(feedPayload);

      if (!activeRegionSlug && regions.length > 0) {
        activeRegionSlug = regions[0].slug;
      }

      if (activeRegionSlug) {
        const newestSnapshot = latestSnapshotFor(activeRegionSlug);
        const activeStillExists = regions.some((row) => row.slug === activeRegionSlug);
        if (!activeStillExists && regions.length > 0) {
          await loadRegion(regions[0].slug, true);
          return;
        }

        const detailChanged = newestSnapshot !== previousActiveSnapshot;
        if (detailChanged) {
          await loadRegion(activeRegionSlug, false);
        }
      }
    }

    async function loadRegion(slug, forceRefresh) {
      activeRegionSlug = slug;
      renderRegionsTable(regions);
      const newestSnapshot = latestSnapshotFor(slug);
      if (!forceRefresh && lastDetailSnapshotByRegion.get(slug) === newestSnapshot) {
        return;
      }

      const detail = await fetchJson(endpointMap.regionDetail(slug), null);
      renderDetail(detail);
      lastDetailSnapshotByRegion.set(slug, newestSnapshot ?? detail?.latest_score?.snapshot_time ?? null);
    }

    document.getElementById('region-sort').addEventListener('change', () => renderRegionsTable(regions));
    document.getElementById('region-sort-direction').addEventListener('change', () => renderRegionsTable(regions));
    document.getElementById('region-search').addEventListener('input', () => renderRegionsTable(regions));
    document.getElementById('top-movers-only').addEventListener('change', () => renderRegionsTable(regions));
    document.getElementById('filter-status-band').addEventListener('change', () => renderRegionsTable(regions));
    document.getElementById('filter-confidence-band').addEventListener('change', () => renderRegionsTable(regions));
    document.getElementById('filter-freshness-state').addEventListener('change', () => renderRegionsTable(regions));
    document.getElementById('filter-evidence-state').addEventListener('change', () => renderRegionsTable(regions));

    document.body.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains('region-link')) return;
      const slug = target.getAttribute('data-region');
      if (!slug) return;
      event.preventDefault();
      void loadRegion(slug, true);
    });

    void loadDashboard();
    setInterval(() => {
      void loadDashboard();
    }, 30000);
  `;
}
