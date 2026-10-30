import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { render, screen, fireEvent } from "@testing-library/react";
import { quizItems } from "@/data/quiz-qrc-taxi/quizData";
import { METROPOLE_LYON, ZUPC_LYON, distracteurs } from "@/lib/quizQrcTaxi/communesLyon";
import { corrigerCommunes, corrigerCases, corrigerQrc } from "@/lib/quizQrcTaxi/correction";
import { QUIZ_COMMUNES_METROPOLE, QUIZ_COMMUNES_ZUPC } from "@/components/cours-en-ligne/exercices/communes-metropole-zupc-quiz-data";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "eleve-fictif-1" } }) }));
import QuizQrcTaxiIntegre, { QUIZ_QRC_TAXI, cleStockage } from "@/components/cours-en-ligne/QuizQrcTaxiIntegre";

const correctes = (ex: typeof QUIZ_COMMUNES_ZUPC) =>
  new Set(ex.questions.flatMap((q) => q.choix.filter((c) => c.correct).map((c) => c.texte)));

describe("questions reprises à l'identique", () => {
  it("fichier copié octet pour octet du site Quiz QRC TAXI (commit d00cf370)", () => {
    const h = createHash("md5").update(readFileSync("src/data/quiz-qrc-taxi/quizData.ts")).digest("hex");
    expect(h).toBe("68c4e0ca8fbaf934211b8c55dde37a68");
  });
  it("complet = 39 questions dans l'ordre, sans doublon", () => {
    expect(QUIZ_QRC_TAXI.complet.items.map((q) => q.id)).toEqual(quizItems.map((q) => q.id));
    expect(new Set(quizItems.map((q) => q.id)).size).toBe(39);
  });
  it("spécialités = les 20 questions Réglementation nationale, rien d'autre", () => {
    const s = QUIZ_QRC_TAXI.specialites.items;
    expect(s).toHaveLength(20);
    expect(s.every((q) => q.category === "national")).toBe(true);
  });
});

describe("listes officielles", () => {
  it("Métropole : 58 communes = liste du module 7", () => {
    expect(METROPOLE_LYON).toHaveLength(58);
    expect(new Set(METROPOLE_LYON.map((e) => e.nom))).toEqual(correctes(QUIZ_COMMUNES_METROPOLE));
  });
  it("ZUPC : aéroport + 23 communes, aéroport non compté comme commune", () => {
    expect(ZUPC_LYON).toHaveLength(24);
    expect(ZUPC_LYON.filter((e) => e.estCommune)).toHaveLength(23);
    expect(new Set(ZUPC_LYON.map((e) => e.nom))).toEqual(correctes(QUIZ_COMMUNES_ZUPC));
  });
  it("les distracteurs ne contiennent aucun élément de référence", () => {
    for (const z of ["metropole", "zupc"] as const) {
      const ref = new Set((z === "zupc" ? ZUPC_LYON : METROPOLE_LYON).map((e) => e.nom));
      expect(distracteurs(z).some((d) => ref.has(d))).toBe(false);
    }
    expect(distracteurs("metropole")).toContain("Genas");
    expect(distracteurs("zupc")).toContain("Givors");
  });
});

