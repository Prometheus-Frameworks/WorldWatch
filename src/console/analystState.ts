export function deriveNextActiveRegionSlug(visibleSlugs: string[], activeRegionSlug: string | null): string | null {
  if (activeRegionSlug && visibleSlugs.includes(activeRegionSlug)) {
    return activeRegionSlug;
  }

  return visibleSlugs[0] ?? null;
}

export function deriveNextHoveredRegionSlug(
  visibleSlugs: string[],
  activeRegionSlug: string | null,
  hoveredRegionSlug: string | null,
): string | null {
  if (!hoveredRegionSlug) {
    return null;
  }

  if (hoveredRegionSlug === activeRegionSlug) {
    return null;
  }

  return visibleSlugs.includes(hoveredRegionSlug) ? hoveredRegionSlug : null;
}
