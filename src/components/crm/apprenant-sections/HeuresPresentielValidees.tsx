import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Clock, Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { CATEGORIES_PRESENCE, HEURES_VALIDEES_EVENT, libelleHeureValidee, normaliserHeuresValidees } from "@/lib/heuresValideesAdmin";

interface Props {
  apprenantId: string;
}

interface HeureValideeRow {
  id: string;
  heures: number;
  motif: string | null;
  created_at: string;
  date_presence: string | null;
  categorie: string | null;
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
  const [datePresence, setDatePresence] = useState("");
  const [categorie, setCategorie] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: rows } = useQuery<HeureValideeRow[]>({
    queryKey: ["presentiel-heures-validees", apprenantId],
    enabled: !!apprenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("presentiel_heures_validees" as any)
        .select("id, heures, motif, created_at, date_presence, categorie")
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
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePresence) || datePresence > today) {
      toast.error("Indiquez la date réelle de présence (pas dans le futur)");
      return;
    }
    if (!CATEGORIES_PRESENCE[categorie]) {
      toast.error("Choisissez la catégorie de présence");
      return;
    }
    if (motif.trim().length < 5) {
      toast.error("Indiquez un motif précis (5 caractères minimum)");
      return;
    }
    if (saving) return; // verrou double-clic
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      if (!uid) { toast.error("Session expirée : reconnectez-vous"); return; }
      // Insertion unique, confirmée par la relecture serveur de la ligne créée.
      const { data: inserted, error } = await supabase.from("presentiel_heures_validees" as any).insert({
        apprenant_id: apprenantId,
        heures: value,
        motif: motif.trim(),
        date_presence: datePresence,
        categorie,
        created_by: uid,
      } as any).select("id").single();
      if (error || !(inserted as any)?.id) {
        toast.error("Enregistrement non confirmé par le serveur : rien n'a été compté");
        return;
      }
      toast.success(`${value}h de présence enregistrées et confirmées`);
      setHeures(""); setMotif(""); setDatePresence(""); setCategorie("");
      // Rafraîchit tous les écrans de cet élève (et seulement lui) + jalons.
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey.includes(apprenantId) || String(q.queryKey[0] ?? "").startsWith("jalons") });
      window.dispatchEvent(new CustomEvent(HEURES_VALIDEES_EVENT, { detail: { apprenantId } }));
    } finally {
      setSaving(false);
    }
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
          placeholder="Motif (obligatoire)"
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          className="flex-1 min-w-48"
          maxLength={200}
        />
        <Input type="date" aria-label="Date de présence" value={datePresence} onChange={(e) => setDatePresence(e.target.value)} className="w-40" />
        <select aria-label="Catégorie de présence" value={categorie} onChange={(e) => setCategorie(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
          <option value="">Catégorie…</option>
          {Object.entries(CATEGORIES_PRESENCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Button size="sm" onClick={handleAdd} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Valider les heures
        </Button>
      </div>
      {(rows || []).length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1">
          {normaliserHeuresValidees(rows || []).slice().reverse().map((r) => (
            <li key={r.id}>
              {r.heures}h — {libelleHeureValidee(r)} ({format(new Date(r.createdAt), "HH:mm")})
              {r.motif ? ` — ${r.motif}` : " — motif non renseigné"}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
