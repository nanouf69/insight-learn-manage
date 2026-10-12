import { supabase } from "@/integrations/supabase/client";
import { FORMATION_MODULES } from "@/components/cours-en-ligne/modules-config";
import { fetchPratiqueSlotDetails } from "@/lib/pratiqueSlots";
import { computePresentielHours, type EmargementRowLike } from "@/lib/presentielHours";
import { construireVolumes } from "@/lib/jalonsVolumes";
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
}) {
  const key = formationJalonsElearning(params.typeApprenant, params.formationChoisie);
  if (!key) throw new Error("Formation e-learning non concernée");
  const filiere = filiereDuParcours(key) as Filiere;
  const parcoursInitial = FORMATION_MODULES[key].modules.map((module) => module.id);
  const parcours = avecJalonPratique(parcoursInitial);
  const ids = [...new Set([...MODULES_FILIERE[filiere].filter((id) => id > 0), ...parcoursInitial.filter((id) => INTRO_IDS.has(id)), 26, 32, 34])];
  const [{ data: editorRows, error: editorError }, examensModule, moduleDetail, pratiqueDetails, emargementsResult, completionsResult] = await Promise.all([
    supabase.from("module_editor_state").select("module_id, module_data, deleted_exercices, deleted_cours").in("module_id", ids),
    import("@/components/cours-en-ligne/useLiveExamens"),
    import("@/components/cours-en-ligne/ModuleDetailView"),
    fetchPratiqueSlotDetails(params.apprenantId),
    supabase.from("emargements_fc" as any).select("date_emargement, demi_journee, absent, signature_data_url, masque, signed_at").eq("apprenant_id", params.apprenantId),
    params.completions
      ? Promise.resolve({ data: params.completions, error: null })
      : supabase.from("apprenant_module_completion").select("module_id, status, progress, completed_at").eq("apprenant_id", params.apprenantId),
  ]);
  if (editorError) throw editorError;
  if (emargementsResult.error) throw emargementsResult.error;
  if (completionsResult.error) throw completionsResult.error;
  const examens = await examensModule.fetchLiveExamens();
  const volumes = construireVolumes(
    filiere,
    parcoursInitial,
    (editorRows ?? []) as any,
    (id) => moduleDetail.getInitialModuleContentForVolume(id, params.typeApprenant),
    examens as any,
  );
  const emargements = ((emargementsResult.data as any[]) ?? []) as EmargementRowLike[];
  const { pratiqueMinutes } = computePresentielHours(emargements, pratiqueDetails);
  const completions = [...(((completionsResult.data as JalonCompletion[]) ?? [])), completionPratique(pratiqueMinutes)];
  const durees = calculerDureesPrevisionnelles(filiere, volumes.volumes);
  const poids = calculerPoids(filiere, volumes.volumes);
  const resultat = calculerJalonsPonderes(filiere, parcours, completions, poids);
  const datesPratique = (emargements as Array<EmargementRowLike & { signed_at?: string | null }>)
    .filter((row) => row.absent !== true && row.masque !== true && Boolean(row.signature_data_url?.trim()))
    .map((row) => row.signed_at || row.date_emargement)
    .filter(Boolean)
    .sort();
  return {
    key,
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
      progression: Math.max(0, Math.min(100, pratiqueMinutes / 360 * 100)),
      dernierePreuve: datesPratique.at(-1) ?? null,
      source: "Planning pratique + émargements signés",
    },
  };
}

export const estJalonPratique = (moduleId: number) => moduleId === PRATIQUE_PHYSIQUE;
/** Durée prévisionnelle d'une ligne de résultat (intro attribuée ou non = clé INTRO). */
export function dureeLigne(durees: Record<number, number>, moduleId: number, poids: number) {
  if (poids <= 0) return 0;
  return durees[INTRO_IDS.has(moduleId) || moduleId === 0 ? -1 : moduleId] ?? 0;
}
