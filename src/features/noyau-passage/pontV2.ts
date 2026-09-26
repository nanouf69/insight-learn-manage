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
  matieres: { subject_id: string; titre: string; ordre: number; duree: number; coefficient: number; note_sur: number }[];
  questions: {
    id: string;
    matiere: string;
    ordre: number;
    type: string;
    enonce: string;
    choix: Question["choix"] | null;
    reponseQRC: string | null;
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
          choix: q.choix ?? null,
          reponseQRC: q.reponseQRC ?? null,
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
export async function pontActifPour(apprenantId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("core_bridge_actif_pour", { p_apprenant_id: apprenantId });
  if (error) return false;
  return data === true;
}

/** Le sujet est-il publié dans le noyau (version active non retirée) ? */
export async function sujetPublieDansNoyau(examenId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("exam_content_versions")
    .select("id")
    .eq("exam_id", examenId)
    .eq("statut", "publiee")
    .is("retired_at", null)
    .limit(1);
  if (error) return false;
  return (data ?? []).length > 0;
}

/** Une tentative V2 existe-t-elle déjà pour ce passage ? (reprise, jamais changement de moteur) */
export async function tentativeV2Existante(apprenantId: string, examenId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("exam_attempts_v2")
    .select("attempt_id")
    .eq("apprenant_id", apprenantId)
    .eq("exam_id", examenId)
    .limit(1);
  if (error) return false;
  return (data ?? []).length > 0;
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
  if (!(await pontActifPour(params.apprenantId))) return { moteur: "ancien", motif: "pont_inactif" };
  if (!(await sujetPublieDansNoyau(params.examenId))) return { moteur: "ancien", motif: "sujet_non_publie" };

  const reprise = await tentativeV2Existante(params.apprenantId, params.examenId);
  if (!reprise && params.passageDejaEngage) return { moteur: "ancien", motif: "passage_deja_engage" };

  const attemptId = await demarrerTentative(params);
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
  const [{ data: etat }, { data: neutralisation }] = await Promise.all([
    supabase.from("exam_attempts_v2").select("etat").eq("attempt_id", attemptId).maybeSingle(),
    supabase
      .from("core_tentatives_neutralisees")
      .select("attempt_id")
      .eq("attempt_id", attemptId)
      .maybeSingle(),
  ]);
  if ((etat as { etat?: string } | null)?.etat === "terminee" && !neutralisation) {
    // CAUSE COMMUNE Kevin/Thierno : le rejeu idempotent renvoie une tentative
    // clôturée. On ne la réutilise JAMAIS (ses réponses seraient refusées avec
    // ATTEMPT_CLOSED) et on ne bloque plus l'apprenant : on redemande au noyau
    // une ouverture avec une nouvelle opération. Le serveur reste l'autorité
    // (règle des 48 h, propriété, version publiée) : s'il refuse, on bloque.
    console.warn("[PontV2] tentative clôturée rejouée, nouvelle ouverture demandée:", attemptId);
    const opFraiche = await operationId(`start-after-closed:${attemptId}:${Date.now()}`);
    const { data: recree, error: erreurRecree } = await demarrer(opFraiche);
    if (erreurRecree) {
      console.warn("[PontV2] ouverture après tentative clôturée refusée:", erreurRecree.message);
      return null;
    }
    const nouvelId = (recree as unknown as { attempt_id?: string } | null)?.attempt_id ?? null;
    if (!nouvelId || nouvelId === attemptId) return null;
    const { data: etatNouveau } = await supabase
      .from("exam_attempts_v2")
      .select("etat")
      .eq("attempt_id", nouvelId)
      .maybeSingle();
    if ((etatNouveau as { etat?: string } | null)?.etat !== "en_cours") return null;
    return nouvelId;
  }
  if ((etat as { etat?: string } | null)?.etat === "terminee" && neutralisation) {
    const reopenOp = await operationId(`reopen:${attemptId}`);
    const { data: reopened, error: reopenError } = await demarrer(reopenOp);
    if (reopenError) {
      console.warn("[PontV2] réouverture administrative refusée:", reopenError.message);
      return null;
    }
    return (reopened as unknown as { attempt_id?: string } | null)?.attempt_id ?? null;
  }
  return attemptId;
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
  const sauvegarder = (operation: string, revision: number | null) => supabase.rpc("core_save_answer", {
    p_operation_id: operation,
    p_attempt_id: params.attemptId,
    p_question_id: qid,
    p_valeur: (params.valeur ?? null) as unknown as never,
    p_expected_revision: revision,
    p_session_origine: "passage_apprenant",
  });
  let { data, error } = await sauvegarder(op, params.revisionAttendue ?? null);
  if (error && /ANSWER_STALE_REVISION|P0409/i.test(error.message)) {
    const { data: courant, error: lectureError } = await supabase
      .from("answer_state")
      .select("revision, valeur, updated_at")
      .eq("attempt_id", params.attemptId)
      .eq("question_id", qid)
      .maybeSingle();
    if (lectureError || !courant) return { ok: false, message: error.message };
    if (JSON.stringify(courant.valeur) === JSON.stringify(params.valeur ?? null)) {
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

const CLE_FILE = "noyau_v2_answer_queue_v1";

type ElementFile = {
  attemptId: string;
  matiereId: string;
  questionId: number | string;
  valeur: unknown;
  at: string;
};

function lireFile(): ElementFile[] {
  try {
    const brut = localStorage.getItem(CLE_FILE);
    const parsed = brut ? JSON.parse(brut) : [];
    return Array.isArray(parsed) ? (parsed as ElementFile[]) : [];
  } catch {
    return [];
  }
}

function ecrireFile(file: ElementFile[]): void {
  try {
    localStorage.setItem(CLE_FILE, JSON.stringify(file));
  } catch {
    /* la file bascule en mémoire : rien n'est effacé silencieusement */
  }
}

let fileMemoire: ElementFile[] | null = null;
let envoiEnCours = false;

/** Met une réponse en file puis tente de la transmettre au noyau. */
export function enfilerReponseNoyau(element: Omit<ElementFile, "at">): void {
  const file = fileMemoire ?? lireFile();
  file.push({ ...element, at: new Date().toISOString() });
  fileMemoire = file;
  ecrireFile(file);
  void viderFileNoyau();
}

/**
 * HOTFIX 23/09/2026 — une réponse définitivement refusée (tentative déjà
 * clôturée, question hors snapshot, passage d'un autre examen) ne doit plus
 * bloquer la file entière : elle est MISE DE CÔTÉ (jamais supprimée) pour que
 * les réponses de la matière en cours puissent partir et que « Terminer la
 * matière » redevienne possible.
 */
const CLE_FILE_ECARTEE = "noyau_v2_answer_queue_parked_v1";

function lireEcartees(): ElementFile[] {
  try {
    const brut = localStorage.getItem(CLE_FILE_ECARTEE);
    const parsed = brut ? JSON.parse(brut) : [];
    return Array.isArray(parsed) ? (parsed as ElementFile[]) : [];
  } catch {
    return [];
  }
}

function ecarter(element: ElementFile): void {
  try {
    localStorage.setItem(CLE_FILE_ECARTEE, JSON.stringify([...lireEcartees(), element]));
  } catch {
    /* rien n'est effacé : au pire l'élément reste seulement en mémoire */
  }
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

  const active = fileMemoire ?? lireFile();
  const parked = lireEcartees();
  const candidates = [...parked, ...active]
    .filter((e) => anciens.has(e.attemptId) && String(e.matiereId) === String(params.matiereId))
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));

  const dernierParQuestion = new Map<string, ElementFile>();
  for (const element of candidates) {
    const id = idQuestionNoyau(params.matiereId, element.questionId);
    if (!attendues.has(id)) {
      return { ok: false, correspondance: dernierParQuestion.size, recuperees: 0, questionInvalide: id };
    }
    dernierParQuestion.set(id, element);
  }
  const idsLocales = new Set(dernierParQuestion.keys());
  // Couverture partielle acceptée : chaque réponse locale appartient déjà au
  // snapshot officiel (contrôle ci-dessus). Les questions absentes restent
  // simplement à répondre ; aucune réponse n'est inventée ni écrasée.
  if (idsLocales.size === 0) return { ok: false, correspondance: 0, recuperees: 0 };

  // Toute ancienne entrée encore active est d'abord conservée dans la file
  // écartée. Elle ne sera donc plus jamais envoyée vers ATTEMPT_CLOSED.
  const anciennesActives = active.filter(
    (e) => anciens.has(e.attemptId) && String(e.matiereId) === String(params.matiereId),
  );
  for (const element of anciennesActives) ecarter(element);
  const autresActives = active.filter(
    (e) => !(anciens.has(e.attemptId) && String(e.matiereId) === String(params.matiereId)),
  );
  const dejaNouvelles = new Set(
    autresActives
      .filter((e) => e.attemptId === params.nouvelAttemptId && String(e.matiereId) === String(params.matiereId))
      .map((e) => idQuestionNoyau(params.matiereId, e.questionId)),
  );
  const remappees = [...dernierParQuestion.entries()]
    .filter(([id]) => !dejaNouvelles.has(id))
    .map(([, element]) => ({ ...element, attemptId: params.nouvelAttemptId, at: new Date().toISOString() }));
  const prochaine = [...autresActives, ...remappees];
  fileMemoire = prochaine;
  ecrireFile(prochaine);
  return { ok: true, correspondance: attendues.size, recuperees: dernierParQuestion.size };
}

/** Refus définitif du serveur : réessayer à l'infini n'y changera rien. */
function refusDefinitif(message?: string): boolean {
  const m = String(message ?? "");
  return /ATTEMPT_CLOSED|ATTEMPT_NOT_FOUND|QUESTION_NOT_IN_SNAPSHOT|NOT_OWNER|P0001|permission denied/i.test(m);
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

/** Vide la file séquentiellement. Une réponse ne quitte la file qu'une fois confirmée. */
export async function viderFileNoyau(attemptId?: string | null): Promise<{ restantes: number }> {
  const compter = (f: ElementFile[]) => (attemptId ? f.filter((e) => e.attemptId === attemptId).length : f.length);
  if (envoiEnCours) return { restantes: compter(fileMemoire ?? lireFile()) };
  envoiEnCours = true;
  try {
    let file = fileMemoire ?? lireFile();
    let index = 0;
    while (index < file.length) {
      const element = file[index];
      // Un vidage ciblé ne doit jamais être bloqué par une ancienne file d'un
      // autre passage. Ces éléments restent conservés à leur place et seront
      // traités lorsqu'ils redeviendront la cible active.
      if (attemptId && element.attemptId !== attemptId) {
        index += 1;
        continue;
      }
      const res = await enregistrerReponse({
        attemptId: element.attemptId,
        matiereId: element.matiereId,
        questionId: element.questionId,
        valeur: element.valeur,
        clientSavedAt: element.at,
      });
      if (!res.ok) {
        if (res.message === "ANSWER_STALE_REVISION_CONFLICT") {
          ecarter(element);
          console.warn("[PontV2] conflit P0409 conservé sans écrasement", {
            attemptId: element.attemptId,
            questionId: idQuestionNoyau(element.matiereId, element.questionId),
          });
          file = [...file.slice(0, index), ...file.slice(index + 1)];
          fileMemoire = file;
          ecrireFile(file);
          continue;
        }
        if (!refusDefinitif(res.message)) {
          console.warn("[PontV2] réponse conservée pour nouvel essai", {
            attemptId: element.attemptId,
            questionId: idQuestionNoyau(element.matiereId, element.questionId),
            message: res.message,
          });
          break; // réseau/conflit : on garde l'ordre et on réessaiera
        }
        // Refus définitif : la réponse est conservée à part, la file continue.
        ecarter(element);
        console.warn("[PontV2] réponse mise de côté (refus définitif):", res.message);
      }
      file = [...file.slice(0, index), ...file.slice(index + 1)];
      fileMemoire = file;
      ecrireFile(file);
    }
    return { restantes: compter(file) };
  } finally {
    envoiEnCours = false;
  }
}

/** Nombre de réponses encore non confirmées par le noyau (pour cette tentative si précisée). */
export function reponsesNoyauEnAttente(attemptId?: string | null): number {
  const file = fileMemoire ?? lireFile();
  return attemptId ? file.filter((e) => e.attemptId === attemptId).length : file.length;
}


// ---------------------------------------------------------------------------
// RÈGLE 1 — LE SERVEUR FAIT FOI QUAND IL POSSÈDE TOUTES LES RÉPONSES
// ---------------------------------------------------------------------------
// Quand le serveur confirme 100 % des réponses d'une matière, les marqueurs
// techniques locaux (file en attente, refus historiques) sont obsolètes : ils
// ne doivent plus afficher d'alerte ni bloquer la clôture. Ils sont ARCHIVÉS
// (jamais supprimés) dans une clé dédiée, et AUCUNE réponse n'est effacée.

const CLE_FILE_RESOLUE = "noyau_v2_answer_queue_resolved_v1";

function archiver(elements: ElementFile[]): void {
  if (elements.length === 0) return;
  try {
    const brut = localStorage.getItem(CLE_FILE_RESOLUE);
    const parsed = brut ? JSON.parse(brut) : [];
    const precedent = Array.isArray(parsed) ? (parsed as ElementFile[]) : [];
    localStorage.setItem(CLE_FILE_RESOLUE, JSON.stringify([...precedent, ...elements]));
  } catch {
    /* archive impossible : on ne supprime alors rien */
  }
}

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

  const ecartees = lireEcartees();
  const ecarteesObsoletes = ecartees.filter(estObsolete);
  if (ecarteesObsoletes.length > 0) {
    archiver(ecarteesObsoletes);
    try {
      localStorage.setItem(
        CLE_FILE_ECARTEE,
        JSON.stringify(ecartees.filter((e) => !estObsolete(e))),
      );
    } catch {
      /* rien n'est supprimé si l'écriture échoue */
    }
  }

  const file = fileMemoire ?? lireFile();
  const fileObsolete = file.filter(estObsolete);
  if (fileObsolete.length > 0) {
    archiver(fileObsolete);
    const restante = file.filter((e) => !estObsolete(e));
    fileMemoire = restante;
    ecrireFile(restante);
  }

  return ecarteesObsoletes.length + fileObsolete.length;
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
