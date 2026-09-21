import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logHistorique, saveDossier, uploadPiece } from "@/lib/prestataires/data";
import type { PrestataireDossier } from "@/lib/prestataires/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dossier: PrestataireDossier;
  onSaved: () => void;
}

export function FactureRecueDialog({ open, onOpenChange, dossier, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [dateReception, setDateReception] = useState(new Date().toISOString().slice(0, 10));
  const [numero, setNumero] = useState(dossier.facture_numero ?? "");
  const [ht, setHt] = useState(dossier.facture_montant_ht?.toString() ?? "");
  const [tva, setTva] = useState(dossier.facture_tva?.toString() ?? "");
  const [ttc, setTtc] = useState(dossier.facture_montant_ttc?.toString() ?? "");
  const [file, setFile] = useState<File | null>(null);

  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (file) await uploadPiece(dossier.id, file, "facture_recue", `Facture ${numero || ""}`.trim());
      await saveDossier(
        {
          facture_recue_le: dateReception || null,
          facture_numero: numero || null,
          facture_montant_ht: num(ht),
          facture_tva: num(tva),
          facture_montant_ttc: num(ttc),
          statut: "facture_recue",
          derniere_action_le: new Date().toISOString(),
        },
        dossier.id,
      );
      await logHistorique(dossier.id, "Facture reçue enregistrée", { numero, date: dateReception });
      toast.success("Facture enregistrée — tout l'historique des demandes est conservé");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Facture reçue</DialogTitle>
          <DialogDescription>
            L'historique des demandes et relances reste intégralement conservé.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Fichier de la facture (PDF ou image)</Label>
            <Input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de réception</Label>
              <Input type="date" value={dateReception} onChange={(e) => setDateReception(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Numéro de facture</Label>
              <Input value={numero} onChange={(e) => setNumero(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Montant HT</Label>
              <Input value={ht} onChange={(e) => setHt(e.target.value)} inputMode="decimal" />
            </div>
            <div className="space-y-2">
              <Label>TVA</Label>
              <Input value={tva} onChange={(e) => setTva(e.target.value)} inputMode="decimal" />
            </div>
            <div className="space-y-2">
              <Label>Montant TTC</Label>
              <Input value={ttc} onChange={(e) => setTtc(e.target.value)} inputMode="decimal" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer la facture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
