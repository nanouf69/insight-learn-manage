/**
 * PONT DE PASSAGE VERS LE NOYAU V2
 * ================================
 *
 * Objectif : pour tout NOUVEAU passage d'examen blanc, le noyau sécurisé
 * devient la SOURCE DE VÉRITÉ.
 *
 *   démarrage  → core_start_attempt        (snapshot figé, une seule tentative)
 *   réponse    → core_save_answer          (append-only, révision, idempotent)
 *   fin        → core_finalize_attempt     (QRC créées) + core_recalc_result
 *
 * Règles :
 *  - le serveur seul décide si un apprenant est un compte TEST et si le pont
 *    est actif (tables core_bridge_flags / core_bridge_comptes_test) ;
 *  - aucune note, aucun barème, aucune correction n'est calculé ici ;
 *  - l'ancien circuit (reponses_apprenants) n'est jamais lu comme vérité pour
 *    un passage raccordé : il ne reçoit qu'une projection de lecture.
 */
import { supabase } from "@/integrations/supabase/client";
import { contientNul } from "@/lib/originauxExacts";
import type { ExamenBlanc, Matiere, Question } from "@/components/cours-en-ligne/examens-blancs-data";
import { getPointsParQuestion } from "@/components/cours-en-ligne/examens-blancs-data";

/** Identifiant de question unique dans tout l'examen : matière + numéro. */
export const idQuestionNoyau = (matiereId: string, questionId: number | string) =>
  `${matiereId}:${questionId}`;

/** UUID déterministe (idempotence) calculé à partir d'une clé métier stable. */
export async function operationId(cle: string): Promise<string> {
  const octets = new TextEncoder().encode(cle);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", octets));
  const hex = Array.from(digest.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), "4" + hex.slice(13, 16), "8" + hex.slice(17, 20), hex.slice(20, 32)].join("-");
}

export type ContenuVersion = {
  exam_id: string;
  exam_libelle: string;
  filiere: string;
  exam_numero: string;
    matieres: { subject_id: string; titre: string; ordre: number; duree: number; coefficient: number; note_sur: number; note_eliminatoire: number; pts_qcm?: number; pts_qrc?: number; texte_support?: string; texte_source?: string }[];
  questions: {
    id: string;
    matiere: string;
    ordre: number;
    type: string;
    enonce: string;
    choix: Question["choix"] | null;
    reponseQRC: string | null;
    reponses_possibles: string[] | null;
    requiresCalcul: boolean | null;
    image: string | null;
    points: number;
  }[];
};

/**
 * Construit le contenu à publier À PARTIR DE L'EXAMEN RÉELLEMENT SERVI À
 * L'APPRENANT (même objet, mêmes barèmes) : aucune reconstruction, aucune
 * lecture d'une autre source.
 */
export function contenuVersionDepuisExamen(examen: ExamenBlanc): ContenuVersion {
  const matieres = (examen.matieres ?? []).filter(Boolean) as Matiere[];
  return {
    exam_id: examen.id,
    exam_libelle: examen.titre,
    filiere: examen.type,
    exam_numero: String(examen.numero),
    matieres: matieres.map((m, i) => ({
      subject_id: m.id,
      titre: m.nom,
      ordre: i + 1,
      duree: m.duree ?? 0,
      coefficient: m.coefficient ?? 1,
      note_sur: m.noteSur ?? 0,
      note_eliminatoire: m.noteEliminatoire ?? 0,
      pts_qcm: m.ptsQCM,
      pts_qrc: m.ptsQRC,
      texte_support: m.texteSupport,
      texte_source: m.texteSource,
    })),
    questions: matieres.flatMap((m) =>
      (m.questions ?? [])
        .filter((q): q is Question => !!q && q.type != null)
        .map((q, i) => ({
          id: idQuestionNoyau(m.id, q.id),
          matiere: m.id,
          ordre: i + 1,
          type: q.type,
          enonce: q.enonce ?? "",
          choix: q.choix ? q.choix.map((choice) => ({ ...choice })) : null,
          reponseQRC: q.reponseQRC ?? null,
          reponses_possibles: q.reponses_possibles ? [...q.reponses_possibles] : null,
          requiresCalcul: q.requiresCalcul ?? null,
          image: q.image ?? null,
          points: getPointsParQuestion(m.id, q.type, m),
        })),
    ),
  };
}

/** Publie (ou retrouve) la version active correspondant au contenu actuel. Admin uniquement. */
export async function publierVersionExamen(examen: ExamenBlanc, moduleId: number | null, email?: string) {
  const contenu = contenuVersionDepuisExamen(examen);
  const op = await operationId(`publish:${examen.id}:${JSON.stringify(contenu).length}:${Date.now()}`);
  const { data, error } = await supabase.rpc("core_publish_version_contenu", {
    p_operation_id: op,
    p_filiere: contenu.filiere,
    p_exam_numero: contenu.exam_numero,
    p_module_id: moduleId,
    p_exam_id: contenu.exam_id,
    p_content: contenu as unknown as never,
    p_email: email ?? null,
    p_is_test: false,
  });
  if (error) throw error;
  return data;
}

/** Le pont est-il actif pour cet apprenant ? (décision serveur, jamais locale) */
async function statutPontPour(apprenantId: string): Promise<"actif" | "inactif" | "erreur"> {
  const { data, error } = await supabase.rpc("core_bridge_actif_pour", { p_apprenant_id: apprenantId });
  if (error) return "erreur";
  return data === true ? "actif" : "inactif";
}

export async function pontActifPour(apprenantId: string): Promise<boolean> {
  return (await statutPontPour(apprenantId)) === "actif";
}

/** Le sujet est-il publié dans le noyau (version active non retirée) ? */
async function statutSujetPublie(examenId: string): Promise<"publie" | "absent" | "erreur"> {
  // Fonction serveur : les élèves n'ont plus accès direct aux versions d'examen.
  const { data, error } = await supabase.rpc("core_sujet_publie" as never, { p_exam_id: examenId } as never);
  if (error) return "erreur";
  return data === true ? "publie" : "absent";
}

