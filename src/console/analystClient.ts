import {
  getDetailSignature,
  getFeedSignature,
  getFilterOptionsSignature,
  getMapSignature,
  getRenderRowSignature,
  getSummarySignature,
  getTableSignature,
} from './analystClientSignatures.ts';

function getInjectedSignatureHelpers(): string {
  return [
    getFilterOptionsSignature,
    getRenderRowSignature,
    getTableSignature,
    getMapSignature,
    getFeedSignature,
    getSummarySignature,
    getDetailSignature,
  ]
    .map((fn) => fn.toString())
    .join('\n');
}

function getDashboardDataModule(): string {
  return String.raw`
    async function fetchJson(url, fallback) {
      const response = await fetch(url);
      if (!response.ok) {
        if (fallback !== undefined) return fallback;
        throw new Error('Failed request: ' + url);
      }
      return response.json();
    }

    async function loadDashboardPayload() {
      const dashboardPayload = await fetchJson(endpointMap.analystDashboard, null);
      if (dashboardPayload) {
        return {
          regionsPayload: dashboardPayload.regions,
          geoPayload: dashboardPayload.regions_geo,
          feedPayload: dashboardPayload.feed,
          summaryPayload: dashboardPayload.summary,
        };
      }

      const [regionsPayload, geoPayload, feedPayload, summaryPayload] = await Promise.all([
        fetchJson(endpointMap.regions, []),
        fetchJson(endpointMap.regionsGeo, []),
        fetchJson(endpointMap.feed, []),
        fetchJson(endpointMap.analystSummary, null),
      ]);

      return { regionsPayload, geoPayload, feedPayload, summaryPayload };
    }

    function latestSnapshotFor(slug) {
      const row = regions.find((candidate) => candidate.slug === slug);
      return row?.snapshot_time ?? null;
    }

    async function loadDashboard() {
      const { regionsPayload, geoPayload, feedPayload, summaryPayload } = await loadDashboardPayload();
      const previousActiveSnapshot = activeRegionSlug ? lastDetailSnapshotByRegion.get(activeRegionSlug) : null;

      regions = Array.isArray(regionsPayload) ? regionsPayload : [];
      geoRegions = Array.isArray(geoPayload) ? geoPayload : [];
      populateFilterOptions(regions);
      renderSummaryCards(summaryPayload);
      syncRegionViews();
      renderFeed(feedPayload);
      renderMapLegend();

      if (!activeRegionSlug && regions.length > 0) {
        activeRegionSlug = regions[0].slug;
        syncRegionViews();
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
      syncRegionViews();
      const newestSnapshot = latestSnapshotFor(slug);
      if (!forceRefresh && lastDetailSnapshotByRegion.get(slug) === newestSnapshot) {
        return;
      }

      const [detail, compare] = await Promise.all([fetchJson(endpointMap.regionDetail(slug), null), fetchJson(endpointMap.regionCompare(slug, compareMode), null)]);
      if (detail && compare) detail.compare = compare;
      renderDetail(detail);
      lastDetailSnapshotByRegion.set(slug, newestSnapshot ?? detail?.latest_score?.snapshot_time ?? null);
    }
  `;
}

function getFilterSortModule(): string {
  return String.raw`
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
      const signature = getFilterOptionsSignature(Array.isArray(rows) ? rows : []);
      if (signature === lastFilterOptionsSignature) return;

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
        select.value = values.includes(current) ? current : 'all';
      }

      lastFilterOptionsSignature = signature;
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

    function getFilteredSortedRegions() {
      return sortRegions(filterRegions(Array.isArray(regions) ? regions : []));
    }
  `;
}

