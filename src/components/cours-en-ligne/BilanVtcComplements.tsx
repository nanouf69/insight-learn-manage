import { createContext, type ReactNode, useContext, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export type RemiseComplement = { submitted: boolean; correct: number | null; total: number | null };
export type RemisesComplements = { state: 'loading' | 'ready' | 'error'; rows: Record<number, RemiseComplement> };
const RemisesContext = createContext<RemisesComplements>({ state: 'error', rows: {} });
export const useRemisesComplementsVtc = () => useContext(RemisesContext);
export function projeterRemisesComplements(rows: { exercice_id: string; status?: string; submitted_at?: string | null; bonnes_reponses?: number | null; total_questions?: number | null }[]): RemisesComplements {
  const result: Record<number, RemiseComplement> = {};
  for (const id of [505,506]) {
    const matches = rows.filter(r => r.exercice_id === `module_5_exo_${id}`);
    if (matches.length > 1) return { state: 'error', rows: {} };
    const r = matches[0];
    const correct = r?.bonnes_reponses, total = r?.total_questions;
    const valid = Number.isInteger(correct) && Number.isInteger(total) && total != null && total > 0 && correct != null && correct >= 0 && correct <= total;
    result[id] = { submitted: r?.status === 'submitted' && !!r.submitted_at, correct: valid ? correct : null, total: valid ? total : null };
  }
  return { state: 'ready', rows: result };
}

export type CibleComplementVtc = { exerciceId: 505 | 506; selection: number };
const AccesComplementContext = createContext<((id: 505 | 506) => void) | null>(null);
export const useAccesComplementVtc = () => useContext(AccesComplementContext);
/** Keep the future passage mounted, then mount the existing legacy renderer on demand. */
export function BilanVtcComplements({ future, legacy, apprenantId }: { future: ReactNode; legacy: (cible: CibleComplementVtc | null) => ReactNode; apprenantId?: string }) {
  const [remises,setRemises] = useState<RemisesComplements>({ state: 'loading', rows: {} });
  useEffect(() => {
    let cancelled=false;
    setRemises({ state: 'loading', rows: {} });
    if (!apprenantId) { setRemises({ state: 'error', rows: {} }); return; }
    void (async () => {
      try {
        const { data,error } = await supabase.from('reponses_apprenants').select('exercice_id,status,submitted_at,bonnes_reponses,total_questions')
          .eq('apprenant_id',apprenantId).in('exercice_id',['module_5_exo_505','module_5_exo_506']);
        if (!cancelled) setRemises(error || !Array.isArray(data) ? { state:'error',rows:{} } : projeterRemisesComplements(data));
      } catch { if (!cancelled) setRemises({state:'error',rows:{}}); }
    })();
    return () => { cancelled=true; };
  },[apprenantId]);
  const [ouvert, setOuvert] = useState(false);
  const [visite, setVisite] = useState(false);
  const [cible, setCible] = useState<CibleComplementVtc | null>(null);
  const ouvrirExercice = (exerciceId: 505 | 506) => {
    setCible(prev => ({ exerciceId, selection: (prev?.selection ?? 0) + 1 }));
    setVisite(true);
    setOuvert(true);
  };
  return <RemisesContext.Provider value={remises}><AccesComplementContext.Provider value={ouvrirExercice}>
    {ouvert && <Button className="mb-4" variant="secondary" onClick={() => setOuvert(false)}>Retour au Bilan A–E</Button>}
    <div hidden={ouvert}>{future}</div>
    <section className="mt-6 space-y-4" aria-label="Matières complémentaires VTC">
      <Button variant="outline" onClick={() => { setVisite(true); setOuvert(v => !v); }}>
        {ouvert ? "Masquer les compléments" : "H et Questions QRC VTC — Tous les compléments"}
      </Button>
      <div hidden={!ouvert}>{visite && legacy(cible)}</div>
    </section>
  </AccesComplementContext.Provider></RemisesContext.Provider>;
}