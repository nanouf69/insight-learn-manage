import { describe, it, expect } from "vitest";
import { getMatiereSyncKey } from "./examens-blancs-sync-scope";
import { choisirMatieresModifiees, reconcilierApresSauvegarde, empreinteContenu, remplacerTexteProposition } from "./examens-blancs-persist";

const mid = (id: string) => ({ EB4: 90003, "eb4-va": 90025 } as Record<string, number>)[id];
const DOUBLE = "coût de revient + marge + TVA coût de revient + marge + TVA";
const SIMPLE = "coût de revient + marge + TVA";
const mat = (b: string, at: string) => ({
  id: "reglementation_vtc", nom: "F(V)", _editedAt: at,
  questions: [{ id: 13, type: "QCM", enonce: "Le prix de vente d'une prestation doit être égal au", _editedAt: at,
    choix: [{ lettre: "A", texte: "coût de revient" }, { lettre: "B", texte: b, correct: true }] }],
}) as any;
const ex = (id: string, m: any) => ({ id, matieres: [m] }) as any;
const T0 = "2026-11-12T08:28:00.000Z", T1 = "2026-11-12T08:28:50.000Z", T2 = "2026-11-12T08:28:52.000Z";

describe("incident 12/11 F(V) Q13 EB4 VTC / EB4 VA", () => {
  it("la sync key est commune aux deux examens N°4", () => {
    expect(getMatiereSyncKey("EB4", "reglementation_vtc")).toBe(getMatiereSyncKey("eb4-va", "reglementation_vtc"));
  });

  it("une copie frère périmée n'est jamais recopiée sur la nouvelle valeur", () => {
    // Base : les deux modules ont reçu SIMPLE (T1). Affichage : EB4 rééditée (T2), VA resté sur DOUBLE (T0).
    const emp = { 90003: JSON.stringify([mat(SIMPLE, T1)]), 90025: JSON.stringify([mat(SIMPLE, T1)]) };
    const etat = [ex("EB4", mat(SIMPLE + " ", T2)), ex("eb4-va", mat(DOUBLE, T0))];
    const r = choisirMatieresModifiees(etat, emp, mid);
    const k = getMatiereSyncKey("EB4", "reglementation_vtc");
    expect(r.modifiees.get(k)!.questions[0].choix![1].texte).toBe(SIMPLE + " ");
    expect(r.perimees).toEqual([{ examId: "eb4-va", matiereId: "reglementation_vtc" }]);
  });

  it("seule la copie périmée a changé : rien n'est écrit", () => {
    const emp = { 90003: JSON.stringify([mat(SIMPLE, T1)]), 90025: JSON.stringify([mat(SIMPLE, T1)]) };
    const etat = [ex("EB4", mat(SIMPLE, T1)), ex("eb4-va", mat(DOUBLE, T0))];
    expect(choisirMatieresModifiees(etat, emp, mid).modifiees.size).toBe(0);
  });

  it("une vraie saisie sur l'examen frère reste prise en compte", () => {
    const emp = { 90003: JSON.stringify([mat(SIMPLE, T1)]), 90025: JSON.stringify([mat(SIMPLE, T1)]) };
    const etat = [ex("EB4", mat(SIMPLE, T1)), ex("eb4-va", mat("autre", T2))];
    const r = choisirMatieresModifiees(etat, emp, mid);
    expect(r.modifiees.get(getMatiereSyncKey("EB4", "reglementation_vtc"))!.questions[0].choix![1].texte).toBe("autre");
  });

  it("après écriture, l'examen frère affiche la version enregistrée", () => {
    const envoye = [ex("EB4", mat(SIMPLE, T1)), ex("eb4-va", mat(DOUBLE, T0))];
    const enregistre = [ex("EB4", mat(SIMPLE, T1)), ex("eb4-va", mat(SIMPLE, T1))];
    const actuel = [ex("EB4", mat(SIMPLE, T2)), ex("eb4-va", mat(DOUBLE, T0))]; // saisie pendant l'écriture
    const r = reconcilierApresSauvegarde(actuel, envoye, enregistre);
    expect(r[1].matieres[0].questions[0].choix[1].texte).toBe(SIMPLE);
    expect(r[0].matieres[0]._editedAt).toBe(T2); // saisie conservée
  });

  it("rafraîchissement 10 min plus tard sans saisie : état inchangé, aucune nouvelle candidate", () => {
    const enregistre = [ex("EB4", mat(SIMPLE, T1)), ex("eb4-va", mat(SIMPLE, T1))];
    const r = reconcilierApresSauvegarde(enregistre, enregistre, enregistre);
    expect(r).toBe(enregistre);
    const emp = { 90003: JSON.stringify(enregistre[0].matieres), 90025: JSON.stringify(enregistre[1].matieres) };
    expect(choisirMatieresModifiees(r, emp, mid).modifiees.size).toBe(0);
  });

  it("deux onglets : la relecture compare le contenu, pas l'ordre des clés", () => {
    const a = [{ questions: [{ choix: [{ texte: SIMPLE, lettre: "B", correct: true }], enonce: "x", type: "QCM", id: 13 }], id: "m" }];
    const b = [{ id: "m", questions: [{ id: 13, type: "QCM", enonce: "x", choix: [{ lettre: "B", texte: SIMPLE, correct: true }] }] }];
    expect(empreinteContenu(a)).toBe(empreinteContenu(b));
    const c = [{ id: "m", questions: [{ id: 13, type: "QCM", enonce: "x", choix: [{ lettre: "B", texte: DOUBLE, correct: true }] }] }];
    expect(empreinteContenu(c)).not.toBe(empreinteContenu(b));
  });

  it("édition sur place : seul le texte change, bonne réponse conservée", () => {
    const q = mat(DOUBLE, T0).questions[0];
    const r = remplacerTexteProposition(q, 1, SIMPLE);
    expect(r.choix[1]).toEqual({ lettre: "B", texte: SIMPLE, correct: true });
    expect(r.choix[0]).toBe(q.choix[0]);
    expect(remplacerTexteProposition(q, 5, "x")).toBe(q);
  });
});
