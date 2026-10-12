import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { evaluerEpreuve, LIBELLE_ETAT, moduleEBPourFiliere, type EtatEpreuve } from "@/lib/preuvesExamensBlancs";

const VARIANT: Record<EtatEpreuve, "default" | "secondary" | "destructive" | "outline"> = {
  notee: "default", soumise_correction_manquante: "secondary", soumission_incomplete: "destructive",
  partiellement_soumise: "outline", en_cours: "outline", non_commencee: "outline",
};

/** Admin, lecture seule : preuve de soumission par examen blanc, distincte du statut du module. */
export function PreuvesExamensBlancsCard({ apprenantId, typeApprenant, formationChoisie }: { apprenantId: string; typeApprenant?: string | null; formationChoisie?: string | null }) {
  const { user, loading } = useAuth();
  const userId = !loading ? user?.id ?? null : null;
  const moduleId = moduleEBPourFiliere(typeApprenant, formationChoisie);
  const { data: adminCheck } = useQuery({
    queryKey: ["preuves-eb-admin-role", userId],
    enabled: !!userId && moduleId != null,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId!).eq("role", "admin").maybeSingle();
      if (error) throw error;
      return { userId, admin: !!data };
    },
  });
  // Valable seulement pour le compte qui l'a obtenu : changement de compte / déconnexion = rien affiché ni lu.
  const isAdmin = !!userId && adminCheck?.userId === userId && adminCheck.admin;

  const q = useQuery({
    queryKey: ["preuves-eb", apprenantId, moduleId, userId],
    enabled: isAdmin && moduleId != null,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const db = supabase as any;
      const parc = await fetchAllRows<any>((a, b) => db.from("examens_blancs_parcours").select("module_id, exam_id").eq("module_id", moduleId).order("exam_id").range(a, b));
      const exams: string[] = parc.map((p) => p.exam_id).sort();
      const [rep, notes, v2, comp] = await Promise.all([
        fetchAllRows<any>((a, b) => db.from("reponses_apprenants").select("id, exercice_id, status, reponses, submitted_at").eq("apprenant_id", apprenantId)
          .or(exams.map((e) => `exercice_id.like.${e}__*`).join(",")).order("id").range(a, b)),
        fetchAllRows<any>((a, b) => db.from("apprenant_quiz_results").select("id, quiz_id, matiere_id").eq("apprenant_id", apprenantId).eq("quiz_type", "examen_blanc").in("quiz_id", exams).order("id").range(a, b)),
        fetchAllRows<any>((a, b) => db.from("exam_attempts_v2").select("attempt_id, exam_id, etat, is_test").eq("apprenant_id", apprenantId).in("exam_id", exams).order("attempt_id").range(a, b)),
        db.from("apprenant_module_completion").select("status, completed_at").eq("apprenant_id", apprenantId).eq("module_id", moduleId).maybeSingle(),
      ]);
      if (comp.error) throw comp.error;
      if (exams.length !== 6) throw new Error("parcours EB incomplet");
      const requises = moduleId === 37 || moduleId === 38 ? 2 : 7;
      return { rows: exams.map((ex) => evaluerEpreuve(ex, requises, rep, notes, v2)), comp: comp.data };
    },
  });

  if (moduleId == null || !isAdmin || q.isLoading) return null;
  if (q.isError) return <Card><CardContent className="py-4 text-sm text-destructive">Preuves examens blancs : lecture impossible (erreur de connexion ou de droits), aucune conclusion.</CardContent></Card>;
  const { rows, comp } = q.data!;
  const prouvees = rows.filter((r) => r.prouvee).length;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Preuves des examens blancs (par épreuve)</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm">
          Module {moduleId} — statut enregistré : <b>{comp?.status === "completed" ? "Terminé" : comp?.status ?? "aucun"}</b>
          {" · "}épreuves soumises prouvées : <b>{prouvees}/{rows.length}</b>
          {comp?.status === "completed" && prouvees < rows.length && <span className="text-muted-foreground"> (statut historique conservé, preuve partielle)</span>}
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
        <p className="text-xs text-muted-foreground">Lecture seule. « Note manquante » = épreuve envoyée en attente de correction, pas une épreuve inachevée. Aucune note ni réponse n’est modifiée.</p>
      </CardContent>
    </Card>
  );
}
