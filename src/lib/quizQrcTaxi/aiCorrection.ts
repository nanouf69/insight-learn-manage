import { supabase } from "@/integrations/supabase/client";
export const QRC_AI_VERSION = "taxi-qrc-68c4e0ca-v1-ai1";
export interface PracticeGrade { score: number | null; verdict: "correct" | "partial" | "incorrect" | "review"; explanation: string }
export interface PracticeReceipt { identity?: string; receiptId?: string; status: "active" | "done" | "review" | "error" | "unknown" | "missing"; result?: PracticeGrade; error?: string; httpStatus?: number; retryAt?: string | null; attempt?: number }
export const correctionStorageKey = (account: string, quiz: string) => `quiz-qrc-taxi:ia:${QRC_AI_VERSION}:${account}:${quiz}`;
export async function practiceIdentity(account: string, quiz: string, questionId: number, answer: string) {
  const hash = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))).map(n => n.toString(16).padStart(2, "0")).join("");
  return hash(JSON.stringify([account, quiz, QRC_AI_VERSION, questionId, await hash(answer.trim())]));
}
export function validPracticeReceipt(v: unknown, identity: string): v is PracticeReceipt {
  if (!v || typeof v !== "object") return false;
  const r = v as PracticeReceipt;
  if (r.identity !== identity || !["active", "done", "review", "error", "unknown", "missing"].includes(r.status)) return false;
  if (r.status === "done" || r.status === "review") {
    const g = r.result;
    return !!g && typeof g.explanation === "string" && g.explanation.length > 0 && (r.status === "review" ? g.verdict === "review" && g.score === null : (g.verdict === "correct" && g.score === 1) || (g.verdict === "partial" && g.score === 0.5) || (g.verdict === "incorrect" && g.score === 0));
  }
  return true;
}

const flights = new Map<string, Promise<PracticeReceipt>>();
export function requestPracticeCorrection(account: string, quiz: "complet" | "specialites", questionId: number, answer: string, mode: "correct" | "read" | "retry" = "correct", attemptId?: string): Promise<PracticeReceipt> {
  const key = JSON.stringify([account, quiz, questionId, answer.trim(), mode, attemptId]);
  const active = flights.get(key);
  if (active) return active;
  const promise = (async (): Promise<PracticeReceipt> => {
    const identity = await practiceIdentity(account, quiz, questionId, answer);
    const { data, error } = await supabase.auth.getSession();
    if (error || data.session?.user.id !== account) throw new Error("Reconnectez-vous avec le même compte ; votre réponse est conservée.");
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/qrc-taxi-ia`, { method: "POST", headers: { Authorization: `Bearer ${data.session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ quiz, version: QRC_AI_VERSION, questionId, answer: answer.trim(), mode, ...(attemptId ? { attemptId } : {}) }) });
    let last: PracticeReceipt | undefined;
    if (response.headers.get("Content-Type")?.includes("application/x-ndjson")) {
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Résultat non reçu. Votre réponse est conservée.");
      const decoder = new TextDecoder(); let pending = "";
      while (true) {
        const { value, done } = await reader.read();
        pending += decoder.decode(value, { stream: !done });
        const lines = pending.split("\n"); pending = lines.pop() ?? "";
        for (const line of lines) { if (line.trim()) { const parsed = JSON.parse(line); if (!validPracticeReceipt(parsed, identity)) throw new Error("Résultat non corrélé à cette réponse."); last = parsed; } }
        if (done) break;
      }
    } else {
      const parsed = await response.json();
      if (!response.ok) return { identity, status: "error", error: parsed.error || "Correction indisponible.", httpStatus: response.status };
      if (!validPracticeReceipt(parsed, identity)) throw new Error("Résultat non corrélé à cette réponse.");
      last = parsed;
    }
    const current = await supabase.auth.getSession();
    if (current.data.session?.user.id !== account) throw new Error("Le compte a changé ; aucun résultat n’est appliqué.");
    if (!last) throw new Error("Résultat non reçu. Votre réponse est conservée.");
    return last;
  })().finally(() => flights.delete(key));
  flights.set(key, promise);
  return promise;
}