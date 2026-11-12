import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { chargerEtatCompletionServeur } from "@/lib/etatCompletionServeur";
import { chargerApprenantTauxRealisation } from "@/hooks/useApprenantTauxRealisation";
import { isElearningType } from "@/lib/dossierFormation";
import { eligibiliteAttestation, libelleMotif } from "@/lib/attestationFinValidee/eligibilite";
import { dateFinDepuisConnexions, derniereValidationModules } from "@/lib/attestationFinValidee/dateFin";
import { debutFormation, finFormationCrm } from "../../../../supabase/functions/_shared/attestationFinCore";
import type { ModulePdf } from "@/lib/attestationFinValidee/pdf";
import { modulesExigesDashboard, resolveFormationId } from '@/lib/parcoursModulesDashboard';
import { elementsRestantAValider } from '@/lib/attestationFinValidee/redactionPresentation';

/** Lecture seule des preuves du dossier pour le brouillon ; le serveur refait le même contrôle avant tout enregistrement. */
export function useApercuAttestation(apprenant: any) {
  const q = useQuery({
    queryKey: ["attestation-fin-validee", apprenant.id],
    queryFn: async () => {
      const [etats, taux, cnx, emg] = await Promise.all([
        chargerEtatCompletionServeur(apprenant.id).catch(() => null),
        chargerApprenantTauxRealisation(apprenant.id, apprenant).catch(() => null),
        supabase.from("apprenant_connexions").select("id, started_at").eq("apprenant_id", apprenant.id).not("started_at", "is", null).order("started_at", { ascending: false }).limit(500),
        supabase.from("emargements_fc").select("id, date_emargement").eq("apprenant_id", apprenant.id).eq("masque", false).eq("absent", false).not("signed_at", "is", null).not("signature_data_url", "is", null).order("date_emargement", { ascending: false }).limit(200),
      ]);
      return { etats, taux, connexions: cnx.error || emg.error ? null : [...(cnx.data ?? []), ...(emg.data ?? []).map((x: any) => ({ id: `emargement:${x.id}`, started_at: `${x.date_emargement}T11:00:00Z` }))] };
    },
    staleTime: 0,
  });
  const ids: number[] = Array.isArray(apprenant.modules_autorises) ? [...new Set<number>(apprenant.modules_autorises.map(Number).filter(Number.isFinite))] : [];
  const elearning = isElearningType(apprenant.type_apprenant ?? "") || isElearningType(apprenant.formation_choisie ?? "");
  const t = q.data?.taux;
  const heures = elearning ? { faites: t ? t.doneElearning : null, minimum: t ? t.reqElearning : null } : null;
  const signatures = !elearning ? { signees: t?.signatures?.signees ?? null, attendues: t?.signatures?.attendues ?? null } : null;
  const elig = eligibiliteAttestation({
    lectureErreur: q.isError ? "lecture du dossier impossible" : q.isLoading ? "chargement en cours" : null,
    elearning: heures, presentiel: signatures,
  });
  const derniereValidation = q.data ? derniereValidationModules(ids, id => q.data?.etats?.get(id)?.completed_at ?? null) : null;
  const fin = dateFinDepuisConnexions({ connexions: q.data?.connexions ?? null, dateDebut: debutFormation(apprenant, elearning), dateLimiteCrm: finFormationCrm(apprenant, elearning), derniereValidation });
  const modules: ModulePdf[] = q.data ? ids.map(id => { const e = q.data?.etats?.get(id); return { id, statut: e?.status_effectif ?? null, preuve_complete: e?.preuve_complete ?? null, completed_at: e?.completed_at ?? null }; }) : [];
  const formation = resolveFormationId(apprenant.type_apprenant,apprenant.formation_choisie,apprenant.modules_autorises);
  const attribues = formation ? modulesExigesDashboard(formation,apprenant.modules_autorises,Array.from(q.data?.etats?.values() ?? []),apprenant.date_fin_cours_en_ligne) : [];
  const elementsPedagogiques = attribues.length ? elementsRestantAValider(attribues,q.data?.etats ?? null) : null;
  const motifs = [...elig.motifs.map(libelleMotif), ...(q.data && fin.etat !== "ok" ? [fin.raison] : [])];
  return { q, elearning, heures, signatures, elig, fin, modules, motifs, elementsPedagogiques, pret: !!q.data && elig.eligible && fin.etat === "ok" };
}
