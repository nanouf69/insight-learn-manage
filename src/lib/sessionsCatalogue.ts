// Catalogue unique des sessions présentielles proposées (libellé + date de début YYYY-MM-DD).
// Une session est proposée seulement si elle commence dans les 6 prochains mois (heure de Paris)
// et disparaît dès son premier jour. Ajouter ici les prochaines sessions au fur et à mesure.
export interface SessionCatalogue { label: string; debut: string }

export const SESSIONS_VTC: SessionCatalogue[] = [
  { label: "Du 2 au 15 novembre 2026", debut: "2026-11-02" },
  { label: "Du lundi 11 au vendredi 22 janvier 2027", debut: "2027-01-11" },
  { label: "Du lundi 15 au vendredi 26 mars 2027", debut: "2027-03-15" },
];
export const SESSIONS_TAXI: SessionCatalogue[] = [
  { label: "Du lundi 4 au lundi 25 janvier 2027", debut: "2027-01-04" },
  { label: "Du lundi 8 au lundi 29 mars 2027", debut: "2027-03-08" },
];

const jourParis = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(d);

export function sessionsAVenir(list: SessionCatalogue[], now = new Date()): string[] {
  const today = jourParis(now);
  const limite = new Date(now); limite.setMonth(limite.getMonth() + 6);
  const max = jourParis(limite);
  return list.filter((s) => s.debut > today && s.debut <= max).map((s) => s.label);
}

export const datesVtcAVenir = () => sessionsAVenir(SESSIONS_VTC);
export const datesTaxiAVenir = () => sessionsAVenir(SESSIONS_TAXI);
