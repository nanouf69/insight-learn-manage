// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { courseHttpUrl, courseVideoUrl, courseMediaMarkup } from '@/components/cours-en-ligne/courseMediaRules';
import { CourseDescription } from '@/components/cours-en-ligne/CourseDescription';
import { CourseMediaActions } from '@/components/cours-en-ligne/CourseMediaActions';
afterEach(cleanup);
describe('course-only safe media', () => {
  it('accepts HTTP/HTTPS links including the quiz example', () => {
    expect(courseHttpUrl('https://auto-grade-quiz.lovable.app')).toBe('https://auto-grade-quiz.lovable.app/');
    expect(courseHttpUrl('http://example.org/quiz')).toBe('http://example.org/quiz');
  });
  it.each(['javascript:alert(1)', 'data:text/html,test', 'ftp://example.org', '//example.org', 'https://user:pass@example.org', 'https://example.org/<iframe>', 'https://example.org\\@evil.org'])('rejects unsafe URL %s', url => expect(courseHttpUrl(url)).toBeNull());
  it('allows exact YouTube host and validated ID only', () => {
    expect(courseVideoUrl('https://youtu.be/dQw4w9WgXcQ')?.embed).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=0');
    expect(courseVideoUrl('https://youtube.com.evil.org/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(courseVideoUrl('https://youtube.com/watch?v=invalid')).toBeNull();
  });
  it('recognizes Vimeo numeric IDs and HTTPS files, never HTTP files', () => {
    expect(courseVideoUrl('https://vimeo.com/123456')?.kind).toBe('vimeo');
    expect(courseVideoUrl('https://vimeo.com/abc')).toBeNull();
    expect(courseVideoUrl('https://example.org/movie.MP4?version=1')?.kind).toBe('file');
    expect(courseVideoUrl('https://example.org/movie.webm')?.kind).toBe('file');
    expect(courseVideoUrl('http://example.org/movie.mp4')).toBeNull();
  });
  it('escapes free labels and retains the entire preexisting description', () => {
    const prior = '<p><strong>Ancien cours</strong></p>';
    const inserted = courseMediaMarkup('link', 'https://example.org', '<img src=x onerror=alert(1)>');
    expect(inserted).toContain('&lt;img');
    const saved = JSON.parse(JSON.stringify({ id: 10, description: prior + inserted }));
    expect(saved.description.slice(0, prior.length)).toBe(prior);
    render(<CourseDescription value={saved.description} />);
    expect(screen.getByRole('link').getAttribute('rel')).toBe('noopener noreferrer');
    expect(document.querySelector('img')).toBeNull();
  });
  it('linkifies old plain URLs only in the display and refuses raw embeds', () => {
    const prior = 'Quiz https://auto-grade-quiz.lovable.app <iframe src="https://evil.org"></iframe><script>alert(1)</script>';
    render(<CourseDescription value={prior} />);
    expect(screen.getByRole('link').getAttribute('href')).toBe('https://auto-grade-quiz.lovable.app/');
    expect(document.querySelector('iframe,script')).toBeNull();
    expect(prior).toContain('<iframe');
  });
  it('never loads a provider before an explicit click and keeps an opening link', () => {
    render(<CourseDescription value={courseMediaMarkup('video', 'https://youtu.be/dQw4w9WgXcQ', 'Vidéo test')} />);
    expect(document.querySelector('iframe')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Vidéo test' }));
    expect(document.querySelector('iframe')?.getAttribute('src')).toContain('autoplay=0');
    expect(screen.getByRole('link', { name: 'Ouvrir la vidéo' }).getAttribute('target')).toBe('_blank');
  });
  it('direct video has controls without autoplay and falls back on failure', () => {
    render(<CourseDescription value={courseMediaMarkup('video', 'https://example.org/test.webm', 'Film')} />);
    fireEvent.click(screen.getByRole('button', { name: 'Film' }));
    const video = document.querySelector('video');
    expect(video?.hasAttribute('controls')).toBe(true);
    expect(video?.hasAttribute('autoplay')).toBe(false);
    if (video) fireEvent.error(video);
    expect(screen.getByRole('status').textContent).toBe('Lecture intégrée indisponible.');
    expect(screen.getByRole('link')).toBeTruthy();
  });
  it('invalid addition does not call persistence or insertion', () => {
    const calls: string[] = [];
    render(<CourseMediaActions onInsert={html => calls.push(html)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter un lien' }));
    fireEvent.change(screen.getByLabelText('URL'), { target: { value: 'javascript:alert(1)' } });
    fireEvent.change(screen.getByLabelText('Libellé'), { target: { value: 'Quiz' } });
    fireEvent.click(screen.getByRole('button', { name: /^Ajouter$/ }));
    expect(calls).toEqual([]);
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});