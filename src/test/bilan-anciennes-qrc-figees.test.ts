import { describe, it, expect } from "vitest";
import { estAncienneQrcInformative, questionsComptees, type EtatSnapshotsEleve } from "@/components/cours-en-ligne/bilanSnapshotsEleve";

// Passage fictif reproduisant H : 48 QCM + 48 anciennes QRC (type "QRC", sans proposition, réponse dans reponseQRC).
const qcm = (id: number) => ({ id, type: "QCM", enonce: `Q${id}`, choix: [{ lettre: "A", texte: "a", correct: true }, { lettre: "B", texte: "b" }] });
const qrc = (id: number) => ({ id, type: "QRC", enonce: `Q${id}`, choix: [], reponseQRC: "réponse officielle" });
const questions = Array.from({ length: 96 }, (_, i) => (i % 2 === 0 ? qcm(i + 1) : qrc(i + 1)));
const fige: EtatSnapshotsEleve = { statut: "pret", parExo: { 507: { snapshotId: "s", empreinte: "e", questions } } };

describe("Anciennes QRC dans un passage figé", () => {
  it("reconnaît uniquement les anciennes QRC non saisissables", () => {
    expect(estAncienneQrcInformative(qrc(2))).toBe(true);
    expect(estAncienneQrcInformative(qcm(1))).toBe(false);
    expect(estAncienneQrcInformative({ id: 9, type: "qrc", choix: [] })).toBe(false);
    expect(estAncienneQrcInformative({ id: 9, choix: [], reponsesAttendues: ["x"], type: "QRC" })).toBe(false);
  });
  it("passage figé : les 96 restent affichées, seules les 48 QCM comptent", () => {
    expect(questions.length).toBe(96);
    const comptees = questionsComptees(fige, 507, questions);
    expect(comptees.length).toBe(48);
    // 1 réponse Q1 = A : progression et note ne voient jamais les QRC.
    const rep: Record<number, string> = { 1: "A" };
    const manquantes = comptees.filter((q) => !rep[q.id]);
    expect(manquantes.every((q) => q.type === "QCM")).toBe(true);
    // Toutes les QCM répondues → terminé, même sans aucune QRC répondue.
    const toutes = Object.fromEntries(comptees.map((q) => [q.id, "A"]));
    expect(comptees.filter((q) => !toutes[q.id]).length).toBe(0);
  });
  it("sans passage figé ou autre exercice : comportement inchangé", () => {
    expect(questionsComptees({ statut: "inactif" }, 507, questions).length).toBe(96);
    expect(questionsComptees(fige, 508, questions).length).toBe(96);
  });
});
