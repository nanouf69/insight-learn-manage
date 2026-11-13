// @vitest-environment node
/**
 * Stabilisation 13/11/2026 — obstacles du NO-GO :
 *  - stockage navigateur refusé / saturé / inaccessible ;
 *  - deux onglets du même navigateur ;
 *  - fermeture ou rechargement pendant une requête en vol ;
 *  - panne prolongée (6 min) avec changements de réponse et réouverture.
 * Faux serveur reprenant les règles de core_save_answer (CAS de révision +
 * idempotence par operation_id). Aucune donnée réelle.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------- stockages simulés ----------
type Magasin = Storage & { _m: Map<string, string>; refuseEcriture: boolean; refuseLecture: boolean };
function magasin(): Magasin {
  const m = new Map<string, string>();
  const s = {
    _m: m, refuseEcriture: false, refuseLecture: false,
    getItem(k: string) { if (s.refuseLecture) throw new DOMException("refusé", "SecurityError"); return m.has(k) ? m.get(k)! : null; },
    setItem(k: string, v: string) { if (s.refuseEcriture) throw new DOMException("plein", "QuotaExceededError"); m.set(k, v); },
    removeItem(k: string) { m.delete(k); },
    clear() { m.clear(); },
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
  return s as unknown as Magasin;
}
let local = magasin();
let session = magasin();
let localInaccessible = false;
Object.defineProperty(globalThis, "localStorage", { configurable: true, get: () => { if (localInaccessible) throw new DOMException("accès refusé", "SecurityError"); return local; } });
Object.defineProperty(globalThis, "sessionStorage", { configurable: true, get: () => session });

// ---------- verrou inter-onglets simulé (Web Locks, mode ifAvailable) ----------
const tenus = new Set<string>();
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    locks: {
      async request(nom: string, _o: { ifAvailable: boolean }, rappel: (v: unknown) => Promise<unknown>) {
        if (tenus.has(nom)) return rappel(null);
        tenus.add(nom);
        try { return await rappel({ name: nom }); } finally { tenus.delete(nom); }
      },
    },
  },
});

// ---------- faux serveur ----------
type Ligne = { valeur: unknown; revision: number };
const serveur = new Map<string, Ligne>();
const ops = new Map<string, unknown>();
let panne = false;
let appels = 0;
let ecrituresEffectives = 0;
let enVol = 0;
let maxEnVol = 0;
let latenceMs = 0;
/** Simule une réponse perdue après validation serveur (fermeture d'onglet pendant l'appel). */
let perdreReponseApresCommit = false;
/** Simule une requête perdue avant d'atteindre le serveur. */
let perdreAvantServeur = false;
const k = (a: string, q: string) => `${a}|${q}`;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

function appliquer(p: any) {
  if (ops.has(p.p_operation_id)) return { data: ops.get(p.p_operation_id), error: null };
  const cle = k(p.p_attempt_id, p.p_question_id);
  const courant = serveur.get(cle);
  const exp = p.p_expected_revision;
  let res;
  if (!courant) {
    if ((exp ?? 0) !== 0) return { data: null, error: { message: "ANSWER_STALE_REVISION P0409" } };
    serveur.set(cle, { valeur: p.p_valeur, revision: 1 }); ecrituresEffectives += 1; res = { revision: 1 };
  } else {
    if (exp == null && JSON.stringify(courant.valeur) === JSON.stringify(p.p_valeur)) { res = { revision: courant.revision }; ops.set(p.p_operation_id, res); return { data: res, error: null }; }
    if (exp !== courant.revision) return { data: null, error: { message: "ANSWER_STALE_REVISION P0409" } };
    serveur.set(cle, { valeur: p.p_valeur, revision: courant.revision + 1 }); ecrituresEffectives += 1; res = { revision: courant.revision + 1 };
  }
  ops.set(p.p_operation_id, res);
  return { data: res, error: null };
}
async function coreSaveAnswer(p: any) {
  appels += 1; enVol += 1; maxEnVol = Math.max(maxEnVol, enVol);
  try {
    if (latenceMs) await pause(latenceMs);
    if (panne || perdreAvantServeur) return { data: null, error: { message: "TypeError: Failed to fetch" } };
    const r = appliquer(p);
    if (perdreReponseApresCommit) return new Promise<never>(() => { /* l'onglet est fermé : aucune réponse */ });
    return r;
  } finally { enVol -= 1; }
}
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: async (_n: string, p: any) => coreSaveAnswer(p),
    from: () => {
      const f: Record<string, string> = {};
      const q: any = {
        select: () => q, eq: (c: string, v: string) => { f[c] = v; return q; },
        maybeSingle: async () => { const l = serveur.get(k(f.attempt_id, f.question_id)); return { data: l ? { ...l } : null, error: panne ? { message: "Failed to fetch" } : null }; },
        then: (ok: any) => ok({ data: panne ? null : [...serveur.entries()].filter(([c]) => c.startsWith(`${f.attempt_id}|`)).map(([c, l]) => ({ question_id: c.split("|")[1], revision: l.revision, valeur: l.valeur })), error: panne ? { message: "Failed to fetch" } : null }),
      };
      return q;
    },
  },
}));

