import type { PrestataireDossier, TypeEnvoi } from "./types";
import { MODES_PAIEMENT } from "./types";

export interface EntrepriseInfos {
  raison_sociale: string;
  siren: string;
  adresse: string;
  email: string;
  telephone: string;
  responsable: string;
}

export const DEFAULT_ENTREPRISE: EntrepriseInfos = {
  raison_sociale: "FTRANSPORT",
  siren: "",
  adresse: "86 Route de Genas, 69003 Lyon",
  email: "contact@ftransport.fr",
  telephone: "04 28 29 60 91",
  responsable: "",
};

export const VARIABLES = [
  "prestataire_nom",
  "raison_sociale",
  "siren",
  "siret",
  "description_prestation",
  "date_prestation",
  "periode_prestation",
  "montant_ht",
  "tva",
  "montant_ttc",
  "date_paiement",
  "mode_paiement",
  "reference_paiement",
  "notre_raison_sociale",
  "notre_siren",
  "notre_adresse",
  "notre_email",
  "notre_telephone",
  "responsable",
] as const;

const SIGNATURE = `Cordialement,
{{notre_raison_sociale}}
{{responsable}}
{{notre_adresse}}
SIREN : {{notre_siren}}
{{notre_telephone}}
{{notre_email}}`;

const BLOC_PRESTATION = `Prestation : {{description_prestation}}
Date / période : {{periode_prestation}}
Montant réglé : {{montant_ttc}}
Date du règlement : {{date_paiement}}
Mode de règlement : {{mode_paiement}}
Référence du règlement : {{reference_paiement}}`;

export interface TemplateDef {
  objet: string;
  corps: string;
}

export const DEFAULT_TEMPLATES: Record<TypeEnvoi | "signature", TemplateDef> = {
  demande: {
    objet: "Demande de facture – {{description_prestation}} – {{date_prestation}}",
    corps: `Bonjour {{prestataire_nom}},

Sauf erreur de notre part, nous n'avons pas encore reçu la facture correspondant à la prestation suivante :

${BLOC_PRESTATION}

Nous vous remercions de bien vouloir nous transmettre la facture correspondante dans les meilleurs délais.
La facture devra comporter les mentions obligatoires applicables à votre situation.
Cette facture est nécessaire à la justification et à la comptabilisation de cette dépense.

Merci de nous l'adresser en réponse à ce courriel.

{{signature}}`,
  },
  relance1: {
    objet: "Relance – Demande de facture – {{description_prestation}} – {{date_prestation}}",
    corps: `Bonjour {{prestataire_nom}},

Nous revenons vers vous concernant notre demande de facture, restée sans réponse à ce jour, pour la prestation suivante :

${BLOC_PRESTATION}

Nous vous remercions de bien vouloir nous transmettre cette facture dans les meilleurs délais, en réponse à ce courriel.

{{signature}}`,
  },
  relance2: {
    objet: "2e relance – Facture non reçue – {{description_prestation}} – {{date_prestation}}",
    corps: `Bonjour {{prestataire_nom}},

Malgré nos précédentes demandes, nous n'avons toujours pas reçu la facture correspondant à la prestation suivante :

${BLOC_PRESTATION}

Cette facture est indispensable à la justification comptable et fiscale de cette dépense. Nous vous remercions de nous l'adresser sans délai.

{{signature}}`,
  },
  mise_en_demeure: {
    objet: "Mise en demeure – Défaut de facturation – {{description_prestation}} – {{date_prestation}}",
    corps: `Bonjour {{prestataire_nom}},

Malgré plusieurs demandes et relances restées sans réponse, la facture correspondant à la prestation ci-dessous ne nous est toujours pas parvenue :

${BLOC_PRESTATION}

Par la présente, nous vous mettons en demeure de nous transmettre cette facture, comportant les mentions obligatoires applicables, dans un délai de huit (8) jours à compter de la réception de ce courriel.

À défaut, nous nous réservons la possibilité de faire valoir nos droits par toute voie utile.

{{signature}}`,
  },
  signature: { objet: "", corps: SIGNATURE },
};

const fmtDate = (d?: string | null) => {
  if (!d) return "";
  const [y, m, j] = d.split("-");
  return y && m && j ? `${j}/${m}/${y}` : d;
};

const fmtMontant = (n?: number | null) =>
  n === null || n === undefined || Number.isNaN(n)
    ? ""
    : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(n));

export function buildVariables(
  dossier: Partial<PrestataireDossier>,
  entreprise: EntrepriseInfos,
): Record<string, string> {
  const periode =
    dossier.periode_debut && dossier.periode_fin
      ? `du ${fmtDate(dossier.periode_debut)} au ${fmtDate(dossier.periode_fin)}`
      : fmtDate(dossier.date_prestation);
  const mode = MODES_PAIEMENT.find((m) => m.value === dossier.mode_paiement)?.label ?? "";
  const nom = [dossier.prestataire_prenom, dossier.prestataire_nom].filter(Boolean).join(" ")
    || dossier.raison_sociale
    || "";
  return {
    prestataire_nom: nom,
    raison_sociale: dossier.raison_sociale ?? "",
    siren: dossier.siren ?? "",
    siret: dossier.siret ?? "",
    description_prestation: dossier.description_prestation ?? "",
    date_prestation: fmtDate(dossier.date_prestation),
    periode_prestation: periode,
    montant_ht: fmtMontant(dossier.montant_ht),
    tva: fmtMontant(dossier.tva),
    montant_ttc: fmtMontant(dossier.montant_paye ?? dossier.montant_ttc),
    date_paiement: fmtDate(dossier.date_paiement),
    mode_paiement: mode,
    reference_paiement: dossier.reference_paiement ?? "",
    notre_raison_sociale: entreprise.raison_sociale ?? "",
    notre_siren: entreprise.siren ?? "",
    notre_adresse: entreprise.adresse ?? "",
    notre_email: entreprise.email ?? "",
    notre_telephone: entreprise.telephone ?? "",
    responsable: entreprise.responsable ?? "",
  };
}

/**
 * Remplace les variables. Une ligne dont toutes les variables sont vides
 * est supprimée proprement (jamais de ligne vide ni de "[NON RENSEIGNÉ]").
 */
export function renderTemplate(text: string, vars: Record<string, string>): string {
  const lines = text.split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    const found = [...line.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/gi)].map((m) => m[1]);
    if (found.length > 0) {
      const values = found.map((k) => (vars[k] ?? "").trim());
      const allEmpty = values.every((v) => v === "");
      if (allEmpty) continue;
      const rendered = line.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, k: string) => (vars[k] ?? "").trim());
      if (rendered.trim() === "" || /^[^\p{L}\p{N}]*$/u.test(rendered.replace(/\s/g, "")) && rendered.trim().length <= 2) continue;
      kept.push(rendered);
    } else {
      kept.push(line);
    }
  }
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function renderEmail(
  template: TemplateDef,
  signature: string,
  dossier: Partial<PrestataireDossier>,
  entreprise: EntrepriseInfos,
): { objet: string; corps: string } {
  const vars = buildVariables(dossier, entreprise);
  const corpsAvecSignature = template.corps.replace(/\{\{\s*signature\s*\}\}/gi, signature);
  return {
    objet: renderTemplate(template.objet, vars),
    corps: renderTemplate(corpsAvecSignature, vars),
  };
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function textToHtml(text: string): string {
  const body = escapeHtml(text)
    .split("\n")
    .map((l) => (l.trim() === "" ? "<br/>" : `<p style="margin:0 0 8px">${l}</p>`))
    .join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;line-height:1.5">${body}</div>`;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}
