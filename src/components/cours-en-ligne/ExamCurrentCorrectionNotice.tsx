import type { Question } from "./examens-blancs-data";
import { currentCorrectionFor, type ExamCurrentCorrection } from "@/lib/examCurrentCorrection";

export function ExamCurrentCorrectionNotice({source, examId, subject, frozen}: {source: ExamCurrentCorrection | null; examId: string; subject: string; frozen: Question}) {
  const correction = currentCorrectionFor(source, examId, subject, frozen);
  if (!correction) return null;
  const {current, savedAt, contentChanged} = correction;
  return <aside aria-label="Corrigé administrateur actuel" className="mt-2 space-y-1 rounded-md border border-primary bg-primary/5 p-3 text-sm">
    <p className="font-semibold">Corrigé administrateur actuel</p>
    {current.enonce !== frozen.enonce && <p className="whitespace-pre-wrap">{current.enonce}</p>}
    {(current.choix ?? []).filter(c => c.correct).map(c => <p key={c.lettre} className="font-semibold text-primary">{c.lettre} — {c.texte}</p>)}
    <p className="text-xs text-muted-foreground">Enregistré le {new Date(savedAt).toLocaleString("fr-FR", {timeZone: "Europe/Paris"})}. Réponse remise et note du passage inchangées.</p>
    {contentChanged && <p className="text-xs text-muted-foreground">Énoncé ou propositions modifiés : l’ancienne sélection n’est pas réinterprétée avec ce nouveau texte.</p>}
  </aside>;
}