type Pont = typeof import("@/features/noyau-passage/pontV2");
/** Fermeture d'onglet : le navigateur libère les verrous Web Locks qu'il détenait. */
const fermerOnglet = () => tenus.clear();
/** Un onglet = une instance de module indépendante (mémoire propre), stockage partagé. */
async function ouvrirOnglet(): Promise<Pont> {
  vi.resetModules();
  return await import("@/features/noyau-passage/pontV2");
}
const attendre = () => new Promise((r) => setTimeout(r, 0));
async function vider(...onglets: Pont[]) {
  for (let i = 0; i < 500 && onglets.some((o) => o.reponsesNoyauEnAttente() > 0); i++) {
    for (const o of onglets) await o.viderFileNoyau(null, { forcer: true });
    await attendre();
  }
}
const valeurServeur = (a: string, q: string) => serveur.get(k(a, q))?.valeur;

beforeEach(() => {
  local = magasin(); session = magasin(); localInaccessible = false; tenus.clear();
  serveur.clear(); ops.clear(); panne = false; appels = 0; ecrituresEffectives = 0; enVol = 0; maxEnVol = 0; latenceMs = 0;
  perdreReponseApresCommit = false; perdreAvantServeur = false;
  vi.useRealTimers();
});

describe("Stockage navigateur refusé, saturé ou inaccessible", () => {
  it("localStorage saturé : repli sur l'onglet, état exposé, réponse reprise après rechargement puis confirmée", async () => {
    local.refuseEcriture = true; panne = true;
    const onglet = await ouvrirOnglet();
    onglet.enfilerReponseNoyau({ attemptId: "a", matiereId: "francais", questionId: 1, valeur: "texte complet" });
    await attendre();
    expect(onglet.etatStockageFileNoyau()).toBe("session");
    expect(onglet.reponsesNoyauEnAttente("a")).toBe(1);
    // F5 dans le même onglet : la mémoire disparaît, le sessionStorage reste.
    const recharge = await ouvrirOnglet();
    expect(recharge.reponsesNoyauEnAttente("a")).toBe(1);
    panne = false;
    await vider(recharge);
    expect(valeurServeur("a", "francais:1")).toBe("texte complet");
    expect(recharge.reponsesNoyauEnAttente()).toBe(0);
    expect(ecrituresEffectives).toBe(1);
  });

  it("localStorage inaccessible (SecurityError) : la file fonctionne sur le stockage d'onglet", async () => {
    localInaccessible = true;
    const onglet = await ouvrirOnglet();
    panne = true;
    onglet.enfilerReponseNoyau({ attemptId: "a", matiereId: "m", questionId: 2, valeur: ["B", "D"] });
    await attendre();
    expect(onglet.etatStockageFileNoyau()).toBe("session");
    panne = false;
    await vider(onglet);
    expect(valeurServeur("a", "m:2")).toEqual(["B", "D"]);
  });

  it("tout stockage refusé : état « mémoire seule », la réponse n'est jamais retirée avant confirmation serveur", async () => {
    local.refuseEcriture = true; session.refuseEcriture = true; panne = true;
    const onglet = await ouvrirOnglet();
    let notifications = 0;
    onglet.surveillerFileNoyau(() => { notifications += 1; });
    onglet.enfilerReponseNoyau({ attemptId: "a", matiereId: "m", questionId: 3, valeur: "v1" });
    onglet.enfilerReponseNoyau({ attemptId: "a", matiereId: "m", questionId: 3, valeur: "v2" });
    for (let i = 0; i < 5; i++) { await onglet.viderFileNoyau("a", { forcer: true }); await attendre(); }
    expect(onglet.etatStockageFileNoyau()).toBe("memoire");
    expect(onglet.reponsesNoyauEnAttente("a")).toBe(1); // jamais « enregistré » : toujours en attente
    expect(notifications).toBeGreaterThan(0);
    expect(serveur.size).toBe(0);
    panne = false;
    await vider(onglet);
    expect(valeurServeur("a", "m:3")).toBe("v2");
    expect(onglet.reponsesNoyauEnAttente("a")).toBe(0);
    expect(ecrituresEffectives).toBe(1);
  });

  it("le stockage redevient disponible : retour à l'état durable sans perte", async () => {
    local.refuseEcriture = true; session.refuseEcriture = true; panne = true;
    const onglet = await ouvrirOnglet();
    onglet.enfilerReponseNoyau({ attemptId: "a", matiereId: "m", questionId: 1, valeur: "x" });
    expect(onglet.etatStockageFileNoyau()).toBe("memoire");
    local.refuseEcriture = false; session.refuseEcriture = false;
    onglet.enfilerReponseNoyau({ attemptId: "a", matiereId: "m", questionId: 2, valeur: "y" });
    expect(onglet.etatStockageFileNoyau()).toBe("durable");
    // Les deux réponses (dont celle restée en mémoire) sont maintenant dans le stockage durable.
    expect(JSON.parse(local.getItem("noyau_v2_answer_queue_v1")!)).toHaveLength(2);
    panne = false;
    await vider(onglet);
    expect(valeurServeur("a", "m:1")).toBe("x");
    expect(valeurServeur("a", "m:2")).toBe("y");
  });
});

