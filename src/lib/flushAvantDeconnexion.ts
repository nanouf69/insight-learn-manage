/**
 * Déconnexion sûre : toutes les files locales pouvant contenir des réponses du
 * compte actif doivent être confirmées par le serveur AVANT signOut.
 * Files cartographiées :
 *  1. answerPersistence (reponses_apprenants, quiz/modules/révisions) ;
 *  2. pont noyau V2 (answer_state des examens blancs), filtrée sur les tentatives du compte ;
 *  3. Bilans futurs 5/11 (bilan-future:v1:<compte>:<reçu>:<version>) ;
 *  4. notes de quiz en attente (apprenant_quiz_results) du compte ;
 *  5. pages de cours lues (module_pages_pending_v1:<compte>:…) ;
 *  6. brouillons de formulaires (autosave_pending_<dossier>_<type>), relus sur le serveur.
 * Aucune file n'est vidée sans accusé serveur ; les éléments d'un autre compte
 * ne sont ni envoyés ni supprimés et ne bloquent pas cette déconnexion.
 */
import { supabase } from "@/integrations/supabase/client";
import { flushOwnAnswerSavesBeforeLogout } from "@/lib/answerPersistence";
import { attemptsEnFileNoyau, viderFileNoyau } from "@/features/noyau-passage/pontV2";
import { FUTURE_QUEUE_PREFIX, flushQueue, type KV, type SaveRpc } from "@/lib/bilanFutureTransport";
import { flushQuizResultSaves, getPendingQuizResultCountFor } from "@/lib/quizResultPersistence";
import { flushModulePagesAvantDeconnexion } from "@/lib/modulePagesPersistence";
import { flushBrouillonsFormulaires } from "@/lib/brouillonsFormulaires";

export const MESSAGE_DECONNEXION_SUSPENDUE = "Déconnexion suspendue : certaines réponses ne sont pas encore confirmées par le serveur. Elles restent conservées sur cet appareil. Vérifiez votre connexion puis réessayez.";

export const MESSAGE_FORMULAIRE_A_ROUVRIR = "Déconnexion suspendue : un formulaire contient une saisie non envoyée, conservée sur cet appareil. Rouvrez ce formulaire pour terminer son enregistrement, puis réessayez.";

export type FileDeconnexion = "reponses" | "examens" | "bilans" | "notes" | "pages" | "formulaires" | "formulaires_a_rouvrir";
export interface ResultatFlushDeconnexion { ok: boolean; nonConfirmees: FileDeconnexion[] }

export interface DepsFlushDeconnexion {
  flushReponses: () => Promise<boolean>;
  attemptsNoyau: () => string[];
  attemptsDuCompte: (apprenantId: string, ids: string[]) => Promise<string[] | null>;
  viderNoyau: (attemptId: string) => Promise<{ restantes: number }>;
  kv: KV & { keys: () => string[] };
  saveBilan: SaveRpc;
  flushNotes: () => Promise<boolean>;
  notesEnAttente: (userId: string) => number;
  /** Absent dans un faux de test = file non concernée. */
  flushPages?: (userId: string) => Promise<boolean>;
  flushFormulaires?: (ctx: { userId: string | null; apprenantId: string | null }) => Promise<{ ok: boolean; aRouvrir: string[] }>;
}

const kvNavigateur = (): DepsFlushDeconnexion["kv"] => ({
  getItem: (k) => localStorage.getItem(k),
  setItem: (k, v) => localStorage.setItem(k, v),
  removeItem: (k) => localStorage.removeItem(k),
  keys: () => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter((k): k is string => !!k),
});

export const depsNavigateur = (): DepsFlushDeconnexion => ({
  flushReponses: () => flushOwnAnswerSavesBeforeLogout(),
  attemptsNoyau: attemptsEnFileNoyau,
  attemptsDuCompte: async (apprenantId, ids) => {
    const { data, error } = await supabase.from("exam_attempts_v2").select("attempt_id").eq("apprenant_id", apprenantId).in("attempt_id", ids);
    if (error) return null;
    return ((data as { attempt_id: string }[] | null) ?? []).map((r) => r.attempt_id);
  },
  viderNoyau: (id) => viderFileNoyau(id, { forcer: true }),
  kv: kvNavigateur(),
  saveBilan: (a) => (supabase as any).rpc("bilan_future_save_draft", a),
  flushNotes: flushQuizResultSaves,
  notesEnAttente: getPendingQuizResultCountFor,
  flushPages: flushModulePagesAvantDeconnexion,
  flushFormulaires: (ctx) => flushBrouillonsFormulaires(ctx),
});

