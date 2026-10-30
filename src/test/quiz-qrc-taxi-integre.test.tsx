import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { quizItems } from "@/data/quiz-qrc-taxi/quizData";
import { METROPOLE_LYON, ZUPC_LYON, distracteurs } from "@/lib/quizQrcTaxi/communesLyon";
import { corrigerCommunes, corrigerCases, corrigerQrc } from "@/lib/quizQrcTaxi/correction";
import { QUIZ_COMMUNES_METROPOLE, QUIZ_COMMUNES_ZUPC } from "@/components/cours-en-ligne/exercices/communes-metropole-zupc-quiz-data";

import { requirements } from '@/lib/quizQrcTaxi/manifest';
const persisted = vi.hoisted(() => ({answers: {} as Record<string, unknown>, quiz: 'specialites'}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: {getSession: async()=>({data:{session:{user:{id:'eleve-fictif-1'}}}})}, rpc: async(name:string,args:Record<string,unknown>)=>{
 if(name==='qrc_practice_open') persisted.quiz=String(args.p_quiz);
 if(name==='qrc_practice_save') persisted.answers[String(args.p_key)]=args.p_answer;
 return {data:{id:'fixture',owner:'eleve-fictif-1',quiz:persisted.quiz,version:'taxi-optional-durable-v1',revision:0,manifest:requirements(persisted.quiz as 'complet'|'specialites'),answers:{...persisted.answers},answer_meta:{},submitted_at:null,saved_at:null,submit_operation:null}};
}}}));
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
  beforeEach(() => {localStorage.clear(); persisted.answers={};});
  it("QCM + QRC sauvegardés au serveur et repris après rechargement", async () => {
    const {unmount}=render(<QuizQrcTaxiIntegre quiz="specialites" />);
    await screen.findByText(/^A\./);
    fireEvent.click(screen.getByText(/^A\./)); fireEvent.click(screen.getByText('Passer à la QRC'));
    fireEvent.change(screen.getByPlaceholderText('Tapez votre réponse ici...'),{target:{value:'ma réponse'}});
    await waitFor(()=>expect(persisted.answers['qrc:21']).toBe('ma réponse'));
    unmount(); render(<QuizQrcTaxiIntegre quiz="specialites" />);
    await screen.findByText(/^A\./); fireEvent.click(screen.getByText('Passer à la QRC'));
    expect((screen.getByPlaceholderText('Tapez votre réponse ici...') as HTMLTextAreaElement).value).toBe('ma réponse');
  });
  it("exercices incomplets ne donnent ni correction ni soumission", async () => {
    render(<QuizQrcTaxiIntegre quiz="specialites" />); await screen.findByText('Exercices et soumission');
    fireEvent.click(screen.getByText('Exercices et soumission'));
    expect(screen.getByTestId('zone-zupc')).toBeTruthy();expect(screen.getByTestId('zone-metropole')).toBeTruthy();
    expect((screen.getByText('Soumettre le quiz') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText('Correction des 20 questions')).toBeNull();
  });
  it("complet conserve première question sans QRC",async()=>{
    render(<QuizQrcTaxiIntegre quiz="complet" />);await screen.findByText(/^A\./);
    fireEvent.click(screen.getByText(/^A\./));expect(screen.getByText('Question suivante')).toBeTruthy();
    expect(QUIZ_QRC_TAXI.complet.zones).toEqual(['metropole']);
  });
});

import { QCM_LOCAUX_BILAN_TA } from "@/data/bilan-ta/qcmLocauxBilanTa";
import { qcmLocalJuste } from "@/components/cours-en-ligne/QuizQrcTaxiIntegre";
describe("QCM locaux du Bilan examen TA ajoutés au quiz spécialités", () => {
  beforeEach(() => {localStorage.clear(); persisted.answers={};});
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
  it("écran : choix local sauvegardé, pas de correction avant soumission",async()=>{
    render(<QuizQrcTaxiIntegre quiz="specialites" />);await screen.findByText('Exercices et soumission');
    fireEvent.click(screen.getByText('Exercices et soumission'));
    const sec=screen.getByTestId('qcm-locaux-ta');const choice=sec.querySelector('button[role="checkbox"]');if(!choice)throw Error('choice');
    fireEvent.click(choice);await waitFor(()=>expect(persisted.answers['local:1']).toEqual(['A']));
    expect(screen.queryByText('1/40 justes')).toBeNull();
  });
});

import { quizIntegresBilan, exerciceRemplaceParQuizIntegres } from "@/components/cours-en-ligne/QuizExterneBilan";
import { BILAN_EXAMEN_TAXI } from "@/components/cours-en-ligne/bilan-examen-taxi-data";
describe("placement des quiz intégrés", () => {
  it("TAXI 11 et TA 28 affichent les deux quiz ; VTC 5 garde son lien", () => {
    expect(quizIntegresBilan(11)).toEqual(["complet", "specialites"]);
    expect(quizIntegresBilan(28)).toEqual(["specialites"]);
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
