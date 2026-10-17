export function canonicalAppUrl(href: string): string | null {
  const url = new URL(href);
  if (url.hostname.toLowerCase() !== 'gestion.ftransport.fr.') return null;
  url.hostname = 'gestion.ftransport.fr';
  return url.href;
}