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
  /** File du noyau V2 (examens blancs) : réponses non confirmées et stockage réel. */
  noyau?: { enAttente: number; stockage: "durable" | "session" | "memoire" } | null;
}

/** Présentation purement informative : aucune écriture ni mutation de la file. */
export function getAnswerSaveIndicatorView({
  state,
  pendingAnswers,
  saturated,
  rejection,
  noyau,
}: AnswerSaveIndicatorInput): AnswerSaveIndicatorView {
  const enAttenteNoyau = Math.max(0, noyau?.enAttente ?? 0);
  // Stockage refusé : rien ne survivrait à une fermeture. Alerte prioritaire tant que tout n'est pas confirmé.
  if (noyau?.stockage === "memoire" && enAttenteNoyau > 0) {
    return {
      tone: "saturated",
      message: `Cet appareil refuse de conserver vos réponses : ${enAttenteNoyau} réponse${enAttenteNoyau > 1 ? "s" : ""} pas encore enregistrée${enAttenteNoyau > 1 ? "s" : ""} sur le serveur. Ne fermez pas et ne rechargez pas la page : l'envoi est réessayé automatiquement.`,
    };
  }
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
      }. Restez connecté(e) : vos réponses sont conservées sur cet appareil et renvoyées automatiquement. Le centre est prévenu automatiquement.`,
    };
  }

  if (state === "error") {
    return {
      tone: "unavailable",
      message:
        "Serveur temporairement indisponible — vos réponses sont conservées sur cet appareil. Ne fermez pas votre navigateur et ne changez pas d'appareil.",
    };
  }

  if (enAttenteNoyau > 0 && state !== "error") {
    return {
      tone: "pending",
      message: `Synchronisation en cours — ${enAttenteNoyau} réponse${enAttenteNoyau > 1 ? "s" : ""} pas encore confirmée${enAttenteNoyau > 1 ? "s" : ""} par le serveur${
        noyau?.stockage === "session" ? " (conservées dans cet onglet uniquement : ne le fermez pas)" : ""
      }`,
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