describe("Alerte dès l'ouverture", () => {
  it("rechargement avec stockage refusé : l'état est « mémoire seule » avant toute nouvelle saisie", async () => {
    local.refuseEcriture = true; session.refuseEcriture = true;
    const A = await ouvrirOnglet();
    expect(A.etatStockageFileNoyau()).toBe("memoire");
  });
  it("rechargement avec seul localStorage plein : repli « onglet » annoncé immédiatement", async () => {
    local.refuseEcriture = true;
    const A = await ouvrirOnglet();
    expect(A.etatStockageFileNoyau()).toBe("session");
  });
});

describe("Deux onglets du même navigateur", () => {
  it("chaque onglet garde les réponses de l'autre (aucun écrasement de la file partagée)", async () => {
    panne = true;
    const A = await ouvrirOnglet();
    const B = await ouvrirOnglet();
    A.enfilerReponseNoyau({ attemptId: "t", matiereId: "m", questionId: 1, valeur: "réponse A" });
    B.enfilerReponseNoyau({ attemptId: "t", matiereId: "m", questionId: 2, valeur: "réponse B" });
    A.enfilerReponseNoyau({ attemptId: "t", matiereId: "m", questionId: 3, valeur: "réponse A3" });
    await attendre();
    expect(A.reponsesNoyauEnAttente("t")).toBe(3);
    expect(B.reponsesNoyauEnAttente("t")).toBe(3);
    panne = false;
    await vider(A, B);
    expect(valeurServeur("t", "m:1")).toBe("réponse A");
    expect(valeurServeur("t", "m:2")).toBe("réponse B");
    expect(valeurServeur("t", "m:3")).toBe("réponse A3");
    expect(ecrituresEffectives).toBe(3);
  });

  it("même question dans deux onglets : la saisie la plus récente gagne, l'ancienne n'est jamais renvoyée après", async () => {
    panne = true;
    const A = await ouvrirOnglet();
    const B = await ouvrirOnglet();
    A.enfilerReponseNoyau({ attemptId: "t", matiereId: "m", questionId: 1, valeur: ["A"] });
    await pause(3);
    B.enfilerReponseNoyau({ attemptId: "t", matiereId: "m", questionId: 1, valeur: ["C"] });
    panne = false;
    await vider(A, B);
    expect(valeurServeur("t", "m:1")).toEqual(["C"]);
    expect(ecrituresEffectives).toBe(1);
    expect(A.reponsesNoyauEcartees("t")).toBe(0);
  });

  it("changements successifs alternés entre onglets : version serveur partagée, aucun conflit inventé, dernière valeur conservée", async () => {
    const A = await ouvrirOnglet();
    const B = await ouvrirOnglet();
    A.enfilerReponseNoyau({ attemptId: "t", matiereId: "m", questionId: 1, valeur: "1" }); await vider(A, B);
    B.enfilerReponseNoyau({ attemptId: "t", matiereId: "m", questionId: 1, valeur: "2" }); await vider(A, B);
    A.enfilerReponseNoyau({ attemptId: "t", matiereId: "m", questionId: 1, valeur: "3" }); await vider(A, B);
    expect(serveur.get(k("t", "m:1"))).toEqual({ valeur: "3", revision: 3 });
    expect(A.reponsesNoyauEcartees()).toBe(0);
    expect(B.reponsesNoyauEcartees()).toBe(0);
  });

  it("un seul envoi en vol pour tout le navigateur, même si les deux onglets vident en même temps", async () => {
    latenceMs = 5;
    const A = await ouvrirOnglet();
    const B = await ouvrirOnglet();
    for (let q = 1; q <= 6; q++) (q % 2 ? A : B).enfilerReponseNoyau({ attemptId: "t", matiereId: "m", questionId: q, valeur: `v${q}` });
    await Promise.all([A.viderFileNoyau(null, { forcer: true }), B.viderFileNoyau(null, { forcer: true }), A.viderFileNoyau("t", { forcer: true })]);
    await vider(A, B);
    expect(maxEnVol).toBe(1);
    expect(ecrituresEffectives).toBe(6);
    for (let q = 1; q <= 6; q++) expect(valeurServeur("t", `m:${q}`)).toBe(`v${q}`);
  });

  it("réponse modifiée depuis un autre appareil : mise de côté visible, jamais d'écrasement", async () => {
    const A = await ouvrirOnglet();
    A.enfilerReponseNoyau({ attemptId: "t", matiereId: "m", questionId: 1, valeur: "tablette" }); await vider(A);
    // Autre appareil (autre navigateur, autre stockage) : révision 2 écrite côté serveur.
    serveur.set(k("t", "m:1"), { valeur: "téléphone", revision: 2 });
    A.enfilerReponseNoyau({ attemptId: "t", matiereId: "m", questionId: 1, valeur: "tablette bis" }); await vider(A);
    expect(valeurServeur("t", "m:1")).toBe("téléphone");
    expect(A.reponsesNoyauEcartees("t")).toBe(1);
    expect(A.questionsNoyauEcartees("t").has("m:1")).toBe(true);
  });
});

