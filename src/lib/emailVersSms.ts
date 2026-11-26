export const SMS_MAX_CARACTERES = 480;

export function mobileSmsFrancais(raw: string): string | null {
  let n = raw.replace(/[\s.\-()]/g, '');
  if (n.startsWith('0033')) n = '+33' + n.slice(4);
  else if (n.startsWith('33') && n.length === 11) n = '+' + n;
  else if (n.startsWith('0')) n = '+33' + n.slice(1);
  return /^\+33[67]\d{8}$/.test(n) ? n : null;
}

/** Plain-text projection only; the original email is never changed. */
export function texteEmailPourSms(html: string, subject = ''): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,img').forEach(n => n.remove());
  doc.querySelectorAll('a').forEach(a => {
    const href = a.getAttribute('href') ?? '';
    if (/^https?:\/\//i.test(href) && !a.textContent?.includes(href)) a.append(` ${href}`);
  });
  doc.querySelectorAll('br').forEach(n => n.replaceWith('\n'));
  doc.querySelectorAll('p,div,li,tr,h1,h2,h3').forEach(n => n.append('\n'));
  const text = (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
  return [subject.trim(), text].filter(Boolean).join(' : ');
}

/** Explicitly requested shortening; every complete URL is retained. */
export function reduireEmailSms(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= SMS_MAX_CARACTERES) return compact;
  const links = [...new Set(compact.match(/https?:\/\/[^\s]+/g) ?? [])];
  const suffix = links.length ? ` ${links.join(' ')}` : '';
  const budget = SMS_MAX_CARACTERES - suffix.length - 3;
  if (budget < 1) return compact; // Never silently damage a long link.
  const prose = compact.replace(/https?:\/\/[^\s]+/g, '').replace(/\s+/g, ' ').trim();
  const prefix = prose.slice(0, budget).replace(/\s+\S*$/, '').trim() || prose.slice(0, budget);
  return `${prefix}...${suffix}`;
}