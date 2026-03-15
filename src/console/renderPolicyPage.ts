import type { DeploymentPostureConfig } from './posture.ts';
import { renderPostureBannerHtml } from './posture.ts';
import { ACCEPTABLE_USE_STATEMENT, CIVILIAN_USE_STATEMENT } from './policy.ts';

export function renderPolicyPage(posture: DeploymentPostureConfig): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WorldWatch About / Usage / Terms</title>
  <style>
    body { font-family: Inter, system-ui, sans-serif; margin: 16px; background: #12161d; color: #e6e8ec; }
    a { color: #84c7ff; }
    .card { border: 1px solid #364153; border-radius: 6px; padding: 12px; background: #1a202a; margin-bottom: 12px; max-width: 920px; }
    .posture-banner { border: 1px solid #4d6d95; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; background: #142033; max-width: 920px; }
    .posture-banner p { margin: 2px 0; }
    .posture-title { font-size: 12px; color: #9eb7d8; text-transform: uppercase; letter-spacing: 0.04em; }
    .posture-copy { font-size: 13px; }
    h1, h2 { margin: 0 0 8px; }
    p { line-height: 1.45; }
  </style>
</head>
<body>
  ${renderPostureBannerHtml(posture)}

  <section class="card">
    <h1>WorldWatch About / Usage / Terms</h1>
    <p><a href="/">Back to analyst dashboard</a> · <a href="/ops">Open ops console</a></p>
    <h2>Civilian public-source use</h2>
    <p>${CIVILIAN_USE_STATEMENT}</p>
    <h2>Acceptable use</h2>
    <p>${ACCEPTABLE_USE_STATEMENT}</p>
  </section>
</body>
</html>`;
}
