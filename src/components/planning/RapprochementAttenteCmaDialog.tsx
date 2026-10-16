import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export interface AttenteCma { id: string; candidatsIds: string[]; raison: string | null; prenom: string; nom: string }
interface Fiche { id: string; prenom: string | null; nom: string | null; email: string | null; type_apprenant: string | null; created_at: string | null }

/** Rattachement manuel d'une ligne du PDF en attente à une fiche EXISTANTE. Aucun compte créé, fiche inchangée. */
export function RapprochementAttenteCmaDialog({ attente, date, heure, onClose, onDone }: {
  attente: AttenteCma | null; date?: string; heure?: string; onClose: () => void; onDone: () => void;
}) {
  const [recherche, setRecherche] = useState("");
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [choix, setChoix] = useState<string>("");
  const [envoi, setEnvoi] = useState(false);
  const cols = "id, prenom, nom, email, type_apprenant, created_at";

  useEffect(() => {
    if (!attente) return;
    setRecherche(attente.nom); setChoix("");
  }, [attente]);

  useEffect(() => {
    if (!attente) return;
    let annule = false;
    (async () => {
      const [{ data: proposes }, { data: trouves }] = await Promise.all([
        attente.candidatsIds.length ? supabase.from("apprenants").select(cols).in("id", attente.candidatsIds) : Promise.resolve({ data: [] as Fiche[] }),
        recherche.trim().length >= 2
          ? supabase.from("apprenants").select(cols).is("deleted_at", null).ilike("nom", `%${recherche.trim()}%`).limit(30)
          : Promise.resolve({ data: [] as Fiche[] }),
      ]);
      if (annule) return;
      const m = new Map<string, Fiche>();
      [...((proposes as Fiche[]) || []), ...((trouves as Fiche[]) || [])].forEach((f) => m.set(f.id, f));
      setFiches([...m.values()]);
    })();
    return () => { annule = true; };
  }, [attente, recherche]);

  const valider = async () => {
    if (!attente || !choix) return;
    setEnvoi(true);
    const { error } = await supabase.rpc("rattacher_attente_cma", { p_attente: attente.id, p_apprenant: choix });
    setEnvoi(false);
    if (error) { toast.error("Rattachement refusé : " + error.message); return; }
    toast.success("Candidat rattaché au planning (fiche élève inchangée)");
    onDone(); onClose();
  };

  return (
    <Dialog open={!!attente} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>À rapprocher : {attente?.prenom} {attente?.nom}</DialogTitle>
          <DialogDescription>
            {date} {heure} — {attente?.raison || "Aucune fiche identifiée."} Choisissez une fiche existante ; aucune n'est sélectionnée par défaut.
          </DialogDescription>
        </DialogHeader>
        <Input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher par nom" />
        <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
          {fiches.length === 0 && <p className="text-sm text-muted-foreground">Aucune fiche trouvée : la ligne reste en attente.</p>}
          {fiches.map((f) => (
            <label key={f.id} className="flex items-start gap-2 text-sm border rounded p-2 cursor-pointer">
              <input type="radio" name="fiche" checked={choix === f.id} onChange={() => setChoix(f.id)} />
              <span>
                <b>{f.prenom} {f.nom}</b> · {f.type_apprenant || "?"} · {f.email || "sans mail"}
                <span className="block text-xs text-muted-foreground">Fiche créée le {f.created_at?.slice(0, 10)} · {f.id.slice(0, 8)}</span>
              </span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Laisser en attente</Button>
          <Button disabled={!choix || envoi} onClick={valider}>Rattacher à cette fiche</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
