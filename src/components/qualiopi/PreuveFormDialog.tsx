import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { createPreuve, linkPreuve, uploadPreuveFichier, type PreuveFichier } from "@/lib/qualiopi/data";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  indicateur: number;
  remplacePreuveId?: string | null;
  onSaved: () => void;
}

export function PreuveFormDialog({ open, onOpenChange, indicateur, remplacePreuveId, onSaved }: Props) {
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [datePreuve, setDatePreuve] = useState("");
  const [valideDu, setValideDu] = useState("");
  const [valideAu, setValideAu] = useState("");
  const [lien, setLien] = useState("");
  const [ceQueDemontre, setCeQueDemontre] = useState("");
  const [emplacement, setEmplacement] = useState("");
  const [sourceLibelle, setSourceLibelle] = useState("");
  const [remarqueInterne, setRemarqueInterne] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitre(""); setDescription(""); setDatePreuve(""); setValideDu(""); setValideAu(""); setLien(""); setFiles([]);
    setCeQueDemontre(""); setEmplacement(""); setSourceLibelle(""); setRemarqueInterne("");
  };

  const handleSave = async () => {
    if (!titre.trim()) { toast.error("Indiquez un intitulé de preuve"); return; }
    setSaving(true);
    try {
      const uploaded: PreuveFichier[] = [];
      for (const f of files) uploaded.push(await uploadPreuveFichier(f));
      const id = await createPreuve({
        titre: titre.trim(),
        description: description.trim() || null,
        ce_que_demontre: ceQueDemontre.trim() || null,
        emplacement: emplacement.trim() || null,
        source_libelle: sourceLibelle.trim() || null,
        remarque_interne: remarqueInterne.trim() || null,
        date_preuve: datePreuve || null,
        valide_du: valideDu || null,
        valide_au: valideAu || null,
        fichiers: uploaded,
        lien_url: lien.trim() || null,
        source_type: "upload",
        remplace_preuve_id: remplacePreuveId ?? null,
      });
      await linkPreuve(id, indicateur);
      toast.success("Preuve ajoutée");
      reset();
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{remplacePreuveId ? "Remplacer la preuve" : `Ajouter une preuve — indicateur ${indicateur}`}</DialogTitle>
          <DialogDescription>
            Expliquez en quoi cette preuve répond à l'indicateur. L'ancienne preuve reste archivée, jamais supprimée.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Intitulé de la preuve *</Label>
            <Input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex. Règlement intérieur 2026 signé" />
          </div>
          <div className="space-y-1.5">
            <Label>En quoi cette preuve répond à l'indicateur</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Ce que démontre la preuve</Label>
            <Textarea rows={2} value={ceQueDemontre} onChange={(e) => setCeQueDemontre(e.target.value)} placeholder="Ex. Diffusion publique de la durée et des tarifs avant inscription" />
          </div>
          <div className="space-y-1.5">
            <Label>Emplacement de la preuve</Label>
            <Input value={emplacement} onChange={(e) => setEmplacement(e.target.value)} placeholder="Ex. Site public — page /formation-vtc" />
          </div>
          <div className="space-y-1.5">
            <Label>Source</Label>
            <Input value={sourceLibelle} onChange={(e) => setSourceLibelle(e.target.value)} placeholder="Ex. Mon Compte Formation / EDOF" />
          </div>
          <div className="space-y-1.5">
            <Label>Remarque interne</Label>
            <Textarea rows={2} value={remarqueInterne} onChange={(e) => setRemarqueInterne(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Date de la preuve</Label>
            <Input type="date" value={datePreuve} onChange={(e) => setDatePreuve(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Valide du</Label>
            <Input type="date" value={valideDu} onChange={(e) => setValideDu(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Valide jusqu'au</Label>
            <Input type="date" value={valideAu} onChange={(e) => setValideAu(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Lien (page, dossier ou élément du CRM)</Label>
            <Input value={lien} onChange={(e) => setLien(e.target.value)} placeholder="https://…" />
          </div>
          <div className="space-y-1.5">
            <Label>Fichiers (PDF, Word, Excel, images…)</Label>
            <Input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
            {files.length > 0 && (
              <div className="space-y-1 pt-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-muted-foreground border rounded px-2 py-1">
                    <span className="truncate">{f.name}</span>
                    <button onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Enregistrer la preuve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
