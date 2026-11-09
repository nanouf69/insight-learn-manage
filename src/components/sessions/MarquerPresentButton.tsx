import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  inscriptionId: string;
  sessionId: string;
  nom: string;
  present: boolean;
  onSaved: () => Promise<unknown>;
}

export function estAbsentSession(presence: string | null | undefined, resultatExamen: string | null | undefined, signatureManquante: boolean): boolean {
  return presence === "absent" || resultatExamen === "absent" || (signatureManquante && presence !== "present");
}

// Une déclaration de présence ne crée aucune preuve d'émargement ni autre action.
export function MarquerPresentButton({ inscriptionId, sessionId, nom, present, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const save = async () => {
    if (saving || present) return;
    if (!window.confirm(`Marquer ${nom} comme présent à cette session ? Aucune signature ni attestation ne sera créée.`)) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from("session_apprenants")
        .update({ presence_pratique: "present" })
        .eq("id", inscriptionId).eq("session_id", sessionId)
        .select("id, presence_pratique").single();
      if (error) throw error;
      if (data?.id !== inscriptionId || data.presence_pratique !== "present") {
        throw new Error("La présence n'a pas été confirmée.");
      }
      await onSaved();
      toast({ title: "Présence enregistrée", description: `${nom} est marqué présent à cette session.` });
    } catch (error) {
      toast({ title: "Présence non confirmée", description: error instanceof Error ? error.message : "Veuillez réessayer.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };
  return <Button size="sm" variant="outline" className="gap-2 shrink-0" disabled={saving || present} onClick={save}>
    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
    {present ? "Présence déclarée" : "Mettre présent"}
  </Button>;
}