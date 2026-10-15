import { describe, expect, it, vi } from "vitest";
import { finalisationBloqueeParRefus } from "@/lib/examClotureGarde";

/**
 * Reproduit la boucle KEVIN FERNANDES (14/10) : relance de finalisation
 * toutes les 15 s, chaque relance réenfilant la clôture refusée (P0530).
 */
function simulerFinalisation(refusApresPremierEnvoi: boolean) {
  let refus: { exerciceId: string; reason: string } | null = null;
  const enfilages: number[] = [];
  const file: string[] = [];
  const handleExpire = () => {
    if (finalisationBloqueeParRefus(refus, "EB2_t2")) return "bloque";
    enfilages.push(Date.now());
    file.push("cloture");
    if (refusApresPremierEnvoi) refus = { exerciceId: "EB2_t2", reason: "refused" };
    return "en_attente";
  };
  return { handleExpire, enfilages, file };
}

describe("Finalisation : refus définitif ⇒ aucune relance, file conservée", () => {
  it("après un P0530, 43 minutes de relances n'envoient plus rien", () => {
    vi.useFakeTimers();
    const s = simulerFinalisation(true);
    s.handleExpire();
    const id = setInterval(() => s.handleExpire(), 15_000);
    vi.advanceTimersByTime(43 * 60_000);
    clearInterval(id);
    vi.useRealTimers();
    expect(s.enfilages.length).toBe(1);
    expect(s.file.length).toBe(1); // jamais supprimée
  });
  it("erreur temporaire : les relances continuent", () => {
    vi.useFakeTimers();
    const s = simulerFinalisation(false);
    const id = setInterval(() => s.handleExpire(), 15_000);
    vi.advanceTimersByTime(60_000);
    clearInterval(id);
    vi.useRealTimers();
    expect(s.enfilages.length).toBe(4);
  });
  it("refus d'un autre exercice ou 'frozen' ne bloque pas", () => {
    expect(finalisationBloqueeParRefus({ exerciceId: "autre", reason: "refused" }, "EB2_t2")).toBe(false);
    expect(finalisationBloqueeParRefus({ exerciceId: "EB2_t2", reason: "frozen" }, "EB2_t2")).toBe(false);
    expect(finalisationBloqueeParRefus(null, "EB2_t2")).toBe(false);
  });
});