export async function sujetPublieDansNoyau(examenId: string): Promise<boolean> {
  return (await statutSujetPublie(examenId)) === "publie";
}

/** Une tentative V2 existe-t-elle déjà pour ce passage ? (reprise, jamais changement de moteur) */
export async function tentativeV2Existante(apprenantId: string, examenId: string): Promise<boolean | null> {
  const { data, error } = await supabase
    .from("exam_attempts_v2")
    .select("attempt_id")
    .eq("apprenant_id", apprenantId)
    .eq("exam_id", examenId)
    .limit(1);
  if (error) return null;
  return (data ?? []).length > 0;
}

/** Reprise exacte : elle ne dépend ni du pont actuel ni d'une version toujours publiée. */
async function tentativeV2OuvertePourMatiere(
  apprenantId: string,
  examenId: string,
  matiereId: string,
): Promise<{ attemptId: string | null; erreur: boolean }> {
  const { data, error } = await supabase
    .from("exam_attempts_v2")
    .select("attempt_id, snapshot")
    .eq("apprenant_id", apprenantId)
    .eq("exam_id", examenId)
    .eq("etat", "en_cours")
    .order("started_at", { ascending: false });
  if (error) return { attemptId: null, erreur: true };
  const matches = (data ?? []).filter((row) => String((row as { snapshot?: { matiere?: unknown } }).snapshot?.matiere ?? "") === matiereId);
  if (matches.length > 1) return { attemptId: null, erreur: true };
  return { attemptId: matches.length === 1 ? String((matches[0] as { attempt_id: string }).attempt_id) : null, erreur: false };
}

export type DecisionRoutage =
  | { moteur: "v2"; attemptId: string }
  | { moteur: "ancien"; motif: "pont_inactif" | "sujet_non_publie" | "passage_deja_engage" }
  | { moteur: "bloque"; message: string };

/**
 * Décide, côté serveur, quel moteur sert ce passage.
 *  - pont inactif ou sujet non publié (EB3, EB3-TAXI) → ancien circuit ;
 *  - passage déjà engagé sur l'ancien circuit → il y reste (jamais de changement
 *    de moteur en cours de passage) ;
 *  - sinon V2 ; si le noyau refuse d'ouvrir la tentative, on BLOQUE le
 *    démarrage et on journalise : aucune bascule silencieuse vers l'ancien.
 */
export async function routerPassage(params: {
  apprenantId: string;
  examenId: string;
  matiereId: string;
  tentative: number;
  passageDejaEngage: boolean;
}): Promise<DecisionRoutage> {
  const ouverte = await tentativeV2OuvertePourMatiere(params.apprenantId, params.examenId, params.matiereId);
  if (ouverte.erreur) {
    return { moteur: "bloque", message: "La reprise de votre copie figée ne peut pas être vérifiée. Aucun sujet courant n'a été substitué à votre tentative ; réessayez dans quelques instants." };
  }
  if (ouverte.attemptId) return { moteur: "v2", attemptId: ouverte.attemptId };

  const pont = await statutPontPour(params.apprenantId);
  if (pont === "erreur") return { moteur: "bloque", message: "Le circuit de votre examen ne peut pas être vérifié. Aucune nouvelle tentative n'a été ouverte." };
  if (pont === "inactif") return { moteur: "ancien", motif: "pont_inactif" };
  const sujet = await statutSujetPublie(params.examenId);
  if (sujet === "erreur") return { moteur: "bloque", message: "La version officielle de l'examen est momentanément illisible. Aucune nouvelle tentative n'a été ouverte." };
  if (sujet === "absent") return { moteur: "ancien", motif: "sujet_non_publie" };

  const reprise = await tentativeV2Existante(params.apprenantId, params.examenId);
  if (reprise === null) return { moteur: "bloque", message: "L'historique de vos tentatives est illisible. Aucun changement de circuit n'a été effectué." };
  if (!reprise && params.passageDejaEngage) return { moteur: "ancien", motif: "passage_deja_engage" };

  let attemptId: string | null;
  try { attemptId = await demarrerTentative(params); }
  catch (error) {
    return { moteur: 'bloque', message: error instanceof Error ? error.message : 'Démarrage refusé par le serveur.' };
  }
  if (attemptId) return { moteur: "v2", attemptId };
  return {
    moteur: "bloque",
    message: "Le nouveau moteur d'examen n'a pas pu ouvrir la tentative. Vos réponses et résultats sont conservés. Le centre a été prévenu automatiquement ; réessayez dans quelques instants.",
  };
}

