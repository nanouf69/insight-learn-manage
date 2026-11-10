import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lireRevisionsAdmin } from "./lectureRevisionsAdmin";
import type { LigneRevision } from "./revisionsAdmin";

const valeur = (v: unknown) => v === undefined ? "Non prouvée" : Array.isArray(v) ? v.join(" + ") || "Sans réponse" : typeof v === "string" ? v || "Sans réponse" : JSON.stringify(v);
const heure = (v: string) => new Date(v).toLocaleString("fr-FR",{timeZone:"Europe/Paris"});
export function RevisionsAdmin({apprenantId}: {apprenantId:string}) {
  const [state,setState] = useState<{owner:string; rows:LigneRevision[]; error:string|null; loading:boolean}>({owner:apprenantId,rows:[],error:null,loading:true});
  const generation = useRef(0);
  const charger = useCallback(async () => {
    const g = ++generation.current;
    setState(s => ({owner:apprenantId,rows:s.owner === apprenantId ? s.rows:[],error:null,loading:true}));
    try { const rows = await lireRevisionsAdmin(apprenantId); if (g === generation.current) setState({owner:apprenantId,rows,error:null,loading:false}); }
    catch { if (g === generation.current) setState({owner:apprenantId,rows:[],error:"Lecture des révisions impossible : aucune réponse ne peut être confirmée.",loading:false}); }
  },[apprenantId]);
  useEffect(() => {
    void charger();
    const focus = () => {void charger();};
    window.addEventListener("focus",focus);
    const channel = supabase.channel(`admin-revisions-${apprenantId}`).on("postgres_changes",{event:"*",schema:"public",table:"reponses_apprenants",filter:`apprenant_id=eq.${apprenantId}`},focus).subscribe();
    return () => {generation.current++; window.removeEventListener("focus",focus); void supabase.removeChannel(channel);};
  },[apprenantId,charger]);
  const rows = state.owner === apprenantId ? state.rows : [];
  return <section aria-label="Questions à refaire — réponses enregistrées" className="space-y-3 border-t pt-4">
    <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">Questions à refaire — réponses enregistrées ({rows.length})</h3><Button variant="outline" size="icon" aria-label="Actualiser les révisions" title="Actualiser les révisions" onClick={() => void charger()} disabled={state.loading}><RefreshCw className="h-4 w-4" /></Button></div>
    {state.error && <p role="alert" className="text-destructive font-semibold">{state.error}</p>}
    {state.loading && <p className="text-muted-foreground">Lecture en cours…</p>}
    {!state.loading && !state.error && !rows.length && <p className="text-muted-foreground">Aucune réponse de révision enregistrée.</p>}
    {rows.map(r => <article key={r.cle} className="border-b pb-4 space-y-2 break-words">
      <h4 className="font-semibold">{r.examen} · {r.matiere} · {r.type} Q{r.question} · Tentative {r.tentative ?? "À VÉRIFIER"} · Révision {r.revision}</h4>
      {r.cause && <p className="text-destructive font-semibold">À VÉRIFIER : {r.cause}</p>}
      <p className="whitespace-pre-wrap"><strong>Réponse initiale :</strong> {valeur(r.initiale)}</p>
      <p className="whitespace-pre-wrap"><strong>Dernière révision enregistrée :</strong> {valeur(r.derniere)}</p>
      <p className="text-sm text-muted-foreground">{r.heureQuestion ? `Réponse enregistrée le ${heure(r.heureQuestion)}` : "Heure individuelle de réponse non prouvée"} · État enregistré le {heure(r.heureEtat)} · {r.terminee ? "Révision terminée" : "Révision en cours"}</p>
    </article>)}
  </section>;
}