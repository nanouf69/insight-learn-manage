import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SignaturePad } from "@/components/onboarding/SignaturePad";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, FileText } from "lucide-react";

interface PendingDoc {
  id: string;
  type_document: string;
  titre: string;
  donnees: any;
}

interface Props {
  apprenantId: string;
  onAllSigned: () => void;
}

// Types of documents filled by the trainee that REQUIRE a signature
const SIGNABLE_TYPES = [
  "cgv-acceptation",
  "cgv-ri-acceptation",
  "analyse-besoin",
  "projet-professionnel",
  "evaluation-acquis",
  "test-competences",
  "dossier-bienvenue",
  "satisfaction",
];

export function SignatureDocumentsRequiredModal({ apprenantId, onAllSigned }: Props) {
  const [pending, setPending] = useState<PendingDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [signature, setSignature] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("apprenant_documents_completes" as any)
        .select("id, type_document, titre, donnees")
        .eq("apprenant_id", apprenantId)
        .in("type_document", SIGNABLE_TYPES);

      if (error) {
        console.error("Error loading documents:", error);
        setLoading(false);
        onAllSigned();
        return;
      }

      const unsigned = ((data || []) as any[]).filter((d) => {
        const sig = d?.donnees?.signature_stagiaire || d?.donnees?.signature;
        return !sig || typeof sig !== "string" || sig.length < 100;
      });

      setPending(unsigned as PendingDoc[]);
      setLoading(false);

      if (unsigned.length === 0) onAllSigned();
    };
    load();
  }, [apprenantId, onAllSigned]);

  const current = pending[currentIdx];

  const handleSign = async () => {
    if (!signature || signature.length < 100) {
      toast.error("Veuillez dessiner votre signature avant de continuer.");
      return;
    }
    setSaving(true);
    const newDonnees = {
      ...(current.donnees || {}),
      signature_stagiaire: signature,
      signature_stagiaire_date: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("apprenant_documents_completes" as any)
      .update({ donnees: newDonnees } as any)
      .eq("id", current.id);

    setSaving(false);

    if (error) {
      console.error(error);
      toast.error("Erreur lors de l'enregistrement de la signature.");
      return;
    }

    toast.success("✅ Signature enregistrée");
    setSignature("");

    if (currentIdx + 1 >= pending.length) {
      onAllSigned();
    } else {
      setCurrentIdx(currentIdx + 1);
    }
  };

  if (loading || pending.length === 0 || !current) return null;

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Signature requise
          </DialogTitle>
          <DialogDescription>
            Document {currentIdx + 1} sur {pending.length} — Veuillez signer pour continuer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 border">
            <p className="font-semibold text-sm">{current.titre}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ce document a été complété mais n'a pas encore été signé. Votre signature est obligatoire.
            </p>
          </div>

          <SignaturePad value={signature} onChange={setSignature} />

          <div className="flex justify-between items-center pt-2">
            <p className="text-xs text-muted-foreground">
              {pending.length - currentIdx - 1} document(s) restant(s) après celui-ci
            </p>
            <Button onClick={handleSign} disabled={saving || !signature}>
              {saving ? (
                "Enregistrement…"
              ) : currentIdx + 1 >= pending.length ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Terminer
                </>
              ) : (
                "Signer et continuer"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
