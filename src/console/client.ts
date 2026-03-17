export function getOpsConsoleClientScript(): string {
  return String.raw`
    const endpointMap = {
      summary: '/api/ops/summary',
      latest: '/api/ops/cycle/latest',
      cycleRuns: '/api/ops/cycles?limit=20',
      sourceRuns: '/api/ops/sources/runs?limit=50',
      freshness: '/api/ops/source-freshness',
      failures: '/api/ops/failures?limit=20'
    };

    const timeFmt = new Intl.DateTimeFormat('en', { dateStyle: 'short', timeStyle: 'medium' });

    function formatTimestamp(value) {
      if (!value) return '-';
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? String(value) : timeFmt.format(date);
    }

    function formatMs(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
      if (value < 1000) return value + 'ms';
      return (value / 1000).toFixed(1) + 's';
    }

    function renderTable(id, rows, columns) {
      const table = document.getElementById(id);
      if (!Array.isArray(rows) || rows.length === 0) {
        table.innerHTML = '<tr><td>No data</td></tr>';
        return;
      }

      const header = '<tr>' + columns.map((col) => '<th>' + col.header + '</th>').join('') + '</tr>';
      const body = rows.map((row) => {
        const cells = columns.map((col) => {
          const raw = row[col.key];
          const value = col.render ? col.render(raw, row) : raw;
          return '<td>' + String(value ?? '') + '</td>';
        }).join('');
        return '<tr>' + cells + '</tr>';
      }).join('');

      table.innerHTML = header + body;
    }

    function renderLatestCycle(latestCycle) {
      const fallback = latestCycle && latestCycle.error ? latestCycle.error : 'No cycle runs yet';
      if (!latestCycle || latestCycle.error) {
        document.getElementById('latest-cycle-card').innerHTML = '<p>' + fallback + '</p>';
        return;
      }

      document.getElementById('latest-cycle-card').innerHTML = [
        '<p><strong>Status:</strong> ' + latestCycle.status + '</p>',
        '<p><strong>Started:</strong> ' + formatTimestamp(latestCycle.started_at) + '</p>',
        '<p><strong>Finished:</strong> ' + formatTimestamp(latestCycle.finished_at) + '</p>',
        '<p><strong>Duration:</strong> ' + formatMs(latestCycle.duration_ms) + '</p>',
        '<p><strong>Records:</strong> ' + (latestCycle.records_processed ?? 0) + '</p>'
      ].join('');
    }

    async function fetchJson(url, fallback) {
      const response = await fetch(url);
      if (!response.ok) {
        if (fallback !== undefined) return fallback;
        throw new Error('Request failed: ' + url);
      }
      return response.json();
    }

    async function loadOps() {
      const [summary, latest, cycleRuns, sourceRuns, freshness, failures] = await Promise.all([
        fetchJson(endpointMap.summary, {}),
        fetchJson(endpointMap.latest, { error: 'No cycle runs yet' }),
        fetchJson(endpointMap.cycleRuns, []),
        fetchJson(endpointMap.sourceRuns, []),
        fetchJson(endpointMap.freshness, []),
        fetchJson(endpointMap.failures, [])
      ]);

      renderLatestCycle(latest);
      const opsSummaryEl = document.getElementById('ops-summary');
      if (opsSummaryEl) {
        const compactSummary = {
          status: summary?.latest_cycle?.status ?? 'unknown',
          stale_source_count: summary?.stale_source_count ?? 0,
          recent_failure_count: summary?.recent_failure_count ?? 0,
          source_degradation: summary?.source_degradation ?? null,
        };
        opsSummaryEl.textContent = JSON.stringify(compactSummary, null, 2);
      }

      renderTable('cycle-runs-table', cycleRuns, [
        { key: 'started_at', header: 'Started', render: (v) => formatTimestamp(v) },
        { key: 'status', header: 'Status' },
        { key: 'duration_ms', header: 'Duration', render: (v) => formatMs(v) },
        { key: 'records_processed', header: 'Records' },
        { key: 'regions_scored', header: 'Regions' },
        { key: 'alerts_generated', header: 'Alerts' },
        { key: 'failed_jobs', header: 'Failed jobs' },
      ]);

      renderTable('source-runs-table', sourceRuns, [
        { key: 'started_at', header: 'Started', render: (v) => formatTimestamp(v) },
        { key: 'source_name', header: 'Source' },
        { key: 'status', header: 'Status' },
        { key: 'duration_ms', header: 'Duration', render: (v) => formatMs(v) },
        { key: 'records_processed', header: 'Records' },
        { key: 'mapped_regions', header: 'Mapped regions' },
        { key: 'inserted_signals', header: 'Inserted signals' },
        { key: 'error_message', header: 'Error' },
      ]);

      renderTable('freshness-table', freshness, [
        { key: 'source_name', header: 'Source' },
        { key: 'last_success_at', header: 'Last success', render: (v) => formatTimestamp(v) },
        { key: 'minutes_since_last_success', header: 'Minutes ago' },
        { key: 'freshness_minutes', header: 'Freshness window' },
        { key: 'stale', header: 'Stale' },
      ]);

      const sourceDegradationRows = Array.isArray(summary?.source_degradation?.recurring_patterns)
        ? summary.source_degradation.recurring_patterns
        : [];

      renderTable('source-degradation-table', sourceDegradationRows, [
        { key: 'source_name', header: 'Source' },
        { key: 'pattern', header: 'Pattern' },
        { key: 'stale', header: 'Stale' },
        { key: 'consecutive_failures', header: 'Consecutive failures' },
        { key: 'failures_24h', header: 'Failures 24h' },
        { key: 'latest_success_age_minutes', header: 'Minutes since last success' },
      ]);

      const sourceTrendEl = document.getElementById('source-degradation-trends');
      if (sourceTrendEl) {
        const trend = summary?.source_degradation ?? {};
        sourceTrendEl.innerHTML = [
          '<p><strong>Stale sources (24h):</strong> ' + String(trend.stale_source_count_24h ?? 0) + ' (Δ ' + String(trend.stale_source_count_delta_24h ?? 0) + ' vs prior 24h)</p>',
          '<p><strong>Source failures (24h):</strong> ' + String(trend.source_failures_24h ?? 0) + ' (Δ ' + String(trend.source_failures_delta_24h ?? 0) + ' vs prior 24h)</p>'
        ].join('');
      }

      renderTable('failures-table', failures, [
        { key: 'started_at', header: 'Started', render: (v) => formatTimestamp(v) },
        { key: 'job_type', header: 'Type' },
        { key: 'job_name', header: 'Job' },
        { key: 'status', header: 'Status' },
        { key: 'error_message', header: 'Error' },
      ]);

    }

    const triggerEl = document.getElementById('trigger');

    if (triggerEl) {
      triggerEl.addEventListener('click', async () => {
        const statusEl = document.getElementById('trigger-status');
        const disabledByPosture = triggerEl.getAttribute('data-manual-trigger-disabled') === 'true';
        if (disabledByPosture || triggerEl.disabled) {
          statusEl.textContent = 'disabled by deployment posture';
          return;
        }

        statusEl.textContent = 'running...';
        const response = await fetch('/api/ops/cycle/run', { method: 'POST' });

        if (response.ok) {
          statusEl.textContent = 'done';
        } else {
          let message = 'error';
          try {
            const payload = await response.json();
            if (payload && typeof payload.message === 'string') {
              message = payload.message;
            }
          } catch {
            message = 'error';
          }
          statusEl.textContent = message;
        }

        await loadOps();
      });
    }

    void loadOps();
    setInterval(loadOps, 30000);
  `;
}
