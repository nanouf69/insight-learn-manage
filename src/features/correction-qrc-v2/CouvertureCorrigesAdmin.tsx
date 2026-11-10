import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LIBELLES_RAISONS, type RaisonNonRapproche, type SourceType } from "@/lib/corrigesSources";

type Item = {source_id: string; exam_id: string | null; questions: number; rapprochees: number; raisons: Partial<Record<RaisonNonRapproche, number>>};
export type Bilan = {copies: number; questions: number; rapprochees: number; copiesSansQuestion: number; raisons: Record<string, number>; parExamen: Record<string, {copies: number; rapprochees: number; questions: number}>};
const CIRCUITS: {type: SourceType; libelle: string}[] = [
  {type: "attempt", libelle: "Examens blancs — nouveau circuit"},
  {type: "result", libelle: "Examens blancs — résultats enregistrés (dont anciens)"},
  {type: "bilan_snapshot", libelle: "Bilans d’examen — passages figés"},
  {type: "bilan_future", libelle: "Bilans d’examen — nouveau circuit remis"},
];
export function agreger(items: Item[]): Bilan {
  const b: Bilan = {copies: 0, questions: 0, rapprochees: 0, copiesSansQuestion: 0, raisons: {}, parExamen: {}};
  for (const i of items) {
    b.copies++; b.questions += i.questions; b.rapprochees += i.rapprochees; if (i.questions === 0) b.copiesSansQuestion++;
    for (const [r, n] of Object.entries(i.raisons ?? {})) b.raisons[r] = (b.raisons[r] ?? 0) + (n ?? 0);
    const e = (b.parExamen[i.exam_id ?? "?"] ??= {copies: 0, rapprochees: 0, questions: 0});
    e.copies++; e.rapprochees += i.rapprochees; e.questions += i.questions;
  }
  return b;
}
/** Exhaustive keyset audit, 50 copies per call; a cancelled or failed audit is never shown as complete. */
export async function auditerCircuit(type: SourceType, onPage: (n: number) => void, stop: () => boolean,
  rpc: (args: object) => PromiseLike<{data: unknown; error: unknown}> = args => supabase.rpc("corriges_couverture_admin" as never, args as never)) {
  const items: Item[] = []; const vus = new Set<string>(); let after: string | null = null;
  for (;;) {
    if (stop()) throw new Error("annule");
    const {data, error} = await rpc({p_type: type, p_after: after, p_limit: 50});
    if (error) throw error;
    const page = data as unknown as {items: Item[]; next: string | null};
    if (!page || !Array.isArray(page.items)) throw new Error("Réponse invalide");
    for (const i of page.items) { if (vus.has(i.source_id)) throw new Error("Doublon de pagination"); vus.add(i.source_id); items.push(i); }
    onPage(items.length);
    if (!page.next) break;
    if (page.next === after) throw new Error("Pagination bloquée");
    after = page.next;
  }
  return agreger(items);
}

export function CouvertureCorrigesAdmin() {
  const [res, setRes] = useState<Partial<Record<SourceType, Bilan>>>({});
  const [prog, setProg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const annule = useRef(false);
  const lancer = async () => {
    annule.current = false; setErr(null); setRes({});
    const out: Partial<Record<SourceType, Bilan>> = {};
    try {
      for (const c of CIRCUITS) out[c.type] = await auditerCircuit(c.type, n => setProg(`${c.libelle} : ${n} copies lues`), () => annule.current);
      setRes(out); setProg(null);
    } catch (e) { setRes({}); setProg(null); setErr(String((e as Error)?.message) === "annule" ? "Audit annulé : aucun résultat partiel affiché." : "Audit interrompu : aucun résultat partiel affiché."); }
  };
  return <section className="space-y-3" aria-label="Couverture des corrigés officiels">
    <div className="flex flex-wrap gap-2"><Button onClick={() => void lancer()} disabled={!!prog}>Vérifier la couverture des corrigés</Button>
      {prog && <Button variant="outline" onClick={() => { annule.current = true; }}>Annuler</Button>}</div>
    {prog && <p aria-live="polite">{prog}</p>}
    {err && <p role="alert" className="text-destructive">{err}</p>}
    {CIRCUITS.map(c => { const b = res[c.type]; if (!b) return null;
      return <article key={c.type} className="border-b pb-2 text-sm space-y-1">
        <p className="font-semibold">{c.libelle} : {b.copies} copies · {b.rapprochees}/{b.questions} questions rapprochées · {b.copiesSansQuestion} copies sans question exploitable</p>
        {Object.entries(b.raisons).map(([r, n]) => <p key={r}>Non rapprochées — {LIBELLES_RAISONS[r as RaisonNonRapproche] ?? r} : {n}</p>)}
        <details><summary>Par examen</summary>{Object.entries(b.parExamen).sort().map(([e, v]) => <p key={e}>{e} : {v.copies} copies, {v.rapprochees}/{v.questions} rapprochées</p>)}</details>
      </article>; })}
  </section>;
}
