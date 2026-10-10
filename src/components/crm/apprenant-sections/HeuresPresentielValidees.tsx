import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Clock, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Props {
  apprenantId: string;
}

interface HeureValideeRow {
  id: string;
  heures: number;
  motif: string | null;
  created_at: string;
}

/**
 * Saisie manuelle d'heures de présence validées par un administrateur.
 * Append-only : chaque validation est une nouvelle ligne conservée en base,
 * jamais modifiée ni supprimée. Le total s'ajoute aux heures signées.
 */
export function HeuresPresentielValidees({ apprenantId }: Props) {
  const queryClient = useQueryClient();
  const [heures, setHeures] = useState("");
  const [motif, setMotif] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: rows } = useQuery<HeureValideeRow[]>({
    queryKey: ["presentiel-heures-validees", apprenantId],
    enabled: !!apprenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("presentiel_heures_validees" as any)
        .select("id, heures, motif, created_at")
        .eq("apprenant_id", apprenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const total = (rows || []).reduce((sum, r) => sum + (Number(r.heures) || 0), 0);

  const handleAdd = async () => {
    const value = Number(String(heures).replace(",", "."));
    if (!Number.isFinite(value) || value <= 0 || value > 500) {
      toast.error("Indiquez un nombre d'heures valide (ex : 6 ou 3.5)");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("presentiel_heures_validees" as any).insert({
      apprenant_id: apprenantId,
      heures: value,
      motif: motif.trim() || null,
      created_by: userData?.user?.id ?? null,
    } as any);
    setSaving(false);
    if (error) {
      toast.error("Enregistrement impossible");
      return;
    }
    toast.success(`${value}h de présence validées`);
    setHeures("");
    setMotif("");
    queryClient.invalidateQueries({ queryKey: ["presentiel-heures-validees", apprenantId] });
    queryClient.invalidateQueries({ queryKey: ["apprenant-taux-realisation", apprenantId] });
  };

  return (
    <div className="w-full rounded-lg border bg-card shadow-sm px-4 py-3 space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Heures de présence validées manuellement</span>
        <span className="text-xs text-muted-foreground">
          {total > 0 ? `Total validé : ${total}h` : "Aucune heure validée manuellement"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="text"
          inputMode="decimal"
          placeholder="Heures (ex : 6)"
          value={heures}
          onChange={(e) => setHeures(e.target.value)}
          className="w-36"
        />
        <Input
          type="text"
          placeholder="Motif (facultatif)"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          className="flex-1 min-w-48"
          maxLength={200}
        />
        <Button size="sm" onClick={handleAdd} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Valider les heures
        </Button>
      </div>
      {(rows || []).length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1">
          {(rows || []).map((r) => (
            <li key={r.id}>
              {format(new Date(r.created_at), "dd/MM/yyyy HH:mm")} — {r.heures}h
              {r.motif ? ` — ${r.motif}` : ""}
          </li>
          ))}
        </ul>
      )}
    </div>
  );
}
