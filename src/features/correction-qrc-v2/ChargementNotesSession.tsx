import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { ProgressionNotes } from './chargementNotesSession';
export function ChargementNotesSession({ progression, debut }: { progression: ProgressionNotes; debut: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => { setElapsed(Math.max(0, Math.floor((performance.now() - debut) / 1000))); timer = setTimeout(tick, 1000); };
    tick(); return () => clearTimeout(timer);
  }, [debut]);
  const mesurable = progression.total != null && progression.total > 0 && progression.charges != null;
  const pct = mesurable ? Math.floor(Math.min(1, (progression.charges ?? 0) / (progression.total ?? 1)) * 100) : null;
  return <div className="w-full border border-primary/40 bg-primary/5 rounded-md p-4 space-y-3" aria-live="polite">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="flex items-center gap-2 text-base font-semibold"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin shrink-0" />{progression.etape}</p>
      {progression.charges != null && progression.total != null && <span className="text-sm font-semibold">{progression.charges} / {progression.total}{pct != null ? ` · ${pct} %` : ''}</span>}
    </div>
    <div role="progressbar" aria-label={progression.etape} aria-valuemin={pct != null ? 0 : undefined} aria-valuemax={pct != null ? 100 : undefined} aria-valuenow={pct ?? undefined} className="h-3 w-full overflow-hidden rounded bg-muted">
      {pct != null ? <div className="h-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${pct}%` }} /> : <div className="h-full w-full bg-primary/30 motion-safe:animate-pulse" />}
    </div>
    <p className="text-sm text-muted-foreground">Temps écoulé : {elapsed} s · Temps restant indisponible</p>
  </div>;
}