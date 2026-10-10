import { describe, it, expect, vi, afterEach } from "vitest";
import { journaliserEchecValidationQuiz } from "@/lib/quizAttempts";

describe("Signalement serveur des échecs de validation de quiz", () => {
  afterEach(() => vi.restoreAllMocks());

  it("envoie seulement les identifiants (jamais de réponses) avec la clé publique", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    journaliserEchecValidationQuiz({ apprenantId: "a1", moduleId: 8, exerciceId: "module_8_exo_1", etape: "relecture" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/rest/v1/rpc/signaler_echec_validation_quiz");
    const body = JSON.parse(init.body);
    expect(Object.keys(body).sort()).toEqual(["_apprenant_id", "_etape", "_exercice_id", "_module_id"]);
    expect(body._module_id).toBe(8);
    vi.unstubAllGlobals();
  });

  it("ne bloque jamais l'élève si l'envoi échoue", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(() =>
      journaliserEchecValidationQuiz({ apprenantId: "a1", moduleId: "2", exerciceId: "module_2_exo_61", etape: "envoi" }),
    ).not.toThrow();
    vi.unstubAllGlobals();
  });
});