describe("correction des communes", () => {
  it("variantes acceptées, oubliées et erronées listées", () => {
    const b = corrigerCommunes("st priest, Ste Foy les Lyon\nOULLINS, Venissieux, Lyon 3e, Givors, Genas, Bron, Bron, Villeurbane", ZUPC_LYON);
    expect(b.trouvees).toEqual(expect.arrayContaining(["Saint-Priest", "Sainte-Foy-lès-Lyon", "Oullins-Pierre-Bénite", "Vénissieux", "Lyon", "Genas", "Bron", "Villeurbanne"]));
    expect(b.erronees).toEqual(["Givors"]);
    expect(b.doublons).toEqual(["Bron"]);
    expect(b.orthographe).toEqual([{ saisie: "Villeurbane", officiel: "Villeurbanne" }]);
    expect(b.oubliees).toContain("Aéroport de Lyon-Saint-Exupéry");
    expect(b.communesTrouvees).toBe(8);
    expect(b.totalCommunes).toBe(23);
  });
  it("Genas est erronée pour la Métropole, jamais rapprochée d'une autre commune", () => {
    expect(corrigerCommunes("Genas, Genay", METROPOLE_LYON).erronees).toEqual(["Genas"]);
  });
  it("aéroport cité compté à part", () => {
    const b = corrigerCommunes("Aéroport Saint-Exupéry", ZUPC_LYON);
    expect(b.trouvees).toEqual(["Aéroport de Lyon-Saint-Exupéry"]);
    expect(b.communesTrouvees).toBe(0);
  });
  it("liste complète Métropole = 0 oubliée", () => {
    expect(corrigerCommunes(METROPOLE_LYON.map((e) => e.nom).join("\n"), METROPOLE_LYON).oubliees).toEqual([]);
  });
  it("cases : oubliées et cochées à tort", () => {
    const b = corrigerCases(["Bron", "Givors"], ZUPC_LYON);
    expect(b.erronees).toEqual(["Givors"]);
    expect(b.oubliees).toHaveLength(23);
  });
});

describe("correction QRC (règles du site d'origine, sans IA)", () => {
  it("réponse simple reconnue", () => {
    expect(corrigerQrc("avoir le casier judiciaire B2 vierge", "Avoir le casier judiciaire B2 vierge").score).toBe(1);
  });
  it("réponses multiples : barème partiel identique", () => {
    const att = ["Carte professionnelle en cours de validité", "Aptitude médicale", "Honorabilité", "Casier judiciaire B2 vierge"];
    expect(corrigerQrc("aptitude medicale, honorabilite", att).score).toBe(0.5);
    expect(corrigerQrc("aptitude medicale, honorabilite, casier judiciaire b2 vierge", att).score).toBe(1);
  });
  it("non reconnue : réponse attendue affichée, pas de faux succès", () => {
    const c = corrigerQrc("je ne sais pas", "Avoir le casier judiciaire B2 vierge");
    expect(c.score).toBe(0);
    expect(c.feedback).toContain("Avoir le casier judiciaire B2 vierge");
  });
});

describe("parcours écran apprenant", () => {
  beforeEach(() => localStorage.clear());
  it("QCM + QRC sauvegardés localement pour ce compte et repris au rechargement", () => {
    const q = QUIZ_QRC_TAXI.specialites.items[0];
    const { unmount } = render(<QuizQrcTaxiIntegre quiz="specialites" />);
    fireEvent.click(screen.getByText(new RegExp(q.mcqOptions[0].slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))));
    fireEvent.click(screen.getByText("Passer à la QRC"));
    fireEvent.change(screen.getByPlaceholderText("Tapez votre réponse ici..."), { target: { value: "ma réponse" } });
    unmount();
    const saved = JSON.parse(localStorage.getItem(cleStockage("eleve-fictif-1", "specialites"))!);
    expect(saved.reponses[q.id]).toEqual({ qcm: q.mcqOptions[0], qrc: "ma réponse" });
    render(<QuizQrcTaxiIntegre quiz="specialites" />);
    expect((screen.getByPlaceholderText("Tapez votre réponse ici...") as HTMLTextAreaElement).value).toBe("ma réponse");
  });
  it("après les questions : exercices ZUPC puis Métropole avec bilan des oubliées", () => {
    localStorage.setItem(cleStockage("eleve-fictif-1", "specialites"), JSON.stringify({ index: 20 }));
    render(<QuizQrcTaxiIntegre quiz="specialites" />);
    expect(screen.getByTestId("zone-zupc")).toBeTruthy();
    expect(screen.getByTestId("zone-metropole")).toBeTruthy();
    const zupc = screen.getByTestId("zone-zupc");
    fireEvent.change(zupc.querySelector("textarea")!, { target: { value: "Bron, Givors" } });
    fireEvent.click(screen.getAllByText("Corriger ma liste")[0]);
    expect(screen.getByText("1/23 communes trouvées · Aéroport : oublié")).toBeTruthy();
    expect(screen.getByText(/Réponses erronées/)).toBeTruthy();
    expect(screen.getAllByText("Correction des 20 questions")).toHaveLength(1);
  });
  it("complet : première question sans QRC, comme le site d'origine ; Métropole seule", () => {
    render(<QuizQrcTaxiIntegre quiz="complet" />);
    fireEvent.click(screen.getByText(/^A\./));
    expect(screen.getByText("Question suivante")).toBeTruthy();
    expect(QUIZ_QRC_TAXI.complet.zones).toEqual(["metropole"]);
  });
});

