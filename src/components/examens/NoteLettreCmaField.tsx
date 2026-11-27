import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";

/** Champ à saisie locale : le parent (page lourde) n'est mis à jour qu'après une pause ou à la sortie du champ. */
export function NoteLettreCmaField({ value, onCommit, delayMs = 500 }: { value: string; onCommit: (v: string) => void; delayMs?: number }) {
  const [local, setLocal] = useState(value);
  const timer = useRef<number | null>(null);
  const focused = useRef(false);
  const latest = useRef(value);
  useEffect(() => { if (!focused.current) { setLocal(value); latest.current = value; } }, [value]);
  useEffect(() => () => { if (timer.current) { window.clearTimeout(timer.current); onCommit(latest.current); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const flush = () => { if (timer.current) { window.clearTimeout(timer.current); timer.current = null; } onCommit(latest.current); };
  return <Textarea rows={3} className="mt-1.5"
    placeholder="Facultatif — cette note apparaît dans la lettre (aperçu, impression et e-mail envoyé à la CMA)."
    value={local}
    onFocus={() => { focused.current = true; }}
    onBlur={() => { focused.current = false; flush(); }}
    onChange={(e) => { const v = e.target.value; setLocal(v); latest.current = v;
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => { timer.current = null; onCommit(latest.current); }, delayMs); }} />;
}
