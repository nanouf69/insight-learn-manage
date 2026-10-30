import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createLiveRefresher, moduleVersionToken, questionBankToken } from "@/lib/moduleLiveRefresh";
import { codeErreurSur, estErreurLectureTransitoire, relireAvecReprisesBornees } from "@/lib/relectureBornee";
import { sourceWorkerCompatible } from "@/lib/pdfWorker";

vi.mock("react-pdf", () => ({ pdfjs: { GlobalWorkerOptions: { workerSrc: "" }, version: "4.8.69" } }));
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({ default: "/assets/pdf.worker.min.mjs" }));

/** Horloge et minuteries manuelles pour tester sans attendre. */
function horloge() {
  let t = 1_000_000;
  const timers: Array<{ at: number; fn: () => void }> = [];
  return {
    now: () => t,
    avancer: (ms: number) => {
      t += ms;
      for (const x of timers.splice(0).sort((a, b) => a.at - b.at)) {
        if (x.at <= t) x.fn(); else timers.push(x);
      }
    },
    setTimer: (fn: () => void, ms: number) => { const h = { at: t + ms, fn }; timers.push(h); return h; },
    clearTimer: (h: unknown) => { const i = timers.indexOf(h as never); if (i >= 0) timers.splice(i, 1); },
    enAttente: () => timers.length,
  };
}

