import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { chargerCalculJalons, formationJalonsElearning } from "@/lib/jalonsPedagogiques";
import { generateReleveJalonsPedagogiquesPdf, type PreuveJalonPdf } from "@/lib/pdf/releve-jalons-pedagogiques";

export function ReleveJalonsPedagogiquesButton({ apprenant }: { apprenant: any }) {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const key = formationJalonsElearning(apprenant?.type_apprenant, apprenant?.formation_choisie);
  const userId = !loading ? user?.id ?? null : null;
  const { data: adminCheck } = useQuery({
    queryKey: ["releve-jalons-admin", userId],
    enabled: !!userId && !!key,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId as string).eq("role", "admin").maybeSingle();
      if (error) throw error;
      return { userId, admin: !!data };
    },
  });
  const isAdmin = !!userId && adminCheck?.userId === userId && adminCheck.admin;
  if (!key || !isAdmin) return null;

  const download = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const stableUserId = userId;
      if (!stableUserId) throw new Error("Accès administrateur requis");
      const { data: role, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", stableUserId).eq("role", "admin").maybeSingle();
      if (roleError) throw roleError;
      if (!role) throw new Error("Accès administrateur requis");
      const [calcul, activities, quizzes, answers, connexions, documents, emails, sessions] = await Promise.all([
        chargerCalculJalons({ apprenantId: apprenant.id, typeApprenant: apprenant.type_apprenant, formationChoisie: apprenant.formation_choisie }),
        supabase.from("apprenant_module_activites").select("occurred_at, action_type, module_id").eq("apprenant_id", apprenant.id).order("occurred_at", { ascending: true }),
        supabase.from("apprenant_quiz_results").select("completed_at, quiz_titre, matiere_nom").eq("apprenant_id", apprenant.id).order("completed_at", { ascending: true }),
        supabase.from("reponses_apprenants").select("updated_at, completed").eq("apprenant_id", apprenant.id).eq("completed", true).order("updated_at", { ascending: true }),
        supabase.from("apprenant_connexions").select("started_at, ended_at, last_action_at").eq("apprenant_id", apprenant.id).order("started_at", { ascending: true }),
        supabase.from("apprenant_documents_completes" as any).select("type_document, completed_at").eq("apprenant_id", apprenant.id).order("completed_at", { ascending: true }),
        supabase.from("emails").select("created_at, sent_at, received_at, type, subject").eq("apprenant_id", apprenant.id).order("created_at", { ascending: true }),
        supabase.from("session_apprenants").select("sessions:session_id(nom, date_debut, date_fin, type_session)").eq("apprenant_id", apprenant.id),
      ]);
      const { data: currentAuth } = await supabase.auth.getUser();
      if (currentAuth.user?.id !== stableUserId) throw new Error("Session administrateur modifiée pendant la lecture");
      for (const result of [activities, quizzes, answers, connexions, documents, emails, sessions]) if (result.error) throw result.error;
      const act = activities.data ?? [], quiz = quizzes.data ?? [], ans = answers.data ?? [], cnx = connexions.data ?? [], docs = (documents.data as any[]) ?? [], mails = emails.data ?? [];
      const preuves: PreuveJalonPdf[] = [
        { label: "Activités pédagogiques datées", count: act.length, dates: act.map((row: any) => row.occurred_at).filter(Boolean), detail: "traces d’activité, sans présumer une lecture intégrale" },
        { label: "Quiz / examens soumis", count: quiz.length, dates: quiz.map((row: any) => row.completed_at).filter(Boolean) },
        { label: "Exercices ou réponses finalisés", count: ans.length, dates: ans.map((row: any) => row.updated_at).filter(Boolean) },
        { label: "Connexions utiles au suivi", count: cnx.length, dates: cnx.map((row: any) => row.started_at).filter(Boolean), detail: "adresses IP exclues du relevé" },
        { label: "Évaluations et documents complétés", count: docs.length, dates: docs.map((row: any) => row.completed_at).filter(Boolean), detail: [...new Set(docs.map((row: any) => row.type_document).filter(Boolean))].join(", ") || "non renseigné" },
        { label: "Accompagnement / relances tracés", count: mails.length, dates: mails.map((row: any) => row.sent_at || row.received_at || row.created_at).filter(Boolean), detail: "existence des échanges uniquement, sans contenu" },
        { label: "Entraînement pratique signé", count: calcul.pratique.minutes > 0 ? 1 : 0, dates: calcul.pratique.dernierePreuve ? [calcul.pratique.dernierePreuve] : [], detail: `${calcul.pratique.minutes} minute(s) justifiée(s) sur 360` },
      ];
      const elementsACompleter = preuves.filter((preuve) => !preuve.count).map((preuve) => `${preuve.label} : non renseigné dans les sources consultées.`);
      const session = ((sessions.data as any[]) ?? []).map((row) => row.sessions).find((value) => value) ?? null;
      generateReleveJalonsPedagogiquesPdf({ apprenant, formationLabel: `${key.toUpperCase()} — e-learning + entraînement pratique présentiel 6 h`, session, calcul, preuves, elementsACompleter });
    } catch (error: any) {
      toast({ title: "Relevé indisponible", description: error?.message || "Impossible de générer le relevé.", variant: "destructive" });
    } finally { setBusy(false); }
  };

  return <Button variant="outline" size="sm" className="gap-2" onClick={download} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Download />}Relevé des jalons pédagogiques</Button>;
}