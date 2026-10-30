import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { correctionStorageKey, PracticeReceipt, requestPracticeCorrection } from "@/lib/quizQrcTaxi/aiCorrection";

export function CorrectionQrcTaxiIA({ quiz, questionId, answer, onNext, onLock, attemptId }: { quiz: "complet" | "specialites"; questionId: number; answer: string; onNext?: () => void; onLock?: (locked: boolean) => void; attemptId?: string }) {
  const { user } = useAuth();
  const [receipt, setReceipt] = useState<PracticeReceipt>();
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const scope = `${user?.id ?? ""}:${quiz}:${questionId}:${answer.trim()}`;
  const currentScope = useRef(scope); currentScope.current = scope;
  const key = user?.id ? correctionStorageKey(user.id, quiz) : null;
  const entry = JSON.stringify([questionId, answer.trim()]);
  const save = (r: PracticeReceipt) => {
    setReceipt(r);
    if (key) { try { const previous = JSON.parse(localStorage.getItem(key) ?? "{}"); localStorage.setItem(key, JSON.stringify({ ...previous, [entry]: r })); } catch { /* answer remains separately saved */ } }
  };
  useEffect(() => {
    let saved;
    if (key) { try { saved = JSON.parse(localStorage.getItem(key) ?? "{}")[entry]; } catch { /* storage unavailable */ } }
    setReceipt(saved); setBusy(false); flight.current = false;
  }, [key, entry]);
  useEffect(() => { onLock?.(busy); return () => onLock?.(false); }, [busy, onLock]);
  const run = async (mode: "correct" | "read" | "retry") => {
    if (!user?.id || flight.current || !answer.trim()) return;
    flight.current = true; setBusy(true);
    const initialScope = scope;
    if (mode !== "read") save({ status: "active" });
    try {
      const result = await requestPracticeCorrection(user.id, quiz, questionId, answer, mode, attemptId);
      if (currentScope.current === initialScope) save(result);
    } catch {
      if (currentScope.current === initialScope) save({ status: "unknown", error: "Résultat non reçu. Vérifiez la correction enregistrée ; votre réponse est conservée." });
    } finally { if (currentScope.current === initialScope) { flight.current = false; setBusy(false); } }
  };
  const finished = receipt?.status === "done" || receipt?.status === "review";
  const unread = receipt?.status === "active" || receipt?.status === "unknown";
  const retryAllowed = receipt?.status === "error" && !!receipt.receiptId && [429, 500, 502, 503, 504].includes(receipt.httpStatus ?? 0) && (receipt.attempt ?? 3) < 3 && !!receipt.retryAt;
  return <div className="space-y-2" aria-live="polite">
    {busy ? <p role="status">Correction en cours…</p> : receipt?.result && finished ? <p className={receipt.status === "review" ? "text-muted-foreground" : receipt.result.score === 1 ? "text-primary" : "text-destructive"}>
      {receipt.status === "review" ? "À arbitrer — sans note définitive" : `Correction IA : ${receipt.result.score}/1`} — {receipt.result.explanation}
    </p> : receipt && <p className="text-muted-foreground">{receipt.error || (receipt.status === "missing" ? "Aucune correction enregistrée ; votre réponse est conservée." : "Correction non reçue ; aucune note attribuée.")}</p>}
    {!busy && !finished && <Button className="w-full" disabled={!user?.id || !answer.trim() || answer.length > 4000} onClick={() => run(unread ? "read" : receipt?.status === "error" ? "read" : "correct")}>
      {unread || receipt?.status === "error" ? "Vérifier la correction" : attemptId ? "Demander la correction IA" : "Valider ma réponse"}
    </Button>}
    {!busy && retryAllowed && <Button variant="outline" className="w-full" onClick={() => { if (receipt?.retryAt && Date.now() >= Date.parse(receipt.retryAt)) run("retry"); else setReceipt(r => r ? { ...r, error: "Veuillez patienter avant la nouvelle tentative autorisée." } : r); }}>Réessayer la correction</Button>}
    {!busy && onNext && receipt && <Button variant="outline" className="w-full" onClick={onNext}>{finished ? "Question suivante" : "Continuer sans note"}</Button>}
  </div>;
}