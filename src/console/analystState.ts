export function deriveNextActiveRegionSlug(visibleSlugs: string[], activeRegionSlug: string | null): string | null {
  if (activeRegionSlug && visibleSlugs.includes(activeRegionSlug)) {
    return activeRegionSlug;
  }

  return visibleSlugs[0] ?? null;
}