describe("Rafraîchissement live : sonde légère au lieu de relire 0,5 Mo toutes les 5 s", () => {
  it("version inchangée → aucune relecture complète ; changée → une seule", async () => {
    const h = horloge();
    let version = "11:v1";
    const fetchFull = vi.fn(async () => true);
    const r = createLiveRefresher({ probe: async () => version, fetchFull, isHidden: () => false, now: h.now });
    expect(await r.poll()).toBe("full-changed"); // premier tic : jeton inconnu
    for (let i = 0; i < 10; i += 1) { h.avancer(5_000); expect(await r.poll()).toBe("unchanged"); }
    expect(fetchFull).toHaveBeenCalledTimes(1);
    version = "11:v2";
    h.avancer(5_000);
    expect(await r.poll()).toBe("full-changed");
    expect(fetchFull).toHaveBeenCalledTimes(2);
  });

  it("relecture complète de sécurité au plus tard toutes les 2 min (événement manqué)", async () => {
    const h = horloge();
    const fetchFull = vi.fn(async () => true);
    const r = createLiveRefresher({ probe: async () => "v", fetchFull, isHidden: () => false, now: h.now });
    await r.poll();
    h.avancer(119_000);
    expect(await r.poll()).toBe("unchanged");
    h.avancer(2_000);
    expect(await r.poll()).toBe("full-safety");
    expect(fetchFull).toHaveBeenCalledTimes(2);
  });

  it("onglet masqué : aucun appel ; focus + visibilité simultanés : une seule sonde", async () => {
    let hidden = true;
    const probe = vi.fn(async () => "v");
    const r = createLiveRefresher({ probe, fetchFull: async () => true, isHidden: () => hidden });
    expect(await r.poll()).toBe("hidden");
    expect(probe).not.toHaveBeenCalled();
    hidden = false;
    const [a, b] = await Promise.all([r.poll({ ignoreHidden: true }), r.poll({ ignoreHidden: true })]);
    expect([a, b]).toContain("coalesced");
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it("rafale Realtime (10 événements) → une relecture décalée, au plus une de rattrapage", async () => {
    const h = horloge();
    let fin!: () => void;
    const fetchFull = vi.fn(() => new Promise<boolean>((res) => { fin = () => res(true); }));
    const r = createLiveRefresher({ probe: async () => "v", fetchFull, now: h.now, setTimer: h.setTimer, clearTimer: h.clearTimer, random: () => 0.5, realtimeJitterMs: 1500 });
    for (let i = 0; i < 10; i += 1) r.trigger();
    expect(h.enAttente()).toBe(1);
    h.avancer(750);
    expect(fetchFull).toHaveBeenCalledTimes(1);
    // nouveaux événements pendant la lecture : fusionnés en une seule relecture de rattrapage
    for (let i = 0; i < 5; i += 1) { r.trigger(); h.avancer(750); }
    fin(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    fin(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(fetchFull.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it("PGRST003 / 57014 : attente exponentielle bornée avec gigue, jamais de rafale", async () => {
    const h = horloge();
    const probe = vi.fn(async () => null as string | null); // lecture en erreur
    const r = createLiveRefresher({ probe, fetchFull: async () => true, isHidden: () => false, now: h.now, random: () => 0.5, backoffBaseMs: 5_000, backoffMaxMs: 60_000 });
    expect(await r.poll()).toBe("probe-error");
    h.avancer(4_000);
    expect(await r.poll()).toBe("backoff");
    h.avancer(1_100);
    expect(await r.poll()).toBe("probe-error"); // 2e erreur → 10 s
    h.avancer(9_000);
    expect(await r.poll()).toBe("backoff");
    for (let i = 0; i < 10; i += 1) { h.avancer(61_000); await r.poll(); }
    h.avancer(59_000);
    expect(await r.poll()).toBe("backoff"); // plafond 60 s ±20 %
    expect(probe.mock.calls.length).toBe(13);
  });

  it("relecture complète en erreur : jeton non retenu, nouvel essai après l'attente", async () => {
    const h = horloge();
    let ok = false;
    const fetchFull = vi.fn(async () => ok);
    const r = createLiveRefresher({ probe: async () => "v2", fetchFull, isHidden: () => false, now: h.now, random: () => 0.5 });
    expect(await r.poll()).toBe("full-changed");
    ok = true;
    h.avancer(6_000);
    expect(await r.poll()).toBe("full-changed"); // pas « unchanged » : la 1re lecture avait échoué
    h.avancer(5_000);
    expect(await r.poll()).toBe("unchanged");
  });

  it("édition admin en cours (pending) : pas d'erreur, relu au tic suivant", async () => {
    const h = horloge();
    let res: boolean | "pending" = "pending";
    const fetchFull = vi.fn(async () => res);
    const r = createLiveRefresher({ probe: async () => "v", fetchFull, isHidden: () => false, now: h.now });
    await r.poll();
    res = true;
    h.avancer(5_000);
    expect(await r.poll()).toBe("full-changed");
    expect(r.stats().failures).toBe(0);
  });

  it("jetons stables et sensibles aux changements", () => {
    expect(moduleVersionToken([{ module_id: 5, updated_at: "a" }, { module_id: 1, updated_at: "b" }]))
      .toBe(moduleVersionToken([{ module_id: 1, updated_at: "b" }, { module_id: 5, updated_at: "a" }]));
    const base = [{ question_id: "q1", section_id: 1, position: 1, active: true, updated_at: "t" }];
    expect(questionBankToken(base)).not.toBe(questionBankToken([{ ...base[0], active: false }]));
    expect(questionBankToken(base)).not.toBe(questionBankToken([{ ...base[0], position: 2 }]));
    expect(questionBankToken(base)).not.toBe(questionBankToken([...base, { ...base[0], question_id: "q2" }]));
  });
});

describe("Relecture de confirmation : erreur passagère ≠ échec, différence ≠ réessai", () => {
  const sansAttente = { attendre: async () => {}, random: () => 0.5 };

  it("PGRST003 puis succès → réponses relues, pas d'échec annoncé", async () => {
    const lire = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { code: "PGRST003", message: "Timed out acquiring connection" } })
      .mockResolvedValueOnce({ data: { reponses: { "1-1": "A" } }, error: null });
    const r = await relireAvecReprisesBornees(lire, sansAttente);
    expect(r.error).toBeNull();
    expect(r.data).toEqual({ reponses: { "1-1": "A" } });
    expect(lire).toHaveBeenCalledTimes(2);
  });

  it("57014 persistant → au plus 3 lectures puis échec avec code sûr", async () => {
    const lire = vi.fn().mockResolvedValue({ data: null, error: { code: "57014", message: "canceling statement" } });
    const r = await relireAvecReprisesBornees(lire, sansAttente);
    expect(lire).toHaveBeenCalledTimes(3);
    expect(codeErreurSur(r.error)).toBe("57014");
  });

  it("401 / JWT expiré → un seul renouvellement de session puis relecture", async () => {
    const renouveler = vi.fn(async () => "jeton");
    const lire = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { code: "PGRST303", message: "JWT expired" } })
      .mockResolvedValueOnce({ data: { reponses: {} }, error: null });
    const r = await relireAvecReprisesBornees(lire, { ...sansAttente, renouvelerSession: renouveler });
    expect(renouveler).toHaveBeenCalledTimes(1);
    expect(r.error).toBeNull();
  });

  it("refus définitif (42501 / 400) → aucune relecture supplémentaire", async () => {
    const lire = vi.fn().mockResolvedValue({ data: null, error: { code: "42501", message: "permission denied" } });
    await relireAvecReprisesBornees(lire, sansAttente);
    expect(lire).toHaveBeenCalledTimes(1);
    expect(estErreurLectureTransitoire({ code: "42501" })).toBe(false);
    expect(estErreurLectureTransitoire({ status: 503 })).toBe(true);
    expect(estErreurLectureTransitoire({ status: 429 })).toBe(true);
    expect(estErreurLectureTransitoire({ message: "Failed to fetch" })).toBe(true);
  });

  it("l'écran valide uniquement après relecture identique ; différence = échec explicite", () => {
    const src = readFileSync("src/components/cours-en-ligne/ModuleDetailView.tsx", "utf8");
    const i = src.indexOf('etapeEnCours = "relecture"');
    const bloc = src.slice(i, i + 2600);
    expect(bloc).toContain("relireAvecReprisesBornees(");
    expect(bloc).toContain('echec(confirmedRow ? "relecture_difference" : "relecture_ligne_absente")');
    expect(bloc.indexOf("answersAreEqual")).toBeLessThan(bloc.indexOf("submitQuizAttempt"));
  });
});

describe("Câblage ModuleDetailView : plus de relecture complète à chaque tic", () => {
  const src = readFileSync("src/components/cours-en-ligne/ModuleDetailView.tsx", "utf8");
  it("le tic élève appelle la sonde, plus refetchModuleFromDb ni les overrides toutes les 5 s", () => {
    const i = src.indexOf("const pollTimer = Number(module.id) === 13 ? null : setInterval(");
    const bloc = src.slice(i, i + 200);
    expect(bloc).toContain("refresher.poll()");
    expect(bloc).not.toContain("refetchModuleFromDb()");
    expect(bloc).not.toContain("setTrainerOverridesReapplyKey");
  });
  it("la sonde ne lit que l'identifiant et la date", () => {
    expect(src).toContain('.select("module_id, updated_at")');
    expect(src).toContain('.select("question_id,section_id,position,active,updated_at")');
  });
});

describe("PDF : polyfill posé aussi dans le worker pour les navigateurs anciens", () => {
  it("navigateur récent : worker d'origine inchangé", () => {
    expect(sourceWorkerCompatible("/assets/w.mjs", true, "https://x.fr/a", () => "blob:x")).toBe("/assets/w.mjs");
  });
  it("Samsung Internet 21 / Chrome 110 : worker enveloppe avec polyfill puis import du vrai worker", () => {
    let code = "";
    const src = sourceWorkerCompatible("/assets/w.mjs", false, "https://gestion.ftransport.fr/cours", (c) => { code = c; return "blob:https://gestion.ftransport.fr/1"; });
    expect(src).toBe("blob:https://gestion.ftransport.fr/1");
    expect(code.indexOf("Promise.withResolvers=")).toBeLessThan(code.indexOf("import "));
    expect(code).toContain('import "https://gestion.ftransport.fr/assets/w.mjs"');
  });
  it("le polyfill du worker fonctionne réellement sans withResolvers natif", () => {
    let code = "";
    sourceWorkerCompatible("/w.mjs", false, "https://x.fr/", (c) => { code = c; return "blob:"; });
    const premiereLigne = code.split("\n")[0];
    const P: any = function (ex: any) { return new Promise(ex); };
    new Function("Promise", premiereLigne)(P);
    const { promise, resolve } = P.withResolvers();
    resolve(7);
    return expect(promise).resolves.toBe(7);
  });
});