describe("Fermeture ou rechargement pendant une requête en vol", () => {
  it("le serveur a enregistré mais l'onglet est fermé avant la réponse : relance sans double écriture", async () => {
    const A = await ouvrirOnglet();
    perdreReponseApresCommit = true;
    A.enfilerReponseNoyau({ attemptId: "t", matiereId: "m", questionId: 1, valeur: "texte final" });
    await pause(5);
    expect(ecrituresEffectives).toBe(1);
    // La réponse n'a pas été confirmée à l'onglet : elle est toujours dans la file durable.
    expect(JSON.parse(local.getItem("noyau_v2_answer_queue_v1")!)).toHaveLength(1);
    perdreReponseApresCommit = false;
    fermerOnglet();
    const rouvert = await ouvrirOnglet();
    expect(rouvert.reponsesNoyauEnAttente("t")).toBe(1);
    await vider(rouvert);
    expect(rouvert.reponsesNoyauEnAttente("t")).toBe(0);
    expect(ecrituresEffectives).toBe(1);
    expect(serveur.get(k("t", "m:1"))).toEqual({ valeur: "texte final", revision: 1 });
  });

  it("la requête est perdue avant le serveur puis l'onglet est rechargé : la réponse repart une fois", async () => {
    const A = await ouvrirOnglet();
    perdreAvantServeur = true;
    A.enfilerReponseNoyau({ attemptId: "t", matiereId: "m", questionId: 1, valeur: ["A", "C"] });
    await pause(5);
    expect(serveur.size).toBe(0);
    perdreAvantServeur = false;
    fermerOnglet();
    const rouvert = await ouvrirOnglet();
    await vider(rouvert);
    expect(valeurServeur("t", "m:1")).toEqual(["A", "C"]);
    expect(ecrituresEffectives).toBe(1);
  });

  it("nouvelle saisie pendant l'envoi puis fermeture : la valeur la plus récente gagne au rechargement", async () => {
    const A = await ouvrirOnglet();
    perdreReponseApresCommit = true;
    A.enfilerReponseNoyau({ attemptId: "t", matiereId: "m", questionId: 1, valeur: "brouillon" });
    await pause(2);
    A.enfilerReponseNoyau({ attemptId: "t", matiereId: "m", questionId: 1, valeur: "réponse définitive" });
    perdreReponseApresCommit = false;
    fermerOnglet();
    const rouvert = await ouvrirOnglet();
    await vider(rouvert);
    expect(valeurServeur("t", "m:1")).toBe("réponse définitive");
    expect(rouvert.reponsesNoyauEcartees("t")).toBe(0);
    expect(ecrituresEffectives).toBe(2);
  });
});

