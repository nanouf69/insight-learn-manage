import { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import {
  subscribeAnswerSaveState,
  onAnswerStorageSaturation,
  onAnswerSaveRejected,
  type AnswerSaveRejection,
  type AnswerSaveState,
} from "@/lib/answerPersistence";
import { getAnswerSaveIndicatorView } from "./answerSaveIndicatorModel";

/**
 * Indicateur honnête de l'état d'enregistrement des réponses.
 * Tant que le serveur n'a pas confirmé, on n'affiche jamais « enregistré ».
 */
export function AnswerSaveIndicator({ className = "" }: { className?: string }) {
  const [state, setState] = useState<AnswerSaveState>("idle");
  const [pending, setPending] = useState(0);
  const [pendingAnswers, setPendingAnswers] = useState(0);
  const [saturated, setSaturated] = useState(false);

  useEffect(() => subscribeAnswerSaveState((s, p, answers) => {
    setState(s);
    setPending(p);
    setPendingAnswers(answers);
  }), []);

  useEffect(() => onAnswerStorageSaturation((s) => setSaturated(s)), []);

  const [rejection, setRejection] = useState<AnswerSaveRejection | null>(null);
  useEffect(() => onAnswerSaveRejected((r) => setRejection(r)), []);

  const view = getAnswerSaveIndicatorView({ state, pendingAnswers, saturated, rejection });
  if (view.tone === "hidden") return null;

  const isAlert = view.tone === "unavailable" || view.tone === "rejected" || view.tone === "saturated";
  const toneClass = view.tone === "saved"
    ? "border-success/40 bg-success/10 text-success"
    : view.tone === "pending"
      ? "border-warning/40 bg-warning/10 text-warning"
      : "border-destructive/40 bg-destructive/10 text-destructive";

  return (
    <div
      role={isAlert ? "alert" : "status"}
      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${toneClass} ${className}`}
      data-save-state={view.tone}
      data-pending-operations={pending}
      data-pending-answers={pendingAnswers}
    >
      {view.tone === "saved" ? (
        <Check className="h-4 w-4 shrink-0" />
      ) : view.tone === "pending" ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      ) : (
        <AlertTriangle className="h-4 w-4 shrink-0" />
      )}
      <span>{view.message}</span>
    </div>
  );
}
