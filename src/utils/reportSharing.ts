export function reportLink(protocol: string, pageUrl?: string): string {
  const currentUrl = pageUrl || (typeof window !== 'undefined' && window.location ? window.location.href : 'http://localhost');
  const url = new URL(currentUrl);
  url.search = '';
  url.hash = '';
  url.searchParams.set('relatorio', protocol);
  return url.toString();
}
