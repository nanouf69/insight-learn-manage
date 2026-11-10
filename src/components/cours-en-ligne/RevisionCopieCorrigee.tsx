import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { lireSourcesCopies, questionsARefaire, type CorrigeSource, type SourceType } from "@/lib/corrigesSources";
import { CORRIGES_TROIS_SURFACES_ACTIFS } from "@/lib/corrigesSourcesActivation";
import { RevisionCorrigeVersionnee, type QuestionNonRapprochee } from "./RevisionCorrigeVersionnee";

type Copie = {type: SourceType; id: string};
type Lecture = {refaire: CorrigeSource[]; non: QuestionNonRapprochee[]} | "erreur" | null;

/**
 * Generic adapter (EB, historical Bilan snapshot, future Bilan receipt): questions to redo are the
 * proven questions whose submitted answer is wrong under the CURRENT official key; unproven ones are
 * listed with their reason, never guessed. Read-only until the learner saves a revision answer.
 */
export function RevisionCopieCorrigee({owner, copies, titre = "Refaire les fausses avec le corrigé actuel"}: {owner: string; copies: Copie[]; titre?: string}) {
  const [ouvert, setOuvert] = useState(false);
  const [lecture, setLecture] = useState<Lecture>(null);
  const cle = JSON.stringify(copies);
  useEffect(() => {
    if (!ouvert || !CORRIGES_TROIS_SURFACES_ACTIFS) return;
    let vivant = true; setLecture(null);
    lireSourcesCopies(copies).then(r => {
      if (!vivant) return;
      const {refaire, nonRapprochees} = questionsARefaire(r.questions.values());
      setLecture({refaire, non: [
        ...r.copies.map(c => ({libelle: `${c.exam_id} (copie entière)`, raison: c.raison})),
        ...r.inaccessibles.map(c => ({libelle: `copie ${c.id.slice(0, 8)}`, raison: null})),
        ...nonRapprochees.map(s => ({libelle: `${s.exam_id} · question ${s.position ?? s.question_id}`, raison: s.raison ?? null})),
      ]});
    }).catch(() => { if (vivant) setLecture("erreur"); });
    return () => { vivant = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert, cle]);
  const refs = useMemo(() => lecture && lecture !== "erreur" ? lecture.refaire.map(s => ({type: s.source_type, id: s.source_id, question: s.question_id})) : [], [lecture]);
  if (!CORRIGES_TROIS_SURFACES_ACTIFS || copies.length === 0) return null;
  if (!ouvert) return <Button variant="outline" onClick={() => setOuvert(true)}>{titre}</Button>;
  return <div className="rounded-lg border border-border p-4 space-y-3">
    {lecture === null && <p>Lecture du corrigé officiel…</p>}
    {lecture === "erreur" && <p role="alert" className="text-destructive">Révision suspendue : le corrigé actuel n’est pas confirmé. Rien n’a été enregistré.</p>}
    {lecture && lecture !== "erreur" && <RevisionCorrigeVersionnee owner={owner} refs={refs} nonRapprochees={lecture.non} onExit={() => setOuvert(false)}/>}
    {lecture !== null && <Button variant="ghost" onClick={() => setOuvert(false)}>Fermer</Button>}
  </div>;
}
