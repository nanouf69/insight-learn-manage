import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { chargerCalculJalons, formationJalonsElearning } from "@/lib/jalonsPedagogiques";
import { generateReleveJalonsPedagogiquesPdf } from "@/lib/pdf/releve-jalons-pedagogiques";
import { chargerPreuvesJalons } from "@/lib/preuvesJalons";
import { GEL_QUERY_KEY, chargerGelReleve, construirePayloadGel, figerReleve, formationTerminee, mentionGel, type PayloadGel } from "@/lib/releveJalonsGel";

async function construireReleveActuel(apprenant: any, key: string): Promise<PayloadGel> {
  const calcul = await chargerCalculJalons({ apprenantId: apprenant.id, typeApprenant: apprenant.type_apprenant, formationChoisie: apprenant.formation_choisie });
  const [preuvesJalons, sessions] = await Promise.all([
    chargerPreuvesJalons({ apprenant, filiere: calcul.filiere, lignesModuleIds: calcul.resultat.lignes.map((l: any) => l.moduleId), completions: calcul.completions as any }),
    supabase.from("session_apprenants").select("sessions:session_id(nom, date_debut, date_fin, type_session)").eq("apprenant_id", apprenant.id),
  ]);
  const elementsACompleter = [
    ...preuvesJalons.sources.filter((s) => !s.lu).map((s) => `${s.libelle} : lecture non possible — les traces de cette source ne sont pas démontrées absentes.`),
    ...(sessions.error ? ["Session : lecture non possible."] : []),
    ...preuvesJalons.synthese.filter((l) => l.traces !== "disponibles").map((l) => `Jalon ${l.moduleId} : ${l.commentaire}`),
  ];
  const session = ((sessions.data as any[]) ?? []).map((row) => row.sessions).find((value) => value) ?? null;
  return construirePayloadGel({ calcul, preuvesJalons, session, elementsACompleter, formationLabel: `${key.toUpperCase()} — e-learning (CPF)` });
}

export function ReleveJalonsPedagogiquesButton({ apprenant }: { apprenant: any }) {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
  const gelQuery = useQuery({
    queryKey: [GEL_QUERY_KEY, apprenant?.id, userId],
    enabled: !!isAdmin && !!key,
    staleTime: 0,
    queryFn: () => chargerGelReleve(apprenant.id),
  });
  if (!key || !isAdmin) return null;

  const verifierAdmin = async () => {
    const stableUserId = userId;
    if (!stableUserId) throw new Error("Accès administrateur requis");
    const { data: role, error: roleError } = await supabase.from("user_roles").select("role").eq("user_id", stableUserId).eq("role", "admin").maybeSingle();
    if (roleError) throw roleError;
    if (!role) throw new Error("Accès administrateur requis");
    return stableUserId;
  };

  const download = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const stableUserId = await verifierAdmin();
      // L'état du gel est relu à chaque export : une lecture en échec bloque l'export (jamais de faux « non figé »).
      const gel = await chargerGelReleve(apprenant.id);
      const payload = gel ? gel.payload : await construireReleveActuel(apprenant, key);
      const { data: currentAuth } = await supabase.auth.getUser();
      if (currentAuth.user?.id !== stableUserId) throw new Error("Session administrateur modifiée pendant la lecture");
      generateReleveJalonsPedagogiquesPdf({ apprenant, formationLabel: payload.formationLabel, session: payload.session, calcul: payload.calcul, preuves: [], preuvesJalons: payload.preuvesJalons, elementsACompleter: payload.elementsACompleter, etatGel: mentionGel(gel, apprenant), generatedAt: gel ? new Date(payload.calculeLe) : undefined });
    } catch (error: any) {
      toast({ title: "Relevé indisponible", description: error?.message || "Impossible de générer le relevé.", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const figer = async () => {
    if (busy) return;
    const motif = window.prompt("Clôture de la formation : le relevé sera FIGÉ définitivement (les futures modifications de questions ne le changeront plus). Motif de clôture :");
    if (motif == null) return;
    setBusy(true);
    try {
      const stableUserId = await verifierAdmin();
      const payload = await construireReleveActuel(apprenant, key);
      const res = await figerReleve({ apprenantId: apprenant.id, payload, motif, adminId: stableUserId });
      await queryClient.invalidateQueries({ queryKey: [GEL_QUERY_KEY, apprenant.id] });
      toast({ title: res.statut === "cree" ? "Relevé figé" : "Relevé déjà figé", description: res.statut === "existant_conserve" ? `La version ${res.gel.version} existante est conservée (aucune réécriture).` : `Version ${res.gel.version} enregistrée et relue sur le serveur.` });
    } catch (error: any) {
      toast({ title: "Clôture non effectuée", description: error?.message || "Le relevé n'a pas été figé.", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const peutFiger = gelQuery.isSuccess && !gelQuery.data && formationTerminee(apprenant);
  return (
    <>
      {peutFiger && <Button variant="outline" size="sm" className="gap-2" onClick={figer} disabled={busy}><Lock />Clôturer et figer le relevé</Button>}
      <Button variant="outline" size="sm" className="gap-2" onClick={download} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Download />}Relevé des jalons pédagogiques</Button>
    </>
  );
}
