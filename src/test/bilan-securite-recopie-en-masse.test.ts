import { describe, it, expect } from "vitest";
import { detecterRecopieEnMasse } from "@/components/cours-en-ligne/detectionRecopieReponses";

const q43 = [
  { texte: "Interdiction aux véhicules > 3,5 t de dépasser", lettre: "A", correct: true },
  { texte: "Interdiction de dépasser", lettre: "B" },
];
const q49 = [
  { texte: "Une circulation à sens unique", lettre: "A", correct: true },
  { texte: "Une obligation d'aller tout droit à la prochaine intersection", lettre: "B" },
];

describe("Bilan Sécurité routière — pas de recopie en masse de Q43/Q49", () => {
  it("détecte les propositions de Q43 recopiées sur d'autres panneaux", () => {
    const qs = [43, 47, 48].map((id) => ({ id, image: `/img${id}.png`, choix: q43 }));
    const r = detecterRecopieEnMasse(qs);
    expect(r).toHaveLength(1);
    expect(r[0].ids).toEqual([43, 47, 48]);
  });

  it("détecte les propositions de Q49 recopiées sur Q1-Q7", () => {
    const qs = [1, 2, 3, 49].map((id) => ({ id, image: `/img${id}.png`, choix: q49 }));
    expect(detecterRecopieEnMasse(qs)[0].images).toBe(4);
  });

  it("contenu réparé : chaque panneau a ses propres propositions", () => {
    const qs = [
      { id: 43, image: "/img43.png", choix: q43 },
      { id: 49, image: "/img49.png", choix: q49 },
      { id: 47, image: "/img47.png", choix: [{ texte: "Accès interdit aux véhicules transportant des marchandises polluant les eaux", lettre: "A", correct: true }, { texte: "Risque d'incendie", lettre: "B" }] },
      { id: 48, image: "/img48.png", choix: [{ texte: "Chaussée glissante", lettre: "A" }, { texte: "Risque d'incendie", lettre: "C", correct: true }] },
    ];
    expect(detecterRecopieEnMasse(qs)).toEqual([]);
  });

  it("même image répétée (même panneau) n'est pas une recopie", () => {
    const qs = [1, 2].map((id) => ({ id, image: "/meme.png", choix: q49 }));
    expect(detecterRecopieEnMasse(qs)).toEqual([]);
  });
});
