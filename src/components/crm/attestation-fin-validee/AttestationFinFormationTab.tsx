import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Eye, Send } from "lucide-react";
import { AttestationFinValideePanel } from "./AttestationFinValideePanel";
import { LIBELLES_FILTRE, type FiltreAttestation } from "@/lib/attestationFinValidee/filtres";

/** Onglet fiche CRM. Aucune attestation n'est encore enregistrée côté serveur (circuit non installé). */
export function AttestationFinFormationTab({ apprenant }: { apprenant: any }) {
  const [filtre, setFiltre] = useState<FiltreAttestation>("a_envoyer");
  const [apercu, setApercu] = useState(false);
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Statut des attestations" className="flex flex-wrap gap-2">
        {(Object.keys(LIBELLES_FILTRE) as FiltreAttestation[]).map(f => (
          <Button key={f} role="tab" aria-selected={filtre === f} variant={filtre === f ? "default" : "outline"} className="min-h-11" onClick={() => setFiltre(f)}>{LIBELLES_FILTRE[f]}</Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {LIBELLES_FILTRE[filtre]} : aucune attestation enregistrée pour cet apprenant (enregistrement non encore installé).
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="min-h-11" onClick={() => setApercu(v => !v)}><Eye className="h-4 w-4 mr-1" />{apercu ? "Masquer l'aperçu" : "Prévisualiser"}</Button>
        <Button className="min-h-11" disabled title="Circuit de signature non installé"><Send className="h-4 w-4 mr-1" />Envoyer pour signature</Button>
        <Button variant="outline" className="min-h-11" disabled title="Disponible seulement après les deux signatures"><Download className="h-4 w-4 mr-1" />Télécharger le PDF</Button>
      </div>
      {apercu && <AttestationFinValideePanel apprenant={apprenant} />}
    </div>
  );
}
