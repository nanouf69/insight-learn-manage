import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock('@/lib/sessionRpc', () => ({ freshSessionCall: (call: () => unknown) => call() }));
vi.mock('@/lib/sessionExpiree', () => ({ assurerSessionFraiche: async () => 'token-fictif' }));

// Données 100 % fictives. Scénarios : session qui change ou disparaît entre
// la vérification et la relecture ; vraie absence ; erreur de droits.
const etat = {
  sessions: [] as Array<string | null>, // ids successifs renvoyés par getSession
  user: null as string | null,
  lectures: [] as Array<{ data: any[]; error: any }>,
  appels: 0,
  rpc: [] as any[],
};

vi.mock("@/integrations/supabase/client", () => {
  const query: any = {
    select: () => query,
    order: () => query,
    in: async () => {
      const r = etat.lectures[etat.appels] ?? { data: [], error: null };
      etat.appels += 1;
      return r;
    },
  };
  return {
    supabase: {
      auth: {
        getSession: async () => {
          const id = etat.sessions.length > 1 ? etat.sessions.shift()! : etat.sessions[0] ?? null;
          return { data: { session: id ? { access_token: "fictif", user: { id } } : null } };
        },
        getUser: async () => ({ data: { user: etat.user ? { id: etat.user } : null } }),
      },
      from: () => query,
      rpc: async (_n: string, args: any) => { etat.rpc.push(args); return { error: null }; },
    },
  };
});

import { loadSavedExamens } from "@/components/cours-en-ligne/ExamensBlancsEditor";

const ligne = { module_id: 999999, module_data: null, updated_at: null };

beforeEach(() => {
  etat.sessions = []; etat.user = null; etat.lectures = []; etat.appels = 0; etat.rpc = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const traces = () => etat.rpc.filter((a) => a._source === "examens-chargement");
const attendre = () => new Promise((r) => setTimeout(r, 0));

describe("Examens blancs : session changée/absente pendant le chargement", () => {
  it("trace anonyme : ni identifiant, ni e-mail, ni URL complète", async () => {
    etat.sessions = ["eleve-A"]; etat.user = "eleve-B";
    await loadSavedExamens().catch(() => null);
    await attendre();
    const t = traces();
    expect(t.length).toBeGreaterThan(0);
    for (const a of t) {
      expect(a._user_id).toBeNull();
      expect(a._user_email).toBeNull();
      expect(a._url).toBeNull();
      expect(JSON.stringify(a)).not.toMatch(/eleve-[AB]|fictif/);
      expect(a._context).toMatchObject({ session: "changee", premiere: "vide", relecture: "non" });
      expect(a._context.build).toBeTruthy();
    }
  });
  it("compte changé après une lecture vide → refus session, aucune relecture, pas d'« absence »", async () => {
    etat.sessions = ["eleve-A"]; etat.user = "eleve-B";
    const err: any = await loadSavedExamens().catch((e) => e);
    expect(err?.sessionAbsente).toBe(true);
    expect(String(err?.message)).not.toContain("Aucune version active");
    expect(etat.appels).toBe(1);
  });

  it("session disparue pendant la relecture → résultat rejeté (même trouvé)", async () => {
    etat.sessions = ["eleve-A", null]; etat.user = "eleve-A";
    etat.lectures = [{ data: [], error: null }, { data: [ligne], error: null }];
    const err: any = await loadSavedExamens().catch((e) => e);
    expect(err?.sessionAbsente).toBe(true);
    expect(etat.appels).toBe(2);
  });

  it("compte changé pendant la relecture → résultat rejeté", async () => {
    etat.sessions = ["eleve-A", "eleve-B"]; etat.user = "eleve-A";
    etat.lectures = [{ data: [], error: null }, { data: [], error: null }];
    const err: any = await loadSavedExamens().catch((e) => e);
    expect(err?.sessionAbsente).toBe(true);
    expect(String(err?.message)).not.toContain("Aucune version active");
  });

  it("session stable et 2 lectures vides → vraie alerte, une seule relecture", async () => {
    etat.sessions = ["eleve-A"]; etat.user = "eleve-A";
    const err: any = await loadSavedExamens().catch((e) => e);
    expect(err?.sessionAbsente).toBeFalsy();
    expect(String(err?.message)).toContain("Aucune version active");
    expect(etat.appels).toBe(2);
  });

  it("erreur de droits → échec visible, jamais confondu avec une absence, aucun contournement", async () => {
    etat.sessions = ["eleve-A"]; etat.user = "eleve-A";
    etat.lectures = [{ data: null as any, error: { message: "permission denied", code: "42501" } }];
    const err: any = await loadSavedExamens().catch((e) => e);
    expect(String(err?.message)).toContain("permission denied");
    expect(etat.appels).toBe(1);
  });

});
