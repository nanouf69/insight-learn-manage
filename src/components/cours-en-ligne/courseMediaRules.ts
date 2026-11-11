export function courseHttpUrl(input: string): string | null {
  const value = input.trim();
  if (!/^https?:\/\//i.test(value) || /[\u0000-\u0020<>"\\]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

export type CourseVideo = { url: string; kind: 'youtube' | 'vimeo' | 'file'; embed: string };
export function courseVideoUrl(input: string): CourseVideo | null {
  const safe = courseHttpUrl(input);
  if (!safe) return null;
  const url = new URL(safe);
  const host = url.hostname.toLowerCase();
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'].includes(host)) {
    const id = host.endsWith('youtu.be') ? url.pathname.slice(1) : url.pathname === '/watch'
      ? url.searchParams.get('v') : /^\/(?:shorts|embed)\/([\w-]+)\/?$/.exec(url.pathname)?.[1];
    if (!id || !/^[\w-]{11}$/.test(id)) return null;
    return { url: safe, kind: 'youtube', embed: `https://www.youtube-nocookie.com/embed/${id}?autoplay=0` };
  }
  if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)) {
    const id = /^\/(?:video\/)?([0-9]{1,12})\/?$/.exec(url.pathname)?.[1];
    if (!id) return null;
    return { url: safe, kind: 'vimeo', embed: `https://player.vimeo.com/video/${id}?autoplay=0` };
  }
  if (url.protocol === 'https:' && /\.(mp4|webm)$/i.test(url.pathname)) return { url: safe, kind: 'file', embed: safe };
  return null;
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
/** Only generated safe markup is inserted; the existing description is left untouched. */
export function courseMediaMarkup(kind: 'link' | 'video', input: string, label: string): string | null {
  const url = kind === 'video' ? courseVideoUrl(input)?.url : courseHttpUrl(input);
  if (!url || !label.trim()) return null;
  return `<p><a href="${escapeHtml(url)}"${kind === 'video' ? ' data-course-video="1"' : ''} target="_blank" rel="noopener noreferrer">${escapeHtml(label.trim())}</a></p>`;
}