/** Démarre (ou reprend) la tentative V2 d'une matière : snapshot figé côté serveur. */
export async function demarrerTentative(params: {
  apprenantId: string;
  examenId: string;
  matiereId: string;
  tentative: number;
}): Promise<string | null> {
  const op = await operationId(
    `start:${params.apprenantId}:${params.examenId}:${params.matiereId}:t${params.tentative}`,
  );
  const demarrer = (operationIdValue: string) => supabase.rpc("core_start_attempt", {
    p_operation_id: operationIdValue,
    p_apprenant_id: params.apprenantId,
    p_exam_id: params.examenId,
    p_matiere: params.matiereId,
  });
  const { data, error } = await demarrer(op);
  if (error) {
    if (error.code === 'P0551') throw new Error(error.message);
    console.warn("[PontV2] démarrage refusé:", error.message);
    return null;
  }
  const att = data as unknown as { attempt_id?: string } | null;
  const attemptId = att?.attempt_id ?? null;
  if (!attemptId) return null;

  // Une opération de démarrage idempotente peut rejouer une ancienne tentative
  // désormais neutralisée après incident. Elle ne doit jamais être réutilisée :
  // ses réponses seraient refusées avec ATTEMPT_CLOSED. Une réouverture n'est
  // permise que si cette tentative figure explicitement au journal append-only
  // des neutralisations administratives.
  const [{ data: etat, error: erreurEtat }, { data: neutralisation, error: erreurNeutralisation }] = await Promise.all([
    supabase.from("exam_attempts_v2").select("etat").eq("attempt_id", attemptId).maybeSingle(),
    supabase
      .from("core_tentatives_neutralisees")
      .select("attempt_id")
      .eq("attempt_id", attemptId)
      .maybeSingle(),
  ]);
  const etatRejoue = (etat as { etat?: string } | null)?.etat;
  // État illisible = échec fermé : renvoyer l'ancien ID pourrait refaire
  // échouer toutes les réponses avec ATTEMPT_CLOSED.
  if (erreurEtat || erreurNeutralisation || !etatRejoue) {
    console.warn("[PontV2] état de tentative illisible, ouverture interrompue:", {
      attemptId,
      etat: erreurEtat?.message,
      neutralisation: erreurNeutralisation?.message,
    });
    return null;
  }

  const relireNouvelleOuverture = async (recree: unknown): Promise<string | null> => {
    const nouvelId = (recree as { attempt_id?: string } | null)?.attempt_id ?? null;
    if (!nouvelId || nouvelId === attemptId) return null;
    const { data: etatNouveau, error: erreurEtatNouveau } = await supabase
      .from("exam_attempts_v2")
      .select("etat")
      .eq("attempt_id", nouvelId)
      .maybeSingle();
    if (erreurEtatNouveau || (etatNouveau as { etat?: string } | null)?.etat !== "en_cours") return null;
    return nouvelId;
  };

  // Toute tentative fermée (terminee, abandonnee après remise à zéro…) non
  // neutralisée n'est jamais reprise : ses réponses seraient refusées.
  if (etatRejoue !== "en_cours" && (!neutralisation || etatRejoue !== "terminee")) {
    console.warn("[PontV2] tentative clôturée rejouée, nouvelle ouverture demandée:", attemptId);
    const opFraiche = await operationId(`start-after-closed:${attemptId}:${Date.now()}`);
    const { data: recree, error: erreurRecree } = await demarrer(opFraiche);
    if (erreurRecree) {
      if (erreurRecree.code === 'P0551') throw new Error(erreurRecree.message);
      console.warn("[PontV2] ouverture après tentative clôturée refusée:", erreurRecree.message);
      return null;
    }
    return relireNouvelleOuverture(recree);
  }
  if (etatRejoue === "terminee" && neutralisation) {
    const reopenOp = await operationId(`reopen:${attemptId}`);
    const { data: reopened, error: reopenError } = await demarrer(reopenOp);
    if (reopenError) {
      if (reopenError.code === 'P0551') throw new Error(reopenError.message);
      console.warn("[PontV2] réouverture administrative refusée:", reopenError.message);
      return null;
    }
    return relireNouvelleOuverture(reopened);
  }
  return attemptId;
}

/**
 * Un appel sans réponse (réseau figé) ne doit jamais bloquer la file ni le
 * verrou inter-onglets : au-delà de ce délai il est traité comme une coupure.
 * Le renvoi reste sans effet double (operation_id déterministe, révision CAS).
 */
export const DELAI_MAX_APPEL_MS = 20_000;
async function avecDelaiMax<T>(appel: PromiseLike<T>): Promise<T | { data: null; error: { message: string } }> {
  let minuteur: ReturnType<typeof setTimeout> | null = null;
  const delai = new Promise<{ data: null; error: { message: string } }>((resoudre) => {
    minuteur = setTimeout(() => resoudre({ data: null, error: { message: "CLIENT_TIMEOUT Failed to fetch" } }), DELAI_MAX_APPEL_MS);
  });
  try {
    return await Promise.race([Promise.resolve(appel), delai]);
  } finally {
    if (minuteur) clearTimeout(minuteur);
  }
}

/** Enregistre une réponse dans le noyau (append-only + révision serveur). */
export async function enregistrerReponse(params: {
  attemptId: string;
  matiereId: string;
  questionId: number | string;
  valeur: unknown;
  revisionAttendue?: number | null;
  clientSavedAt?: string;
}): Promise<{ ok: boolean; revision?: number; message?: string }> {
  const qid = idQuestionNoyau(params.matiereId, params.questionId);
  // La révision attendue fait partie de la clé d'idempotence : sans cela, revenir
  // à une valeur déjà envoyée (A → B → A) rejouerait l'ancienne opération.
  const rev = params.revisionAttendue ?? null;
  const op = await operationId(
    rev == null
      ? `answer:${params.attemptId}:${qid}:${JSON.stringify(params.valeur ?? null)}`
      : `answer:${params.attemptId}:${qid}:r${rev}:${JSON.stringify(params.valeur ?? null)}`,
  );
  // U+0000 : le noyau V2 n'a pas de conservation exacte (answer_state jsonb). Refus local
  // déterministe, sans appel réseau ni boucle ; la copie de référence passe par
  // upsert-reponse-apprenant (original exact) et la file locale conserve la saisie.
  if (contientNul(params.valeur)) return { ok: false, message: "NUL_NON_TRANSMISSIBLE_V2" };
  const valeurTransport = params.valeur ?? null;
  const sauvegarder = (operation: string, revision: number | null) => supabase.rpc("core_save_answer", {
    p_operation_id: operation,
    p_attempt_id: params.attemptId,
    p_question_id: qid,
    p_valeur: valeurTransport as unknown as never,
    p_expected_revision: revision,
    p_session_origine: "passage_apprenant",
  });
  // Réponse absente (coupure) : traitée comme une erreur réseau, la réponse reste en file.
  let { data, error } = (await avecDelaiMax(sauvegarder(op, params.revisionAttendue ?? null))) ?? {
    data: null,
    error: { message: "Failed to fetch" },
  };
  if (error && /ANSWER_STALE_REVISION|P0409/i.test(error.message)) {
    const { data: courant, error: lectureError } = await supabase
      .from("answer_state")
      .select("revision, valeur, updated_at")
      .eq("attempt_id", params.attemptId)
      .eq("question_id", qid)
      .maybeSingle();
    if (lectureError || !courant) return { ok: false, message: error.message };
    if (JSON.stringify(courant.valeur) === JSON.stringify(valeurTransport)) {
      return { ok: true, revision: courant.revision };
    }
    // Le serveur possède une autre réponse plus récente : aucun arbitrage
    // automatique. La réponse locale sera conservée dans la file écartée et le
    // conflit journalisé, mais elle ne doit pas bloquer les questions suivantes.
    return { ok: false, message: "ANSWER_STALE_REVISION_CONFLICT" };
  }
  if (error) return { ok: false, message: error.message };
  const res = data as unknown as { revision?: number } | null;
  return { ok: true, revision: res?.revision };
}

