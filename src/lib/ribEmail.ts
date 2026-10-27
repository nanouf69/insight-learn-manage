/**
 * E-mail « RIB de la société » (Revolut) envoyé aux apprenants depuis la fiche
 * de session. La source de vérité des coordonnées bancaires reste RIB_INFO du
 * générateur canonique de devis — un seul endroit à corriger si le RIB change.
 */

import { RIB_INFO } from "@/lib/pdf/devis-canonical";

export const RIB_EMAIL_SUBJECT = "RIB FTRANSPORT — coordonnées bancaires de la société";

/**
 * Corps HTML du mail, même gabarit visuel que les autres mails FTRANSPORT
 * (en-tête sombre + pied gris). Aucune donnée personnelle de l'apprenant,
 * uniquement les coordonnées bancaires de la société.
 */
export function buildRibEmailHtml(nomComplet?: string | null): string {
  const salutation = nomComplet?.trim() ? `Bonjour ${nomComplet.trim()},` : "Bonjour,";
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #1a1a2e; padding: 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0;">FTRANSPORT</h1>
        <p style="color: #e0e0e0; margin: 5px 0 0;">Centre de formation VTC &amp; TAXI</p>
      </div>
      <div style="padding: 30px; background-color: #ffffff;">
        <p>${salutation}</p>
        <p>Vous trouverez ci-dessous les <strong>coordonnées bancaires de la société FTRANSPORT</strong> à utiliser pour tout virement (acompte, solde, formation).</p>
        <div style="border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; margin: 16px 0; background-color: #f9fafb;">
          <p style="margin: 0 0 8px;"><strong>Titulaire :</strong> ${RIB_INFO.titulaire}</p>
          <p style="margin: 0 0 8px;"><strong>Adresse :</strong> ${RIB_INFO.adresse}</p>
          <p style="margin: 0 0 8px;"><strong>IBAN :</strong> <span style="font-weight: 700; color: #1e3a8a; letter-spacing: 1px;">${RIB_INFO.iban}</span></p>
          <p style="margin: 0 0 8px;"><strong>BIC / SWIFT :</strong> ${RIB_INFO.swift}</p>
          <p style="margin: 0;"><strong>Banque :</strong> ${RIB_INFO.banque}</p>
        </div>
        <p>Pensez à indiquer le nom de l'élève ou le numéro de devis dans le libellé du virement afin de faciliter la comptabilisation.</p>
        <p>Nous restons à votre disposition pour toute question.</p>
        <p>Cordialement,<br/>L'équipe FTRANSPORT</p>
      </div>
      <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 13px; color: #6b7280;">
        <p><strong>FTRANSPORT</strong> – 86 Route de Genas, 69003 Lyon</p>
        <p>📞 04 28 29 60 91 | 📧 contact@ftransport.fr</p>
      </div>
    </div>
  `;
}
