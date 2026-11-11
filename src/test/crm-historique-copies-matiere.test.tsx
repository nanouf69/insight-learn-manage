import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const fixture = vi.hoisted(() => ({ rows: [] as any[], passages: [] as any[], filters: [] as any[], groupes: [] as any[] }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  const query = { select: () => query, eq: (k: string, v: unknown) => { fixture.filters.push([table,k,v]); return query; }, order: () => query,
    range: async () => ({ data: fixture.rows, error: null }), then: (done: (v: unknown) => void) => Promise.resolve({ data: table === "exam_attempts_v2" ? fixture.passages : [{ qrc_instance_id: "qrc-exact" }], error: null }).then(done), limit: () => query };
  return query;
} } }));
vi.mock("@/features/correction-qrc-v2/noyauReel", () => ({ listerGroupesCrm: async () => fixture.groupes }));
import HistoriqueCopiesMatiere, { passageExact, lienCorrectionExact } from "@/components/crm/apprenant-sections/HistoriqueCopiesMatiere";
const details = (full: boolean) => ({ reponses: full ? Object.fromEntries(Array.from({ length: 15 }, (_, i) => [String(i+1), `réponse fictive ${i+1}`])) : { "1": "3.5 t" }, snapshot: { questions: Array.from({ length: 15 }, (_, i) => ({ id: i+1, enonce: `Question fictive ${i+1}` })) } });
const row = (full: boolean) => ({ id: full ? "source-complete" : "source-partielle", apprenant_id: "fixture", quiz_id: "EB3-TAXI", matiere_id: "t3p", tentative: full ? 1 : 2, completed_at: full ? "2026-11-01T17:15:42Z" : "2026-11-09T20:21:19Z", details: details(full) });
const passage = (r: ReturnType<typeof row>) => ({ attempt_id: `v2-${r.id}`, apprenant_id: r.apprenant_id, exam_id: r.quiz_id, snapshot: { source_historique: { result_id: r.id, tentative: r.tentative, details: r.details } } });
afterEach(() => { cleanup(); fixture.rows=[]; fixture.passages=[]; fixture.filters=[]; fixture.groupes=[]; });
describe("historique CRM indépendant", () => {
  it("la date/tentative ne remplacent jamais l’identité source et le contenu", () => {
    const r=row(true), p=passage(r);
    expect(passageExact(r,[p])?.attempt_id).toBe(p.attempt_id);
    for (const other of [{ ...p, apprenant_id:"autre" },{ ...p, exam_id:"EB2-TAXI" },passage(row(false)),{ ...p,snapshot:{ source_historique:{...p.snapshot.source_historique,details:details(false)} } }]) expect(passageExact(r,[other])).toBeNull();
    expect(passageExact(r,[p,p])).toBeNull();
  });
  it("les inscriptions croisées ouvrent le même ID et pas une copie sœur", () => {
    const p=passage(row(true));
    const groupes:any=[{cle:"session",examens:[{cle:"session::EB3-TAXI",exam_id:"EB3-TAXI",attemptIds:[p.attempt_id],apprenantParAttempt:{[p.attempt_id]:"fixture"}}]}];
    const url=lienCorrectionExact(groupes,p,"qrc-exact");
    expect(url).toContain("qrc=qrc-exact");
    expect(lienCorrectionExact(groupes,{...p,apprenant_id:"autre"},"qrc-exact")).toBeNull();
  });
  it("complet puis partiel : choix explicite, 15 réponses conservées, lien exact, aucune sélection automatique", async () => {
    const complete=row(true), partielle=row(false); fixture.rows=[partielle,complete]; fixture.passages=[passage(complete)];
    fixture.groupes=[{cle:"session",examens:[{cle:"session::EB3-TAXI",exam_id:"EB3-TAXI",attemptIds:[passage(complete).attempt_id],apprenantParAttempt:{[passage(complete).attempt_id]:"fixture"}}]}];
    const before=JSON.stringify(fixture.rows);
    render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><HistoriqueCopiesMatiere account="fixture" exam="EB3-TAXI" subject="t3p" nom="A T3P" /></QueryClientProvider>);
    fireEvent.click(screen.getByRole("button",{name:"Historique des copies : A T3P"}));
    await screen.findByRole("combobox"); expect(screen.queryByRole("article")).toBeNull();
    fireEvent.change(screen.getByRole("combobox"),{target:{value:partielle.id}});
    expect(screen.getByText("3.5 t")).toBeTruthy(); expect(screen.getAllByText("Sans réponse enregistrée")).toHaveLength(14);
    fireEvent.change(screen.getByRole("combobox"),{target:{value:complete.id}});
    expect(screen.getByText("réponse fictive 2")).toBeTruthy(); expect(screen.getByText("réponse fictive 3")).toBeTruthy();
    fireEvent.click(screen.getByRole("button",{name:"Retrouver cette copie dans Correction QRC V2"}));
    const link=await screen.findByRole("link",{name:"Ouvrir cette copie exacte dans le correcteur"});
    expect(link.getAttribute("href")).toContain("qrc=qrc-exact");
    fireEvent.change(screen.getByRole("combobox"),{target:{value:partielle.id}});
    expect(screen.queryByRole("link")).toBeNull(); expect(JSON.stringify(fixture.rows)).toBe(before);
    expect(fixture.filters).toContainEqual(["apprenant_quiz_results","apprenant_id","fixture"]);
    expect(fixture.filters).toContainEqual(["apprenant_quiz_results","matiere_id","t3p"]);
  });
});