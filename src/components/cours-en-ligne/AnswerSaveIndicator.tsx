import { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import {
  subscribeAnswerSaveState,
  onAnswerStorageSaturation,
  onAnswerSaveRejected,
  type AnswerSaveRejection,
  type AnswerSaveState,
} from "@/lib/answerPersistence";

/**
 * Indicateur honnête de l'état d'enregistrement des réponses.
 * Tant que le serveur n'a pas confirmé, on n'affiche jamais « enregistré ».
 */
export function AnswerSaveIndicator({ className = "" }: { className?: string }) {
  const [state, setState] = useState<AnswerSaveState>("idle");
  const [pending, setPending] = useState(0);
  const [saturated, setSaturated] = useState(false);

  useEffect(() => subscribeAnswerSaveState((s, p) => {
    setState(s);
    setPending(p);
  }), []);

  useEffect(() => onAnswerStorageSaturation((s) => setSaturated(s)), []);

  const [rejection, setRejection] = useState<AnswerSaveRejection | null>(null);
  useEffect(() => onAnswerSaveRejected((r) => setRejection(r)), []);

  // Le serveur a refusé d'appliquer la réponse : alerte immédiate, jamais
  // « enregistré ». La sauvegarde repart automatiquement sur le bon passage.
  if (rejection) {
    return (
      <div
        role="alert"
        className={`flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 px-3 py-1.5 text-sm font-semibold text-destructive ${className}`}
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          🔴 Votre réponse n'a pas encore été enregistrée. Ne fermez pas cette page.
          Nouvelle tentative de sauvegarde en cours.
        </span>
      </div>
    );
  }

  // Stockage de la tablette saturé : alerte claire, aucune réponse supprimée.
  if (saturated) {
    return (
      <div
        role="alert"
        className={`flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-sm text-destructive ${className}`}
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          La mémoire de cet appareil est saturée. Aucune réponse n'a été supprimée
          {pending > 0 ? ` (${pending} en attente)` : ""} : restez connecté(e) le temps que
          l'enregistrement se termine, et prévenez le centre si le message persiste.
        </span>
      </div>
    );
  }

  if (state === "idle") return null;

  if (state === "error" || pending > 0) {
    return (
      <div
        role="status"
        className={`flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-sm text-destructive ${className}`}
      >
        {state === "error" ? (
          <AlertTriangle className="h-4 w-4 shrink-0" />
        ) : (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        )}
        <span>
          {state === "error"
            ? `Enregistrement en attente (${pending}) — vos réponses ne sont pas encore enregistrées. Vérifiez votre connexion, la sauvegarde reprendra automatiquement.`
            : "Enregistrement en cours…"}
        </span>
      </div>
    );
  }

  if (state === "saving") {
    return (
      <div role="status" className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Enregistrement en cours…</span>
      </div>
    );
  }

  return (
    <div role="status" className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
      <Check className="h-4 w-4 text-green-600" />
      <span>Réponses enregistrées</span>
    </div>
  );
}
