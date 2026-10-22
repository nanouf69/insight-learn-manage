import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SignaturePad } from "@/components/onboarding/SignaturePad";
import type { ChampDocument } from "@/lib/documentsASigner";

export function dateDuJourDocument(now = new Date()) {
  return now.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" });
}

export function DocumentZoneEditor({ champ, valeur, onClose, onApply }: {
  champ: ChampDocument; valeur: string; onClose: () => void; onApply: (value: string) => void;
}) {
  const [draft, setDraft] = useState(valeur);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-h-[85dvh] overflow-y-auto" aria-describedby={undefined}>
        <DialogTitle>{champ.label}</DialogTitle>
        {champ.type === "signature" ? (
          <SignaturePad value={draft} onChange={setDraft} />
        ) : (
          <>
            <Input autoFocus aria-label={champ.label} type={champ.type === "nombre" ? "number" : "text"}
              inputMode={champ.type === "nombre" ? "numeric" : "text"} value={draft} onChange={(e) => setDraft(e.target.value)} />
            {champ.type === "texte" && <Button variant="outline" onClick={() => setDraft(dateDuJourDocument())}>
              <CalendarDays /> Date d’aujourd’hui
            </Button>}
          </>
        )}
        <Button onClick={() => { onApply(draft); onClose(); }}>Appliquer à cette zone</Button>
      </DialogContent>
    </Dialog>
  );
}