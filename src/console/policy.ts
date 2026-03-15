export const CIVILIAN_USE_STATEMENT = 'WorldWatch is a civilian, public-source monitoring and analysis tool for personal, research, journalistic, and general geopolitical awareness use. It is not intended for military targeting, covert surveillance, sanctions evasion, or use by prohibited persons or entities.';

export const ACCEPTABLE_USE_STATEMENT = 'You may not use WorldWatch to support military targeting, kinetic operations, covert surveillance, sanctions evasion, unlawful export activity, or access by prohibited persons or entities. WorldWatch is intended for lawful public-source monitoring and analysis only.';

export function renderPolicyPanelHtml(title = 'About / Usage / Terms'): string {
  return `<section class="card policy-card"><h2>${title}</h2><p>${CIVILIAN_USE_STATEMENT}</p><p>${ACCEPTABLE_USE_STATEMENT}</p></section>`;
}

export function renderPolicyFooterHtml(): string {
  return `<footer class="policy-footer"><p>${CIVILIAN_USE_STATEMENT}</p></footer>`;
}
