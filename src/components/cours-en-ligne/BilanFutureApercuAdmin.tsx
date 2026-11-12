import { useEffect, useState } from "react";
import { BilanMatiereSteps, BilanMatiereCard, BilanQuestionCard, BilanRemiseSummary, NOMS_MATIERES_BILAN } from "./BilanFuturePresentation";
import { Button } from "@/components/ui/button";
import { QuizQuestionSidebar } from "./learnerQuizUi";
import { supabase } from "@/integrations/supabase/client";

type Q = { id: number; enonce: string; image?: string; choix?: { lettre: string; texte: string }[] };
type Matiere = { exercise_id: number; submitted: { correct_count: number; question_count: number } | null; questions: Q[] | null };
export type ApercuFuture = { route: "future" | "legacy"; matieres?: Matiere[] };

const NOMS: Record<number, string> = { 0: "T3P", 1: "Gestion", 2: "Sécurité routière", 3: "Français", 4: "Anglais" };

/** Admin CRM "Vue apprenant": server-side read of the learner's future eligibility. Read error ≠ legacy decision. */
export async function lireApercuFutureAdmin(apprenantId: string, moduleId: number): Promise<ApercuFuture | "erreur"> {
  const { data, error } = await (supabase as any).rpc("bilan_future_admin_apercu", { p_apprenant: apprenantId, p_module: moduleId });
  if (error) return "erreur";
  return data as ApercuFuture;
}

/** Strictly read-only: no receipt, draft, submission or completion is ever written; no answer keys are received. */
export function BilanFutureApercuAdmin({ apercu, presentationVtc = false, titre, description }: { apercu: ApercuFuture; presentationVtc?: boolean; titre?: string; description?: string }) {
  const [ouvert, setOuvert] = useState<number | null>(null);
  useEffect(() => setOuvert(null), [apercu]);
  const m = apercu.matieres?.find((x) => x.exercise_id === ouvert);
  if (presentationVtc) {
    const current = ouvert === null ? 0 : ouvert - 500;
    const matieres = apercu.matieres;
    const selected = matieres?.find(x => x.exercise_id === 500 + current);
    const submitted = NOMS_MATIERES_BILAN.map((_, i) => !!matieres?.find(x => x.exercise_id === 500 + i)?.submitted);
    return <div className="space-y-4">
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">Aperçu administrateur — lecture seule</div>
      <div className="flex flex-col md:flex-row gap-4 lg:gap-6 max-w-[1760px] mx-auto">
        <aside className="md:w-48 lg:w-56 shrink-0 rounded-lg border bg-card p-5 self-start w-full"><h3 className="text-sm font-bold mb-4">Progression</h3><BilanMatiereSteps current={current} submitted={submitted} onSelect={i => setOuvert(500 + i)} /><p className="text-xs text-muted-foreground mt-3">{matieres ? `${submitted.filter(Boolean).length}/5 quiz remis` : "État des remises indisponible"}</p></aside>
        <div className="flex-1 min-w-0 space-y-4">
          <div className="text-center space-y-1"><h2 className="text-2xl font-bold">{titre ?? "Bilan examen VTC"}</h2>{description && <p className="text-muted-foreground text-sm">{description}</p>}</div>
          <div className="grid grid-cols-[minmax(0,1fr)_64px] sm:grid-cols-[minmax(0,1fr)_88px] gap-3 sm:gap-4">
            <BilanMatiereCard nom={NOMS_MATIERES_BILAN[current]}>
              <p className="text-sm text-muted-foreground">{selected?.questions ? `${selected.questions.length} questions` : "Questions indisponibles"} — {selected ? selected.submitted ? "Remis" : "Non remis" : "État de remise indisponible"}</p>
              {selected?.questions?.map((q, i) => <BilanQuestionCard key={q.id} question={q} index={i} disabled anchor={`apercu-bilan-${q.id}`} />)}
              {selected?.submitted && <BilanRemiseSummary correct={selected.submitted.correct_count} total={selected.submitted.question_count} />}
            </BilanMatiereCard>
            <QuizQuestionSidebar items={(selected?.questions ?? []).map(q => ({ key: q.id, answered: false, wrong: false }))} onJump={i => { const q = selected?.questions?.[i]; if (q) document.getElementById(`apercu-bilan-${q.id}`)?.scrollIntoView({ block: "start" }); }} />
          </div>
          <div className="flex items-center justify-between gap-2"><Button variant="outline" disabled={current === 0} onClick={() => setOuvert(500 + current - 1)}>Précédent</Button><span className="text-sm">{current + 1}/5</span><Button variant="outline" disabled={current === 4} onClick={() => setOuvert(500 + current + 1)}>Suivant</Button></div>
        </div>
      </div>
    </div>;
  }
  return (
    <div className="p-4 space-y-4">
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
        Aperçu administrateur en lecture seule du nouveau Bilan : aucune réponse ne peut être saisie ni enregistrée ici.
      </div>
      {!m ? (
        <ul className="space-y-2">
          {(apercu.matieres ?? []).map((x) => (
            <li key={x.exercise_id}>
              <button className="w-full text-left rounded-lg border p-3 hover:bg-muted" onClick={() => setOuvert(x.exercise_id)}>
                <span className="font-semibold">{NOMS[x.exercise_id % 100] ?? x.exercise_id}</span>
                <span className="ml-2 text-muted-foreground">{x.questions?.length ?? 0} questions</span>
                <span className="ml-2">{x.submitted ? `— remis ${x.submitted.correct_count}/${x.submitted.question_count}` : "— non remis"}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="space-y-4">
          <button className="underline text-sm" onClick={() => setOuvert(null)}>← Retour aux matières</button>
          <h3 className="text-lg font-semibold">{NOMS[m.exercise_id % 100]} — {m.questions?.length ?? 0} questions</h3>
          {(m.questions ?? []).map((q, i) => (
            <div key={q.id} data-learner-question className="rounded-lg border p-4 space-y-2">
              <p className="font-medium">Q{i + 1}. {q.enonce}</p>
              {q.image && <img src={q.image} alt={`Illustration question ${i + 1}`} className="max-h-64 rounded" loading="lazy" />}
              <ul className="space-y-1">
                {(q.choix ?? []).map((c) => (
                  <li key={c.lettre} className="flex gap-2"><input type="checkbox" disabled aria-label={c.lettre} /> {c.lettre}. {c.texte}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