describe("Appel figé sans réponse", () => {
  it("au-delà de 20 s l'appel est traité comme une coupure : la file et le verrou sont libérés, aucune double écriture", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      const A = await ouvrirOnglet();
      perdreReponseApresCommit = true;
      A.enfilerReponseNoyau({ attemptId: "f", matiereId: "m", questionId: 1, valeur: "fige" });
      // Le calcul de l'identifiant d'opération (SHA-256) n'est pas une minuterie : attendre l'appel réel.
      for (let i = 0; i < 200 && appels === 0; i++) await new Promise((r) => setImmediate(r));
      expect(appels).toBe(1);
      await vi.advanceTimersByTimeAsync(A.DELAI_MAX_APPEL_MS + 10);
      expect(ecrituresEffectives).toBe(1);
      expect(tenus.size).toBe(0); // le verrou inter-onglets n'est pas retenu indéfiniment
      expect(A.reponsesNoyauEnAttente("f")).toBe(1); // jamais présentée comme enregistrée
      perdreReponseApresCommit = false;
      for (let i = 0; i < 2000 && A.reponsesNoyauEnAttente() > 0; i++) { await A.viderFileNoyau(null, { forcer: true }); await new Promise((r) => setImmediate(r)); }
      expect(A.reponsesNoyauEnAttente()).toBe(0);
      expect(ecrituresEffectives).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("Panne prolongée de six minutes", () => {
  it("modifications pendant la panne, fermeture puis réouverture : zéro perte, essais bornés, une écriture par question", async () => {
    // Seules les minuteries sont simulées : le calcul SHA-256 des opérations reste réel (asynchrone hors minuterie).
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      panne = true;
      const A = await ouvrirOnglet();
      for (let q = 1; q <= 5; q++) A.enfilerReponseNoyau({ attemptId: "p", matiereId: "qrc", questionId: q, valeur: `v1-${q}` });
      for (let s = 0; s < 180; s += 10) { await vi.advanceTimersByTimeAsync(10_000); await A.viderFileNoyau("p"); }
      for (let q = 1; q <= 5; q++) A.enfilerReponseNoyau({ attemptId: "p", matiereId: "qrc", questionId: q, valeur: `final-${q}` });
      const appelsAvantFermeture = appels;
      // Fermeture du navigateur au milieu de la panne, réouverture 3 minutes plus tard.
      fermerOnglet();
      const B = await ouvrirOnglet();
      for (let s = 0; s < 180; s += 10) { await vi.advanceTimersByTimeAsync(10_000); await B.viderFileNoyau("p"); }
      expect(B.reponsesNoyauEnAttente("p")).toBe(5);
      // 6 minutes, délais 1 s → 30 s : au plus ~12 essais par onglet ouvert, jamais une rafale par frappe.
      expect(appels).toBeLessThanOrEqual(40);
      expect(appelsAvantFermeture).toBeLessThanOrEqual(20);
      panne = false;
      await vi.advanceTimersByTimeAsync(31_000);
      for (let i = 0; i < 2000 && B.reponsesNoyauEnAttente() > 0; i++) { await B.viderFileNoyau(null, { forcer: true }); await new Promise((r) => setImmediate(r)); }
      expect(B.reponsesNoyauEnAttente()).toBe(0);
      for (let q = 1; q <= 5; q++) expect(valeurServeur("p", `qrc:${q}`)).toBe(`final-${q}`);
      expect(ecrituresEffectives).toBe(5);
    } finally {
      vi.useRealTimers();
    }
  });
});
