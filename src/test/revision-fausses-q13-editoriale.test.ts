/** EB4 VTC Q13 (fictif) : édition éditoriale propagée par identité stable dans « Refaire les questions fausses », copie figée intacte. */
import { describe, it, expect } from "vitest";
import { questionsFaussesDuPassage, questionActuelleRapprochee } from "@/lib/revisionQuestionsFigees";

const DOUBLE = "coût de revient + marge + TVA coût de revient + marge + TVA";
const q = (id: number, enonce: string, b: string, correct = "B") => ({ id, type: "QCM", enonce, points: 1, choix: ["A", "B", "C"].map(l => ({ lettre: l, texte: l === "B" ? b : `prop ${l}${id}`, correct: l === correct })) });
const figees = [q(12, "Q12", "b12"), q(13, "Le prix de vente d'une prestation doit être égal au", DOUBLE), q(14, "Q14", "b14")];
const resultat = (rep: Record<number, string[]>) => ({ matiereId: "fv", reponses: rep, __core: { questions: figees.map(x => ({ ...x, id: `fv:${x.id}` })) } });
const matiere = (qs: any[]) => ({ id: "fv", nom: "F(V)", duree: 30, coefficient: 1, noteEliminatoire: 6, noteSur: 20, questions: qs }) as any;
const ids = (b: any) => b.fausses.map((f: any) => f.question.id);

describe("Q13 — cohérence après édition", () => {
  const snapshotAvant = JSON.stringify(figees);
  it("changement de texte d'une proposition : texte actuel affiché, même ID/ordre, copie figée intacte", () => {
    const actuelle = matiere([figees[0], q(13, figees[1].enonce, "coût de revient + marge + TVA"), figees[2]]);
    const b = questionsFaussesDuPassage(actuelle, resultat({ 12: ["A"], 13: ["A"], 14: ["B"] }));
    expect(ids(b)).toEqual([12, 13]);
    expect(b.fausses[1].question.choix![1].texte).toBe("coût de revient + marge + TVA");
    expect(b.fausses[1].questionFigee.choix![1].texte).toBe(DOUBLE);
    expect(b.fausses[1].corrige).toBe("actuel");
    expect(b.nonRapprochees).toEqual([]);
    expect(JSON.stringify(figees)).toBe(snapshotAvant);
  });
  it("changement de corrigé : verdict recalculé sur la dernière réponse enregistrée, divergence signalée, rien ajouté", () => {
    const actuelle = matiere([figees[0], q(13, figees[1].enonce, DOUBLE, "A"), figees[2]]);
    const b = questionsFaussesDuPassage(actuelle, resultat({ 12: ["B"], 13: ["A"], 14: ["B"] }));
    expect(ids(b)).toEqual([]); // A devient juste : la liste filtrée se met à jour
    expect(b.divergencesCorrige).toEqual([13]);
    const b2 = questionsFaussesDuPassage(actuelle, resultat({ 12: ["B"], 13: ["B"], 14: ["B"] }));
    expect(ids(b2)).toEqual([13]);
  });
  it("énoncé ET propositions changés, ou ID ambigu : pas de propagation, corrigé figé", () => {
    expect(questionActuelleRapprochee(figees[1] as any, matiere([q(13, "autre", "autre")]))).toBeNull();
    expect(questionActuelleRapprochee(figees[1] as any, matiere([figees[1], figees[1]]))).toBeNull();
    const b = questionsFaussesDuPassage(matiere([q(13, "autre", "autre")]), resultat({ 13: ["A"] }));
    expect(b.nonRapprochees).toEqual([13]);
    expect(b.fausses[0].corrige).toBe("fige");
    expect(b.fausses[0].question.choix![1].texte).toBe(DOUBLE);
  });
  it("lettres réordonnées ou ajoutées : pas de propagation", () => {
    const autre = { ...figees[1], choix: [...figees[1].choix, { lettre: "D", texte: "x", correct: false }] };
    expect(questionActuelleRapprochee(figees[1] as any, matiere([autre]))).toBeNull();
  });
  it("rechargement : même entrée → même résultat (aucun état caché)", () => {
    const actuelle = matiere([figees[0], q(13, figees[1].enonce, "coût de revient + marge + TVA"), figees[2]]);
    const r = resultat({ 13: ["A"] });
    expect(JSON.stringify(questionsFaussesDuPassage(actuelle, r))).toBe(JSON.stringify(questionsFaussesDuPassage(actuelle, r)));
  });
});
describe("Q13 — durcissement : pas de sens deviné", () => {
  const f = figees[1] as any;
  it("échange des textes A/B en gardant les lettres : non rapproché", () => {
    const a = { ...f, choix: f.choix.map((c: any) => c.lettre === "A" ? { ...c, texte: DOUBLE } : c.lettre === "B" ? { ...c, texte: "prop A13" } : c) };
    expect(questionActuelleRapprochee(f, matiere([a]))).toBeNull();
  });
  it("réécriture d'énoncé seule : non rapprochée", () => {
    expect(questionActuelleRapprochee(f, matiere([{ ...f, enonce: "Le prix de vente d’une prestation est égal au" }]))).toBeNull();
  });
  it("texte de proposition réécrit (non cosmétique) : non rapproché", () => {
    const a = { ...f, choix: f.choix.map((c: any) => c.lettre === "B" ? { ...c, texte: "coût de revient + marge" } : c) };
    expect(questionActuelleRapprochee(f, matiere([a]))).toBeNull();
  });
  it("espaces seuls : rapproché ; texte identique et clé changée : rapprochée", () => {
    const a = { ...f, enonce: `  ${f.enonce}  `, choix: f.choix.map((c: any) => ({ ...c, correct: c.lettre === "A" })) };
    expect(questionActuelleRapprochee(f, matiere([a]))?.id).toBe(13);
  });
  it("répétition partielle (pas exacte) : non rapprochée", () => {
    const g = { ...f, choix: f.choix.map((c: any) => c.lettre === "B" ? { ...c, texte: "coût de revient + marge + TVA coût de revient" } : c) };
    expect(questionActuelleRapprochee(g, matiere([f]))).toBeNull();
  });
});
