import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Remarques admin : enregistrement seulement si le texte serveur n'a pas changé entre-temps, puis relecture. */
export function RemarquesApprenant({ apprenantId, initial }: { apprenantId: string; initial: string | null }) {
  const [base, setBase] = useState(initial ?? "");
  const [texte, setTexte] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const enregistrer = async () => {
    setSaving(true);
    try {
      let q = (supabase as any).from("apprenants").update({ notes: texte }).eq("id", apprenantId);
      q = base ? q.eq("notes", base) : q.or("notes.is.null,notes.eq.");
      const { data, error } = await q.select("notes");
      if (error) throw error;
      if (!data?.length) { toast.error("Remarques modifiées ailleurs : rechargez la fiche avant d'enregistrer"); return; }
      setBase(data[0].notes ?? ""); setTexte(data[0].notes ?? "");
      toast.success("Remarques enregistrées");
    } catch { toast.error("Enregistrement impossible : remarques non modifiées"); }
    finally { setSaving(false); }
  };
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Notes / remarques</p>
      <Textarea value={texte} onChange={e => setTexte(e.target.value)} rows={4} placeholder="Ajouter une remarque…" />
      {texte !== base && <Button size="sm" className="min-h-11" disabled={saving} onClick={enregistrer}>{saving ? "Enregistrement…" : "Enregistrer les remarques"}</Button>}
    </div>
  );
}