export function getAnalystConsoleClientScript(): string {
  return String.raw`
    const endpointMap = {
      regions: '/api/regions',
      regionsGeo: '/api/regions/geo',
      feed: '/api/feed',
      analystSummary: '/api/analyst/summary',
      analystDashboard: '/api/analyst/dashboard',
      regionDetail: (slug) => '/api/regions/' + encodeURIComponent(slug),
      regionCompare: (slug, rightMode) => '/api/regions/' + encodeURIComponent(slug) + '/compare?right=' + encodeURIComponent(rightMode),
    };

    ${getInjectedSignatureHelpers()}

    const timeFmt = new Intl.DateTimeFormat('en', { dateStyle: 'short', timeStyle: 'medium' });
    const STATUS_COLORS = { low: '#2e7d32', elevated: '#c77800', high: '#d84343', critical: '#9c27b0', unknown: '#607d8b' };
    let regions = [];
    let geoRegions = [];
    let activeRegionSlug = null;
    let lastDetailSnapshotByRegion = new Map();
    let topMoverSlugs = new Set();
    let lastTableSignature = '';
    let lastMapSignature = '';
    let lastSummarySignature = '';
    let lastFeedSignature = '';
    let lastFilterOptionsSignature = '';
    let lastDetailSignature = '';
    let hoveredRegionSlug = null;
    let hasRenderedMapLegend = false;
    let detailMode = localStorage.getItem('worldwatch.analyst.detail_mode') === 'full' ? 'full' : 'focus';
    let detailPins = new Set(JSON.parse(localStorage.getItem('worldwatch.analyst.pins') ?? '[]'));
    let compareMode = 'previous';

    function formatTimestamp(value) {
      if (!value) return '-';
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? String(value) : timeFmt.format(date);
    }
    function formatNum(value, digits = 2) {
      return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '-';
    }
    function deriveNextActiveRegionSlug(visibleSlugs, currentActiveSlug) {
      if (currentActiveSlug && visibleSlugs.includes(currentActiveSlug)) return currentActiveSlug;
      return visibleSlugs[0] ?? null;
    }
    function getMapTooltipText(row) {
      return row.name + ' · ' + row.status_band + ' · score ' + formatNum(Number(row.composite_score), 1) + ' · Δ24h ' + formatNum(Number(row.delta_24h), 1) + ' · Δ7d ' + formatNum(Number(row.delta_7d), 1);
    }
    function computeSubscoreWidth(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return 0;
      return Math.max(0, Math.min(100, Math.round(numeric)));
    }

    ${getFilterSortModule()}

    function renderRegionsTable(allRows) {
      const table = document.getElementById('regions-table');
      if (!(table instanceof HTMLTableElement)) return;
      const filtered = filterRegions(Array.isArray(allRows) ? allRows : []);
      if (filtered.length === 0) {
        table.innerHTML = '<tr><td colspan="9">No regions match current filters.</td></tr>';
        lastTableSignature = 'empty';
        return;
      }
      const sorted = sortRegions(filtered);
      const signature = getTableSignature(sorted, activeRegionSlug, hoveredRegionSlug);
      if (signature === lastTableSignature) return;
      const header = '<tr>' + ['Region', 'Composite risk', 'Status band', 'Confidence', 'Freshness', 'Evidence', 'Δ 24h', 'Δ 7d', 'Latest snapshot'].map((value) => '<th>' + value + '</th>').join('') + '</tr>';
      const body = sorted.map((row) => {
        const isActive = row.slug === activeRegionSlug;
        const isHovered = row.slug === hoveredRegionSlug;
        const rowClass = isActive ? 'active-row' : (isHovered ? 'hover-row' : '');
        return '<tr data-region="' + row.slug + '"' + (rowClass ? ' class="' + rowClass + '"' : '') + '>' +
          '<td><button class="region-link" data-region="' + row.slug + '">' + row.name + '</button></td>' +
          '<td>' + formatNum(row.composite_score, 1) + '</td>' +
          '<td><span class="pill">' + row.status_band + '</span></td>' +
          '<td>' + row.confidence_band + '</td><td>' + row.freshness_state + '</td><td>' + row.evidence_state + '</td>' +
          '<td>' + formatNum(row.delta_24h, 1) + '</td><td>' + formatNum(row.delta_7d, 1) + '</td><td>' + formatTimestamp(row.snapshot_time) + '</td></tr>';
      }).join('');
      table.innerHTML = header + body;
      lastTableSignature = signature;
    }

    function renderSummaryCards(summary) {
      const container = document.getElementById('summary-cards');
      if (!(container instanceof HTMLElement)) return;
      const signature = getSummarySignature(summary ?? null);
      if (signature === lastSummarySignature) return;
      if (!summary || !summary.cards) {
        container.innerHTML = '<div class="summary-card"><p class="summary-label">Summary</p><p class="summary-value">No summary data</p></div>';
        lastSummarySignature = signature;
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
      topMoverSlugs = new Set([...mover24hRows, ...mover7dRows].map((row) => row.slug).filter(Boolean));
      lastSummarySignature = signature;
    }

    function renderFeed(feed) {
      const container = document.getElementById('feed-cards');
      if (!(container instanceof HTMLElement)) return;
      const signature = getFeedSignature(feed);
      if (signature === lastFeedSignature) return;
      if (!Array.isArray(feed) || feed.length === 0) {
        container.innerHTML = '<p>No feed entries yet.</p>';
        lastFeedSignature = signature;
        return;
      }
      container.innerHTML = feed.slice(0, 30).map((row) => '<article class="feed-card"><h3>' + row.name + '</h3><p><strong>Composite risk:</strong> ' + formatNum(row.composite_score, 1) + ' <span class="pill">' + row.status_band + '</span></p><p><strong>Momentum:</strong> 24h ' + formatNum(row.delta_24h, 1) + ' · 7d ' + formatNum(row.delta_7d, 1) + '</p><p><strong>Triage:</strong> ' + (row.confidence_band ?? '-') + ' confidence · ' + (row.freshness_state ?? '-') + ' freshness · ' + (row.evidence_state ?? '-') + ' evidence</p><p><strong>Snapshot:</strong> ' + formatTimestamp(row.snapshot_time) + '</p><p><button class="region-link" data-region="' + row.slug + '">Inspect region</button></p></article>').join('');
      lastFeedSignature = signature;
    }


    function persistDetailMode() { localStorage.setItem('worldwatch.analyst.detail_mode', detailMode); }
    function persistPins() { localStorage.setItem('worldwatch.analyst.pins', JSON.stringify([...detailPins].sort())); }
    function togglePin(sectionKey) { if (detailPins.has(sectionKey)) detailPins.delete(sectionKey); else detailPins.add(sectionKey); persistPins(); applyDetailMode(); }
    function pinButton(sectionKey) { return '<button class="region-link pin-control" data-pin-section="' + sectionKey + '">' + (detailPins.has(sectionKey) ? 'Unpin this section' : 'Pin this section') + '</button>'; }
    function applyDetailMode() {
      const modeSelect = document.getElementById('detail-mode-select');
      if (modeSelect instanceof HTMLSelectElement) modeSelect.value = detailMode;
      const scanHint = document.getElementById('scan-order-hint');
      if (scanHint instanceof HTMLElement) scanHint.hidden = detailMode !== 'focus';
      const collapsibles = document.querySelectorAll('#region-detail details.collapsible');
      for (const node of collapsibles) {
        if (!(node instanceof HTMLDetailsElement)) continue;
        if (detailMode === 'focus') node.open = false;
        else node.open = true;
      }
      const pinnedArea = document.getElementById('pinned-sections');
      const pinnedBody = document.getElementById('pinned-sections-body');
      if (pinnedArea instanceof HTMLElement && pinnedBody instanceof HTMLElement) {
        const pinnedKeys = [...detailPins];
        if (pinnedKeys.length === 0) {
          pinnedArea.hidden = true;
          pinnedBody.innerHTML = '';
        } else {
          pinnedArea.hidden = false;
          pinnedBody.innerHTML = pinnedKeys.map((key) => {
            const section = document.querySelector('#region-detail [data-section-key="' + key + '"]');
            return section instanceof HTMLElement ? section.outerHTML : '';
          }).join('');
        }
      }
    }
    function addSectionPins() {
      const headings = document.querySelectorAll('#region-detail [data-section-key] > h3, #region-detail [data-section-key] > summary');
      for (const heading of headings) {
        if (!(heading instanceof HTMLElement)) continue;
        const parent = heading.parentElement;
        const key = parent?.getAttribute('data-section-key');
        if (!key) continue;
        if (heading.querySelector('[data-pin-section]')) continue;
        heading.insertAdjacentHTML('beforeend', pinButton(key));
      }
    }

    function renderHistoryTable(id, rows, columns) { const table = document.getElementById(id); if (!(table instanceof HTMLTableElement)) return; if (!Array.isArray(rows) || rows.length === 0) { table.innerHTML = '<tr><td>No history available</td></tr>'; return; } const header = '<tr>' + columns.map((col) => '<th>' + col.header + '</th>').join('') + '</tr>'; const body = rows.map((row) => '<tr>' + columns.map((col) => { const raw = row[col.key]; const value = col.render ? col.render(raw, row) : raw; return '<td>' + String(value ?? '-') + '</td>'; }).join('') + '</tr>').join(''); table.innerHTML = header + body; }
    function renderDisagreementSourcesCell(sources) { if (!Array.isArray(sources) || sources.length === 0) return '<span class="muted-cell">No source-level disagreement details</span>'; return '<ul class="source-bullets">' + sources.map((source) => '<li><strong>' + String(source.source ?? '-') + '</strong> · ' + String(source.movement_direction ?? '-') + ' · ' + formatNum(Number(source.recency_minutes), 0) + 'm · r=' + formatNum(Number(source.source_reliability), 2) + '</li>').join('') + '</ul>'; }
    function disagreementTypesText(types) { if (!Array.isArray(types) || types.length === 0) return '<span class="muted-cell">—</span>'; return types.join('<br>'); }
    function renderScanCards(detail, explainabilitySummary, explainabilityGroups) { const container = document.getElementById('explainability-scan-cards'); if (!(container instanceof HTMLElement)) return; const mixedCount = Array.isArray(explainabilityGroups.mixed_signal_indicators) ? explainabilityGroups.mixed_signal_indicators.length : 0; const staleCount = Array.isArray(explainabilityGroups.stale_high_impact_sources) ? explainabilityGroups.stale_high_impact_sources.length : 0; const disagreementCount = Array.isArray(explainabilityGroups.source_disagreement_groups) ? explainabilityGroups.source_disagreement_groups.length : 0; const triageCount = Array.isArray(detail.triage_notes) ? detail.triage_notes.length : 0; container.innerHTML = ['<article class="scan-card"><p class="scan-label">Escalation posture</p><p class="scan-value">' + String(explainabilitySummary.escalation_label ?? '-') + '</p><p class="scan-note">' + String(explainabilitySummary.escalation_copy ?? '') + '</p></article>','<article class="scan-card"><p class="scan-label">Freshness state</p><p class="scan-value">' + String(explainabilitySummary.freshness_state ?? '-') + '</p><p class="scan-note">'+ String(explainabilitySummary.freshness_copy ?? '') + '</p></article>','<article class="scan-card"><p class="scan-label">Confidence / evidence</p><p class="scan-value">' + String(explainabilitySummary.confidence_band ?? '-') + ' / ' + String(explainabilitySummary.evidence_state ?? '-') + '</p><p class="scan-note">Trust posture at a glance.</p></article>','<article class="scan-card"><p class="scan-label">Mixed-signal disagreements</p><p class="scan-value">' + String(mixedCount) + ' domains · ' + String(disagreementCount) + ' groups</p><p class="scan-note">Resolve direction/reliability conflicts before escalation.</p></article>','<article class="scan-card"><p class="scan-label">Stale high-impact evidence</p><p class="scan-value">' + String(staleCount) + '</p><p class="scan-note">Refresh or verify if this count is elevated.</p></article>','<article class="scan-card"><p class="scan-label">Triage notes</p><p class="scan-value">' + String(triageCount) + '</p><p class="scan-note">Decision support notes in this snapshot.</p></article>'].join(''); }
    function renderDetail(detail) {
      const container = document.getElementById('region-detail');
      if (!(container instanceof HTMLElement)) return;
      const signature = getDetailSignature(detail ?? null) + '|' + detailMode + '|' + compareMode + '|' + JSON.stringify([...detailPins].sort());
      if (signature === lastDetailSignature) return;
      if (!detail || !detail.latest_score) { container.innerHTML = '<p>Select a region to inspect score composition and history.</p>'; lastDetailSignature = signature; return; }
      const latest = detail.latest_score; const history = Array.isArray(detail.history) ? detail.history : [];
      const explainabilityGroups = detail.explainability_groups ?? {};
      const explainabilitySummary = detail.explainability_summary ?? {};
      document.getElementById('detail-header').innerHTML = '<h2>' + latest.name + '</h2><p><strong>Snapshot:</strong> ' + formatTimestamp(latest.snapshot_time) + '</p><div class="detail-kpis"><span class="detail-kpi"><strong>Composite:</strong> ' + formatNum(latest.composite_score, 1) + '</span><span class="detail-kpi"><strong>Δ24h:</strong> ' + formatNum(detail.latest_delta?.delta_24h, 1) + '</span><span class="detail-kpi"><strong>Δ7d:</strong> ' + formatNum(detail.latest_delta?.delta_7d, 1) + '</span><span class="detail-kpi"><strong>Status:</strong> ' + latest.status_band + '</span><span class="detail-kpi"><strong>Confidence:</strong> ' + latest.confidence_band + '</span><span class="detail-kpi"><strong>Freshness:</strong> ' + latest.freshness_state + '</span><span class="detail-kpi"><strong>Evidence:</strong> ' + latest.evidence_state + '</span></div>';
      renderScanCards(detail, explainabilitySummary, explainabilityGroups);
      const stateCards = document.getElementById('explainability-state-cards');
      if (stateCards instanceof HTMLElement) {
        const divergence = explainabilityGroups.narrative_physical_divergence;
        const divergenceCard = divergence?.is_active ? '<article class="state-card"><p><strong>Narrative-vs-physical cue:</strong> Narrative-leading signal</p><p>' + String(divergence.analyst_copy ?? '') + '</p></article>' : '';
        stateCards.innerHTML = [
          '<article class="state-card"><p><strong>Freshness:</strong> ' + String(explainabilitySummary.freshness_state ?? latest.freshness_state ?? '-') + '</p><p>' + String(explainabilitySummary.freshness_copy ?? '') + '</p></article>',
          '<article class="state-card"><p><strong>Confidence:</strong> ' + String(explainabilitySummary.confidence_band ?? latest.confidence_band ?? '-') + '</p><p>' + String(explainabilitySummary.confidence_copy ?? '') + '</p></article>',
          '<article class="state-card"><p><strong>Evidence:</strong> ' + String(explainabilitySummary.evidence_state ?? latest.evidence_state ?? '-') + '</p><p>' + String(explainabilitySummary.evidence_copy ?? '') + '</p></article>',
          '<article class="state-card"><p><strong>Escalation posture:</strong> ' + String(explainabilitySummary.escalation_label ?? '-') + '</p><p>' + String(explainabilitySummary.escalation_copy ?? '') + '</p></article>',
          divergenceCard,
        ].join('');
      }
      document.getElementById('subscores-list').innerHTML = [['Conflict pressure', latest.conflict_score], ['Chokepoint stress', latest.chokepoint_score], ['Oil shock risk', latest.oil_score], ['Displacement acceleration', latest.displacement_score], ['Narrative heat', latest.narrative_score]].map(([label, value]) => '<article class="subscore-row"><p><strong>' + label + '</strong><span>' + formatNum(Number(value), 1) + '</span></p><div class="subscore-bar"><span style="width:' + computeSubscoreWidth(value) + '%"></span></div></article>').join('');
      renderHistoryTable('focus-disagreement-table', Array.isArray(explainabilityGroups.source_disagreement_groups) ? explainabilityGroups.source_disagreement_groups.slice(0, 1) : [], [{ key: 'domain', header: 'Domain' }, { key: 'disagreement_types', header: 'Type', render: (v) => disagreementTypesText(v) }, { key: 'disagreeing_sources', header: 'Top sources', render: (v) => renderDisagreementSourcesCell(Array.isArray(v) ? v.slice(0, 3) : v) }]);
      renderHistoryTable('focus-stale-high-impact-table', Array.isArray(explainabilityGroups.stale_high_impact_sources) ? explainabilityGroups.stale_high_impact_sources.slice(0, 4) : [], [{ key: 'source', header: 'Source' }, { key: 'factor_label', header: 'Factor' }, { key: 'recency_minutes', header: 'Recency (m)', render: (v) => formatNum(Number(v), 0) }]);
      renderHistoryTable('explainability-factors-table', Array.isArray(explainabilityGroups.top_contributing_factors) ? explainabilityGroups.top_contributing_factors : [], [{ key: 'factor_label', header: 'Factor' }, { key: 'source', header: 'Source' }, { key: 'domain', header: 'Domain' }, { key: 'normalized_contribution', header: 'Norm contrib', render: (v) => formatNum(Number(v), 1) }, { key: 'recency_minutes', header: 'Recency (m)', render: (v) => formatNum(Number(v), 0) }, { key: 'source_reliability', header: 'Reliability', render: (v) => formatNum(Number(v), 2) }, { key: 'movement_direction', header: 'Direction' }]);
      renderHistoryTable('second-order-table', Array.isArray(detail.second_order_effects) ? detail.second_order_effects : [], [{ key: 'effectType', header: 'Effect' }, { key: 'description', header: 'Description' }, { key: 'confidence', header: 'Confidence' }]);
      renderHistoryTable('signals-table', detail.recent_signals, [{ key: 'event_time', header: 'Event time', render: (v) => formatTimestamp(v) }, { key: 'signal_type', header: 'Signal' }, { key: 'source_name', header: 'Source' }, { key: 'value', header: 'Value', render: (v) => formatNum(Number(v), 2) }, { key: 'unit', header: 'Unit' }]);
      renderHistoryTable('source-contributions-table', Array.isArray(detail.source_contributions) ? detail.source_contributions : [], [{ key: 'source_name', header: 'Source' }, { key: 'avg_reliability', header: 'Avg reliability', render: (v) => formatNum(Number(v), 2) }, { key: 'signal_count', header: 'Count', render: (v) => formatNum(Number(v), 0) }, { key: 'latest_event_time', header: 'Latest event', render: (v) => formatTimestamp(v) }, { key: 'avg_raw_value', header: 'Avg raw value', render: (v) => formatNum(Number(v), 2) }]);
      renderHistoryTable('freshest-sources-table', Array.isArray(explainabilityGroups.freshest_contributing_sources) ? explainabilityGroups.freshest_contributing_sources : [], [{ key: 'source', header: 'Freshest sources' }, { key: 'domain', header: 'Domain' }, { key: 'recency_minutes', header: 'Recency (m)', render: (v) => formatNum(Number(v), 0) }, { key: 'normalized_contribution', header: 'Norm contrib', render: (v) => formatNum(Number(v), 1) }]);
      renderHistoryTable('stale-high-impact-table', Array.isArray(explainabilityGroups.stale_high_impact_sources) ? explainabilityGroups.stale_high_impact_sources : [], [{ key: 'source', header: 'Stale + high-impact' }, { key: 'factor_label', header: 'Factor' }, { key: 'recency_minutes', header: 'Recency (m)', render: (v) => formatNum(Number(v), 0) }, { key: 'normalized_contribution', header: 'Norm contrib', render: (v) => formatNum(Number(v), 1) }]);
      renderHistoryTable('mixed-indicators-table', Array.isArray(explainabilityGroups.mixed_signal_indicators) ? explainabilityGroups.mixed_signal_indicators.map((row) => ({ domain: row.domain, directions: Array.isArray(row.directions) ? row.directions.join(', ') : '' })) : [], [{ key: 'domain', header: 'Mixed-signal domain' }, { key: 'directions', header: 'Observed directions' }]);
      renderHistoryTable('source-disagreement-table', Array.isArray(explainabilityGroups.source_disagreement_groups) ? explainabilityGroups.source_disagreement_groups : [], [{ key: 'domain', header: 'Domain' }, { key: 'disagreement_types', header: 'Disagreement type', render: (v) => disagreementTypesText(v) }, { key: 'disagreeing_sources', header: 'Sources / direction / recency / reliability', render: (v) => renderDisagreementSourcesCell(v) }]);
      renderHistoryTable('score-history-table', history, [{ key: 'snapshot_time', header: 'Snapshot', render: (v) => formatTimestamp(v) }, { key: 'composite_score', header: 'Composite', render: (v) => formatNum(Number(v), 1) }, { key: 'status_band', header: 'Status' }, { key: 'confidence_band', header: 'Confidence' }]);
      renderHistoryTable('delta-history-table', history, [{ key: 'snapshot_time', header: 'Snapshot', render: (v) => formatTimestamp(v) }, { key: 'delta_24h', header: 'Δ 24h', render: (v) => formatNum(Number(v), 1) }, { key: 'delta_7d', header: 'Δ 7d', render: (v) => formatNum(Number(v), 1) }, { key: 'rank_movement', header: 'Rank Δ', render: (v) => formatNum(Number(v), 0) }]);
      const compare = detail.compare ?? null;
      if (compare) {
        renderHistoryTable('compare-summary-table', [{ metric: 'Composite', left: compare.left?.composite_score, right: compare.right?.composite_score, delta: compare.deltas?.composite_score }, { metric: 'Status band', left: compare.left?.status_band, right: compare.right?.status_band, delta: compare.left?.status_band === compare.right?.status_band ? 'unchanged' : 'changed' }, { metric: 'Confidence/Freshness/Evidence', left: String(compare.left?.confidence_band ?? '-') + '/' + String(compare.left?.freshness_state ?? '-') + '/' + String(compare.left?.evidence_state ?? '-'), right: String(compare.right?.confidence_band ?? '-') + '/' + String(compare.right?.freshness_state ?? '-') + '/' + String(compare.right?.evidence_state ?? '-'), delta: '—' }], [{ key: 'metric', header: 'Metric' }, { key: 'left', header: 'Latest' }, { key: 'right', header: compare.compare_mode === '24h-ago' ? '24h-ago' : 'Previous' }, { key: 'delta', header: 'Δ' }]);
        renderHistoryTable('compare-subscores-table', [{ metric: 'Conflict', delta: compare.deltas?.conflict_score }, { metric: 'Shipping', delta: compare.deltas?.chokepoint_score }, { metric: 'Oil', delta: compare.deltas?.oil_score }, { metric: 'Displacement', delta: compare.deltas?.displacement_score }, { metric: 'Narrative', delta: compare.deltas?.narrative_score }], [{ key: 'metric', header: 'Sub-score' }, { key: 'delta', header: 'Δ', render: (v) => formatNum(Number(v), 1) }]);
        renderHistoryTable('compare-factors-table', (compare.left?.top_factors ?? []).map((row, idx) => ({ latest_factor: row.factor_label, latest_source: row.source, other_factor: compare.right?.top_factors?.[idx]?.factor_label ?? '-', other_source: compare.right?.top_factors?.[idx]?.source ?? '-' })), [{ key: 'latest_factor', header: 'Latest factor' }, { key: 'latest_source', header: 'Latest source' }, { key: 'other_factor', header: 'Compared factor' }, { key: 'other_source', header: 'Compared source' }]);
        renderHistoryTable('compare-signals-table', [{ metric: 'Disagreement groups changed', value: compare.flags?.disagreement_changed ? 'yes' : 'no' }, { metric: 'Narrative-vs-physical cue changed', value: compare.flags?.divergence_changed ? 'yes' : 'no' }], [{ key: 'metric', header: 'Change signal' }, { key: 'value', header: 'Value' }]);
      }
      const triageContainer = document.getElementById('triage-notes'); if (triageContainer instanceof HTMLElement) { triageContainer.innerHTML = (Array.isArray(detail.triage_notes) ? detail.triage_notes : []).map((note) => '<article class="triage-note"><p><strong>' + note.title + '</strong></p><p>' + note.copy + '</p></article>').join(''); }
      addSectionPins();
      applyDetailMode();
      container.hidden = false;
      lastDetailSignature = signature;
    }

    function getBoundsFromGeometry(geometryRows) { let minLon = Infinity; let minLat = Infinity; let maxLon = -Infinity; let maxLat = -Infinity; for (const row of geometryRows) { const coordinates = row?.geometry?.coordinates; if (!Array.isArray(coordinates)) continue; const stack = [...coordinates]; while (stack.length > 0) { const current = stack.pop(); if (!Array.isArray(current)) continue; if (current.length >= 2 && typeof current[0] === 'number' && typeof current[1] === 'number') { const [lon, lat] = current; minLon = Math.min(minLon, lon); minLat = Math.min(minLat, lat); maxLon = Math.max(maxLon, lon); maxLat = Math.max(maxLat, lat);} else { for (const item of current) stack.push(item); } } } if (!Number.isFinite(minLon) || !Number.isFinite(minLat) || !Number.isFinite(maxLon) || !Number.isFinite(maxLat)) return { minLon: -180, minLat: -90, maxLon: 180, maxLat: 90 }; return { minLon, minLat, maxLon, maxLat }; }
    function projectCoordinate(lon, lat, bounds) { const xRange = Math.max(0.1, bounds.maxLon - bounds.minLon); const yRange = Math.max(0.1, bounds.maxLat - bounds.minLat); const padding = 16; const width = 960 - padding * 2; const height = 480 - padding * 2; const x = ((lon - bounds.minLon) / xRange) * width + padding; const y = height - ((lat - bounds.minLat) / yRange) * height + padding; return [x, y]; }
    function geometryToPathD(geometry, bounds) { if (!geometry || !Array.isArray(geometry.coordinates)) return ''; const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : (geometry.type === 'MultiPolygon' ? geometry.coordinates : []); const segments = []; for (const polygon of polygons) { for (const ring of polygon) { if (!Array.isArray(ring) || ring.length === 0) continue; let segment = ''; for (let i = 0; i < ring.length; i += 1) { const point = ring[i]; if (!Array.isArray(point) || point.length < 2) continue; const [x, y] = projectCoordinate(point[0], point[1], bounds); segment += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ',' + y.toFixed(2) + ' '; } if (segment) segments.push(segment + 'Z'); } } return segments.join(' '); }
    function renderMapLegend() { const legend = document.getElementById('map-legend'); if (!(legend instanceof HTMLElement) || hasRenderedMapLegend) return; legend.innerHTML = ['critical', 'high', 'elevated', 'low'].map((level) => '<span><span class="map-dot" style="background:' + (STATUS_COLORS[level] ?? STATUS_COLORS.unknown) + '"></span>' + level + '</span>').join(''); hasRenderedMapLegend = true; }
    function renderMap() { const map = document.getElementById('analyst-map'); if (!(map instanceof SVGElement)) return; const sortedVisibleRows = getFilteredSortedRegions(); const visibleSlugs = new Set(sortedVisibleRows.map((row) => row.slug)); const visibleGeo = geoRegions.filter((row) => visibleSlugs.has(row.slug)); const mapSignature = getMapSignature(sortedVisibleRows, activeRegionSlug, hoveredRegionSlug); if (visibleGeo.length === 0) { map.innerHTML = ''; lastMapSignature = ''; return; } if (mapSignature === lastMapSignature) return; const bounds = getBoundsFromGeometry(visibleGeo); map.innerHTML = visibleGeo.map((row) => { const isActive = row.slug === activeRegionSlug; const isHovered = row.slug === hoveredRegionSlug; const hasActive = Boolean(activeRegionSlug); const fill = STATUS_COLORS[row.status_band] ?? STATUS_COLORS.unknown; const title = getMapTooltipText(row); return '<path class="map-region' + (isActive ? ' active' : '') + (isHovered && !isActive ? ' hover' : '') + (hasActive && !isActive && !isHovered ? ' dimmed' : '') + '" data-region="' + row.slug + '" data-tooltip="' + title + '" d="' + geometryToPathD(row.geometry, bounds) + '" fill="' + fill + '" stroke="#1a2435" stroke-width="1" cursor="pointer"><title>' + title + '</title></path>'; }).join(''); lastMapSignature = mapSignature; }
    function showMapTooltip(text, x, y) { const tooltip = document.getElementById('map-tooltip'); if (!(tooltip instanceof HTMLElement)) return; tooltip.textContent = text; tooltip.hidden = false; tooltip.style.left = (x + 12) + 'px'; tooltip.style.top = (y + 12) + 'px'; }
    function hideMapTooltip() { const tooltip = document.getElementById('map-tooltip'); if (!(tooltip instanceof HTMLElement)) return; tooltip.hidden = true; }
    function setHoveredRegion(slug) { if (hoveredRegionSlug === slug) return; hoveredRegionSlug = slug; renderRegionsTable(regions); renderMap(); }
    function syncRegionViews() { const visible = getFilteredSortedRegions(); activeRegionSlug = deriveNextActiveRegionSlug(visible.map((row) => row.slug), activeRegionSlug); renderRegionsTable(regions); renderMap(); }
    async function syncRegionViewsAndMaybeLoadDetail(forceRefresh) { const previous = activeRegionSlug; setHoveredRegion(null); syncRegionViews(); if (activeRegionSlug && (forceRefresh || activeRegionSlug !== previous)) await loadRegion(activeRegionSlug, true); }
    function applyLayout() { const mode = getSelectValue('analyst-layout'); const primaryPanel = document.getElementById('primary-panel-layout'); const mapCard = document.getElementById('analyst-map-card'); if (!(primaryPanel instanceof HTMLElement) || !(mapCard instanceof HTMLElement)) return; if (mode === 'split') { primaryPanel.classList.add('split'); mapCard.classList.remove('map-hidden'); } else { primaryPanel.classList.remove('split'); mapCard.classList.add('map-hidden'); } }

    ${getDashboardDataModule()}

    document.getElementById('region-sort').addEventListener('change', () => { void syncRegionViewsAndMaybeLoadDetail(false); });
    document.getElementById('region-sort-direction').addEventListener('change', () => { void syncRegionViewsAndMaybeLoadDetail(false); });
    document.getElementById('region-search').addEventListener('input', () => { void syncRegionViewsAndMaybeLoadDetail(false); });
    document.getElementById('top-movers-only').addEventListener('change', () => { void syncRegionViewsAndMaybeLoadDetail(false); });
    document.getElementById('filter-status-band').addEventListener('change', () => { void syncRegionViewsAndMaybeLoadDetail(false); });
    document.getElementById('filter-confidence-band').addEventListener('change', () => { void syncRegionViewsAndMaybeLoadDetail(false); });
    document.getElementById('filter-freshness-state').addEventListener('change', () => { void syncRegionViewsAndMaybeLoadDetail(false); });
    document.getElementById('filter-evidence-state').addEventListener('change', () => { void syncRegionViewsAndMaybeLoadDetail(false); });
    document.getElementById('analyst-layout').addEventListener('change', () => applyLayout());
    document.getElementById('detail-mode-select').addEventListener('change', (event) => { const target = event.target; if (target instanceof HTMLSelectElement) { detailMode = target.value === 'full' ? 'full' : 'focus'; persistDetailMode(); applyDetailMode(); lastDetailSignature = ''; void loadRegion(activeRegionSlug, true); } });
    document.getElementById('compare-select').addEventListener('change', (event) => { const target = event.target; if (target instanceof HTMLSelectElement) { compareMode = target.value === '24h-ago' ? '24h-ago' : 'previous'; lastDetailSignature = ''; void loadRegion(activeRegionSlug, true); } });
    document.body.addEventListener('mouseover', (event) => { const target = event.target; if (!(target instanceof HTMLElement)) return; const regionNode = target.closest('[data-region]'); if (!(regionNode instanceof HTMLElement)) return; const slug = regionNode.getAttribute('data-region'); if (!slug || slug === activeRegionSlug) return; setHoveredRegion(slug); });
    document.body.addEventListener('mouseout', (event) => { const target = event.target; if (!(target instanceof HTMLElement)) return; const regionNode = target.closest('[data-region]'); if (!(regionNode instanceof HTMLElement)) return; const related = event.relatedTarget; if (related instanceof HTMLElement && related.closest('[data-region]') === regionNode) return; if (hoveredRegionSlug && hoveredRegionSlug !== activeRegionSlug) setHoveredRegion(null); });
    document.body.addEventListener('click', (event) => { const target = event.target; if (!(target instanceof HTMLElement)) return; const pin = target.closest('[data-pin-section]'); if (pin instanceof HTMLElement) { event.preventDefault(); const key = pin.getAttribute('data-pin-section'); if (key) { togglePin(key); lastDetailSignature = ''; void loadRegion(activeRegionSlug, true); } return; } const regionNode = target.closest('[data-region]'); if (!(regionNode instanceof HTMLElement)) return; const slug = regionNode.getAttribute('data-region'); if (!slug) return; event.preventDefault(); setHoveredRegion(null); void loadRegion(slug, true); });
    document.getElementById('analyst-map').addEventListener('mousemove', (event) => { const target = event.target; if (!(target instanceof SVGElement)) return; const path = target.closest('.map-region'); if (!(path instanceof SVGElement)) { hideMapTooltip(); return; } const slug = path.getAttribute('data-region'); if (slug && slug !== activeRegionSlug) setHoveredRegion(slug); const tooltip = path.getAttribute('data-tooltip'); if (!tooltip) { hideMapTooltip(); return; } showMapTooltip(tooltip, event.clientX, event.clientY); });
    document.getElementById('analyst-map').addEventListener('mouseleave', () => { hideMapTooltip(); setHoveredRegion(null); });

    applyLayout();
    void loadDashboard();
    setInterval(() => { void loadDashboard(); }, 30000);
  `;
}
