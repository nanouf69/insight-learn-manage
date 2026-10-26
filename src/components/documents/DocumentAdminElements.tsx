import { useEffect, useState } from "react";
import { Download, PenTool, Stamp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DOCUMENT_ADMIN_ELEMENTS, chargerElementAdmin } from "@/lib/documentAdminElements";

export function DocumentAdminElements() {
  const [images, setImages] = useState<Record<string, string>>({});
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.all(DOCUMENT_ADMIN_ELEMENTS.map(async (item) => [item.id, await chargerElementAdmin(item.id)]))
      .then((entries) => { if (active) setImages(Object.fromEntries(entries)); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);
  return <div className="grid gap-6 sm:grid-cols-2">
    {DOCUMENT_ADMIN_ELEMENTS.map((item) => <div key={item.id} className="space-y-4 rounded-lg border border-border p-4">
      <h3 className="flex items-center gap-2 font-semibold">{item.id === "signature" ? <PenTool className="h-4 w-4" /> : <Stamp className="h-4 w-4" />}{item.label}</h3>
      <div className="flex h-40 items-center justify-center rounded border border-border bg-background p-4">
        {images[item.id] ? <img src={images[item.id]} alt={item.label} className="max-h-full max-w-full object-contain" /> : <p className="text-sm text-muted-foreground">{error ? "Chargement impossible" : "Chargement…"}</p>}
      </div>
      <Button variant="outline" disabled={!images[item.id]} onClick={() => {
        const link = document.createElement("a"); link.href = images[item.id]; link.download = `${item.id}-naoufal.png`; link.click();
      }}><Download className="h-4 w-4" /> Télécharger le PNG transparent</Button>
    </div>)}
  </div>;
}