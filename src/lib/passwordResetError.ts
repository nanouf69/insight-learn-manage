type ResetError = { code?: string; message?: string; reasons?: string[] };

export function passwordResetErrorFrench(error: unknown): string {
  const value: ResetError = typeof error === "object" && error !== null ? error : {};
  const message = value.message ?? "";
  if (value.code === "weak_password" || /password.*(weak|short|least|contain)/i.test(message)) {
    const reasons = value.reasons ?? [];
    const details: string[] = [];
    const minimum = message.match(/at least (\d+) characters/i)?.[1];
    if (reasons.includes("length") || minimum) {
      details.push(minimum ? `Il doit contenir au moins ${minimum} caractères.` : "Il est trop court : ajoutez des caractères.");
    }
    if (reasons.includes("characters") || /contain/i.test(message)) {
      details.push("Il manque des caractères exigés : utilisez des minuscules, des majuscules, des chiffres et des caractères spéciaux.");
    }
    if (reasons.includes("pwned")) {
      details.push("Il figure dans une fuite de données connue. Choisissez un mot de passe différent, jamais utilisé ailleurs.");
    }
    return `Ce mot de passe est trop facile ou insuffisamment sécurisé. ${details.join(" ") || "Choisissez un mot de passe plus long et moins prévisible, avec des lettres, des chiffres et des caractères spéciaux."}`;
  }
  if (value.code === "same_password") return "Le nouveau mot de passe doit être différent de l’ancien.";
  if (["otp_expired", "session_not_found", "refresh_token_not_found", "bad_jwt"].includes(value.code ?? "")) {
    return "Votre lien ou votre session a expiré. Demandez un nouveau lien depuis « Mot de passe oublié ».";
  }
  if (value.code === "over_request_rate_limit" || value.code === "over_email_send_rate_limit") {
    return "Trop de demandes ont été effectuées. Patientez avant de réessayer.";
  }
  return "Impossible de modifier le mot de passe pour le moment. Réessayez ; si le problème persiste, demandez un nouveau lien depuis « Mot de passe oublié ».";
}