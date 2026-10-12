import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { evaluerEpreuve, LIBELLE_ETAT, type EtatEpreuve } from "@/lib/preuvesExamensBlancs";

const VARIANT: Record<EtatEpreuve, "default" | "secondary" | "destructive" | "outline"> = {
  notee: "default", soumise_correction_manquante: "secondary", soumission_incomplete: "destructive",
  en_cours: "outline", non_commencee: "outline",
};

/** Admin, lecture seule : preuve de soumission par examen blanc, distincte du statut du module. */
export function PreuvesExamensBlancsCard({ apprenantId }: { apprenantId: string }) {
  const q = useQuery({
    queryKey: ["preuves-eb-admin", apprenantId],
    queryFn: async () => {
      const db = supabase as any;
      const [parc, rep, notes, v2, comp, req] = await Promise.all([
        db.from("examens_blancs_parcours").select("module_id, exam_id"),
        db.from("reponses_apprenants").select("exercice_id, status, reponses, submitted_at").eq("apprenant_id", apprenantId).ilike("exercice_id", "eb%\\_\\_%"),
        db.from("apprenant_quiz_results").select("quiz_id, matiere_id").eq("apprenant_id", apprenantId).eq("quiz_type", "examen_blanc"),
        db.from("exam_attempts_v2").select("exam_id, etat, is_test").eq("apprenant_id", apprenantId),
        db.from("apprenant_module_completion").select("module_id, status, completed_at").eq("apprenant_id", apprenantId).in("module_id", [35, 36, 37, 38]),
        db.rpc("examens_blancs_matieres_requises").then((r: any) => r, () => ({ data: null })),
      ]);
      for (const r of [parc, rep, notes, v2, comp]) if (r.error) throw r.error;
      return { parc: parc.data ?? [], rep: rep.data ?? [], notes: notes.data ?? [], v2: v2.data ?? [], comp: comp.data ?? [], req: req?.data };
    },
  });

  if (q.isLoading) return null;
  if (q.isError) return <Card><CardContent className="py-4 text-sm text-destructive">Preuves examens blancs : lecture impossible (erreur de connexion ou de droits), aucune conclusion.</CardContent></Card>;
  const d = q.data!;
  const modules = [...new Set<number>(d.parc.map((p: any) => p.module_id))].sort();
  const blocs = modules.map((m) => {
    const exams = d.parc.filter((p: any) => p.module_id === m).map((p: any) => p.exam_id).sort();
    const rows = exams.map((ex: string) => {
      const requises = ex.match(/-(ta|va)$/i) ? 2 : 7;
      return evaluerEpreuve(ex, requises, d.rep, d.notes, d.v2);
    });
    return { m, rows, comp: d.comp.find((c: any) => c.module_id === m) };
  }).filter((b) => b.comp || b.rows.some((r) => r.etat !== "non_commencee"));
  if (!blocs.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Preuves des examens blancs (par épreuve)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {blocs.map(({ m, rows, comp }) => {
          const prouvees = rows.filter((r) => r.prouvee).length;
          return (
            <div key={m} className="space-y-2">
              <div className="text-sm">
                Module {m} — statut enregistré : <b>{comp?.status === "completed" ? "Terminé" : comp?.status ?? "aucun"}</b>
                {" · "}épreuves soumises prouvées : <b>{prouvees}/{rows.length}</b>
                {comp?.status === "completed" && prouvees < rows.length && (
                  <span className="text-muted-foreground"> (statut historique conservé, preuve partielle)</span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-left text-muted-foreground"><th className="py-1 pr-2">Épreuve</th><th className="pr-2">État</th><th className="pr-2">Matières notées</th><th className="pr-2">Envoyées non vides</th><th>Envoyées vides</th></tr></thead>
                  <tbody>{rows.map((r) => (
                    <tr key={r.examId} className="border-t border-border">
                      <td className="py-1 pr-2 font-medium">{r.examId}</td>
                      <td className="pr-2"><Badge variant={VARIANT[r.etat]}>{LIBELLE_ETAT[r.etat]}</Badge>{r.v2Terminee && " (V2)"}</td>
                      <td className="pr-2">{r.notees}/{r.requises}</td>
                      <td className="pr-2">{r.soumisesNonVides}/{r.requises}</td>
                      <td>{r.soumisesVides.join(", ") || "—"}</td>
                    </tr>))}</tbody>
                </table>
              </div>
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground">Lecture seule. « Note manquante » = épreuve envoyée en attente de correction, pas une épreuve inachevée. Aucune note ni réponse n’est modifiée.</p>
      </CardContent>
    </Card>
  );
}
