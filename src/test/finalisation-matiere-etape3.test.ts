// @vitest-environment node
/**
 * ÉTAPE 3 — SÉCURISATION DE « TERMINER LA MATIÈRE » (tests uniquement).
 *
 * Aucune écriture réelle : on vérifie la décision de clôture.
 * Règle : on contrôle la SYNCHRONISATION des écritures produites, jamais le
 * nombre de questions répondues. Une question ou une QRC laissée vide ne doit
 * jamais empêcher un élève de terminer.
 */
import { describe, it, expect, vi } from "vitest";
import {
  assessFinalizationReadiness,
  attendreFinalizationReadiness,
  MESSAGE_SYNCHRONISATION_EN_COURS,
  type FinalizationContext,
} from "@/lib/examFinalizationReadiness";
import {
  runFinalizationOnce,
  buildFinalizationKey,
  buildFinalizationToastId,
  isFinalizationConfirmed,
  resolveIdempotentTentative,
} from "@/lib/examFinalizationGuard";

const base = (over: Partial<FinalizationContext> = {}): FinalizationContext => ({
  apprenantId: "A1",
  examenId: "EB3",
  matiereId: "t3p",
  tentative: 1,
  attempt: { apprenantId: "A1", examenId: "EB3", matiereId: "t3p", tentative: 1 },
  ecrituresLocalesEnAttente: 0,
  ecrituresNoyauEnAttente: 0,
  dernierOrdreClient: 12,
  dernierOrdreConfirme: 12,
  refus: null,
  ...over,
});

describe("Contrôle avant finalisation", () => {
  it("finalisation normale : tout est confirmé → clôture autorisée", () => {
    expect(assessFinalizationReadiness(base()).pret).toBe(true);
  });

  it("une réponse encore locale → finalisation refusée avec le message d'attente", () => {
    const v = assessFinalizationReadiness(base({ ecrituresLocalesEnAttente: 1 }));
    expect(v.pret).toBe(false);
    expect(v.raison).toBe("ecritures_en_attente");
    expect(v.message).toBe(MESSAGE_SYNCHRONISATION_EN_COURS);
  });

  it("une écriture connue du client absente du serveur → refus (ordre non confirmé)", () => {
    const v = assessFinalizationReadiness(base({ dernierOrdreClient: 13, dernierOrdreConfirme: 12 }));
    expect(v.pret).toBe(false);
    expect(v.raison).toBe("ordre_non_confirme");
  });

  it("ancienne réponse arrivant après une plus récente : l'ordre confirmé ne recule pas", () => {
    const v = assessFinalizationReadiness(base({ dernierOrdreClient: 12, dernierOrdreConfirme: 15 }));
    expect(v.pret).toBe(true);
  });

  it("tentative d'un autre passage → refus, rien n'est clôturé", () => {
    const v = assessFinalizationReadiness(
      base({ attempt: { apprenantId: "A2", examenId: "EB3", matiereId: "t3p", tentative: 1 } }),
    );
    expect(v.pret).toBe(false);
    expect(v.raison).toBe("identite");
  });

  it("matière ou examen différents → refus", () => {
    expect(
      assessFinalizationReadiness(base({ attempt: { apprenantId: "A1", examenId: "EB2", matiereId: "t3p", tentative: 1 } })).raison,
    ).toBe("identite");
    expect(
      assessFinalizationReadiness(base({ attempt: { apprenantId: "A1", examenId: "EB3", matiereId: "gestion", tentative: 1 } })).raison,
    ).toBe("identite");
    expect(
      assessFinalizationReadiness(base({ attempt: { apprenantId: "A1", examenId: "EB3", matiereId: "t3p", tentative: 2 } })).raison,
    ).toBe("identite");
  });

  it("refus définitif du serveur : message fonctionnel, jamais « panne »", () => {
    const v = assessFinalizationReadiness(
      base({ refus: { reason: "retake_delay", message: "Nouvelle tentative possible dans 48 h." } }),
    );
    expect(v.raison).toBe("refus_serveur");
    expect(v.message).toContain("48 h");
  });

  it("tentative déjà finalisée : aucune erreur, aucune deuxième finalisation", () => {
    const v = assessFinalizationReadiness(
      base({ attempt: { apprenantId: "A1", examenId: "EB3", matiereId: "t3p", tentative: 1, dejaFinalisee: true } }),
    );
    expect(v.pret).toBe(false);
    expect(v.dejaFinalisee).toBe(true);
    expect(v.message).toBeUndefined();
  });
});

describe("Questions volontairement vides", () => {
  it("aucune question répondue n'est exigée : le contrôle ignore le taux de réponse", () => {
    // Le contexte ne contient aucune notion de « réponses attendues ».
    const ctx = base();
    expect(Object.keys(ctx)).not.toContain("reponsesAttendues");
    expect(assessFinalizationReadiness(ctx).pret).toBe(true);
  });

  it("QRC vide et QCM vide : la clôture reste autorisée dès que tout est synchronisé", () => {
    expect(assessFinalizationReadiness(base({ dernierOrdreClient: 3, dernierOrdreConfirme: 3 })).pret).toBe(true);
  });
});