/** Finalise la matière : crée les QRC en attente puis publie le résultat serveur. */
export async function finaliserMatiere(params: {
  attemptId: string;
  matiereId: string;
  questionsQRC: (number | string)[];
}): Promise<{ ok: boolean; message?: string }> {
  const op = await operationId(`finalize:${params.attemptId}`);
  const { error } = await supabase.rpc("core_finalize_attempt", {
    p_operation_id: op,
    p_attempt_id: params.attemptId,
    p_qrc_questions: params.questionsQRC.map((q) => idQuestionNoyau(params.matiereId, q)),
    p_resultat: {} as unknown as never,
  });
  if (error) return { ok: false, message: error.message };

  const { error: erreurNote } = await supabase.rpc("core_recalc_result", { p_attempt_id: params.attemptId });
  if (erreurNote) return { ok: false, message: erreurNote.message };
  demanderCorrectionIa(params.attemptId);
  return { ok: true };
}

/**
 * Demande (sans attendre) la correction IA des QRC du passage. Le serveur
 * décide seul : interrupteur, e-learning, nouveau passage, règles d'exclusion,
 * idempotence. Un échec n'a aucun effet sur la copie : les QRC restent à
 * corriger par le formateur.
 */
export function demanderCorrectionIa(attemptId: string): void {
  try {
    void supabase.functions
      .invoke("qrc-ia-correction", { body: { attempt_id: attemptId } })
      .catch(() => undefined);
  } catch {
    /* jamais bloquant */
  }
}

// ---------------------------------------------------------------------------
// FILE D'ATTENTE DURABLE (hors ligne)
// ---------------------------------------------------------------------------
// Une réponse saisie hors connexion n'est jamais perdue : elle attend dans le
// navigateur et repart au retour du réseau. Les identifiants d'opération étant
// déterministes, un renvoi ne peut pas créer de doublon côté serveur.
//
// STABILISATION 13/11 — trois garanties supplémentaires :
//  1. stockage refusé/saturé : repli sessionStorage puis mémoire, état exposé
//     (etatStockageFileNoyau) pour une alerte visible ; rien n'est retiré tant
//     que le serveur n'a pas confirmé ;
//  2. plusieurs onglets : chaque mutation relit le stockage partagé (aucun
//     onglet n'écrase la file d'un autre), chaque élément a un identifiant
//     unique, la valeur la plus récente d'une question est choisie par
//     horodatage et un verrou inter-onglets (Web Locks) garantit un seul envoi
//     à la fois pour tout le navigateur ;
//  3. le délai de nouvel essai ne dépasse jamais 30 s, aléa compris.

const CLE_FILE = "noyau_v2_answer_queue_v1";
const CLE_FILE_ECARTEE = "noyau_v2_answer_queue_parked_v1";
const CLE_FILE_RESOLUE = "noyau_v2_answer_queue_resolved_v1";
const CLE_REVISIONS = "noyau_v2_revisions_confirmees_v1";
const NOM_VERROU = "noyau_v2_answer_queue_lock_v1";

type ElementFile = {
  attemptId: string;
  matiereId: string;
  questionId: number | string;
  valeur: unknown;
  at: string;
  /** Identifiant unique de l'élément (absent des files écrites avant le 13/11). */
  uid?: string;
  /** Ordre d'arrivée dans l'onglet (départage deux saisies de la même milliseconde). */
  seq?: number;
};

/** durable = localStorage ; session = repli sessionStorage (onglet) ; memoire = rien ne survit à la fermeture. */
export type EtatStockageFileNoyau = "durable" | "session" | "memoire";

const cleElement = (e: { attemptId: string; matiereId: string; questionId: number | string }) =>
  `${e.attemptId}|${e.matiereId}|${String(e.questionId)}`;
const uidDe = (e: ElementFile) => e.uid ?? `ancien|${cleElement(e)}|${e.at}`;
/** Ordre chronologique : horodatage puis ordre d'arrivée. */
const comparer = (a: ElementFile, b: ElementFile) =>
  String(a.at).localeCompare(String(b.at)) || (a.seq ?? 0) - (b.seq ?? 0);

let sequenceOnglet = 0;
const nouvelUid = () => {
  try { return crypto.randomUUID(); } catch { return `u${Date.now()}-${Math.random().toString(36).slice(2)}-${++sequenceOnglet}`; }
};

let etatStockage: EtatStockageFileNoyau = "durable";
const abonnes = new Set<() => void>();
function notifier(): void {
  for (const abonne of abonnes) { try { abonne(); } catch { /* un écran défaillant ne bloque jamais la file */ } }
}

/** État réel de conservation locale des réponses non encore confirmées. */
/** Sonde réelle du stockage : après un rechargement, l'alerte doit apparaître avant toute nouvelle saisie. */
function sonderStockage(): EtatStockageFileNoyau {
  const { local, session } = magasins();
  const essayer = (m: Storage | null) => {
    if (!m) return false;
    try { m.setItem("noyau_v2_sonde_stockage", "1"); m.removeItem("noyau_v2_sonde_stockage"); return true; } catch { return false; }
  };
  return essayer(local) ? "durable" : essayer(session) ? "session" : "memoire";
}
let stockageSonde = false;
export function etatStockageFileNoyau(): EtatStockageFileNoyau {
  if (!stockageSonde) { stockageSonde = true; etatStockage = sonderStockage(); }
  return etatStockage;
}

/** Abonnement aux changements de la file (ajout, confirmation, stockage, autre onglet). */
export function surveillerFileNoyau(rappel: () => void): () => void {
  abonnes.add(rappel);
  return () => { abonnes.delete(rappel); };
}

