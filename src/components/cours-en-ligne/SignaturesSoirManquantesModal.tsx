import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sunset, AlertTriangle, PenTool, ShieldCheck } from "lucide-react";
import { SignaturePad } from "@/components/onboarding/SignaturePad";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  apprenantId: string;
  userId: string;
  onAllSigned: () => void;
}

const SINCE = "2026-05-11";

const formatFR = (iso: string) => {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
};

export const SignaturesSoirManquantesModal = ({ apprenantId, userId, onAllSigned }: Props) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [datesManquantes, setDatesManquantes] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [signature, setSignature] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("emargements_fc" as any)
        .select("date_emargement, demi_journee")
        .eq("apprenant_id", apprenantId)
        .gte("date_emargement", SINCE);
      if (error || !data) {
        setLoading(false);
        onAllSigned();
        return;
      }
      const byDate = new Map<string, Set<string>>();
      for (const r of data as any[]) {
        if (!byDate.has(r.date_emargement)) byDate.set(r.date_emargement, new Set());
        byDate.get(r.date_emargement)!.add(r.demi_journee);
      }
      const missing: string[] = [];
      byDate.forEach((set, date) => {
        if (set.has("soir_1") && !set.has("soir_2") && !set.has("soir")) {
          missing.push(date);
        }
      });
      missing.sort();
      setDatesManquantes(missing);
      setLoading(false);
      if (missing.length === 0) onAllSigned();
    };
    load();
  }, [apprenantId, onAllSigned]);

  const currentDate = datesManquantes[idx];

  const handleSubmit = async () => {
    if (!signature) {
      toast({ title: "Signature requise", description: "Veuillez signer.", variant: "destructive" });
      return;
    }
    if (!currentDate) return;
    setSaving(true);
    const { error } = await supabase.from("emargements_fc" as any).insert({
      apprenant_id: apprenantId,
      user_id: userId,
      date_emargement: currentDate,
      demi_journee: "soir_2",
      signature_data_url: signature,
      user_agent: navigator.userAgent.slice(0, 500),
    });
    setSaving(false);
    if (error && error.code !== "23505") {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Signature enregistrée", description: `Soir 18h30-21h du ${formatFR(currentDate)}` });
    setSignature("");
    if (idx + 1 >= datesManquantes.length) {
      onAllSigned();
    } else {
      setIdx(idx + 1);
    }
  };

  if (loading || datesManquantes.length === 0) return null;

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sunset className="w-5 h-5 text-orange-500" />
            Signature manquante — Soir 18h30 à 21h00
          </DialogTitle>
          <DialogDescription>
            Il manque {datesManquantes.length - idx} signature(s) du soir (2ème partie 18h30-21h00) depuis le 11 mai.
            Vous pouvez régulariser maintenant ou plus tard.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-900">
            Date à signer : <strong>{formatFR(currentDate)}</strong><br />
            Créneau : <strong>Soir 2ème partie (18h30 — 21h00)</strong><br />
            <span className="text-xs">Signature {idx + 1} / {datesManquantes.length}</span>
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
          En signant, vous attestez de votre présence effective sur ce créneau.
        </p>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={handleSubmit} disabled={saving || !signature} size="lg" className="w-full">
            {saving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement…</>) : "Valider cette signature"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            disabled={saving}
            onClick={() => onAllSigned()}
          >
            Signer plus tard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
