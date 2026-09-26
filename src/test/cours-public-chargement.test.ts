import { describe, it, expect } from "vitest";
import { getLearnerModuleDisplayState } from "@/lib/moduleUnlockLogic";

describe("Accueil élève — chargement de la progression", () => {
  it("loaded=false : ni terminé, ni à faire, aucun compteur à 0 inventé", () => {
    const s = getLearnerModuleDisplayState({ loaded: false, serverCompleted: true, hasProgress: true });
    expect(s.status).toBe("chargement");
    expect(s.isDone).toBe(false);
    expect(s.action).toBeNull();
  });
  it("loaded=true : un Terminé serveur reste Terminé", () => {
    const s = getLearnerModuleDisplayState({ loaded: true, serverCompleted: true, hasProgress: false });
    expect(s.status).toBe("termine");
  });
});
