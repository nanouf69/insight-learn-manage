// Catalogue unique des sessions présentielles proposées (libellé + date de début YYYY-MM-DD).
// Une session est proposée seulement si elle commence dans les 6 prochains mois (heure de Paris)
// et disparaît dès son premier jour. Copie des dates publiées sur ftransport.fr (projet « site internet ») : les reporter ici à chaque changement du site.
export interface SessionCatalogue { label: string; debut: string }

export const SESSIONS_VTC: SessionCatalogue[] = [
  { label: "Du 2 au 15 novembre 2026", debut: "2026-11-02" },
  { label: "Du lundi 11 au vendredi 22 janvier 2027", debut: "2027-01-11" },
  { label: "Du lundi 15 au vendredi 26 mars 2027", debut: "2027-03-15" },
  { label: "Du lundi 10 au vendredi 21 mai 2027", debut: "2027-05-10" },
  { label: "Du lundi 5 au vendredi 16 juillet 2027", debut: "2027-07-05" },
  { label: "Du lundi 13 au vendredi 24 septembre 2027", debut: "2027-09-13" },
  { label: "Du lundi 22 novembre au vendredi 3 décembre 2027", debut: "2027-11-22" },
];
export const SESSIONS_TAXI: SessionCatalogue[] = [
  { label: "Du lundi 4 au lundi 25 janvier 2027", debut: "2027-01-04" },
  { label: "Du lundi 8 au lundi 29 mars 2027", debut: "2027-03-08" },
  { label: "Du lundi 3 au lundi 24 mai 2027", debut: "2027-05-03" },
  { label: "Du lundi 28 juin au lundi 19 juillet 2027", debut: "2027-06-28" },
  { label: "Du lundi 6 au lundi 27 septembre 2027", debut: "2027-09-06" },
  { label: "Du lundi 15 novembre au lundi 6 décembre 2027", debut: "2027-11-15" },
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
