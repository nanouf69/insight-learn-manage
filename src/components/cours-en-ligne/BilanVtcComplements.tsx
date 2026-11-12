import { createContext, type ReactNode, useContext, useState } from "react";
import { Button } from "@/components/ui/button";

export type CibleComplementVtc = { exerciceId: 505 | 506; selection: number };
const AccesComplementContext = createContext<((id: 505 | 506) => void) | null>(null);
export const useAccesComplementVtc = () => useContext(AccesComplementContext);
/** Keep the future passage mounted, then mount the existing legacy renderer on demand. */
export function BilanVtcComplements({ future, legacy }: { future: ReactNode; legacy: (cible: CibleComplementVtc | null) => ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  const [visite, setVisite] = useState(false);
  const [cible, setCible] = useState<CibleComplementVtc | null>(null);
  const ouvrirExercice = (exerciceId: 505 | 506) => {
    setCible(prev => ({ exerciceId, selection: (prev?.selection ?? 0) + 1 }));
    setVisite(true);
    setOuvert(true);
  };
  return <AccesComplementContext.Provider value={ouvrirExercice}>
    {ouvert && <Button className="mb-4" variant="secondary" onClick={() => setOuvert(false)}>Retour au Bilan A–E</Button>}
    <div hidden={ouvert}>{future}</div>
    <section className="mt-6 space-y-4" aria-label="Matières complémentaires VTC">
      <Button variant="outline" onClick={() => { setVisite(true); setOuvert(v => !v); }}>
        {ouvert ? "Masquer les compléments" : "H et Questions QRC VTC — Tous les compléments"}
      </Button>
      <div hidden={!ouvert}>{visite && legacy(cible)}</div>
    </section>
  </AccesComplementContext.Provider>;
}