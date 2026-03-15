export const DEPLOYMENT_POSTURES = ['internal', 'invite_only', 'public_read_only'] as const;

export type DeploymentPosture = (typeof DEPLOYMENT_POSTURES)[number];

export interface DeploymentPostureConfig {
  posture: DeploymentPosture;
  bannerText: string;
  subtitleText: string;
}

export function isReadOnlyPosture(config: DeploymentPostureConfig): boolean {
  return config.posture === 'public_read_only';
}

const DEFAULT_COPY: Record<DeploymentPosture, { banner: string; subtitle: string }> = {
  internal: {
    banner: 'Internal-only workspace',
    subtitle: 'For internal analyst and operations workflows only.',
  },
  invite_only: {
    banner: 'Invite-only analyst workspace',
    subtitle: 'Access is controlled for approved civilian public-source monitoring users.',
  },
  public_read_only: {
    banner: 'Public read-only posture',
    subtitle: 'Read-only visibility for civilian public-source monitoring outputs.',
  },
};

export function parseDeploymentPosture(value: string | undefined): DeploymentPosture {
  if (!value) return 'internal';
  return DEPLOYMENT_POSTURES.includes(value as DeploymentPosture) ? (value as DeploymentPosture) : 'internal';
}

export function getDeploymentPostureConfig(env: NodeJS.ProcessEnv = process.env): DeploymentPostureConfig {
  const posture = parseDeploymentPosture(env.DEPLOYMENT_POSTURE);
  const defaults = DEFAULT_COPY[posture];
  const bannerText = readOptional(env.DEPLOYMENT_BANNER_TEXT) ?? defaults.banner;
  const subtitleText = readOptional(env.DEPLOYMENT_SUBTITLE_TEXT) ?? defaults.subtitle;
  return { posture, bannerText, subtitleText };
}

export function renderPostureBannerHtml(config: DeploymentPostureConfig): string {
  const label = config.posture.replace('_', ' ');
  return `<section class="posture-banner posture-${config.posture}" role="status" aria-live="polite"><p class="posture-title"><strong>Deployment posture:</strong> ${label}</p><p class="posture-copy"><strong>${config.bannerText}</strong> ${config.subtitleText}</p></section>`;
}

function readOptional(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
