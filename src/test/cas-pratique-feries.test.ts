import { describe, it, expect } from "vitest";
import { SERIE_FERIES_CAS_PRATIQUE as serie } from "@/components/cours-en-ligne/cas-pratique-feries/donnees";
import { FERIES_2026, IDS_TAXI } from "@/components/cours-en-ligne/pratique-taxi-2026/donnees";
import { serieComplete } from "@/components/cours-en-ligne/equipements-taxi-locale/useQuizEquipements";
describe("Cas pratique — jours fériés 2026", () => {
  it("11 dates exactes, dont Pâques le 6 avril et Ascension le 14 mai", () => {
    expect(serie.questions).toHaveLength(11);
    expect(serie.questions[1].choix[serie.questions[1].correct]).toBe("lundi 6 avril 2026");
    expect(serie.questions[4].choix[serie.questions[4].correct]).toBe("jeudi 14 mai 2026");
    for (const [i, q] of serie.questions.entries()) {
      const attendu = new Date(`${FERIES_2026[i].date}T12:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", year: "numeric" });
      expect(q.choix[q.correct]).toBe(attendu);
      expect(new Set(q.choix).size).toBe(3);
    }
  });
  it("identité séparée du calendrier pratique, réponses complètes même fausses", () => {
    expect([...IDS_TAXI]).not.toContain(serie.id);
    expect(serieComplete(serie, {})).toBe(false);
    expect(serieComplete(serie, Object.fromEntries(serie.questions.map(q => [q.id, String((q.correct + 1) % 3)])))).toBe(true);
  });
});