function magasins(): { local: Storage | null; session: Storage | null } {
  let local: Storage | null = null;
  let session: Storage | null = null;
  try { local = (globalThis as { localStorage?: Storage }).localStorage ?? null; } catch { local = null; }
  try { session = (globalThis as { sessionStorage?: Storage }).sessionStorage ?? null; } catch { session = null; }
  return { local, session };
}

function lireTableau(magasin: Storage | null, cle: string): ElementFile[] {
  if (!magasin) return [];
  try {
    const brut = magasin.getItem(cle);
    const parsed = brut ? JSON.parse(brut) : [];
    return Array.isArray(parsed) ? (parsed as ElementFile[]) : [];
  } catch {
    return [];
  }
}

/**
 * Par liste : éléments que cet onglet n'a pas pu écrire (repli mémoire) et
 * éléments que cet onglet a retirés après confirmation (jamais ressuscités
 * depuis une ancienne copie restée dans un stockage).
 */
type Tampon = { nonPersistes: ElementFile[] | null; retires: Set<string> };
const tampons = new Map<string, Tampon>();
const tampon = (cle: string): Tampon => {
  let t = tampons.get(cle);
  if (!t) { t = { nonPersistes: null, retires: new Set() }; tampons.set(cle, t); }
  return t;
};

function lireListe(cle: string): ElementFile[] {
  const { local, session } = magasins();
  const t = tampon(cle);
  const vus = new Map<string, ElementFile>();
  for (const e of [...lireTableau(local, cle), ...lireTableau(session, cle), ...(t.nonPersistes ?? [])]) {
    if (!e || typeof e !== "object") continue;
    const u = uidDe(e);
    if (t.retires.has(u) || vus.has(u)) continue;
    vus.set(u, e);
  }
  return [...vus.values()].sort(comparer);
}

function ecrireListe(cle: string, liste: ElementFile[]): EtatStockageFileNoyau {
  const { local, session } = magasins();
  const t = tampon(cle);
  const json = JSON.stringify(liste);
  let etat: EtatStockageFileNoyau = "memoire";
  try {
    if (!local) throw new Error("localStorage indisponible");
    local.setItem(cle, json);
    etat = "durable";
    // Copie de repli devenue inutile : retirée pour ne jamais ressusciter un élément confirmé.
    try { session?.removeItem(cle); } catch { /* les identifiants retirés restent filtrés */ }
  } catch {
    try {
      if (!session) throw new Error("sessionStorage indisponible");
      session.setItem(cle, json);
      etat = "session";
      // L'ancienne copie locale n'est retirée qu'APRÈS une écriture de repli réussie.
      try { local?.removeItem(cle); } catch { /* filtrée par les identifiants retirés */ }
    } catch {
      etat = "memoire";
    }
  }
  t.nonPersistes = etat === "memoire" ? [...liste] : null;
  return etat;
}

/** Mutation atomique dans l'onglet : relit le stockage partagé, applique, réécrit. */
function muterListe(cle: string, mutation: (liste: ElementFile[]) => ElementFile[]): ElementFile[] {
  const avant = lireListe(cle);
  const apres = mutation([...avant]);
  const gardes = new Set(apres.map(uidDe));
  const t = tampon(cle);
  for (const e of avant) if (!gardes.has(uidDe(e))) t.retires.add(uidDe(e));
  const etat = ecrireListe(cle, apres);
  if (cle === CLE_FILE) { etatStockage = etat; stockageSonde = true; }
  notifier();
  return apres;
}

const lireFile = () => lireListe(CLE_FILE);
const lireEcartees = () => lireListe(CLE_FILE_ECARTEE);

let envoiEnCours = false;
let uidEnVol: string | null = null;
// Délai de nouvel essai PAR passage : la panne d'une ancienne tentative ne retarde jamais la tentative ouverte.
const attentes = new Map<string, { echecs: number; prochainEssaiMs: number }>();
const enAttenteReseau = (attemptId: string) => (attentes.get(attemptId)?.prochainEssaiMs ?? 0) > Date.now();
let minuteurReessai: ReturnType<typeof setTimeout> | null = null;
let minuteurVerrou: ReturnType<typeof setTimeout> | null = null;
export const DELAI_REESSAI_MIN_MS = 1_000;
export const DELAI_REESSAI_MAX_MS = 30_000;
/** Un autre onglet envoie déjà : nouvelle vérification après ce délai. */
export const DELAI_VERROU_OCCUPE_MS = 1_500;

/** Délai avant nouvel essai : 1 s, 2 s, 4 s… avec ±30 % d'aléa, jamais plus de 30 s. */
export function delaiReessai(echecs: number, alea: number = Math.random()): number {
  const base = Math.min(DELAI_REESSAI_MAX_MS, DELAI_REESSAI_MIN_MS * 2 ** Math.max(0, echecs - 1));
  return Math.min(DELAI_REESSAI_MAX_MS, Math.round(base * (0.7 + 0.6 * alea)));
}

function planifierReessai(): void {
  if (minuteurReessai) clearTimeout(minuteurReessai);
  const prochain = Math.min(...[...attentes.values()].map((a) => a.prochainEssaiMs));
  if (!Number.isFinite(prochain)) return;
  const attente = Math.max(0, prochain - Date.now());
  minuteurReessai = setTimeout(() => { minuteurReessai = null; void viderFileNoyau(); }, attente);
}

function planifierApresVerrou(attemptId?: string | null, forcer?: boolean): void {
  if (minuteurVerrou) return;
  minuteurVerrou = setTimeout(() => {
    minuteurVerrou = null;
    void viderFileNoyau(attemptId ?? null, forcer ? { forcer: true } : undefined);
  }, DELAI_VERROU_OCCUPE_MS);
}

// Autre onglet : ses ajouts/confirmations rafraîchissent les compteurs affichés ici.
try {
  const fenetre = (globalThis as { addEventListener?: Window["addEventListener"] });
  fenetre.addEventListener?.("storage", (evenement: StorageEvent) => {
    if (!evenement.key || evenement.key === CLE_FILE || evenement.key === CLE_FILE_ECARTEE) notifier();
  });
} catch { /* environnement sans fenêtre */ }

