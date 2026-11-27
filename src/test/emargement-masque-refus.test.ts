// @vitest-environment node
import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

// Execute the actual HTTP handler with an entirely in-memory client. Import
// declarations are removed so no remote package, credential or service is used.
const source = readFileSync("supabase/functions/save-emargement-apprenant/index.ts", "utf8");
const js = ts.transpileModule(source.replace(/^import .*;\s*$/gm, ""), {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
type Row = { id: string; masque: boolean; signature_data_url: string | null; signed_at: string | null; absent: boolean };
const filled = (masque: boolean): Row => ({ id: "synthetic-sheet", masque, signature_data_url: "synthetic-ink", signed_at: "2026-11-27T09:00:00Z", absent: false });
function fixture(initial: Row[], race?: "masked" | "visible" | "zero-update" | "read-error") {
  const rows = initial.map(r => ({ ...r }));
  const mutations: string[] = [];
  let reads = 0;
  const client = { auth: { getUser: vi.fn(async () => ({ data: { user: { id: "synthetic-user" } }, error: null })) },
    rpc: vi.fn(async (name: string) => ({ data: name === "has_role" ? false : { autorise: true }, error: null })),
    from: vi.fn((table: string) => {
      const filters: Record<string, unknown> = {};
      let action: string | null = null;
      const query: any = {
        select: () => query, eq: (k: string, v: unknown) => { filters[k] = v; return query; }, limit: () => query,
        maybeSingle: async () => ({ data: { id: "synthetic-owner", auth_user_id: "synthetic-user" }, error: null }),
        update: () => { action = "update"; return query; }, insert: () => { action = "insert"; return query; },
        then: (resolve: any) => {
          if (table !== "emargements_fc") throw new Error("Unexpected write/read table");
          if (action) {
            mutations.push(action);
            if (race === "masked" || race === "visible") {
              rows.push(filled(race === "masked")); return resolve({ error: { code: "23505" } });
            }
            if (race !== "zero-update") rows.push(filled(false));
            return resolve({ error: null });
          }
          reads++;
          if (race === "read-error" && reads === 1) return resolve({ data: null, error: { code: "503", message: "fictional read failure" } });
          return resolve({ data: rows.filter(r => r.masque === filters.masque), error: null });
        },
      };
      return query;
    }),
  };
  let handler: ((request: Request) => Promise<Response>) | undefined;
  new Function("createClient", "Deno", "traiterRegularisation", "signatureVide", "corsHeaders", js)(
    () => client,
    { env: { get: () => "synthetic-service-value" }, serve: (h: typeof handler) => { handler = h; } },
    () => { throw new Error("No regularisation permitted"); }, () => false, {},
  );
  return { rows, mutations, client, request: async () => {
    if (!handler) throw new Error("Missing handler");
    const response = await handler(new Request("https://example.invalid/test", { method: "POST",
      headers: { Authorization: "Bearer synthetic-token", "Content-Type": "application/json" },
      body: JSON.stringify({ apprenant_id: "synthetic-owner", demi_journee: "matin", date_emargement: "2026-11-27", signature_data_url: "synthetic-ink" }),
    }));
    return { status: response.status, body: await response.json() };
  } };
}
describe("Émargement : une feuille masquée ne prouve jamais un succès", () => {
  it.each([filled(true), { ...filled(true), signature_data_url: null, signed_at: null }])(
    "feuille masquée remplie ou vide : refus 409, aucune mutation (%j)", async row => {
      const f = fixture([row]); const before = JSON.stringify(f.rows);
      const response = await f.request();
      expect(response.status).toBe(409); expect(response.body).toMatchObject({ success: false, code: "feuille_masquee" });
      expect(response.body.duplicate).toBeUndefined(); expect(f.mutations).toEqual([]);
      expect(JSON.stringify(f.rows)).toBe(before);
    },
  );
  it("feuille visible déjà signée : vrai doublon sans mutation", async () => {
    const f = fixture([filled(false)]); const before = JSON.stringify(f.rows);
    expect(await f.request()).toEqual({ status: 200, body: { success: true, duplicate: true } });
    expect(f.mutations).toEqual([]); expect(JSON.stringify(f.rows)).toBe(before);
  });
  it("23505 puis feuille masquée : aucun faux succès", async () => {
    const f = fixture([], "masked"); const response = await f.request();
    expect(response.status).toBe(409); expect(response.body.success).toBe(false); expect(response.body.duplicate).toBeUndefined();
    expect(f.rows.filter(r => !r.masque)).toHaveLength(0);
  });
  it("23505 puis feuille visible signée relue : doublon confirmé", async () => {
    const f = fixture([], "visible");
    expect(await f.request()).toEqual({ status: 200, body: { success: true, duplicate: true } });
  });
  it("update de zéro ligne : refus sans confirmation visible", async () => {
    const f = fixture([{ ...filled(false), signature_data_url: null, signed_at: null }], "zero-update");
    const response = await f.request();
    expect(response.status).toBe(409); expect(response.body.success).toBe(false);
  });
  it("erreur de lecture : aucune écriture, aucun succès", async () => {
    const f = fixture([], "read-error"); const response = await f.request();
    expect(response.status).toBe(400); expect(response.body.success).not.toBe(true); expect(f.mutations).toEqual([]);
  });
});