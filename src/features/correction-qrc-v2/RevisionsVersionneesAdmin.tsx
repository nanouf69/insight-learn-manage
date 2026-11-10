import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { bonnesReponses, cleSource, lireSourcesCopies, provenanceTexte, type CarteSources, type SourceType } from "@/lib/corrigesSources";

type Answer = {key: string; answer: unknown; saved_at: string; seq: number; statut?: string; nb_sauvegardes?: number; corrige?: {version: number | null; bonnes: unknown; provenance?: {kind: string; date?: string}}};
export type SessionAdmin = {session_id: string; owner_id: string; created_at?: string; refs: {type: SourceType; id: string; question: string}[];
  submission: null | {perfect: number; total: number; qrc_a_verifier: number; submitted_at: string}; answers: Answer[]};

const texte = (a: unknown) => Array.isArray(a) ? (a as string[]).join(" + ") || "Sans réponse" : a == null || a === "" ? "Non prouvée" : String(a);
const heure = (d?: string | null) => d ? new Date(d).toLocaleString("fr-FR", {timeZone: "Europe/Paris"}) : "heure inconnue";
const STATUTS: Record<string, string> = {juste: "juste", fausse: "fausse", a_verifier: "QRC à vérifier (aucune note humaine)"};

/** Every page of 20 sessions is read until the server returns a short page; identity is checked on each row. */
export async function lireSessionsAdmin(owner: string, rpc: (args: object) => PromiseLike<{data: unknown; error: unknown}> = args => supabase.rpc("revision_corrige_admin" as never, args as never)) {
  const all: SessionAdmin[] = []; let after: string | null = null;
  for (;;) {
    const {data, error} = await rpc({p_owner: owner, p_after: after});
    if (error) throw error;
    const page = data as unknown as SessionAdmin[];
    if (!Array.isArray(page) || page.some(r => r.owner_id !== owner || !Array.isArray(r.answers))) throw new Error("Identité non confirmée");
    all.push(...page);
    if (page.length < 20) break;
    const next = page.at(-1)?.session_id;
    if (!next || next === after) throw new Error("Pagination non confirmée");
    after = next;
  }
  return all;
}

export function RevisionsVersionneesAdmin({owner}: {owner: string}) {
  const [rows, setRows] = useState<SessionAdmin[]>([]);
  const [sources, setSources] = useState<CarteSources>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const gen = useRef(0);
  const load = useCallback(async () => {
    const g = ++gen.current; setLoading(true);
    try {
      const all = await lireSessionsAdmin(owner);
      const copies = all.flatMap(s => s.refs.map(r => ({type: r.type, id: r.id})));
      const lu = copies.length ? await lireSourcesCopies(copies) : {questions: new Map() as CarteSources};
      if (g !== gen.current) return;
      setRows(all); setSources(lu.questions); setError(null);
    } catch { if (g === gen.current) { setRows([]); setSources(new Map()); setError("Lecture des révisions versionnées non confirmée."); } }
    finally { if (g === gen.current) setLoading(false); }
  }, [owner]);
  useEffect(() => { void load(); const f = () => void load(); window.addEventListener("focus", f); return () => { gen.current++; window.removeEventListener("focus", f); }; }, [load]);
  const n = rows.reduce((t, s) => t + s.answers.length, 0);
  return <section className="space-y-3 border-t pt-4" aria-label="Révisions avec corrigé versionné">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Révisions avec corrigé versionné ({rows.length} révisions, {n} réponses)</h3>
      <Button variant="outline" disabled={loading} onClick={() => void load()}>Relire les dernières réponses</Button></div>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {loading && <p className="text-muted-foreground">Lecture en cours…</p>}
    {rows.map(s => <div key={s.session_id} className="space-y-2">
      <p className="font-semibold">Révision ouverte le {heure(s.created_at)} · {s.submission
        ? `Terminée le ${heure(s.submission.submitted_at)} : ${s.submission.perfect}/${s.submission.total} parfaites${s.submission.qrc_a_verifier ? `, ${s.submission.qrc_a_verifier} QRC à vérifier` : ""}`
        : "En cours (non validée)"}</p>
      {s.answers.length === 0 && <p className="text-sm text-muted-foreground">Aucune réponse enregistrée.</p>}
      {s.answers.map(a => {
        const src = sources.get(a.key) ?? (() => { const [t, id, ...q] = a.key.split("|"); return sources.get(cleSource(t, id, q.join("|"))); })();
        return <article key={`${s.session_id}|${a.key}`} className="border-b pb-3 break-words space-y-1">
          <p className="font-medium">{src ? `${src.exam_id}${src.tentative ? ` · tentative ${src.tentative}` : ""} · question ${src.position ?? src.question_id}` : a.key}</p>
          {src?.historique?.enonce && <p className="text-sm whitespace-pre-wrap">{src.historique.enonce}</p>}
          <p><strong>Réponse initiale de la copie :</strong> {src ? texte(src.reponse_initiale) : "Non prouvée"}</p>
          <p><strong>Dernière réponse refaite :</strong> {texte(a.answer)} · {STATUTS[a.statut ?? ""] ?? "statut inconnu"}</p>
          <p className="text-sm text-muted-foreground">Enregistrée le {heure(a.saved_at)} · sauvegarde n° {a.seq}{a.nb_sauvegardes ? ` · ${a.nb_sauvegardes} enregistrement(s) pour cette question` : ""}</p>
          <p className="text-sm">Corrigé utilisé à l’enregistrement : {texte(a.corrige?.bonnes)}{a.corrige?.version != null ? ` (version ${a.corrige.version})` : ""}</p>
          {src?.actuelle ? <p className="text-sm">Corrigé officiel actuel : {bonnesReponses(src.actuelle)} — {provenanceTexte(src)}</p>
            : <p className="text-sm text-destructive">Corrigé actuel non rapproché pour cette question.</p>}
          {src && <p className="text-sm text-muted-foreground">Corrigé figé de la copie (note inchangée) : {bonnesReponses(src.historique) || "non disponible"}</p>}
        </article>;
      })}
    </div>)}
  </section>;
}
