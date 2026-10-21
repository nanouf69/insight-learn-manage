/**
 * Mise en page professionnelle des convocations de formation (e-mail).
 * N'invente aucune information : chaque champ vient de la session, de la fiche élève
 * ou du modèle existant ; une donnée absente est signalée « à confirmer ».
 * Le contenu détaillé du modèle existant (examens, consignes…) est conservé tel quel.
 */
import type { ResultatAcces } from "./accesCoursFenetre";

export const FTRANSPORT = {
  nom: "FTRANSPORT",
  raisonSociale: "SERVICES PRO FTRANSPORT",
  adresse: "86 Route de Genas, 69003 Lyon",
  telephone: "04 28 29 60 91",
  email: "contact@ftransport.fr",
  siret: "82346156100018",
  nda: "84 69 15114 69",
  logoUrl: "https://gestion.ftransport.fr/logo-ftransport-email.png",
};

export const TEXTE_STATIONNEMENT = "Vous venez en voiture ? Merci de vous garer avenue des Acacias, à Lyon.";

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const fmt = (d: Date | null) =>
  d ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";

/** Site lyonnais FTRANSPORT (86 route de Genas, 69003). Aucun autre centre. */
export function estSiteLyonGenas(lieu?: string | null): boolean {
  const l = (lieu || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return /route\s+de\s+genas/.test(l) && /(69003|lyon)/.test(l);
}

export function texteAccesCours(acces: ResultatAcces): string {
  if (acces.statut === "manquant" || !acces.debut || !acces.fin)
    return "Votre période d'accès aux cours n'est pas encore définie : l'accès vous sera communiqué par l'administration. Aucun accès n'est ouvert avant cette confirmation.";
  const d = fmt(acces.debut), f = fmt(acces.fin);
  if (acces.statut === "avant") return `Vos cours seront accessibles à partir du ${d} et jusqu'au ${f}.`;
  if (acces.statut === "pendant") return `Vos cours sont accessibles depuis le ${d} et jusqu'au ${f}.`;
  return `Votre période d'accès aux cours (du ${d} au ${f}) est terminée. Contactez-nous si besoin.`;
}

export interface ConvocationParams {
  civilite?: string | null;
  prenom?: string | null;
  nom?: string | null;
  referenceDossier?: string | null;
  intituleFormation: string;
  presentiel: boolean;
  dateDebut?: string | null; // déjà formatée
  dateFin?: string | null;
  horaires?: string | null;
  lieu?: string | null;
  acces: ResultatAcces;
  corpsModele: string; // contenu du modèle existant, déjà personnalisé
  dateEmission?: Date;
}

export function construireConvocationHtml(p: ConvocationParams): string {
  const aConfirmer = '<em style="color:#b45309">à confirmer par l\'administration</em>';
  const v = (x?: string | null) => (x && x.trim() ? esc(x) : aConfirmer);
  const identite = [p.civilite, p.prenom, p.nom].filter(Boolean).join(" ");
  const modalite = p.presentiel ? "Présentiel" : "E-learning (à distance)";
  const dates = p.dateDebut && p.dateFin ? `du ${esc(p.dateDebut)} au ${esc(p.dateFin)}` : aConfirmer;
  const lieu = p.presentiel ? v(p.lieu) : "À distance — plateforme de cours en ligne FTRANSPORT";
  const parking = p.presentiel && estSiteLyonGenas(p.lieu);
  const ligne = (k: string, val: string) =>
    `<tr><td style="padding:6px 10px;color:#475569;font-size:13px;width:150px;vertical-align:top">${k}</td><td style="padding:6px 10px;font-size:14px;color:#0f172a;font-weight:600">${val}</td></tr>`;

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto;color:#0f172a;background:#ffffff">
<table role="presentation" width="100%" style="border-bottom:3px solid #1e3a8a;margin-bottom:18px"><tr>
<td style="padding:8px 0"><img src="${FTRANSPORT.logoUrl}" alt="FTRANSPORT" width="160" style="display:block;max-width:160px;height:auto" /></td>
<td style="padding:8px 0;text-align:right;font-size:12px;color:#475569;line-height:1.5"><strong style="color:#0f172a">${FTRANSPORT.raisonSociale}</strong><br>${FTRANSPORT.adresse}<br>${FTRANSPORT.telephone} · ${FTRANSPORT.email}</td>
</tr></table>
<h1 style="font-size:20px;letter-spacing:1px;color:#1e3a8a;margin:0 0 14px">CONVOCATION À LA FORMATION</h1>
<table role="presentation" width="100%" style="font-size:13px;color:#334155;margin-bottom:16px">
<tr><td><strong>Participant :</strong> ${esc(identite)}</td><td style="text-align:right"><strong>Émise le :</strong> ${esc(fmt(p.dateEmission ?? new Date()))}</td></tr>
<tr><td><strong>Référence dossier :</strong> ${p.referenceDossier ? esc(p.referenceDossier) : aConfirmer}</td><td style="text-align:right"><strong>Contact administratif :</strong> ${FTRANSPORT.telephone}</td></tr>
</table>
<p style="font-size:14px;line-height:1.6">${esc(identite) || "Madame, Monsieur"},<br>Nous avons le plaisir de vous accueillir prochainement au sein de FTRANSPORT. Vous trouverez ci-dessous le récapitulatif de votre formation.</p>
<div style="border:2px solid #1e3a8a;border-radius:8px;background:#f1f5ff;padding:10px;margin:16px 0">
<div style="font-size:13px;font-weight:bold;color:#1e3a8a;text-transform:uppercase;padding:4px 10px">Récapitulatif de votre formation</div>
<table role="presentation" width="100%">
${ligne("Formation", v(p.intituleFormation))}
${ligne("Modalité", modalite)}
${ligne("Dates", dates)}
${ligne("Horaires", p.presentiel ? v(p.horaires) : "Libres, pendant votre période d'accès")}
${ligne("Lieu", lieu)}
</table></div>
<div style="border-left:4px solid #0f766e;background:#f0fdfa;padding:10px 14px;margin:16px 0;font-size:14px"><strong>Accès aux cours en ligne :</strong> ${esc(texteAccesCours(p.acces))}<br><span style="font-size:12px;color:#475569">Votre compte peut être créé avant cette période ; le contenu des cours n'est accessible qu'aux dates indiquées.</span></div>
${parking ? `<div style="border:2px solid #d97706;background:#fffbeb;border-radius:8px;padding:10px 14px;margin:16px 0;font-size:14px">🚗 <strong>${esc(TEXTE_STATIONNEMENT)}</strong></div>` : ""}
<h2 style="font-size:15px;color:#1e3a8a;border-bottom:1px solid #cbd5e1;padding-bottom:4px;margin-top:22px">Informations pratiques</h2>
<div style="font-size:14px;line-height:1.6">${p.corpsModele}</div>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin:18px 0;font-size:13px">♿ <strong>Besoin d'un aménagement (situation de handicap) ?</strong> Contactez-nous avant le début de la formation : ${FTRANSPORT.telephone} · ${FTRANSPORT.email}.</div>
<p style="font-size:11px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:8px;margin-top:20px">${FTRANSPORT.raisonSociale} · ${FTRANSPORT.adresse} · SIRET ${FTRANSPORT.siret} · N° de déclaration d'activité ${FTRANSPORT.nda}</p>
</div>`;
}