import { QCM_LOCAUX_BILAN_TA } from "@/data/bilan-ta/qcmLocauxBilanTa";
import { qcmLocalJuste } from "@/components/cours-en-ligne/QuizQrcTaxiIntegre";
describe("QCM locaux du Bilan examen TA ajoutés au quiz spécialités", () => {
  beforeEach(() => localStorage.clear());
  it("40 QCM ajoutés, les 20 QRC conservées, complet inchangé", () => {
    expect(QUIZ_QRC_TAXI.specialites.qcmLocaux).toHaveLength(40);
    expect(QUIZ_QRC_TAXI.specialites.items).toHaveLength(20);
    expect(QUIZ_QRC_TAXI.complet.qcmLocaux).toHaveLength(0);
    expect(new Set(QCM_LOCAUX_BILAN_TA.map((q) => q.id)).size).toBe(40);
    expect(QCM_LOCAUX_BILAN_TA.every((q) => q.choix.some((c) => c.correct))).toBe(true);
  });
  it("réponse multiple exigée en entier (tarif D = C + D)", () => {
    const q = QCM_LOCAUX_BILAN_TA.find((x) => x.id === 13)!;
    expect(qcmLocalJuste(q, ["C", "D"])).toBe(true);
    expect(qcmLocalJuste(q, ["C"])).toBe(false);
  });
  it("écran : cocher, corriger, résultat affiché et sauvegardé", () => {
    localStorage.setItem(cleStockage("eleve-fictif-1", "specialites"), JSON.stringify({ index: 20 }));
    render(<QuizQrcTaxiIntegre quiz="specialites" />);
    const sec = screen.getByTestId("qcm-locaux-ta");
    fireEvent.click(sec.querySelectorAll('button[role="checkbox"]')[0]); // Q1 A = juste
    fireEvent.click(screen.getByText("Corriger les QCM locaux"));
    expect(screen.getByText("1/40 justes")).toBeTruthy();
    const saved = JSON.parse(localStorage.getItem(cleStockage("eleve-fictif-1", "specialites"))!);
    expect(saved.locaux[1]).toEqual(["A"]);
  });
});

import { quizIntegresBilan, exerciceRemplaceParQuizIntegres } from "@/components/cours-en-ligne/QuizExterneBilan";
import { BILAN_EXAMEN_TAXI } from "@/components/cours-en-ligne/bilan-examen-taxi-data";
describe("placement des quiz intégrés", () => {
  it("TAXI 11 et TA 28 affichent les deux quiz ; VTC 5 garde son lien", () => {
    expect(quizIntegresBilan(11)).toEqual(["complet", "specialites"]);
    expect(quizIntegresBilan(28)).toEqual(["complet", "specialites"]);
    expect(quizIntegresBilan(5)).toEqual([]);
  });
  it("seule l'entrée H (607) du module 11 est remplacée, ses questions restent dans les données", () => {
    const visibles = BILAN_EXAMEN_TAXI.filter((e) => !exerciceRemplaceParQuizIntegres(11, e.id)).map((e) => e.id);
    expect(visibles).toEqual([600, 601, 602, 603, 604, 605, 606]);
    expect(BILAN_EXAMEN_TAXI.find((e) => e.id === 607)!.questions.length).toBeGreaterThan(0);
    expect(exerciceRemplaceParQuizIntegres(28, 607)).toBe(false);
    expect(exerciceRemplaceParQuizIntegres(5, 507)).toBe(false);
  });
});
