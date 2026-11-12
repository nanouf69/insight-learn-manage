import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";

/** Keep the future passage mounted, then mount the existing legacy renderer on demand. */
export function BilanVtcComplements({ future, legacy }: { future: ReactNode; legacy: ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  const [visite, setVisite] = useState(false);
  return <>
    <div hidden={ouvert}>{future}</div>
    <section className="mt-6 space-y-4" aria-label="Matières complémentaires VTC">
      <Button variant="outline" onClick={() => { setVisite(true); setOuvert(v => !v); }}>
        {ouvert ? "Retour au Bilan A–E" : "F(V), G(V), H et Questions QRC VTC"}
      </Button>
      <div hidden={!ouvert}>{visite && legacy}</div>
    </section>
  </>;
}