export async function flushToutesFilesAvantDeconnexion(
  ctx: { userId: string | null; apprenantId: string | null },
  deps: DepsFlushDeconnexion = depsNavigateur(),
): Promise<ResultatFlushDeconnexion> {
  const nonConfirmees: FileDeconnexion[] = [];
  const essai = async (nom: FileDeconnexion, f: () => Promise<boolean>) => {
    try { if (!(await f())) nonConfirmees.push(nom); } catch { nonConfirmees.push(nom); }
  };

  await essai("reponses", deps.flushReponses);

  await essai("examens", async () => {
    const enFile = deps.attemptsNoyau();
    if (enFile.length === 0) return true;
    if (!ctx.apprenantId) return false;
    const miens = await deps.attemptsDuCompte(ctx.apprenantId, enFile);
    if (miens === null) return false; // propriété illisible : on ne conclut pas
    for (const id of miens) {
      if ((await deps.viderNoyau(id)).restantes > 0) return false;
    }
    return true;
  });

  await essai("bilans", async () => {
    if (!ctx.userId) return true;
    const prefixe = `${FUTURE_QUEUE_PREFIX}${ctx.userId}:`;
    for (const cle of deps.kv.keys().filter((k) => k.startsWith(prefixe))) {
      const [passageId, versionId] = cle.slice(prefixe.length).split(":");
      if (!passageId || !versionId) return false;
      const res = await flushQueue(deps.kv, { ownerId: ctx.userId, passageId, versionId } as any, deps.saveBilan);
      if (res.pending > 0) return false;
    }
    return true;
  });

  await essai("notes", async () => {
    if (!ctx.userId) return true;
    if (deps.notesEnAttente(ctx.userId) === 0) return true;
    await deps.flushNotes();
    return deps.notesEnAttente(ctx.userId) === 0;
  });

  if (deps.flushPages) await essai("pages", async () => (ctx.userId ? deps.flushPages!(ctx.userId) : true));

  if (deps.flushFormulaires) {
    try {
      const r = await deps.flushFormulaires(ctx);
      if (r.aRouvrir.length > 0) nonConfirmees.push("formulaires_a_rouvrir");
      else if (!r.ok) nonConfirmees.push("formulaires");
    } catch { nonConfirmees.push("formulaires"); }
  }

  return { ok: nonConfirmees.length === 0, nonConfirmees };
}

export const messageDeconnexionSuspendue = (r: { nonConfirmees?: FileDeconnexion[] }) =>
  r.nonConfirmees?.includes("formulaires_a_rouvrir") ? MESSAGE_FORMULAIRE_A_ROUVRIR : MESSAGE_DECONNEXION_SUSPENDUE;

/** Sortie apprenant commune : files confirmées puis fermeture réelle de session ; sinon rien ne change. */
export async function sortieApprenantSecurisee(
  ctx: { userId: string | null; apprenantId: string | null },
  f: { flush?: typeof flushToutesFilesAvantDeconnexion; signOut?: () => Promise<{ error: unknown }> } = {},
): Promise<{ ok: boolean; message?: string }> {
  let r: ResultatFlushDeconnexion;
  try { r = await (f.flush ?? flushToutesFilesAvantDeconnexion)(ctx); } catch { r = { ok: false, nonConfirmees: [] }; }
  if (!r.ok) return { ok: false, message: messageDeconnexionSuspendue(r) };
  try {
    const { error } = await (f.signOut ?? (() => supabase.auth.signOut({ scope: "local" })))();
    if (error) return { ok: false, message: "Déconnexion impossible : votre compte reste ouvert. Réessayez." };
  } catch { return { ok: false, message: "Déconnexion impossible : votre compte reste ouvert. Réessayez." }; }
  return { ok: true };
}
