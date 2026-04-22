import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type DayType = "formation_vtc" | "formation_taxi" | "examen_vtc" | "examen_taxi";

type Apprenant = { id: string; nom: string; prenom: string; formation_choisie: string | null };
type Slot = { apprenant_id: string; nom: string; prenom: string; heure: string };

interface Props {
  open: boolean;
  onClose: () => void;
  date: Date;
  initialType: DayType;
  initialSlots: Slot[];
  onSaved: () => void;
}

const toLocalDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const DEFAULT_SLOTS = ["08:30", "10:00", "11:30", "13:30", "15:00", "16:30"];

export function DayConfigDialog({ open, onClose, date, initialType, initialSlots, onSaved }: Props) {
  const [type, setType] = useState<DayType>(initialType);
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [allApprenants, setAllApprenants] = useState<Apprenant[]>([]);
  const [saving, setSaving] = useState(false);
  const [pickerOpenIdx, setPickerOpenIdx] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setType(initialType);
      setSlots(initialSlots);
    }
  }, [open, initialType, initialSlots]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, formation_choisie")
        .is("deleted_at", null)
        .order("nom");
      setAllApprenants(data || []);
    })();
  }, [open]);

  const isExamen = type.startsWith("examen_");
  const isTaxi = type.endsWith("_taxi");
  const dateKey = toLocalDateKey(date);

  const addSlot = () => {
    const nextIdx = slots.length;
    const heure = DEFAULT_SLOTS[nextIdx % DEFAULT_SLOTS.length];
    setSlots([...slots, { apprenant_id: "", nom: "", prenom: "", heure }]);
  };

  const removeSlot = (i: number) => setSlots(slots.filter((_, idx) => idx !== i));

  const updateSlot = (i: number, patch: Partial<Slot>) => {
    setSlots(slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Filtrer les slots valides
      const validSlots = slots.filter((s) => s.apprenant_id && s.heure);

      if (isExamen) {
        // Pour un examen : mettre à jour date_examen_pratique + heure_examen_pratique sur chaque apprenant
        for (const s of validSlots) {
          const formationLabel = isTaxi ? "TAXI" : "VTC";
          const updates: any = {
            date_examen_pratique: dateKey,
            heure_examen_pratique: s.heure,
          };
          // Si formation_choisie ne contient pas le bon type, on aligne (optionnel mais utile pour la couleur)
          const app = allApprenants.find((a) => a.id === s.apprenant_id);
          if (app && !(app.formation_choisie || "").toUpperCase().includes(formationLabel)) {
            updates.formation_choisie = formationLabel;
          }
          await supabase.from("apprenants").update(updates).eq("id", s.apprenant_id);
        }
        // Supprimer toute session pratique existante ce jour-là (car c'est un jour examen)
        await supabase
          .from("sessions")
          .delete()
          .eq("type_session", "pratique")
          .eq("date_debut", dateKey);
        toast.success(`✅ ${validSlots.length} candidat(s) inscrit(s) à l'examen ${isTaxi ? "TAXI" : "VTC"}`);
      } else {
        // Formation pratique : créer/maj une session
        const sessionType = isTaxi ? "TAXI" : "VTC";
        const sessionNom = `Formation pratique ${sessionType} - ${date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}`;

        // Chercher session existante ce jour-là
        const { data: existing } = await supabase
          .from("sessions")
          .select("id")
          .eq("type_session", "pratique")
          .eq("date_debut", dateKey)
          .maybeSingle();

        let sessionId = existing?.id;
        if (sessionId) {
          await supabase
            .from("sessions")
            .update({ nom: sessionNom })
            .eq("id", sessionId);
          // Purger les liens existants
          await supabase.from("session_apprenants").delete().eq("session_id", sessionId);
        } else {
          const { data: created, error } = await supabase
            .from("sessions")
            .insert({
              nom: sessionNom,
              type_session: "pratique",
              date_debut: dateKey,
              date_fin: dateKey,
              statut: "planifiee",
            } as any)
            .select("id")
            .single();
          if (error) throw error;
          sessionId = created.id;
        }

        // Insérer les nouveaux liens avec horaires
        if (validSlots.length > 0) {
          const rows = validSlots.map((s) => ({
            session_id: sessionId!,
            apprenant_id: s.apprenant_id,
            heure_debut_personnalisee: s.heure,
          }));
          const { error: linkErr } = await supabase.from("session_apprenants").insert(rows as any);
          if (linkErr) throw linkErr;
        }
        toast.success(`✅ Session ${sessionType} enregistrée (${validSlots.length} apprenant(s))`);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error("Erreur : " + (err.message || "Échec"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Configurer le {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Type de journée</Label>
            <Select value={type} onValueChange={(v) => setType(v as DayType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="formation_vtc">🚗 Entraînement pratique VTC</SelectItem>
                <SelectItem value="formation_taxi">🚕 Entraînement pratique TAXI</SelectItem>
                <SelectItem value="examen_vtc">📋 Examen pratique VTC</SelectItem>
                <SelectItem value="examen_taxi">📋 Examen pratique TAXI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Apprenants & horaires</Label>
              <Button size="sm" variant="outline" onClick={addSlot} className="gap-1">
                <Plus className="h-3.5 w-3.5" />
                Ajouter
              </Button>
            </div>

            {slots.length === 0 && (
              <p className="text-sm text-muted-foreground italic">Aucun apprenant. Cliquez sur « Ajouter ».</p>
            )}

            <div className="space-y-2">
              {slots.map((s, i) => (
                <div key={i} className="flex items-center gap-2 border border-border rounded-md p-2">
                  <Input
                    type="time"
                    value={s.heure}
                    onChange={(e) => updateSlot(i, { heure: e.target.value })}
                    className="w-28"
                  />
                  <Popover open={pickerOpenIdx === i} onOpenChange={(o) => setPickerOpenIdx(o ? i : null)}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start font-normal">
                        <Search className="h-3.5 w-3.5 mr-2 opacity-60" />
                        {s.apprenant_id ? `${s.nom} ${s.prenom}` : "Sélectionner un apprenant…"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[380px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Rechercher nom ou prénom…" />
                        <CommandList>
                          <CommandEmpty>Aucun résultat</CommandEmpty>
                          <CommandGroup>
                            {allApprenants.map((a) => (
                              <CommandItem
                                key={a.id}
                                value={`${a.nom} ${a.prenom}`}
                                onSelect={() => {
                                  updateSlot(i, { apprenant_id: a.id, nom: a.nom, prenom: a.prenom });
                                  setPickerOpenIdx(null);
                                }}
                              >
                                {a.nom} {a.prenom}
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {a.formation_choisie}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button size="icon" variant="ghost" onClick={() => removeSlot(i)} className="h-8 w-8">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
