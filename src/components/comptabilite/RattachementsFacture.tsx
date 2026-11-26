import { useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { type RattachementFacture } from "@/lib/comptabilite/rattachementsFacture";

interface OptionApprenant { id: string; nom: string | null; prenom: string | null; }

export function RattachementsFacture({ factureId, existants, options, onSaved }: {
  factureId: string;
  existants: RattachementFacture[];
  options: OptionApprenant[];
  onSaved: (liens: RattachementFacture[]) => Promise<void>;
}) {
  const [selection, setSelection] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const idsExistants = new Set(existants.map(l => l.apprenant_id));
  const disponibles = options.filter(a => !idsExistants.has(a.id));
  const ajouter = async () => {
    if (busy || selection.length === 0) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("facture_rattacher_apprenants", {
        _facture_id: factureId, _apprenant_ids: selection,
      });
      if (error) throw error;
      const { data, error: readError } = await supabase.from("facture_apprenants_rattachements")
        .select("apprenant_id,nom_apprenant").eq("facture_id", factureId);
      if (readError) throw readError;
      const confirmes = new Set((data ?? []).map(l => l.apprenant_id));
      if (!selection.every(id => confirmes.has(id) || idsExistants.has(id))) {
        throw new Error("La confirmation des rattachements n’a pas été reçue. Réessayez sans fermer la facture.");
      }
      await onSaved(data ?? []);
      setSelection([]);
      toast.success("Apprenants rattachés à la facture");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rattachement non confirmé. Réessayez.");
    } finally { setBusy(false); }
  };
  return <div className="space-y-3">
    <div className="space-y-1">
      <p className="text-xs font-medium">Apprenants rattachés</p>
      {existants.length === 0 && <p className="text-sm text-muted-foreground">Aucun apprenant rattaché</p>}
      {existants.map(l => <p className="break-words text-sm font-medium" key={l.apprenant_id}>{l.nom_apprenant}</p>)}
    </div>
    {disponibles.length > 0 && <div className="max-h-48 overflow-y-auto divide-y rounded-md border bg-background">
      {disponibles.map(a => <label key={a.id} className="flex cursor-pointer items-center gap-3 p-2 text-sm">
        <Checkbox disabled={busy} checked={selection.includes(a.id)}
          onCheckedChange={checked => setSelection(ids => checked === true ? [...ids.filter(id => id !== a.id), a.id] : ids.filter(id => id !== a.id))} />
        <span className="break-words">{`${a.prenom ?? ""} ${a.nom ?? ""}`.trim()}</span>
      </label>)}
    </div>}
    {selection.length > 0 && <Button type="button" disabled={busy} onClick={ajouter} className="w-full whitespace-normal">
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
      Rattacher {selection.length} apprenant{selection.length > 1 ? "s" : ""}
    </Button>}
  </div>;
}