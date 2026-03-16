# DECISIONS_LOG

> Concise record of major product/architecture posture choices.

## 2026-03-16
- Kept WorldWatch ChatGPT-oriented for internal build/iteration workflows with Lamar + Codex only.
- Chose **not** to ship a public marketing map; internal analyst utility remains the priority.
- Kept table/detail as the primary analyst workflow; map remains secondary context.
- Added deployment posture enforcement so `public_read_only` disables manual cycle triggering.
- Made civilian/public-source posture explicit across product surfaces and policy page.
- Required deterministic explainability as a hard constraint for scoring interpretation.

## 2026-03-16 (recent sprint line)
- Expanded analyst explainability detail to include disagreement groups and factor/source provenance.
- Tightened analyst payload shaping and modularized analyst client rendering to reduce churn and keep behavior explicit.
