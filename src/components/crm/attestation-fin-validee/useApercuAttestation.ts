import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { chargerEtatCompletionServeur } from "@/lib/etatCompletionServeur";
import { chargerApprenantTauxRealisation } from "@/hooks/useApprenantTauxRealisation";
import { isElearningType } from "@/lib/dossierFormation";
import { eligibiliteAttestation, libelleMotif } from "@/lib/attestationFinValidee/eligibilite";
import { dateFinDepuisConnexions, derniereValidationModules } from "@/lib/attestationFinValidee/dateFin";
import { debutFormation } from "../../../../supabase/functions/_shared/attestationFinCore";
import type { ModulePdf } from "@/lib/attestationFinValidee/pdf";

/** Lecture seule des preuves du dossier pour le brouillon ; le serveur refait le même contrôle avant tout enregistrement. */
export function useApercuAttestation(apprenant: any) {
  const q = useQuery({
    queryKey: ["attestation-fin-validee", apprenant.id],
    queryFn: async () => {
      const [etats, taux, cnx] = await Promise.all([
        chargerEtatCompletionServeur(apprenant.id),
        chargerApprenantTauxRealisation(apprenant.id, apprenant),
        supabase.from("apprenant_connexions").select("id, started_at").eq("apprenant_id", apprenant.id).not("started_at", "is", null).order("started_at", { ascending: false }).limit(1),
      ]);
      return { etats, taux, connexions: cnx.error ? null : (cnx.data ?? []) };
    },
    staleTime: 0,
  });
  const ids: number[] = Array.isArray(apprenant.modules_autorises) ? [...new Set<number>(apprenant.modules_autorises.map(Number).filter(Number.isFinite))] : [];
  const elearning = isElearningType(apprenant.type_apprenant ?? "") || isElearningType(apprenant.formation_choisie ?? "");
  const t = q.data?.taux;
  const heures = elearning ? { faites: t ? t.doneElearning : null, minimum: t ? t.reqElearning : null } : null;
  const signatures = !elearning ? { signees: t?.signatures?.signees ?? null, attendues: t?.signatures?.attendues ?? null } : null;
  const elig = eligibiliteAttestation({
    lectureErreur: q.isError ? "suivi pédagogique illisible" : q.isLoading ? "chargement en cours" : (q.data && !t ? "heures indisponibles" : null),
    elearning: heures, presentiel: signatures,
  });
  const derniereValidation = q.data ? derniereValidationModules(ids, id => q.data!.etats.get(id)?.completed_at ?? null) : null;
  const fin = dateFinDepuisConnexions({ connexions: q.data?.connexions ?? null, dateDebut: debutFormation(apprenant, elearning), derniereValidation });
  const modules: ModulePdf[] = q.data ? ids.map(id => { const e = q.data!.etats.get(id); return { id, statut: e?.status_effectif ?? null, preuve_complete: e?.preuve_complete ?? null, completed_at: e?.completed_at ?? null }; }) : [];
  const motifs = [...elig.motifs.map(libelleMotif), ...(q.data && fin.etat !== "ok" ? [fin.raison] : [])];
  return { q, elearning, heures, signatures, elig, fin, modules, motifs, pret: !!q.data && elig.eligible && fin.etat === "ok" };
}
