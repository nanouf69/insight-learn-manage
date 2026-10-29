import { calculerSignaturesManquantes, planningCreneaux, dateDuJourParis } from "@/lib/signaturesManquantes";

export const OBJET_DERNIERE_RELANCE = "URGENT – DERNIER AVERTISSEMENT – Formation à terminer sous 3 jours";

/** % de modules ENTIÈREMENT terminés (jamais d'heures ni de sous-étapes) ; null si total nul. */
export function pourcentageModules(termines: number, total: number): number | null {
  if (!Number.isFinite(termines) || !Number.isFinite(total) || total <= 0) return null;
  return Math.round((termines / total) * 1000) / 10;
}

export const formatPourcentage = (p: number) => `${p.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;

/**
 * Présentiel, lecture seule : créneaux réellement prévus (sessions attribuées + réservations
 * pratiques) jusqu'à aujourd'hui, et ceux sans signature réelle. Aucun nombre supposé.
 */
export function bilanSignaturesPresentiel(emargements: any[], sessionRows: any[], reservations: any[], configs: any[], dateReference = dateDuJourParis()) {
  const { parDate } = planningCreneaux(sessionRows, reservations, configs);
  let attendues = 0;
  for (const [date, jour] of parDate) if (date <= dateReference) attendues += jour.creneaux.size;
  const manquantes = calculerSignaturesManquantes(emargements, sessionRows, reservations, dateReference, configs).length;
  return { attendues, manquantes };
}

/**
 * Compteur EDOF = MÊME source que la fiche apprenant : objectif « Total signatures X/Y »
 * (calculerBilanSignaturesEdof) et liste rouge « Signatures manquantes (N) »
 * (classifierSignatures, état « manquante »). Aucun calcul parallèle.
 */
export function compteurSignaturesFiche(bilan: { objectifTotal: number; total: number }, attendus: { etat?: string }[]) {
  const liste = attendus.filter((m) => m.etat === "manquante").length;
  // Même affichage que la fiche : liste rouge si elle existe, sinon « Il manque X pour atteindre l'objectif ».
  const manquantes = liste > 0 ? liste : Math.max(0, bilan.objectifTotal - bilan.total);
  return { attendues: bilan.objectifTotal, signees: bilan.total, manquantes };
}

/** Date limite = date d'envoi + 3 jours calendaires (Europe/Paris). */
export function dateLimiteRelance(envoi: Date = new Date()): string {
  const jour = dateDuJourParis(envoi);
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 3);
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
}

/** Rouge des passages de sanctions (contraste suffisant sur fond blanc). */
export const ROUGE_SANCTIONS = "#C62828";

/** Passages de sanctions affichés en rouge (sources : CGU Mon Compte Formation V15 2026, France Travail). */
export const PARAGRAPHES_SANCTIONS_ROUGES = [
  "ATTENTION : LE NON-RESPECT DE VOS OBLIGATIONS PEUT ENTRAÎNER DES SANCTIONS IMPORTANTES.",
  "Financement CPF : en cas de manquements constatés, notamment d'absences répétées injustifiées, la Caisse des dépôts peut décider d'une suspension de l'utilisation de votre compte CPF allant de 7 jours à 1 an.",
  "Financement France Travail : une absence ou un abandon de formation sans motif légitime peut entraîner une radiation de la liste des demandeurs d'emploi et une suppression de vos allocations. Le remboursement des sommes indûment perçues peut également être exigé.",
] as const;

/** Nuance obligatoire, en texte normal : jamais de sanction présentée comme automatique. */
export const PARAGRAPHE_SANCTIONS_NORMAL =
  "Ces mesures sont décidées par les organismes compétents, selon votre situation et les procédures applicables. Elles ne sont pas automatiques.";

type SegmentMail = { texte: string; rouge: boolean };

function segmentsMailDerniereRelance(prenom: string | null | undefined, nom: string | null | undefined, pourcentage: number, dateLimite: string): SegmentMail[] {
  const nomComplet = [prenom?.trim(), nom?.trim().toUpperCase()].filter(Boolean).join(" ");
  return [
    { texte: `Bonjour${nomComplet ? ` ${nomComplet}` : ""},`, rouge: false },
    { texte: "Malgré nos précédentes relances, nous constatons que vous n'avez toujours pas terminé l'intégralité des modules obligatoires de votre formation.", rouge: false },
    { texte: `Votre progression actuelle : ${formatPourcentage(pourcentage)} des modules terminés.`, rouge: false },
    { texte: "CE MESSAGE CONSTITUE NOTRE DERNIER AVERTISSEMENT.", rouge: false },
    { texte: `Vous disposez de 3 JOURS calendaires à compter de la réception de cet email pour terminer l'ensemble des modules, exercices et évaluations obligatoires de votre parcours, soit au plus tard le ${dateLimite}.`, rouge: true },
    ...PARAGRAPHES_SANCTIONS_ROUGES.map(texte => ({ texte, rouge: true as const })),
    { texte: PARAGRAPHE_SANCTIONS_NORMAL, rouge: false },
    { texte: "En cas de non-régularisation, notre centre pourra signaler aux organismes concernés les éléments factuels relatifs à votre participation et à votre progression.", rouge: false },
    { texte: "Notre centre ne pourra être tenu responsable des conséquences directement liées à votre absence de participation ou à la non-réalisation des obligations qui vous incombent, sous réserve de ses propres obligations légales et contractuelles.", rouge: false },
    { texte: "Si vous rencontrez une difficulté technique vous empêchant de terminer votre formation, signalez-la immédiatement avant l'expiration du délai.", rouge: false },
    { texte: "Cordialement,\nLe service pédagogique – SERVICES PRO\nCentre de formation TAXI / VTC", rouge: false },
  ];
}

const echapperHtml = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Version texte brut, sans couleur (éditable dans l'aperçu avant envoi). */
export function mailDerniereRelance(prenom: string | null | undefined, nom: string | null | undefined, pourcentage: number, dateLimite: string) {
  return {
    subject: OBJET_DERNIERE_RELANCE,
    body: segmentsMailDerniereRelance(prenom, nom, pourcentage, dateLimite).map(s => s.texte).join("\n\n"),
  };
}

/** Version HTML réellement reçue : seuls les passages de sanctions sont en rouge (et en gras, pas la couleur seule). */
export function mailDerniereRelanceHtml(prenom: string | null | undefined, nom: string | null | undefined, pourcentage: number, dateLimite: string): string {
  return segmentsMailDerniereRelance(prenom, nom, pourcentage, dateLimite)
    .map(s => {
      const corps = echapperHtml(s.texte).replace(/\n/g, "<br>")
        .replace("3 JOURS", `<strong style="font-size:1.15em">3 JOURS</strong>`);
      return s.rouge
        ? `<p style="color:${ROUGE_SANCTIONS};font-weight:600">${corps}</p>`
        : `<p>${corps}</p>`;
    })
    .join("\n");
}
