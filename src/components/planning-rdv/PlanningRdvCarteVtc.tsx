import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Calendar, Clock, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Slot {
  id: string;
  date: string;
  heure: string;
  statut: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  notes: string | null;
}

const TIME_OPTIONS: string[] = (() => {
  const arr: string[] = [];
  for (let h = 9; h <= 17; h++) {
    arr.push(`${String(h).padStart(2, "0")}:00`);
    arr.push(`${String(h).padStart(2, "0")}:30`);
  }
  return arr;
})();

export function PlanningRdvCarteVtc() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("09:00");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkStart, setBulkStart] = useState("09:00");
  const [bulkEnd, setBulkEnd] = useState("17:00");
  const SLOT_DURATION_MIN = 30;
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rdv_carte_vtc_slots")
      .select("*")
      .order("date", { ascending: true })
      .order("heure", { ascending: true });
    if (error) toast.error("Erreur chargement");
    else setSlots((data ?? []) as Slot[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addSlot = async () => {
    if (!date) {
      toast.error("Sélectionnez une date");
      return;
    }
    setSaving(true);
    if (bulkMode) {
      const [sh, sm] = bulkStart.split(":").map(Number);
      const [eh, em] = bulkEnd.split(":").map(Number);
      const interval = SLOT_DURATION_MIN;
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      const rows: { date: string; heure: string }[] = [];
      for (let m = startMin; m <= endMin; m += interval) {
        const h = Math.floor(m / 60);
        const mm = m % 60;
        rows.push({ date, heure: `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00` });
      }
      const { error } = await supabase.from("rdv_carte_vtc_slots").insert(rows);
      if (error) toast.error("Erreur: " + error.message);
      else toast.success(`${rows.length} créneaux ajoutés`);
    } else {
      const { error } = await supabase.from("rdv_carte_vtc_slots").insert({ date, heure: `${heure}:00` });
      if (error) toast.error("Erreur: " + error.message);
      else toast.success("Créneau ajouté");
    }
    setSaving(false);
    load();
  };

  const deleteSlot = async (id: string) => {
    const { error } = await supabase.from("rdv_carte_vtc_slots").delete().eq("id", id);
    if (error) toast.error("Erreur suppression");
    else {
      toast.success("Supprimé");
      load();
    }
  };

  const toggleStatut = async (s: Slot) => {
    const newStatut = s.statut === "libre" ? "reserve" : "libre";
    const { error } = await supabase
      .from("rdv_carte_vtc_slots")
      .update({ statut: newStatut })
      .eq("id", s.id);
    if (error) toast.error("Erreur");
    else load();
  };

  // Group by date
  const grouped = slots.reduce<Record<string, Slot[]>>((acc, s) => {
    (acc[s.date] ??= []).push(s);
    return acc;
  }, {});

  const fmtDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h2 className="text-2xl font-bold">Planning RDV — Carte VTC</h2>
        <p className="text-sm text-muted-foreground">
          Gérez vos disponibilités pour les rendez-vous de création de carte professionnelle VTC au centre.
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Ajouter des créneaux</h3>
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setBulkMode(false)}
              className={`px-3 py-1 rounded ${!bulkMode ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              Un créneau
            </button>
            <button
              onClick={() => setBulkMode(true)}
              className={`px-3 py-1 rounded ${bulkMode ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              Plage horaire
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {!bulkMode ? (
            <div>
              <Label>Heure</Label>
              <Select value={heure} onValueChange={setHeure}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div>
                <Label>De</Label>
                <Input type="time" value={bulkStart} onChange={(e) => setBulkStart(e.target.value)} />
              </div>
              <div>
                <Label>À</Label>
                <Input type="time" value={bulkEnd} onChange={(e) => setBulkEnd(e.target.value)} />
              </div>
              <div>
                <Label>Durée</Label>
                <div className="h-10 px-3 flex items-center rounded-md border bg-muted text-sm">
                  30 min (fixe)
                </div>
              </div>
            </>
          )}
        </div>

        <Button onClick={addSlot} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {bulkMode ? "Générer les créneaux" : "Ajouter le créneau"}
        </Button>
      </Card>

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Aucun créneau. Ajoutez vos disponibilités ci-dessus.
          </Card>
        ) : (
          Object.entries(grouped).map(([d, items]) => (
            <Card key={d} className="p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="font-semibold capitalize">{fmtDate(d)}</h3>
                <Badge variant="outline" className="ml-auto">{items.length} créneau(x)</Badge>
              </div>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {items.map((s) => (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between p-2 rounded border ${
                      s.statut === "libre" ? "bg-emerald-50 border-emerald-200" : "bg-orange-50 border-orange-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="font-medium">
                        {s.heure.slice(0, 5)}
                        {(() => {
                          const [h, m] = s.heure.split(":").map(Number);
                          const end = h * 60 + m + 30;
                          return ` – ${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
                        })()}
                      </span>
                      {s.statut === "reserve" && (
                        <span className="text-xs flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {s.prenom || s.nom ? `${s.prenom ?? ""} ${s.nom ?? ""}`.trim() : "Réservé"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => toggleStatut(s)}
                      >
                        {s.statut === "libre" ? "Marquer réservé" : "Libérer"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={() => deleteSlot(s.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
