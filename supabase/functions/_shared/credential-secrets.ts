// Règles d'accès des apprenants (étape 1 — 24/09/2026) :
// - aucun mot de passe permanent n'est envoyé par e-mail ;
// - aucun secret (mot de passe, lien personnel) n'est conservé dans
//   l'historique des e-mails : il est remplacé par un marqueur ;
// - le CRM n'enregistre jamais le mot de passe plateforme.

export const SECRET_MASK = "[secret masqué]";
export const HISTORY_ACCESS_NOTE = "Identifiants d'accès envoyés – secret masqué";

/** Mot de passe aléatoire long, jamais communiqué : l'élève définit le sien via le lien. */
export function generateUnsharedPassword(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Lien sécurisé (usage unique, durée limitée) pour définir son mot de passe. */
export async function generateSetPasswordLink(
  supabaseAdmin: any,
  email: string,
): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: "https://insight-learn-manage.lovable.app/reset-password" },
  });
  const link = data?.properties?.action_link;
  if (error || !link) throw new Error(error?.message || "Impossible de générer le lien sécurisé");
  return link;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Version de l'e-mail destinée à l'historique : chaque secret fourni est
 * remplacé (y compris sous forme HTML-échappée), ainsi que tout lien
 * d'authentification résiduel.
 */
export function redactForHistory(html: string, secrets: Array<string | null | undefined>): string {
  let out = String(html ?? "");
  for (const s of secrets) {
    if (!s) continue;
    const variants = new Set([s, s.replace(/&/g, "&amp;")]);
    for (const v of variants) out = out.replace(new RegExp(escapeRegExp(v), "g"), SECRET_MASK);
  }
  // Filet de sécurité : tout lien de vérification / jeton résiduel.
  out = out.replace(/https?:\/\/[^\s"'<>]*\/auth\/v1\/verify[^\s"'<>]*/gi, SECRET_MASK);
  out = out.replace(/([?&#](?:token|token_hash|access_token|refresh_token)=)[^\s"'<>&]+/gi, `$1${SECRET_MASK}`);
  return `<p><em>${HISTORY_ACCESS_NOTE}</em></p>` + out;
}

/** Bloc e-mail « Définissez votre mot de passe » (commun aux 3 services). */
export function setPasswordBlock(email: string, link: string): string {
  return `
    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <h3 style="color: #065f46; margin-top: 0;">🔐 Définissez votre mot de passe</h3>
      <p><strong>Votre email de connexion :</strong> ${email}</p>
      <p>Cliquez sur le bouton ci-dessous pour choisir vous-même votre mot de passe. Ce lien personnel est à usage unique et à durée limitée.</p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${link}" style="background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">🔑 Définir mon mot de passe</a>
      </div>
      <p style="color: #6b7280; font-size: 13px;">Lien expiré ? Sur la page de connexion, cliquez sur « Mot de passe oublié » pour en recevoir un nouveau.</p>
    </div>`;
}
