# WorldWatch Internal Release Readiness Checklist

Use this checklist before expanding internal trial usage.

## 1) Analyst workflow sanity
- [ ] Region table, feed, and map all load with deterministic ordering.
- [ ] Empty states are actionable (clear filters, run cycle guidance).
- [ ] Detail header shows score posture **and** source-quality cue.
- [ ] Focus mode scan order is followed before full-detail expansion.
- [ ] Pinned sections persist across region switches and can be reset.

## 2) Ops sanity
- [ ] Posture banner is visible at the top of Ops.
- [ ] Manual cycle trigger behavior matches posture restrictions.
- [ ] Latest cycle, runs, failures, and freshness tables all render.
- [ ] Source degradation section clearly separates input health from region risk.

## 3) Source freshness / degradation checks
- [ ] Dashboard rows and feed cards show source-quality cue with deterministic icon/copy.
- [ ] Compare flow shows whether source-quality drag changed between snapshots.
- [ ] Degradation trend deltas (24h vs prior 24h) are present in Ops.
- [ ] Recurring degradation patterns are visible; otherwise explicit no-patterns message is shown.

## 4) Posture + policy visibility
- [ ] Analyst page shows posture banner and About/Usage/Terms access.
- [ ] Ops page shows posture banner and policy footer.
- [ ] About page is reachable from both analyst and ops surfaces.

## 5) Compare / Focus mode sanity under degraded-source conditions
- [ ] Compare highlights include source-quality cue status in latest snapshot.
- [ ] Trust-cue strip shows disagreement/divergence and source-quality drag state for both snapshots.
- [ ] Compare signals table includes source-quality drag changed yes/no.
- [ ] Focus mode still collapses/de-emphasizes sections correctly with pinned sections active.

## 6) Known limitations
- Source-quality cues are heuristic posture aids; they do not replace analyst judgment.
- Snapshot compare relies on available history and can be sparse early in a deployment.
- Map is an internal spatial context aid, not a standalone decision surface.
- This checklist does not alter scoring math; scoring behavior remains canonical.

## 7) Railway deployment readiness
- [ ] Web service starts with `npm run deploy:web` and serves analyst + ops + API only.
- [ ] Scheduler service starts with `npm run deploy:scheduler` and runs recurring cycle execution only.
- [ ] Railway web healthcheck is configured to `GET /healthz` and returns `200` after boot.
- [ ] `DATABASE_URL` is wired from Railway Postgres to both services.
- [ ] `DEPLOYMENT_POSTURE` is explicitly set (recommended first launch: `internal`).
- [ ] Required source endpoint variables are set for all canonical ingestion jobs.
- [ ] `docs/RAILWAY_DEPLOY.md` steps were completed and post-boot verification passed.
