import type { AnswerSaveRejection, AnswerSaveState } from "@/lib/answerPersistence";

export type AnswerSaveIndicatorTone = "saved" | "pending" | "unavailable" | "rejected" | "saturated" | "hidden";

export interface AnswerSaveIndicatorView {
  tone: AnswerSaveIndicatorTone;
  message: string;
}

interface AnswerSaveIndicatorInput {
  state: AnswerSaveState;
  pendingAnswers: number;
  saturated: boolean;
  rejection: AnswerSaveRejection | null;
}

/** Présentation purement informative : aucune écriture ni mutation de la file. */
export function getAnswerSaveIndicatorView({
  state,
  pendingAnswers,
  saturated,
  rejection,
}: AnswerSaveIndicatorInput): AnswerSaveIndicatorView {
  if (rejection) {
    return {
      tone: "rejected",
      message:
        rejection.message ??
        "Un problème de synchronisation a été détecté. Vos réponses sont conservées sur cet appareil. Une alerte technique a été envoyée automatiquement.",
    };
  }

  if (saturated) {
    return {
      tone: "saturated",
      message: `La mémoire de cet appareil est saturée. Aucune réponse n'a été supprimée${
        pendingAnswers > 0 ? ` (${pendingAnswers} en attente)` : ""
      }. Restez connecté(e) et prévenez le centre si ce message persiste.`,
    };
  }

  if (state === "error") {
    return {
      tone: "unavailable",
      message:
        "Serveur temporairement indisponible — vos réponses sont conservées sur cet appareil. Ne fermez pas votre navigateur et ne changez pas d'appareil.",
    };
  }

  if (state === "saving" || pendingAnswers > 0) {
    return {
      tone: "pending",
      message: `Synchronisation en cours — ${pendingAnswers} réponse${pendingAnswers > 1 ? "s" : ""} en attente`,
    };
  }

  if (state === "saved" && pendingAnswers === 0) {
    return { tone: "saved", message: "Sauvegardé — toutes vos réponses sont enregistrées" };
  }

  return { tone: "hidden", message: "" };
}