import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { AdminExamQuestionCard } from "@/components/cours-en-ligne/AdminExamQuestionCard";

vi.mock("@/components/cours-en-ligne/QuestionFirstPassageRate", () => ({ QuestionFirstPassageRate: () => null }));
afterEach(cleanup);
const qcm: any = { id: 44, type: "QCM", enonce: "Énoncé simulé", choix: [{ lettre: "A", texte: "Choix inchangé", correct: true }] };
const qrc: any = { id: 44, type: "QRC", enonce: "Énoncé simulé", reponseQRC: "Corrigé inchangé", reponses_possibles: ["coût"] };
const props = (question: any, save?: (s: string) => Promise<boolean>) => ({ question, questionIndex: 3, questionCount: 4, matiere: { id: "reglementation_vtc1", questions: [question] } as any, statsEnabled: false, onEdit: vi.fn(), onMove: vi.fn(), onMoveTo: vi.fn(), onEnonceSave: save });
describe("Édition locale du seul énoncé", () => {
  it.each([qcm, qrc])("une modification %s confirmée, sans mutation de la question fournie", async (q) => {
    const before = structuredClone(q);
    const save = vi.fn().mockResolvedValue(true);
    render(<AdminExamQuestionCard {...props(q, save)} />);
    fireEvent.click(screen.getByRole("button", { name: "Modifier le texte de l’énoncé" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Énoncé modifié" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer l’énoncé" }));
    await waitFor(() => expect(save).toHaveBeenCalledExactlyOnceWith("Énoncé modifié"));
    expect(q).toEqual(before);
  });
  it.each([false, "throw"])("refus %s : saisie conservée et retry du même texte malgré affichage optimiste", async (failure) => {
    const save = vi.fn().mockImplementationOnce(() => failure === "throw" ? Promise.reject(new Error("réseau")) : Promise.resolve(false)).mockResolvedValue(true);
    const view = render(<AdminExamQuestionCard {...props(qrc, save)} />);
    fireEvent.click(screen.getByRole("button", { name: "Modifier le texte de l’énoncé" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Nouveau" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer l’énoncé" }));
    await screen.findByRole("alert");
    view.rerender(<AdminExamQuestionCard {...props({ ...qrc, enonce: "Nouveau" }, save)} />);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Nouveau");
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer l’énoncé" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  });
  it("annuler et crayon restent indépendants des réponses", () => {
    const save = vi.fn(); const p = props(qcm, save);
    const response = vi.fn().mockResolvedValue(true);
    render(<AdminExamQuestionCard {...p} onChoixTexteSave={response} />);
    fireEvent.click(screen.getByRole("button", { name: "Modifier le texte de l’énoncé" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    fireEvent.click(screen.getByRole("button", { name: "Modifier la question 4" }));
    expect(p.onEdit).toHaveBeenCalledOnce(); expect(save).not.toHaveBeenCalled(); expect(response).not.toHaveBeenCalled();
  });
});