/** Met une réponse en file puis tente de la transmettre au noyau. */
export function enfilerReponseNoyau(element: Omit<ElementFile, "at" | "uid" | "seq">): void {
  const cle = cleElement(element);
  const nouveau: ElementFile = { ...element, at: new Date().toISOString(), uid: nouvelUid(), seq: ++sequenceOnglet };
  // Remplace l'ancienne valeur en attente de la même question (jamais celle en vol dans cet onglet) :
  // la plus récente gagne, l'ordre d'arrivée des autres questions est conservé.
  muterListe(CLE_FILE, (file) => [...file.filter((e) => uidDe(e) === uidEnVol || cleElement(e) !== cle), nouveau]);
  void viderFileNoyau();
}

/**
 * HOTFIX 23/09/2026 — une réponse définitivement refusée (tentative déjà
 * clôturée, question hors snapshot, passage d'un autre examen) ne doit plus
 * bloquer la file entière : elle est MISE DE CÔTÉ (jamais supprimée) pour que
 * les réponses de la matière en cours puissent partir et que « Terminer la
 * matière » redevienne possible.
 */
function ecarter(element: ElementFile): void {
  const copie = { ...element, uid: uidDe(element) };
  muterListe(CLE_FILE_ECARTEE, (liste) => (liste.some((e) => uidDe(e) === copie.uid) ? liste : [...liste, copie]));
}

export type ResultatRemappageFileNoyau = {
  ok: boolean;
  correspondance: number;
  recuperees: number;
  questionInvalide?: string;
};

/**
 * Réouverture administrative après incident : rattache les réponses locales de
 * la tentative neutralisée à la nouvelle tentative, mais uniquement si les
 * identifiants correspondent EXACTEMENT au snapshot officiel.
 *
 * Les éléments d'origine restent dans la file écartée (preuve locale, aucune
 * suppression). Une seule copie, la plus récente par question, est ajoutée à
 * la file active avec le nouvel attemptId. Aucun rapprochement par position ou
 * par texte n'est permis.
 */
export function remapperFileApresReouverture(params: {
  anciensAttemptIds: string[];
  nouvelAttemptId: string;
  matiereId: string;
  questionIdsSnapshot: string[];
}): ResultatRemappageFileNoyau {
  const anciens = new Set(params.anciensAttemptIds.filter((id) => id && id !== params.nouvelAttemptId));
  const attendues = new Set(params.questionIdsSnapshot.map(String));
  if (anciens.size === 0 || attendues.size === 0) return { ok: false, correspondance: 0, recuperees: 0 };

  const active = lireFile();
  const parked = lireEcartees();
  const concerne = (e: ElementFile) => anciens.has(e.attemptId) && String(e.matiereId) === String(params.matiereId);
  const candidates = [...parked, ...active].filter(concerne).sort(comparer);

  const dernierParQuestion = new Map<string, ElementFile>();
  for (const element of candidates) {
    const id = idQuestionNoyau(params.matiereId, element.questionId);
    if (!attendues.has(id)) {
      return { ok: false, correspondance: dernierParQuestion.size, recuperees: 0, questionInvalide: id };
    }
    dernierParQuestion.set(id, element);
  }
  // Couverture partielle acceptée : chaque réponse locale appartient déjà au
  // snapshot officiel (contrôle ci-dessus). Les questions absentes restent
  // simplement à répondre ; aucune réponse n'est inventée ni écrasée.
  if (dernierParQuestion.size === 0) return { ok: false, correspondance: 0, recuperees: 0 };

  // Toute ancienne entrée encore active est d'abord conservée dans la file
  // écartée. Elle ne sera donc plus jamais envoyée vers ATTEMPT_CLOSED.
  for (const element of active.filter(concerne)) ecarter(element);
  muterListe(CLE_FILE, (file) => {
    const autres = file.filter((e) => !concerne(e));
    const dejaNouvelles = new Set(
      autres
        .filter((e) => e.attemptId === params.nouvelAttemptId && String(e.matiereId) === String(params.matiereId))
        .map((e) => idQuestionNoyau(params.matiereId, e.questionId)),
    );
    const remappees = [...dernierParQuestion.entries()]
      .filter(([id]) => !dejaNouvelles.has(id))
      .map(([, element]) => ({
        ...element,
        attemptId: params.nouvelAttemptId,
        at: new Date().toISOString(),
        uid: nouvelUid(),
        seq: ++sequenceOnglet,
      }));
    return [...autres, ...remappees];
  });
  return { ok: true, correspondance: attendues.size, recuperees: dernierParQuestion.size };
}

/** Refus définitif du serveur : réessayer à l'infini n'y changera rien. */
function refusDefinitif(message?: string): boolean {
  const m = String(message ?? "");
  return /ATTEMPT_CLOSED|ATTEMPT_NOT_FOUND|QUESTION_NOT_IN_SNAPSHOT|NOT_OWNER|P0001|permission denied|NUL_NON_TRANSMISSIBLE_V2|22P05/i.test(m);
}

/** Réponses définitivement refusées et conservées pour la tentative donnée. */
export function reponsesNoyauEcartees(attemptId?: string | null): number {
  const ecartees = lireEcartees();
  return attemptId ? ecartees.filter((e) => e.attemptId === attemptId).length : ecartees.length;
}

/** Identifiants stables des réponses refusées pour colorer honnêtement l'écran. */
export function questionsNoyauEcartees(attemptId?: string | null): Set<string> {
  return new Set(
    lireEcartees()
      .filter((e) => !attemptId || e.attemptId === attemptId)
      .map((e) => idQuestionNoyau(e.matiereId, e.questionId)),
  );
}

