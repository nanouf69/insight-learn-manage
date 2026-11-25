import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { confirmerDateExamenTheorique } from "@/lib/candidatsFormationPreuves";
import { toast } from "sonner";

const AUCUNE_DATE = "pas_encore_choisi";

interface DateExamenTheoriqueSelectProps {
  apprenantId: string;
  candidatNom: string;
  value: string | null;
  dates: string[];
  onSaved: () => void;
}

export function DateExamenTheoriqueSelect({
  apprenantId,
  candidatNom,
  value,
  dates,
  onSaved,
}: DateExamenTheoriqueSelectProps) {
  const [saving, setSaving] = useState(false);
  const currentValue = value?.trim() || AUCUNE_DATE;
  const options = currentValue !== AUCUNE_DATE && !dates.includes(currentValue)
    ? [currentValue, ...dates]
    : dates;

  const save = async (nextValue: string) => {
    if (saving || nextValue === currentValue) return;
    setSaving(true);
    try {
      await confirmerDateExamenTheorique(nextValue, async (date) => {
        const { data, error } = await supabase
          .from("apprenants")
          .update({ date_examen_theorique: date })
          .eq("id", apprenantId)
          .select("id, date_examen_theorique")
          .maybeSingle();
        if (error) throw error;
        return data?.date_examen_theorique;
      });
      toast.success(`Date d'examen théorique enregistrée pour ${candidatNom}`);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La date n'a pas pu être enregistrée.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Select value={currentValue} onValueChange={(next) => void save(next)} disabled={saving}>
      <SelectTrigger
        className="h-8 w-[190px] text-xs"
        aria-label={`Date d'examen théorique de ${candidatNom}`}
      >
        <SelectValue placeholder="Choisir une date" />
      </SelectTrigger>
      <SelectContent className="bg-background">
        <SelectItem value={AUCUNE_DATE}>Pas de date choisie encore</SelectItem>
        {options.map((date) => <SelectItem key={date} value={date}>{date}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
