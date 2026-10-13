import { normaliserHeuresValidees } from "@/lib/heuresValideesAdmin";
import { computePresentielHours, type EmargementRowLike } from "@/lib/presentielHours";
import { construireVolumes } from "@/lib/jalonsVolumes";
import { activitesDuModule, completionAvecActivites, METHODE_ACTIVITES, type EtatActivites } from "@/lib/jeuxPedagogiques";
import type { PratiqueSlotDetail } from "@/lib/pratiqueSlots";
import type { ModuleContentLite } from "@/lib/volumeModules";
import {
  calculerJalonsPonderes,
  calculerPoids,
  calculerDureesPrevisionnelles,
  completionPratique,
  type CompletionLite,
  type Filiere,
} from "@/lib/jalonsPonderes";

/** Version de la méthode de calcul enregistrée avec chaque calcul figé. */
export const METHODE_CALCUL_JALONS = "jalons-calcul v3 — 13/10/2026";

export interface CompletionCalc extends CompletionLite { completed_at?: string | null }

/**
 * Calcul PUR des jalons (aucune lecture de base) : même code pour le calcul
 * actuel (navigateur) et pour le calcul figé côté serveur au moment du gel.
 */
export function assemblerCalculJalons(i: {
  key: string; filiere: Filiere; parcours: number[]; parcoursInitial: number[];
  editorRows: any[]; examens: any[]; initialDe: (id: number) => ModuleContentLite | null;
  pratiqueDetails: PratiqueSlotDetail[]; emargements: any[]; completions: CompletionCalc[]; heuresValidees: any[];
  gelId?: string | null;
  /** Activités du registre terminées (confirmées serveur). Absent = méthode v3 inchangée (calculs figés). */
  jeuxTermines?: string[];
  /** Date de référence des activités (défaut : maintenant). */
  dateActivites?: string;
}) {
  const volumes = construireVolumes(i.filiere, i.parcoursInitial, i.editorRows as any, i.initialDe, i.examens as any);
  const emargements = (i.emargements ?? []) as EmargementRowLike[];
  // Même présence que le « taux présentiel » : théorie signée + pratique signée
  // + heures validées par un admin (append-only). Aucune ligne n'est modifiée.
  const { theorieHours, pratiqueMinutes: pratiqueSigneeMinutes } = computePresentielHours(emargements, i.pratiqueDetails);
  const heuresValidees = normaliserHeuresValidees(i.heuresValidees ?? []);
  const valideesMinutes = Math.round(heuresValidees.reduce((s, r) => s + r.heures, 0) * 60);
  const theorieMinutes = Math.round(theorieHours * 60);
  const pratiqueMinutes = pratiqueSigneeMinutes + theorieMinutes + valideesMinutes;
  let completionsBase = i.completions ?? [];
  let activites: Array<EtatActivites & { methode: string }> = [];
  if (i.jeuxTermines) {
    const termines = new Set(i.jeuxTermines);
    // Tout module du parcours RÉEL ayant des activités dans le registre (aucune liste parallèle).
    for (const [cle, v] of Object.entries(volumes.volumes)) {
      if (!i.parcours.includes(v.moduleId)) continue;
      const acts = activitesDuModule(v.moduleId, i.dateActivites);
      if (!acts.length) continue;
      const lignes = completionsBase.filter((c) => Number(c.module_id) === v.moduleId);
      const row = lignes.find((c) => c.status === "completed") ?? [...lignes].sort((x, y) => (Number(y.progress) || 0) - (Number(x.progress) || 0))[0];
      const r = completionAvecActivites((row ?? { module_id: v.moduleId }) as any, { ...v }, acts, termines);
      volumes.volumes[Number(cle)] = { ...v, jeux: acts.reduce((s2, x) => s2 + x.unites, 0) };
      completionsBase = [...completionsBase.filter((c) => Number(c.module_id) !== v.moduleId), { ...r.completion, completed_at: (row as any)?.completed_at ?? null }];
      activites.push({ ...r.etat, methode: METHODE_ACTIVITES });
    }
  }
  const completions = [...completionsBase, completionPratique(pratiqueMinutes)];
  const durees = calculerDureesPrevisionnelles(i.filiere, volumes.volumes);
  const poids = calculerPoids(i.filiere, volumes.volumes);
  const resultat = calculerJalonsPonderes(i.filiere, i.parcours, completions, poids);
  const datesPratique = [
    ...(emargements as Array<EmargementRowLike & { signed_at?: string | null }>)
      .filter((row) => row.absent !== true && row.masque !== true && Boolean(row.signature_data_url?.trim()))
      .map((row) => row.signed_at || row.date_emargement),
    // Date de présence seulement si réellement saisie (jamais la date de saisie).
    ...heuresValidees.map((r) => r.datePresence),
  ].filter(Boolean).sort();
  return {
    key: i.key,
    gelId: i.gelId ?? null,
    filiere: i.filiere,
    parcours: i.parcours,
    volumes: volumes.volumes,
    limites: volumes.limites,
    durees,
    poids,
    resultat,
    completions,
    activites,
    jeux: activites[0] ?? null,
    pratique: {
      minutes: pratiqueMinutes,
      detail: { pratiqueSignee: pratiqueSigneeMinutes, theorieSignee: theorieMinutes, valideesAdmin: valideesMinutes },
      progression: Math.max(0, Math.min(100, pratiqueMinutes / 360 * 100)),
      dernierePreuve: datesPratique.at(-1) ?? null,
      source: "Émargements signés + heures validées par l’administration",
    },
  };
}

export type CalculJalons = ReturnType<typeof assemblerCalculJalons>;
