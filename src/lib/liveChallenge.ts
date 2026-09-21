import { supabase } from "@/integrations/supabase/client";

/**
 * Module "Challenge en direct" — TOTALEMENT SEPARE des examens blancs et du e-learning.
 * Ne lit et n'ecrit QUE les tables live_sessions / live_participants / live_responses.
 */

export type LiveQuestion = {
  id: string;
  enonce: string;
  type: "qcm" | "qrc";
  propositions?: string[];
  bonneReponse?: string | null;
  /** QCM a plusieurs bonnes reponses : toute proposition correcte compte juste. */
  bonnesReponses?: string[];
  points?: number;
  explication?: string | null;
  image?: string | null;
};

export type LiveSession = {
  id: string;
  code: string;
  titre: string;
  source_quiz_id: string | null;
  source_label: string | null;
  questions_snapshot: LiveQuestion[];
  statut: string;
  current_index: number;
  reveal_results: boolean;
  masquer_noms: boolean;
  created_at: string;
  ended_at: string | null;
};

export type LiveParticipant = {
  id: string;
  live_session_id: string;
  display_name: string;
  score: number;
  joined_at: string;
  last_seen_at: string;
};

export type LiveResponse = {
  id: string;
  live_session_id: string;
  participant_id: string;
  question_id: string;
  question_index: number;
  question_type: string;
  reponse: string | null;
  est_correcte: boolean | null;
  points_max: number;
  points_obtenus: number | null;
  corrigee_manuellement: boolean;
  commentaire: string | null;
  created_at: string;
};

const DEVICE_TOKEN_KEY = "live_challenge_device_token";

export function getDeviceToken(): string {
  try {
    const existing = localStorage.getItem(DEVICE_TOKEN_KEY);
    if (existing) return existing;
    const token = crypto.randomUUID();
    localStorage.setItem(DEVICE_TOKEN_KEY, token);
    return token;
  } catch {
    return "anon-" + Math.random().toString(36).slice(2);
  }
}

function normalizeSession(row: any): LiveSession {
  const snap = row?.questions_snapshot;
  return {
    ...row,
    questions_snapshot: Array.isArray(snap) ? (snap as LiveQuestion[]) : [],
  } as LiveSession;
}

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

/** Cree un challenge en figeant un SNAPSHOT des questions (le quiz d'origine peut ensuite changer). */
export async function createLiveSession(params: {
  titre: string;
  questions: LiveQuestion[];
  sourceQuizId?: string | null;
  sourceLabel?: string | null;
}): Promise<LiveSession> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("live_sessions")
      .insert({
        code: randomCode(),
        titre: params.titre || "Challenge en direct",
        source_quiz_id: params.sourceQuizId ?? null,
        source_label: params.sourceLabel ?? null,
        questions_snapshot: params.questions as any,
        statut: "en_cours",
        current_index: 0,
      })
      .select("*")
      .single();
    if (!error && data) return normalizeSession(data);
    lastError = error;
    if (error && !String(error.message || "").includes("duplicate key")) break;
  }
  throw lastError instanceof Error ? lastError : new Error("Impossible de creer le challenge");
}

export async function fetchLiveSessions(): Promise<LiveSession[]> {
  const { data, error } = await supabase
    .from("live_sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []).map(normalizeSession);
}

export async function fetchLiveSessionByCode(code: string): Promise<LiveSession | null> {
  const { data, error } = await supabase
    .from("live_sessions")
    .select("*")
    .ilike("code", code)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeSession(data) : null;
}

export async function fetchLiveSessionById(id: string): Promise<LiveSession | null> {
  const { data, error } = await supabase.from("live_sessions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normalizeSession(data) : null;
}

export async function updateLiveSession(
  id: string,
  patch: Partial<Pick<LiveSession, "statut" | "current_index" | "reveal_results" | "masquer_noms">>,
): Promise<void> {
  const { error } = await supabase
    .from("live_sessions")
    .update({ ...patch, updated_at: new Date().toISOString() } as any)
    .eq("id", id);
  if (error) throw error;
}

export async function endLiveSession(id: string): Promise<void> {
  const { error } = await supabase
    .from("live_sessions")
    .update({ statut: "terminee", ended_at: new Date().toISOString(), reveal_results: true } as any)
    .eq("id", id);
  if (error) throw error;
}

/** Rattrapage serveur : etat complet de la session (utilise a l'abonnement et a chaque reconnexion). */
export async function fetchLiveState(
  sessionId: string,
): Promise<{ participants: LiveParticipant[]; responses: LiveResponse[] }> {
  const [p, r] = await Promise.all([
    supabase.from("live_participants").select("*").eq("live_session_id", sessionId).order("joined_at"),
    supabase.from("live_responses").select("*").eq("live_session_id", sessionId).order("created_at"),
  ]);
  if (p.error) throw p.error;
  if (r.error) throw r.error;
  return {
    participants: (p.data || []) as LiveParticipant[],
    responses: (r.data || []) as LiveResponse[],
  };
}

/** Rejoindre : idempotent, une reconnexion retrouve le MEME participant. */
export async function joinLiveSession(
  code: string,
  displayName: string,
): Promise<LiveParticipant> {
  const { data, error } = await supabase.rpc("live_join_session", {
    _code: code.trim(),
    _device_token: getDeviceToken(),
    _display_name: displayName,
  } as any);
  if (error) throw error;
  return data as unknown as LiveParticipant;
}

/** 1 reponse = 1 identifiant unique. Double-clic / F5 / reconnexion ne creent jamais de doublon. */
export async function submitLiveResponse(params: {
  participantId: string;
  question: LiveQuestion;
  questionIndex: number;
  reponse: string;
}): Promise<LiveResponse> {
  const { question } = params;
  const estCorrecte =
    question.type === "qrc"
      ? null
      : normalize(params.reponse) === normalize(question.bonneReponse || "");
  const { data, error } = await supabase.rpc("live_submit_response", {
    _participant_id: params.participantId,
    _device_token: getDeviceToken(),
    _question_id: question.id,
    _question_index: params.questionIndex,
    _question_type: question.type,
    _reponse: params.reponse,
    _est_correcte: estCorrecte,
    _points_max: question.points ?? 1,
  } as any);
  if (error) throw error;
  return data as unknown as LiveResponse;
}

export async function correctLiveResponse(
  responseId: string,
  points: number,
  commentaire: string,
): Promise<LiveResponse> {
  const { data, error } = await supabase.rpc("live_correct_response", {
    _response_id: responseId,
    _points: points,
    _commentaire: commentaire || null,
  } as any);
  if (error) throw error;
  return data as unknown as LiveResponse;
}

function normalize(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
