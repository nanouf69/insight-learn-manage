import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, PenTool, ShieldCheck, Sun, Moon, Sunset, AlertTriangle } from "lucide-react";
import { SignaturePad } from "@/components/onboarding/SignaturePad";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { CreneauKey } from "@/lib/agendaSlots";
import { creneauLabel, creneauHoraire } from "@/lib/agendaSlots";

interface EmargementFCModalProps {
  apprenantId: string;
  userId: string;
  apprenantNom: string;
  apprenantPrenom: string;
  /** Créneau forcé (présentiel : déterminé via agenda). Sinon, calculé selon l'heure. */
  creneau?: CreneauKey;
  /** Mode: "fc" = formation continue, "presentiel" = cours présentiel classique */
  mode?: "fc" | "presentiel";
  onSigned?: () => void;
}

const getCurrentCreneauFromHour = (): CreneauKey => {
  const h = new Date().getHours();
  if (h < 13) return "matin";
  if (h < 18) return "apres_midi";
  return "soir";
};

const todayISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const creneauIcon = (k: CreneauKey) => {
  if (k === "matin") return <Sun className="w-5 h-5 text-amber-500" />;
  if (k === "apres_midi") return <Moon className="w-5 h-5 text-indigo-500" />;
  return <Sunset className="w-5 h-5 text-orange-500" />;
};

export const EmargementFCModal = ({
  apprenantId,
  userId,
  apprenantNom,
  apprenantPrenom,
  creneau,
  mode = "fc",
  onSigned,
}: EmargementFCModalProps) => {
  const { toast } = useToast();
  const [signature, setSignature] = useState("");
  const [saving, setSaving] = useState(false);
  const [demi] = useState<CreneauKey>(creneau || getCurrentCreneauFromHour());
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!signature) {
      toast({
        title: "Signature requise",
        description: "Veuillez dessiner votre signature avant de valider.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("emargements_fc" as any).insert({
      apprenant_id: apprenantId,
      user_id: userId,
      date_emargement: todayISO(),
      demi_journee: demi,
      signature_data_url: signature,
      user_agent: navigator.userAgent.slice(0, 500),
    });
    setSaving(false);
    if (error) {
      // Si déjà signé entre-temps : on laisse passer
      if (error.code === "23505") {
        setDone(true);
        onSigned?.();
        return;
      }
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer votre signature. " + error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Émargement validé",
      description: `Signature ${creneauLabel(demi).toLowerCase()} enregistrée. Bonne formation !`,
    });
    setDone(true);
    onSigned?.();
  };

  if (done) return null;

  const formationLabel = mode === "presentiel" ? "formation en présentiel" : "formation continue";

  return (
    <Dialog open={true} onOpenChange={() => { /* non-fermable */ }}>
      <DialogContent
        className="max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {creneauIcon(demi)}
            Émargement obligatoire — {creneauLabel(demi)}
          </DialogTitle>
          <DialogDescription>
            Bonjour <strong>{apprenantPrenom} {apprenantNom}</strong>, vous suivez une <strong>{formationLabel}</strong>.
            Pour accéder à vos cours, vous devez signer la feuille d'émargement de ce créneau.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-900">
            Date : <strong>{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</strong>
            <br />
            Créneau : <strong>{creneauLabel(demi)} ({creneauHoraire(demi)})</strong>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <PenTool className="w-4 h-4" /> Votre signature
          </p>
          <SignaturePad value={signature} onChange={setSignature} disabled={saving} />
        </div>

        <p className="text-xs text-muted-foreground flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
          En signant, vous attestez de votre présence effective à ce créneau de formation.
          Cette signature est horodatée et conservée à des fins légales (Qualiopi / financeurs).
        </p>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={saving || !signature}
            className="w-full"
            size="lg"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement…</>
            ) : (
              <>Valider mon émargement et accéder aux cours</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Helper exporté pour détecter si un apprenant est en formation continue
export const isFormationContinue = (
  type_apprenant?: string | null,
  formation_choisie?: string | null,
): boolean => {
  const t = (type_apprenant || "").toLowerCase();
  const f = (formation_choisie || "").toLowerCase();
  // Type FC, FCO, ou formation_choisie contenant "continue"
  return /\bfc\b|fco|formation\s*continue|continue/.test(t) || /continue/.test(f);
};