// ---------------------------------------------------------------------------
// NUMÉROS DE VERSION CONFIRMÉS (correctif 26/09/2026)
// ---------------------------------------------------------------------------
// Sans numéro, core_save_answer refuse toute modification (P0409) : seule la
// première réponse arrivait au noyau. Chaque tablette retient le dernier numéro
// confirmé par le serveur pour chaque question et l'envoie avec la réponse.
// Si un autre appareil a modifié la réponse, le numéro ne correspond plus :
// refus serveur, mise de côté, jamais d'écrasement. Les numéros sont partagés
// entre onglets (stockage) et doublés en mémoire si le stockage est refusé.
const cleRevision = (attemptId: string, qid: string) => `${attemptId}|${qid}`;
const revisionsChargees = new Set<string>();
const revisionsMemoire: Record<string, number> = {};
/** Dernière valeur confirmée par le serveur (mémoire de page) : un renvoi identique ne crée pas de nouvelle révision. */
const valeursConfirmees = new Map<string, string>();

function lireRevisions(): Record<string, number> {
  const fusion: Record<string, number> = { ...revisionsMemoire };
  const { local, session } = magasins();
  for (const magasin of [local, session]) {
    if (!magasin) continue;
    try {
      const brut = magasin.getItem(CLE_REVISIONS);
      const parsed = brut ? JSON.parse(brut) : {};
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
      for (const [cle, rev] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof rev === "number" && !(typeof fusion[cle] === "number" && fusion[cle] >= rev)) fusion[cle] = rev;
      }
    } catch { /* stockage illisible : la mémoire de page reste utilisée */ }
  }
  return fusion;
}

function memoriserRevision(cle: string, revision: number): void {
  const courant = lireRevisions();
  // Un numéro ne recule jamais.
  if (typeof courant[cle] === "number" && courant[cle] >= revision) return;
  revisionsMemoire[cle] = revision;
  const json = JSON.stringify({ ...courant, [cle]: revision });
  const { local, session } = magasins();
  try { if (!local) throw new Error(); local.setItem(CLE_REVISIONS, json); return; } catch { /* repli */ }
  try { session?.setItem(CLE_REVISIONS, json); } catch { /* mémoire de page : le serveur refuse au pire, rien n'est écrasé */ }
}

/** Charge une fois par page les numéros de version serveur d'un passage (lecture seule). */
async function chargerRevisionsServeur(attemptId: string): Promise<void> {
  if (revisionsChargees.has(attemptId)) return;
  try {
    const { data, error } = await supabase
      .from("answer_state")
      .select("question_id, revision, valeur")
      .eq("attempt_id", attemptId);
    if (error) return; // nouvel essai au prochain vidage
    for (const r of (data as { question_id?: string; revision?: number; valeur?: unknown }[] | null) ?? []) {
      if (!r?.question_id || typeof r.revision !== "number") continue;
      const cle = cleRevision(attemptId, String(r.question_id));
      memoriserRevision(cle, r.revision);
      valeursConfirmees.set(cle, JSON.stringify(r.valeur ?? null));
    }
    revisionsChargees.add(attemptId);
  } catch {
    /* nouvel essai au prochain vidage */
  }
}

/** Réservé aux tests : simule un rechargement de page (la mémoire de l'onglet disparaît). */
export function __simulerRechargementPourTests(): void {
  attentes.clear(); uidEnVol = null; envoiEnCours = false;
  if (minuteurReessai) { clearTimeout(minuteurReessai); minuteurReessai = null; }
  if (minuteurVerrou) { clearTimeout(minuteurVerrou); minuteurVerrou = null; }
  revisionsChargees.clear();
  valeursConfirmees.clear();
  tampons.clear();
  for (const cle of Object.keys(revisionsMemoire)) delete revisionsMemoire[cle];
  etatStockage = "durable";
  stockageSonde = false;
}

type Verrous = { request: (nom: string, options: { ifAvailable: boolean }, rappel: (verrou: unknown) => Promise<unknown>) => Promise<unknown> };

/**
 * Un seul envoi à la fois pour tout le navigateur. Sans Web Locks (anciens
 * navigateurs, tests), le verrou d'onglet suffit : l'idempotence et les numéros
 * de version serveur empêchent toujours un double effet ou un écrasement.
 */
async function sousVerrou(travail: () => Promise<void>): Promise<boolean> {
  const verrous = (globalThis as { navigator?: { locks?: Verrous } }).navigator?.locks;
  if (!verrous?.request) { await travail(); return true; }
  let obtenu = false;
  await verrous.request(NOM_VERROU, { ifAvailable: true }, async (verrou) => {
    if (!verrou) return;
    obtenu = true;
    await travail();
  });
  return obtenu;
}

