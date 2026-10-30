import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { practiceIdentity, requestPracticeCorrection, validPracticeReceipt, correctionStorageKey } from "@/lib/quizQrcTaxi/aiCorrection";
import { validateGrade, disputedQuestion } from "../../supabase/functions/qrc-taxi-ia/core";
import { quizItems } from "@/data/quiz-qrc-taxi/quizData";
import serverQuestions from "../../supabase/functions/qrc-taxi-ia/questions.json";
import { CorrectionQrcTaxiIA } from "@/components/cours-en-ligne/CorrectionQrcTaxiIA";
const auth = vi.hoisted(() => ({ id: "technical-test", token: "test-token" }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: auth.id }, access_token: auth.token } } }) } } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: auth.id } }) }));
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); auth.id = "technical-test"; });

describe("preuves de correction facultative", () => {
  it("référence serveur exacte, mêmes 39 questions et corrigés", () => { expect(serverQuestions).toEqual(quizItems); });
  it("l'identité isole compte, quiz, question et réponse", async () => {
    const base = await practiceIdentity("a", "complet", 2, "réponse");
    for (const [account, quiz, question, answer] of [["b", "complet", 2, "réponse"], ["a", "specialites", 2, "réponse"], ["a", "complet", 3, "réponse"], ["a", "complet", 2, "autre"]] as const) expect(await practiceIdentity(account, quiz, question, answer)).not.toBe(base);
  });
  it("erreur et arbitrage n'inventent pas de zéro", () => {
    expect(validateGrade({ score: null, verdict: "review", explanation: "À arbitrer" }).score).toBeNull();
    expect(() => validateGrade({ score: 0, verdict: "review", explanation: "À arbitrer" })).toThrow();
    expect(() => validateGrade({ score: 1, verdict: "incorrect", explanation: "Faux" })).toThrow();
    expect(disputedQuestion(25)).toBe(true); expect(disputedQuestion(26)).toBe(true); expect(disputedQuestion(33)).toBe(true); expect(disputedQuestion(24)).toBe(false);
  });
  it("réponse corrélée et score cohérent obligatoires", () => {
    expect(validPracticeReceipt({ identity: "a", status: "done", result: { score: 1, verdict: "correct", explanation: "Juste" } }, "a")).toBe(true);
    expect(validPracticeReceipt({ identity: "b", status: "done", result: { score: 1, verdict: "correct", explanation: "Juste" } }, "a")).toBe(false);
    expect(validPracticeReceipt({ identity: "a", status: "done", result: { score: 0, verdict: "correct", explanation: "Juste" } }, "a")).toBe(false);
  });
  it("deux demandes simultanées ne lancent qu'un appel", async () => {
    const identity = await practiceIdentity(auth.id, "complet", 2, "paraphrase");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ identity, status: "done", result: { score: 1, verdict: "correct", explanation: "Même sens" } }), { headers: { "Content-Type": "application/json" } }));
    await Promise.all([requestPracticeCorrection(auth.id, "complet", 2, "paraphrase"), requestPracticeCorrection(auth.id, "complet", 2, "paraphrase")]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).not.toHaveProperty("expected");
  });
  it("erreur réseau : aucun retry automatique ni faux résultat", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    await expect(requestPracticeCorrection(auth.id, "complet", 2, "réponse réseau")).rejects.toThrow();
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("un changement de compte pendant l'appel empêche l'application", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      const identity = await practiceIdentity(auth.id, "complet", 2, "changement"); auth.id = "another-account";
      return new Response(JSON.stringify({ identity, status: "done", result: { score: 1, verdict: "correct", explanation: "Juste" } }));
    });
    await expect(requestPracticeCorrection("technical-test", "complet", 2, "changement")).rejects.toThrow("compte a changé");
  });
  it("validation visible, double clic protégé et reçu restauré sans appel", async () => {
    const identity = await practiceIdentity(auth.id, "specialites", 20, "ma réponse");
    let release: (r: Response) => void = () => {};
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(resolve => { release = resolve; }));
    const { unmount } = render(<CorrectionQrcTaxiIA quiz="specialites" questionId={20} answer="ma réponse" />);
    fireEvent.click(screen.getByText("Valider ma réponse"));
    expect(screen.getByRole("status").textContent).toContain("Correction en cours");
    await waitFor(() => expect(f).toHaveBeenCalledTimes(1));
    release(new Response(JSON.stringify({ identity, receiptId: "receipt-test", status: "done", result: { score: 1, verdict: "correct", explanation: "La paraphrase reprend le sens attendu." } })));
    await screen.findByText(/Correction IA : 1\/1/);
    expect(JSON.parse(localStorage.getItem(correctionStorageKey(auth.id, "specialites")) ?? "{}")[JSON.stringify([20, "ma réponse"])].receiptId).toBe("receipt-test");
    unmount(); render(<CorrectionQrcTaxiIA quiz="specialites" questionId={20} answer="ma réponse" />);
    expect(screen.getByText(/Correction IA : 1\/1/)).toBeTruthy(); expect(f).toHaveBeenCalledTimes(1);
  });
  it("réseau indisponible : réponse conservée, zéro absent, vérification explicite", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    render(<CorrectionQrcTaxiIA quiz="complet" questionId={2} answer="texte conservé" />);
    fireEvent.click(screen.getByText("Valider ma réponse"));
    await screen.findByText(/Résultat non reçu/);
    expect(screen.queryByText(/0\/1/)).toBeNull();
    expect(screen.getByText("Vérifier la correction")).toBeTruthy();
    expect(localStorage.getItem(correctionStorageKey(auth.id, "complet"))).toContain("texte conservé");
  });
});