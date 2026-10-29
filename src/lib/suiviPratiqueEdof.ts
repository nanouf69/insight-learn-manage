import { calculerSignaturesManquantes, planningCreneaux, dateDuJourParis } from "@/lib/signaturesManquantes";

export const OBJET_DERNIERE_RELANCE = "DERNIER AVERTISSEMENT – Formation à terminer sous 3 jours";

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

/** Date limite = date d'envoi + 3 jours calendaires (Europe/Paris). */
export function dateLimiteRelance(envoi: Date = new Date()): string {
  const jour = dateDuJourParis(envoi);
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 3);
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
}

export function mailDerniereRelance(prenom: string | null | undefined, nom: string | null | undefined, pourcentage: number, dateLimite: string) {
  const nomComplet = [prenom?.trim(), nom?.trim().toUpperCase()].filter(Boolean).join(" ");
  return {
    subject: OBJET_DERNIERE_RELANCE,
    body: `Bonjour${nomComplet ? ` ${nomComplet}` : ""},

Malgré nos précédentes relances, nous constatons que vous n'avez toujours pas terminé l'intégralité des modules obligatoires de votre formation.

Votre progression actuelle : ${formatPourcentage(pourcentage)} des modules terminés.

CE MESSAGE CONSTITUE NOTRE DERNIER AVERTISSEMENT.

Nous vous demandons impérativement de terminer l'ensemble des modules, exercices et évaluations obligatoires de votre parcours dans un délai maximum de 3 jours calendaires à compter de la réception de cet email, soit au plus tard le ${dateLimite}.

Le non-respect de vos obligations de formation peut entraîner des conséquences sur votre dossier de financement, notamment dans le cadre du CPF ou d'un financement France Travail, selon les règles applicables à votre situation.

En cas de non-régularisation, notre centre pourra signaler aux organismes concernés les éléments factuels relatifs à votre participation et à votre progression.

Notre centre ne pourra être tenu responsable des conséquences directement liées à votre absence de participation ou à la non-réalisation des obligations qui vous incombent, sous réserve de ses propres obligations légales et contractuelles.

Si vous rencontrez une difficulté technique vous empêchant de terminer votre formation, signalez-la immédiatement avant l'expiration du délai.

Cordialement,
Le service pédagogique – SERVICES PRO
Centre de formation TAXI / VTC`,
  };
}
