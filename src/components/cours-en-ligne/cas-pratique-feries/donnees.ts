import { FERIES_2026 } from "../pratique-taxi-2026/donnees";
import type { SerieEquipements } from "../equipements-taxi-locale/useQuizEquipements";

const dateFr = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", year: "numeric" });
export const SERIE_FERIES_CAS_PRATIQUE: SerieEquipements = {
  id: "quiz_cas_pratique_feries_2026_v1",
  version: "2026-10-29-m12-feries-v1",
  protectionRpc: "quiz_cas_pratique_feries_protection_prete",
  questions: FERIES_2026.map((jour, index) => {
    const correct = index % 3;
    const choix = [-7, 0, 7].map((offset) => {
      const d = new Date(`${jour.date}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + offset);
      return dateFr(d.toISOString().slice(0, 10));
    });
    [choix[correct], choix[1]] = [choix[1], choix[correct]];
    return { id: jour.id, enonce: `À quelle date tombe ${jour.nom} en 2026 ?`, choix, correct, justification: `${jour.nom} : ${dateFr(jour.date)}. Jour férié national applicable dans le Rhône en 2026.` };
  }),
};