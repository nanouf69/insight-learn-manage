import { useEffect, useState } from "react";
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
export function BilanFutureApercuAdmin({ apercu }: { apercu: ApercuFuture }) {
  const [ouvert, setOuvert] = useState<number | null>(null);
  useEffect(() => setOuvert(null), [apercu]);
  const m = apercu.matieres?.find((x) => x.exercise_id === ouvert);
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
