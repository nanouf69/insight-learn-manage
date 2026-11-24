import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RI_SERVICES_PRO_V2 } from "@/lib/reglementServicesPro";

export function ReglementServicesProInformation() {
  const [open, setOpen] = useState(false);
  return <>
    <Button variant="outline" onClick={() => setOpen(true)}>Nouveau règlement SERVICES PRO — 24/11/2026</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Règlement intérieur SERVICES PRO — nouvelle version</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">21 articles. Information des inscrits à organiser ; aucun envoi ni nouvelle acceptation enregistrés ici. Les acceptations précédentes restent inchangées.</p>
      {RI_SERVICES_PRO_V2.map(article => <section key={article.num} className="space-y-1"><h3 className="font-bold text-sm">Article {article.num} — {article.titre}</h3><p className="text-xs whitespace-pre-line leading-relaxed text-muted-foreground">{article.contenu}</p></section>)}
    </DialogContent></Dialog>
  </>;
}