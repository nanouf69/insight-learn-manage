import { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { subscribeAnswerSaveState, type AnswerSaveState } from "@/lib/answerPersistence";

/**
 * Indicateur honnête de l'état d'enregistrement des réponses.
 * Tant que le serveur n'a pas confirmé, on n'affiche jamais « enregistré ».
 */
export function AnswerSaveIndicator({ className = "" }: { className?: string }) {
  const [state, setState] = useState<AnswerSaveState>("idle");
  const [pending, setPending] = useState(0);

  useEffect(() => subscribeAnswerSaveState((s, p) => {
    setState(s);
    setPending(p);
  }), []);

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
