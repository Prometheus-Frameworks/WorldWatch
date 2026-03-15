export interface TriageNote {
  title: string;
  copy: string;
}

export interface TriageInput {
  composite_score: number;
  status_band: string;
  confidence_band: string;
  freshness_state: string;
  delta_24h: number;
  delta_7d: number;
}

export interface TriageSpotlight {
  slug: string;
  name: string;
  notes: TriageNote[];
}

export function deriveTriageNotes(input: TriageInput): TriageNote[] {
  const notes: TriageNote[] = [];

  if (Number.isFinite(input.delta_24h) && input.delta_24h >= 7) {
    notes.push({
      title: 'Top mover (24h)',
      copy: 'Rapid daily movement detected. Prioritize validation of newest factor inputs.',
    });
  }

  if (Number.isFinite(input.delta_7d) && input.delta_7d >= 12) {
    notes.push({
      title: 'Sustained weekly acceleration',
      copy: '7-day trend remains elevated. Check whether pressure is broad-based or source-specific.',
    });
  }

  if ((input.status_band === 'high' || input.status_band === 'critical') && input.freshness_state !== 'fresh') {
    notes.push({
      title: 'Stale high-risk pattern',
      copy: 'Risk is high but freshness is degraded. Consider source rerun or analyst verification.',
    });
  }

  if (input.composite_score >= 70 && input.confidence_band === 'low') {
    notes.push({
      title: 'High risk with low confidence',
      copy: 'Elevated score and lower confidence suggest careful human review before escalation.',
    });
  }

  if (notes.length === 0) {
    notes.push({
      title: 'No immediate triage flags',
      copy: 'Current region mix is comparatively stable. Continue normal monitoring cadence.',
    });
  }

  return notes.slice(0, 3);
}

export function toTriageInput(region: Partial<TriageInput>): TriageInput {
  return {
    composite_score: Number(region.composite_score ?? 0),
    status_band: String(region.status_band ?? ''),
    confidence_band: String(region.confidence_band ?? ''),
    freshness_state: String(region.freshness_state ?? ''),
    delta_24h: Number(region.delta_24h ?? 0),
    delta_7d: Number(region.delta_7d ?? 0),
  };
}

export function buildTriageSpotlight(regions: Array<{ slug: string; name: string } & Partial<TriageInput>>): TriageSpotlight[] {
  const sorted = [...regions].sort((a, b) => Number(b.composite_score ?? 0) - Number(a.composite_score ?? 0));
  return sorted.slice(0, 5).map((region) => ({
    slug: region.slug,
    name: region.name,
    notes: deriveTriageNotes(toTriageInput(region)),
  }));
}
