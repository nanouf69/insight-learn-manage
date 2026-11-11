import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Play } from 'lucide-react';
import { courseHttpUrl, courseVideoUrl } from './courseMediaRules';

function Video({ url, label }: { url: string; label: string }) {
  const video = courseVideoUrl(url);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!video) return <span>{label}</span>;
  return <section className="my-3 space-y-2" aria-label={label}>
    {!loaded ? <Button type="button" variant="outline" className="max-w-full h-auto whitespace-normal gap-2" onClick={() => setLoaded(true)}><Play className="h-4 w-4 shrink-0" />{label}</Button>
      : !failed && (video.kind === 'file'
        ? <video className="w-full aspect-video bg-muted" controls preload="none" src={video.embed} aria-label={label} onError={() => setFailed(true)} />
        : <iframe className="w-full aspect-video border-0" src={video.embed} title={label} loading="lazy" allow="fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" onError={() => setFailed(true)} />)}
    {failed && <p role="status">Lecture intégrée indisponible.</p>}
    <a className="text-primary underline inline-flex items-center gap-1 break-all" href={video.url} target="_blank" rel="noopener noreferrer">Ouvrir la vidéo<ExternalLink className="h-3 w-3 shrink-0" /></a>
  </section>;
}

function linkify(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []; let start = 0;
  for (const match of text.matchAll(/https?:\/\/[^\s<>"\u0000-\u001f]+/gi)) {
    const at = match.index ?? 0;
    const value = match[0].replace(/[.,;!?)\]]+$/, '');
    const url = courseHttpUrl(value);
    nodes.push(text.slice(start, at));
    nodes.push(url ? <a key={at} href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">{value}</a> : value);
    start = at + value.length;
  }
  nodes.push(text.slice(start)); return nodes;
}

/** Course-only HTML projection. Never inject arbitrary HTML or alter stored descriptions. */
export function CourseDescription({ value }: { value?: string | null }) {
  const content = useMemo(() => {
    const doc = new DOMParser().parseFromString(value ?? '', 'text/html');
    const render = (node: Node, key: string, inLink = false): React.ReactNode => {
      if (node.nodeType === Node.TEXT_NODE) return inLink ? node.textContent : linkify(node.textContent ?? '');
      if (!(node instanceof Element)) return null;
      const tag = node.tagName.toLowerCase();
      if (['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'video', 'audio'].includes(tag)) return null;
      const label = node.textContent ?? '';
      if (tag === 'a') {
        const href = courseHttpUrl(node.getAttribute('href') ?? '');
        if (!href) return <span key={key}>{label}</span>;
        if (node.getAttribute('data-course-video') === '1') return <Video key={key + href} url={href} label={label} />;
        return <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">{Array.from(node.childNodes).map((n, i) => render(n, `${key}-${i}`, true))}</a>;
      }
      const children = Array.from(node.childNodes).map((n, i) => render(n, `${key}-${i}`, inLink));
      if (!['p', 'div', 'span', 'b', 'strong', 'i', 'em', 'u', 's', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'font'].includes(tag)) return <React.Fragment key={key}>{children}</React.Fragment>;
      // Preserve author-selected text formatting only; never background URLs or layout styles.
      const style: React.CSSProperties = {};
      const source = (node as HTMLElement).style;
      const color = source.color || node.getAttribute('color');
      if (color && /^(#[\da-f]{3,8}|[a-z]+|rgba?\([\d\s.,%]+\))$/i.test(color)) style.color = color;
      if (/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)$/.test(source.fontSize)) style.fontSize = source.fontSize;
      if (['bold', 'normal', '400', '700'].includes(source.fontWeight)) style.fontWeight = source.fontWeight;
      if (['italic', 'normal'].includes(source.fontStyle)) style.fontStyle = source.fontStyle;
      if (['underline', 'line-through', 'none'].includes(source.textDecoration)) style.textDecoration = source.textDecoration;
      const renderedTag = tag === 'font' ? 'span' : tag === 'p' && node.querySelector('a[data-course-video="1"]') ? 'div' : tag;
      return React.createElement(renderedTag, { key, style }, tag === 'br' ? undefined : children);
    };
    return Array.from(doc.body.childNodes).map((n, i) => render(n, String(i)));
  }, [value]);
  return <div className="text-sm whitespace-pre-line leading-relaxed mt-2 break-words max-w-full">{content}</div>;
}