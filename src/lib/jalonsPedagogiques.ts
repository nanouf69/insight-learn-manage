import { normaliserHeuresValidees } from "@/lib/heuresValideesAdmin";
import { supabase } from "@/integrations/supabase/client";
import { FORMATION_MODULES } from "@/components/cours-en-ligne/modules-config";
import { fetchPratiqueSlotDetails } from "@/lib/pratiqueSlots";
import { computePresentielHours, type EmargementRowLike } from "@/lib/presentielHours";
import { construireVolumes } from "@/lib/jalonsVolumes";
import { lireContenuFige, type GelFinAcces } from "@/lib/releveJalonsGel";
import {
  INTRO_IDS,
  MODULES_FILIERE,
  PRATIQUE_PHYSIQUE,
  avecJalonPratique,
  calculerJalonsPonderes,
  calculerPoids,
  calculerDureesPrevisionnelles,
  completionPratique,
  filiereDuParcours,
  type CompletionLite,
  type Filiere,
} from "@/lib/jalonsPonderes";

export const FORMATIONS_JALONS_ELEARNING = new Set(["vtc-e", "taxi-e", "ta-e", "va-e"]);

export function formationJalonsElearning(typeApprenant?: string | null, formationChoisie?: string | null) {
  const type = String(typeApprenant ?? "").toLowerCase().trim();
  const formation = String(formationChoisie ?? "").toLowerCase().trim();
  if (FORMATIONS_JALONS_ELEARNING.has(type)) return type;
  if (FORMATIONS_JALONS_ELEARNING.has(formation)) return formation;
  return null;
}

export interface JalonCompletion extends CompletionLite { completed_at?: string | null }

export async function chargerCalculJalons(params: {
  apprenantId: string;
  typeApprenant?: string | null;
  formationChoisie?: string | null;
  completions?: JalonCompletion[];
  /** Relevé figé à la fin des accès : contenu et sources figés uniquement (jamais le contenu actuel). */
  gel?: GelFinAcces | null;
}) {
  const gel = params.gel ?? null;
  const key = formationJalonsElearning(params.typeApprenant, params.formationChoisie);
  if (!key) throw new Error("Formation e-learning non concernée");
  const filiere = filiereDuParcours(key) as Filiere;
  const parcoursInitial = FORMATION_MODULES[key].modules.map((module) => module.id);
  const parcours = avecJalonPratique(parcoursInitial);
  const ids = [...new Set([...MODULES_FILIERE[filiere].filter((id) => id > 0), ...parcoursInitial.filter((id) => INTRO_IDS.has(id)), 26, 32, 34])];
  const [{ data: editorRows, error: editorError }, examensModule, moduleDetail, pratiqueDetails, emargementsResult, completionsResult, heuresValideesResult] = await Promise.all([
    gel
      ? lireContenuFige(gel, ids).then((data) => ({ data, error: null }))
      : supabase.from("module_editor_state").select("module_id, module_data, deleted_exercices, deleted_cours").in("module_id", ids),
    import("@/components/cours-en-ligne/useLiveExamens"),
    import("@/components/cours-en-ligne/ModuleDetailView"),
    fetchPratiqueSlotDetails(params.apprenantId),
    gel
      ? Promise.resolve({ data: gel.sources.emargements ?? [], error: null })
      : supabase.from("emargements_fc" as any).select("date_emargement, demi_journee, absent, signature_data_url, masque, signed_at").eq("apprenant_id", params.apprenantId),
    gel
      ? Promise.resolve({ data: gel.sources.completions ?? [], error: null })
      : params.completions
      ? Promise.resolve({ data: params.completions, error: null })
      : supabase.from("apprenant_module_completion").select("module_id, status, progress, completed_at").eq("apprenant_id", params.apprenantId),
    gel
      ? Promise.resolve({ data: gel.sources.heures_validees ?? [], error: null })
      : supabase.from("presentiel_heures_validees" as any).select("id, heures, created_at, date_presence, categorie").eq("apprenant_id", params.apprenantId),
  ]);
  if (editorError) throw editorError;
  if (emargementsResult.error) throw emargementsResult.error;
  if (completionsResult.error) throw completionsResult.error;
  if (heuresValideesResult.error) throw heuresValideesResult.error;
  const examens = gel
    ? await (await import("@/components/cours-en-ligne/ExamensBlancsEditor")).loadSavedExamens(false, (mids) => lireContenuFige(gel, mids))
    : await examensModule.fetchLiveExamens();
  const volumes = construireVolumes(
    filiere,
    parcoursInitial,
    (editorRows ?? []) as any,
    (id) => moduleDetail.getInitialModuleContentForVolume(id, params.typeApprenant),
    examens as any,
  );
  const emargements = ((emargementsResult.data as any[]) ?? []) as EmargementRowLike[];
  // Même présence que le « taux présentiel » : théorie signée + pratique signée
  // + heures validées par un admin (append-only). Aucune ligne n'est modifiée.
  const { theorieHours, pratiqueMinutes: pratiqueSigneeMinutes } = computePresentielHours(emargements, pratiqueDetails);
  const heuresValidees = normaliserHeuresValidees(((heuresValideesResult.data as any[]) ?? []));
  const valideesMinutes = Math.round(heuresValidees.reduce((s, r) => s + r.heures, 0) * 60);
  const theorieMinutes = Math.round(theorieHours * 60);
  const pratiqueMinutes = pratiqueSigneeMinutes + theorieMinutes + valideesMinutes;
  const completions = [...(((completionsResult.data as JalonCompletion[]) ?? [])), completionPratique(pratiqueMinutes)];
  const durees = calculerDureesPrevisionnelles(filiere, volumes.volumes);
  const poids = calculerPoids(filiere, volumes.volumes);
  const resultat = calculerJalonsPonderes(filiere, parcours, completions, poids);
  const datesPratique = [
    ...(emargements as Array<EmargementRowLike & { signed_at?: string | null }>)
      .filter((row) => row.absent !== true && row.masque !== true && Boolean(row.signature_data_url?.trim()))
      .map((row) => row.signed_at || row.date_emargement),
    // Date de présence seulement si réellement saisie (jamais la date de saisie).
    ...heuresValidees.map((r) => r.datePresence),
  ].filter(Boolean).sort();
  return {
    key,
    gelId: gel?.id ?? null,
    filiere,
    parcours,
    volumes: volumes.volumes,
    limites: volumes.limites,
    durees,
    poids,
    resultat,
    completions,
    pratique: {
      minutes: pratiqueMinutes,
      detail: { pratiqueSignee: pratiqueSigneeMinutes, theorieSignee: theorieMinutes, valideesAdmin: valideesMinutes },
      progression: Math.max(0, Math.min(100, pratiqueMinutes / 360 * 100)),
      dernierePreuve: datesPratique.at(-1) ?? null,
      source: "Émargements signés + heures validées par l’administration",
    },
  };
}

export const estJalonPratique = (moduleId: number) => moduleId === PRATIQUE_PHYSIQUE;
export { dureeLigne } from "@/lib/jalonsPonderes";