/** Vide la file séquentiellement. Une réponse ne quitte la file qu'une fois confirmée. */
export async function viderFileNoyau(attemptId?: string | null, options?: { forcer?: boolean }): Promise<{ restantes: number }> {
  const compter = (f: ElementFile[]) => (attemptId ? f.filter((e) => e.attemptId === attemptId).length : f.length);
  if (envoiEnCours) return { restantes: compter(lireFile()) };
  // Pendant le délai de nouvel essai, seules les actions explicites (terminer, retour réseau) relancent.
  if (!options?.forcer && attemptId && enAttenteReseau(attemptId)) return { restantes: compter(lireFile()) };
  envoiEnCours = true;
  try {
    const obtenu = await sousVerrou(async () => {
      for (;;) {
        // Relu à chaque tour : les ajouts de cet onglet et des autres sont pris en compte.
        const file = lireFile();
        // Un vidage ciblé ne doit jamais être bloqué par une ancienne file d'un autre passage.
        const element = file.find((e) => (attemptId ? e.attemptId === attemptId : options?.forcer || !enAttenteReseau(e.attemptId)));
        if (!element) break;
        const uid = uidDe(element);
        const retirer = () => muterListe(CLE_FILE, (f) => f.filter((e) => uidDe(e) !== uid));
        // Une valeur plus récente de la même question attend déjà : l'ancienne n'est jamais envoyée.
        if (file.some((e) => e !== element && cleElement(e) === cleElement(element) && comparer(e, element) > 0)) { retirer(); continue; }
        uidEnVol = uid;
        // Reprise (F5, autre tablette) : numéros de version de ce passage lus une
        // fois depuis le serveur avant le premier envoi.
        await chargerRevisionsServeur(element.attemptId);
        const cleRev = cleRevision(element.attemptId, idQuestionNoyau(element.matiereId, element.questionId));
        const revisionConnue = lireRevisions()[cleRev];
        // Valeur identique à la dernière confirmée : envoi sans numéro, le serveur
        // répond « déjà enregistré » sans créer de nouvelle révision.
        const identique = valeursConfirmees.get(cleRev) === JSON.stringify(element.valeur ?? null);
        const res = await enregistrerReponse({
          attemptId: element.attemptId,
          matiereId: element.matiereId,
          questionId: element.questionId,
          valeur: element.valeur,
          revisionAttendue: !identique && typeof revisionConnue === "number" ? revisionConnue : null,
          clientSavedAt: element.at,
        });
        uidEnVol = null;
        if (res.ok && typeof res.revision === "number") {
          memoriserRevision(cleRev, res.revision);
          valeursConfirmees.set(cleRev, JSON.stringify(element.valeur ?? null));
        }
        if (!res.ok) {
          if (res.message === "ANSWER_STALE_REVISION_CONFLICT") {
            ecarter(element);
            console.warn("[PontV2] conflit P0409 conservé sans écrasement", {
              attemptId: element.attemptId,
              questionId: idQuestionNoyau(element.matiereId, element.questionId),
            });
            retirer();
            continue;
          }
          if (!refusDefinitif(res.message)) {
            const echecs = (attentes.get(element.attemptId)?.echecs ?? 0) + 1;
            attentes.set(element.attemptId, { echecs, prochainEssaiMs: Date.now() + delaiReessai(echecs) });
            planifierReessai();
            console.warn("[PontV2] réponse conservée pour nouvel essai", {
              attemptId: element.attemptId,
              questionId: idQuestionNoyau(element.matiereId, element.questionId),
              message: res.message,
              essaiDans_ms: (attentes.get(element.attemptId)?.prochainEssaiMs ?? 0) - Date.now(),
            });
            break; // réseau : on garde l'ordre et on réessaiera
          }
          // Refus définitif : la réponse est conservée à part, la file continue.
          ecarter(element);
          console.warn("[PontV2] réponse mise de côté (refus définitif):", res.message);
        } else {
          attentes.delete(element.attemptId);
        }
        retirer();
      }
    });
    // Un autre onglet envoie : il traite aussi nos réponses (file partagée) ; nouvelle vérification bientôt.
    if (!obtenu && compter(lireFile()) > 0) planifierApresVerrou(attemptId, options?.forcer);
    return { restantes: compter(lireFile()) };
  } finally {
    uidEnVol = null;
    envoiEnCours = false;
  }
}

/** Nombre de réponses encore non confirmées par le noyau (pour cette tentative si précisée). */
export function reponsesNoyauEnAttente(attemptId?: string | null): number {
  const file = lireFile();
  return attemptId ? file.filter((e) => e.attemptId === attemptId).length : file.length;
}


// ---------------------------------------------------------------------------
// RÈGLE 1 — LE SERVEUR FAIT FOI QUAND IL POSSÈDE TOUTES LES RÉPONSES
// ---------------------------------------------------------------------------
// Quand le serveur confirme 100 % des réponses d'une matière, les marqueurs
// techniques locaux (file en attente, refus historiques) sont obsolètes : ils
// ne doivent plus afficher d'alerte ni bloquer la clôture. Ils sont ARCHIVÉS
// (jamais supprimés) dans une clé dédiée, et AUCUNE réponse n'est effacée.

/**
 * Retire des files techniques les éléments dont la réponse est DÉJÀ confirmée
 * par le serveur pour cette tentative. Renvoie le nombre d'éléments archivés.
 */
export function archiverMarqueursObsoletes(
  attemptId: string,
  questionsConfirmees: Set<string>,
): number {
  const estObsolete = (e: ElementFile) =>
    e.attemptId === attemptId && questionsConfirmees.has(idQuestionNoyau(e.matiereId, e.questionId));
  let total = 0;
  for (const cle of [CLE_FILE_ECARTEE, CLE_FILE]) {
    const obsoletes = lireListe(cle).filter(estObsolete);
    if (obsoletes.length === 0) continue;
    // Archive d'abord ; le retrait n'a lieu que si l'archive est bien conservée.
    const archives = new Set(obsoletes.map(uidDe));
    const etatArchive = (() => {
      const avant = lireListe(CLE_FILE_RESOLUE);
      const deja = new Set(avant.map(uidDe));
      return ecrireListe(CLE_FILE_RESOLUE, [...avant, ...obsoletes.filter((e) => !deja.has(uidDe(e))).map((e) => ({ ...e, uid: uidDe(e) }))]);
    })();
    if (etatArchive === "memoire") continue; // archive impossible : on ne retire alors rien
    muterListe(cle, (liste) => liste.filter((e) => !archives.has(uidDe(e))));
    total += obsoletes.length;
  }
  return total;
}

/**
 * RÈGLE 2 — secours anti-blocage : archive l'ancienne tentative et ouvre une
 * nouvelle tentative propre pour CETTE matière uniquement (chrono complet,
 * snapshot officiel). Aucune donnée n'est supprimée, aucun doublon possible.
 */
export async function recommencerMatiereNoyau(
  attemptId: string,
  motif = "synchronisation_impossible",
): Promise<{ ok: boolean; attemptId?: string; message?: string }> {
  const op = await operationId(`restart-matiere:${attemptId}:${Date.now()}`);
  const { data, error } = await supabase.rpc("core_restart_matiere", {
    p_operation_id: op,
    p_attempt_id: attemptId,
    p_motif: motif,
  });
  if (error) return { ok: false, message: error.message };
  const nouvelle = (data as unknown as { attempt_id?: string } | null)?.attempt_id ?? null;
  if (!nouvelle) return { ok: false, message: "REPRISE_IMPOSSIBLE" };
  return { ok: true, attemptId: nouvelle };
}
