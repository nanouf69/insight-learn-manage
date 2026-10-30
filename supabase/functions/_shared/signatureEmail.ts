/**
 * Signature commune apposée à la fin de chaque e-mail sortant FTRANSPORT.
 * Module pur (aucune API Deno, aucun import npm:) : importable par les Edge
 * Functions, par le client et par les tests Vitest.
 * Décision utilisateur (30/10/2026) : signature en bleu, écriture cursive,
 * « Cordialement — FTRANSPORT Services Pro — 86 route de Genas, 69003 Lyon — 04 28 29 60 91 ».
 */

export const SIGNATURE_EMAIL_COULEUR = "#1d4ed8";

const STYLE_BLOC =
  `margin-top:28px;padding-top:14px;border-top:1px solid #dbeafe;` +
  `font-family:'Segoe Script','Bradley Hand','Brush Script MT','Comic Sans MS',cursive;` +
  `color:${SIGNATURE_EMAIL_COULEUR};font-size:15px;line-height:1.7;`;

/** Bloc signature HTML complet, à placer en toute fin de corps de message. */
export function signatureEmailHtml(): string {
  return (
    `<div style="${STYLE_BLOC}">` +
    `<div style="font-size:17px;font-weight:bold;">Cordialement,</div>` +
    `<div style="font-size:16px;font-weight:bold;">FTRANSPORT Services Pro</div>` +
    `<div>86 route de Genas, 69003 Lyon</div>` +
    `<div>04 28 29 60 91</div>` +
    `</div>`
  );
}

const FERMETURE_BODY = /<\/body>\s*<\/html>\s*$/i;

/**
 * Appose la signature commune à la fin d'un corps HTML de mail.
 * Si une signature FTRANSPORT existe déjà en toute fin (« Cordialement » …
 * Ftransport), elle est remplacée par la signature commune afin d'éviter un
 * doublon ; sinon la signature est simplement ajoutée.
 * Les fermetures `</body></html>` et le contenu après la signature sont conservés.
 */
export function appliquerSignatureEmail(html: string): string {
  if (!html || typeof html !== "string") return html;
  const fermeture = html.match(FERMETURE_BODY);
  const corps = fermeture ? html.slice(0, fermeture.index ?? 0) : html;
  const fin = fermeture ? html.slice(fermeture.index ?? 0) : "";
  let base = corps;
  const idx = corps.toLowerCase().lastIndexOf("cordialement");
  if (idx !== -1) {
    const existante = corps.slice(idx);
    const estSignature =
      /ftransport/i.test(existante) &&
      existante.length <= 700 &&
      !/<a[\s>]/i.test(existante) &&
      !/<table/i.test(existante);
    if (estSignature) base = corps.slice(0, idx);
  }
  return base.replace(/(?:\s|<br\s*\/?>)*$/i, "") + signatureEmailHtml() + fin;
}
