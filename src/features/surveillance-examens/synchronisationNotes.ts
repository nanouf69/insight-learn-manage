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
  /** Copies lues / total serveur par circuit (contrôle d'exhaustivité). */
  couverture?: { nouveau: { lues: number; total: number | null }; ancien: { lues: number; total: number | null } };
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

/** Taille des lots : le serveur borne aussi chaque lot à 3 s et rend un curseur de reprise. */
export const LOT_NOUVEAU = 50;
export const LOT_ANCIEN = 200;

export interface Progression { circuit: "nouveau" | "ancien"; lues: number; total: number | null; lot: number }
export interface OptionsLecture {
  signal?: AbortSignal;
  onProgress?: (p: Progression) => void;
  /** Attente avant une nouvelle tentative d'un lot (remplaçable en test). */
  pause?: (ms: number) => Promise<void>;
}

export class VerificationAnnulee extends Error {
  constructor() { super("Vérification annulée : aucun résultat partiel n'est affiché"); this.name = "VerificationAnnulee"; }
}

const CODES_TRANSITOIRES = new Set(["57014", "40001", "40P01", "55P03", "53300", "08006", "08001", "PGRST000", "PGRST001", "PGRST002"]);
/** Erreur transitoire (délai, réseau, surcharge) : le même lot peut être relu sans risque (lecture seule). */
export function estTransitoire(e: unknown): boolean {
  const o = (e ?? {}) as { code?: string; message?: string; status?: number };
  if (o.code && CODES_TRANSITOIRES.has(o.code)) return true;
  if (typeof o.status === "number" && o.status >= 500) return true;
  return /statement timeout|timed out|failed to fetch|network|fetch failed|load failed|503|504/i.test(o.message ?? "");
}

const RETRAITS_MS = [500, 1500, 3000];
const pauseParDefaut = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Appel d'un lot : relu au même curseur en cas d'erreur transitoire (3 fois au plus), sinon erreur détaillée. */
async function lireLot(rpc: Rpc, fn: string, args: Record<string, unknown>, contexte: string, opts: OptionsLecture) {
  for (let essai = 0; ; essai++) {
    if (opts.signal?.aborted) throw new VerificationAnnulee();
    let res: { data: unknown; error: unknown };
    try {
      res = await rpc(fn, args);
    } catch (e) {
      res = { data: null, error: e };
    }
    if (!res.error) return res.data as any;
    const code = (res.error as { code?: string })?.code;
    if (!estTransitoire(res.error) || essai >= RETRAITS_MS.length) {
      const base = erreur(res.error).message;
      throw new Error(`${contexte} : ${base}${code ? ` [${code}]` : ""}${essai ? ` (après ${essai + 1} essais)` : ""}`);
    }
    await (opts.pause ?? pauseParDefaut)(RETRAITS_MS[essai]);
  }
}

interface Parcours<T> { lignes: T[]; lues: number; total: number | null; terminees: number; enCours: number; importees: number; luA: string }

/** Parcours complet par curseur (identifiant croissant), sans doublon ; total serveur contrôlé à la fin. */
async function parcourir<T>(rpc: Rpc, circuit: "nouveau" | "ancien", opts: OptionsLecture, cle: (l: T) => string): Promise<Parcours<T>> {
  const fn = circuit === "nouveau" ? "eb_notes_diagnostic" : "eb_notes_diagnostic_ancien";
  const libelle = circuit === "nouveau" ? "nouveau correcteur" : "anciennes copies";
  const vues = new Map<string, T>();
  let apres: string | null = null, lues = 0, total: number | null = null, terminees = 0, enCours = 0, importees = 0, luA = "";
  for (let lot = 1; lot <= 2000; lot++) {
    const args: Record<string, unknown> = circuit === "nouveau"
      ? { p_apres: apres, p_limite: LOT_NOUVEAU, p_attempt_id: null }
      : { p_apres: apres, p_limite: LOT_ANCIEN };
    const d = await lireLot(rpc, fn, args, `Lot ${lot} (${libelle}, ${lues}${total != null ? `/${total}` : ""} copies lues)`, opts);
    for (const l of (d?.lignes ?? []) as T[]) {
      const k = cle(l);
      if (vues.has(k)) throw new Error(`Lot ${lot} (${libelle}) : copie ${k} reçue deux fois, vérification interrompue`);
      vues.set(k, l);
    }
    lues += d?.scannees ?? 0;
    terminees += d?.terminees ?? 0;
    enCours += d?.en_cours ?? 0;
    importees += d?.importees_sans_bareme ?? 0;
    if (typeof d?.total === "number") total = d.total;
    luA = d?.lu_a ?? luA;
    opts.onProgress?.({ circuit, lues, total, lot });
    const suivant: string | null = d?.suivant ?? null;
    const fini = typeof d?.fini === "boolean" ? d.fini : !suivant;
    if (fini) return { lignes: [...vues.values()], lues, total, terminees, enCours, importees, luA };
    if (!suivant || (apres && suivant <= apres)) throw new Error(`Lot ${lot} (${libelle}) : curseur de reprise invalide, vérification interrompue`);
    apres = suivant;
  }
  throw new Error(`Lecture interrompue (${libelle}) : trop de lots`);
}

/**
 * Lecture complète des deux circuits par lots bornés. Toute erreur, annulation ou couverture incomplète = erreur,
 * jamais un résultat partiel. Si des copies sont créées pendant la lecture (total final ≠ copies lues),
 * le circuit est relu une fois en entier ; s'il reste incomplet, la vérification échoue explicitement.
 */
export async function lireDiagnostic(rpc: Rpc = rpcParDefaut, opts: OptionsLecture = {}): Promise<Diagnostic> {
  const complet = async <T>(circuit: "nouveau" | "ancien", cle: (l: T) => string) => {
    for (let passe = 1; passe <= 2; passe++) {
      const r = await parcourir<T>(rpc, circuit, opts, cle);
      if (r.total == null || r.lues === r.total) return r;
      if (passe === 2) {
        throw new Error(`Couverture incomplète (${circuit === "nouveau" ? "nouveau correcteur" : "anciennes copies"}) : ${r.lues} copies lues sur ${r.total} — des copies ont été créées pendant la lecture, relancez la vérification`);
      }
    }
    throw new Error("Lecture interrompue");
  };
  const n = await complet<LigneDiagnostic>("nouveau", (l) => l.attempt_id);
  const a = await complet<LigneAncienne>("ancien", (l) => l.result_id);
  return {
    terminees: n.terminees, enCours: n.enCours, importeesSansBareme: n.importees, lignes: n.lignes, anciennes: a.lignes, luA: n.luA,
    couverture: { nouveau: { lues: n.lues, total: n.total }, ancien: { lues: a.lues, total: a.total } },
  };
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