describe("Attente puis finalisation", () => {
  it("dernière réponse en cours d'envoi → on attend, puis on finalise", async () => {
    let pending = 1;
    const v = await attendreFinalizationReadiness({
      lire: () => base({ ecrituresLocalesEnAttente: pending }),
      relancerSynchronisation: () => { pending = 0; },
      timeoutMs: 1000,
      intervalMs: 1,
    });
    expect(v.pret).toBe(true);
  });

  it("serveur coupé au clic « Terminer » : on n'attend pas indéfiniment et on ne finalise pas", async () => {
    const v = await attendreFinalizationReadiness({
      lire: () => base({ ecrituresLocalesEnAttente: 2 }),
      timeoutMs: 30,
      intervalMs: 5,
    });
    expect(v.pret).toBe(false);
    expect(v.message).toBe(MESSAGE_SYNCHRONISATION_EN_COURS);
  });

  it("réseau instable : plusieurs échecs puis succès → finalisation possible", async () => {
    let essais = 0;
    const v = await attendreFinalizationReadiness({
      lire: () => base({ ecrituresLocalesEnAttente: essais >= 3 ? 0 : 1 }),
      relancerSynchronisation: () => { essais += 1; },
      timeoutMs: 1000,
      intervalMs: 1,
    });
    expect(v.pret).toBe(true);
    expect(essais).toBeGreaterThanOrEqual(3);
  });

  it("retour serveur + resynchronisation + nouvelle finalisation après une première tentative refusée", async () => {
    let pending = 1;
    const premier = await attendreFinalizationReadiness({
      lire: () => base({ ecrituresLocalesEnAttente: pending }),
      timeoutMs: 20,
      intervalMs: 5,
    });
    expect(premier.pret).toBe(false);
    pending = 0;
    const second = await attendreFinalizationReadiness({ lire: () => base(), timeoutMs: 20, intervalMs: 5 });
    expect(second.pret).toBe(true);
  });

  it("refus définitif : on n'attend pas la synchronisation, on informe tout de suite", async () => {
    const relance = vi.fn();
    const v = await attendreFinalizationReadiness({
      lire: () => base({ ecrituresLocalesEnAttente: 1, refus: { reason: "forbidden" } }),
      relancerSynchronisation: relance,
      timeoutMs: 500,
      intervalMs: 5,
    });
    expect(v.raison).toBe("refus_serveur");
    expect(relance).not.toHaveBeenCalled();
  });
});

describe("Double-clic, F5, requête rejouée", () => {
  const cle = buildFinalizationKey({
    apprenantId: "A1", quizType: "examen_blanc", quizId: "EB3", matiereId: "t3p", tentative: 1,
  });

  it("double-clic : une seule finalisation réelle", async () => {
    let écritures = 0;
    const tache = () => new Promise<boolean>((r) => setTimeout(() => { écritures++; r(true); }, 10));
    await Promise.all([runFinalizationOnce(cle, tache), runFinalizationOnce(cle, tache)]);
    expect(écritures).toBe(1);
  });

  it("même requête envoyée plusieurs fois : une seule finalisation réelle", async () => {
    let écritures = 0;
    const tache = () => new Promise<boolean>((r) => setTimeout(() => { écritures++; r(true); }, 5));
    await Promise.all([1, 2, 3, 4, 5].map(() => runFinalizationOnce(cle, tache)));
    expect(écritures).toBe(1);
  });

  it("F5 pendant la finalisation : on retombe sur le même passage, pas de tentative supplémentaire", () => {
    const now = Date.now();
    const tentative = resolveIdempotentTentative({
      rows: [{
        apprenant_id: "A1", quiz_id: "EB3", quiz_type: "examen_blanc", matiere_id: "t3p",
        tentative: 1, completed_at: new Date(now - 3000).toISOString(),
        details: { questions: [], reponses: { "1": ["A"] }, correctionsIA: {} },
      }] as any,
      quizId: "EB3", quizType: "examen_blanc", matiereId: "t3p", desiredTentative: 1, now,
    });
    expect(tentative).toBe(1);
  });

  it("réponse modifiée juste avant « Terminer » : l'écriture doit être confirmée d'abord", () => {
    const v = assessFinalizationReadiness(base({ ecrituresLocalesEnAttente: 1, dernierOrdreClient: 13, dernierOrdreConfirme: 12 }));
    expect(v.pret).toBe(false);
  });
});

describe("Message de finalisation", () => {
  it("un résultat serveur unique rend obsolète un ancien échec réseau", () => {
    expect(isFinalizationConfirmed({ saveReported: false, coreResultCount: 1 })).toBe(true);
    expect(isFinalizationConfirmed({ saveReported: false, coreResultCount: 0 })).toBe(false);
  });

  it("l'échec puis le succès de la même matière utilisent le même message", () => {
    const input = { apprenantId: "A1", examenId: "EB1", matiereId: "francais" };
    expect(buildFinalizationToastId(input)).toBe(buildFinalizationToastId(input));
    expect(buildFinalizationToastId({ ...input, matiereId: "anglais" })).not.toBe(buildFinalizationToastId(input));
  });
});
