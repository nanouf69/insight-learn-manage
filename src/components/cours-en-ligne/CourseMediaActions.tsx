import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Link, Video } from 'lucide-react';
import { courseMediaMarkup } from './courseMediaRules';

export function CourseMediaActions({ onInsert }: { onInsert: (markup: string) => void }) {
  const [kind, setKind] = useState<'link' | 'video' | null>(null);
  const [url, setUrl] = useState(''); const [label, setLabel] = useState(''); const [error, setError] = useState('');
  const open = (value: 'link' | 'video') => { setKind(value); setUrl(''); setLabel(''); setError(''); };
  const insert = () => {
    if (!kind) return;
    const markup = courseMediaMarkup(kind, url, label);
    if (!markup) { setError(kind === 'video' ? 'Saisissez un libellé et une URL YouTube, Vimeo ou HTTPS MP4/WebM valide.' : 'Saisissez un libellé et une URL HTTP ou HTTPS valide.'); return; }
    onInsert(markup); setKind(null);
  };
  return <>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => open('link')}><Link className="mr-2 h-4 w-4" />Ajouter un lien</Button>
      <Button type="button" variant="outline" size="sm" onClick={() => open('video')}><Video className="mr-2 h-4 w-4" />Ajouter une vidéo</Button>
    </div>
    <Dialog open={kind !== null} onOpenChange={open => { if (!open) setKind(null); }}>
      <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{kind === 'video' ? 'Ajouter une vidéo' : 'Ajouter un lien'}</DialogTitle><DialogDescription>{kind === 'video' ? 'YouTube, Vimeo ou fichier HTTPS MP4/WebM.' : 'Adresse HTTP ou HTTPS.'}</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); insert(); }}>
          <div className="space-y-1"><label htmlFor="course-media-url">URL</label><Input id="course-media-url" value={url} onChange={e => setUrl(e.target.value)} autoFocus inputMode="url" /></div>
          <div className="space-y-1"><label htmlFor="course-media-label">Libellé</label><Input id="course-media-label" value={label} onChange={e => setLabel(e.target.value)} maxLength={500} /></div>
          {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setKind(null)}>Annuler</Button><Button type="submit">Ajouter</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}