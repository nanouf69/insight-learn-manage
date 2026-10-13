import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { chargerCalculJalons, formationJalonsElearning } from "@/lib/jalonsPedagogiques";
import { generateReleveJalonsPedagogiquesPdf } from "@/lib/pdf/releve-jalons-pedagogiques";
import { chargerPreuvesJalons } from "@/lib/preuvesJalons";
import { chargerEtatGel, mentionGel, type GelFinAcces } from "@/lib/releveJalonsGel";

async function construireReleve(apprenant: any, key: string, gel: GelFinAcces | null) {
  const calcul = await chargerCalculJalons({ apprenantId: apprenant.id, typeApprenant: apprenant.type_apprenant, formationChoisie: apprenant.formation_choisie, gel });
  const [preuvesJalons, sessions] = await Promise.all([
    chargerPreuvesJalons({ apprenant, filiere: calcul.filiere, lignesModuleIds: calcul.resultat.lignes.map((l: any) => l.moduleId), completions: calcul.completions as any, gel }),
    gel
      ? Promise.resolve(Array.isArray((gel.sources as any).sessions) ? { data: (gel.sources as any).sessions, error: null } : { data: null, error: { message: "non archivée" } })
      : supabase.from("session_apprenants").select("sessions:session_id(nom, date_debut, date_fin, type_session)").eq("apprenant_id", apprenant.id),
  ]);
  const elementsACompleter = [
    ...preuvesJalons.sources.filter((s) => !s.lu).map((s) => `${s.libelle} : lecture non possible — les traces de cette source ne sont pas démontrées absentes.`),
    ...(sessions.error ? ["Session : lecture non possible."] : []),
    ...preuvesJalons.synthese.filter((l) => l.traces !== "disponibles").map((l) => `Jalon ${l.moduleId} : ${l.commentaire}`),
  ];
  const session = ((sessions.data as any[]) ?? []).map((row) => row.sessions).find((value) => value) ?? null;
  return { calcul, preuvesJalons, session, elementsACompleter, formationLabel: `${key.toUpperCase()} — e-learning (CPF)` };
}

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
      const etat = await chargerEtatGel(apprenant.id);
      if (etat.etat === "en_attente") throw new Error(mentionGel(etat));
      const payload = await construireReleve(apprenant, key, etat.etat === "fige" ? etat.gel : null);
      const { data: currentAuth } = await supabase.auth.getUser();
      if (currentAuth.user?.id !== stableUserId) throw new Error("Session administrateur modifiée pendant la lecture");
      generateReleveJalonsPedagogiquesPdf({ apprenant, formationLabel: payload.formationLabel, session: payload.session, calcul: payload.calcul, preuves: [], preuvesJalons: payload.preuvesJalons, elementsACompleter: payload.elementsACompleter, etatGel: mentionGel(etat) });
    } catch (error: any) {
      toast({ title: "Relevé indisponible", description: error?.message || "Impossible de générer le relevé.", variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={download} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Download />}Relevé des jalons pédagogiques</Button>
    </>
  );
}
