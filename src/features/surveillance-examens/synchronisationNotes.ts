import { supabase } from "@/integrations/supabase/client";

/** Types d'écart relevés par le serveur. Seuls les états dérivés (statut, compteur, résultat absent) sont réparables. */
export type TypeEcart =
  | "resultat_manquant"
  | "attente_fantome"
  | "definitif_avec_qrc_restantes"
  | "compteur_divergent"
  | "note_divergente"
  | "identite_incoherente"
  | "importee_sans_bareme_qrc_restantes"
  | "importee_note_absente"
  | "qrc_non_corrigee";

export interface EtatNote { status: string | null; score: number | null; qrc_restantes: number | null }

export interface LigneDiagnostic {
  attempt_id: string;
  apprenant_id: string;
  nom: string | null;
  prenom: string | null;
  exam_id: string;
  matiere: string | null;
  titre: string | null;
  finished_at: string | null;
  type: TypeEcart;
  reparable: boolean;
  result_revision: number | null;
  stocke: EtatNote | null;
  attendu: EtatNote;
}

export interface LigneAncienne {
  result_id: string;
  apprenant_id: string;
  nom: string | null;
  prenom: string | null;
  exam_id: string;
  matiere: string | null;
  titre: string | null;
  tentative: number | null;
  completed_at: string | null;
  qrc_sans_correction_humaine: number;
  type: "ancienne_copie_sans_correction" | "ancienne_copie_v2_meme_matiere";
  circuit_notation: "aucun" | "preuve_de_remise_requise";
}

export interface Diagnostic {
  terminees: number;
  enCours: number;
  importeesSansBareme: number;
  lignes: LigneDiagnostic[];
  anciennes: LigneAncienne[];
  luA: string;
}

export const LIBELLES_ECART: Record<TypeEcart, string> = {
  resultat_manquant: "Résultat absent",
  attente_fantome: "« En attente » alors que toutes les QRC sont corrigées",
  definitif_avec_qrc_restantes: "Note définitive alors que des QRC restent à corriger",
  compteur_divergent: "Nombre de QRC restantes faux",
  note_divergente: "Note différente du calcul serveur (vérification humaine)",
  identite_incoherente: "Identité élève / question incohérente",
  importee_sans_bareme_qrc_restantes: "Copie importée sans barème : corriger effacerait la note",
  importee_note_absente: "Copie importée sans note",
  qrc_non_corrigee: "QRC non corrigées (attente normale)",
};

/** Ordre d'affichage : défauts réparables, défauts à vérifier, puis attentes normales. */
export const ORDRE_ECARTS: TypeEcart[] = [
  "attente_fantome", "definitif_avec_qrc_restantes", "resultat_manquant", "compteur_divergent",
  "note_divergente", "identite_incoherente", "importee_sans_bareme_qrc_restantes", "importee_note_absente",
  "qrc_non_corrigee",
];

export const EVENEMENT_NOTES_CORRIGEES = "eb-notes-corrigees";

/** Signalé après chaque correction enregistrée : le panneau revérifie la copie sur le serveur. */
export function signalerCorrectionEnregistree(attemptId: string | null | undefined) {
  if (!attemptId || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENEMENT_NOTES_CORRIGEES, { detail: { attemptId } }));
}

type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
const rpcParDefaut: Rpc = (fn, args) => (supabase as any).rpc(fn, args);

function erreur(e: unknown): Error {
  const m = (e as { message?: string })?.message;
  return new Error(m || "Lecture serveur impossible");
}

/** Lecture complète paginée (identifiant croissant). Toute erreur = erreur, jamais un résultat partiel. */
export async function lireDiagnostic(rpc: Rpc = rpcParDefaut): Promise<Diagnostic> {
  const lignes: LigneDiagnostic[] = [];
  let terminees = 0, enCours = 0, importees = 0, apres: string | null = null, luA = "";
  for (let page = 0; page < 200; page++) {
    const { data, error } = await rpc("eb_notes_diagnostic", { p_apres: apres, p_limite: 300, p_attempt_id: null });
    if (error) throw erreur(error);
    const d = data as any;
    lignes.push(...(d.lignes ?? []));
    terminees += d.terminees ?? 0;
    enCours += d.en_cours ?? 0;
    importees += d.importees_sans_bareme ?? 0;
    luA = d.lu_a ?? luA;
    apres = d.suivant ?? null;
    if (!apres) break;
    if (page === 199) throw new Error("Lecture interrompue : trop de pages");
  }
  const anciennes: LigneAncienne[] = [];
  apres = null;
  for (let page = 0; page < 200; page++) {
    const { data, error } = await rpc("eb_notes_diagnostic_ancien", { p_apres: apres, p_limite: 800 });
    if (error) throw erreur(error);
    const d = data as any;
    anciennes.push(...(d.lignes ?? []));
    apres = d.suivant ?? null;
    if (!apres) break;
    if (page === 199) throw new Error("Lecture interrompue : trop de pages");
  }
  return { terminees, enCours, importeesSansBareme: importees, lignes, anciennes, luA };
}

/** Relecture d'une seule copie (après une correction ou une actualisation). */
export async function lireDiagnosticCopie(attemptId: string, rpc: Rpc = rpcParDefaut): Promise<LigneDiagnostic | null> {
  const { data, error } = await rpc("eb_notes_diagnostic", { p_apres: null, p_limite: 1, p_attempt_id: attemptId });
  if (error) throw erreur(error);
  return ((data as any)?.lignes ?? [])[0] ?? null;
}

/** Remplace la ligne d'une copie par sa relecture serveur (ou la retire si elle est cohérente). */
export function remplacerLigne(lignes: LigneDiagnostic[], attemptId: string, relue: LigneDiagnostic | null): LigneDiagnostic[] {
  const autres = lignes.filter((l) => l.attempt_id !== attemptId);
  return relue ? [...autres, relue] : autres;
}

export function compterParType(lignes: LigneDiagnostic[]): Record<TypeEcart, number> {
  const c = Object.fromEntries(ORDRE_ECARTS.map((t) => [t, 0])) as Record<TypeEcart, number>;
  for (const l of lignes) c[l.type] = (c[l.type] ?? 0) + 1;
  return c;
}

export interface ResultatActualisation { statut: "actualise" | "deja_coherent"; result_revision: number; status: string; score: number | null; qrc_restantes: number; rejoue?: boolean }

/** Actualisation serveur d'une copie : même formule que la correction, CAS sur la révision lue, idempotente. */
export async function actualiserCopie(
  operationId: string, ligne: Pick<LigneDiagnostic, "attempt_id" | "result_revision" | "reparable">, rpc: Rpc = rpcParDefaut,
): Promise<ResultatActualisation> {
  if (!ligne.reparable) throw new Error("Cette copie demande une vérification humaine : aucune actualisation automatique.");
  const { data, error } = await rpc("eb_notes_actualiser", {
    p_operation_id: operationId, p_attempt_id: ligne.attempt_id, p_revision_attendue: ligne.result_revision,
  });
  if (error) throw erreur(error);
  return data as ResultatActualisation;
}
