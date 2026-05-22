import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, PenTool, ShieldCheck, Sun, Moon, Sunset, AlertTriangle, X, UserCheck, UserX, Upload, FileCheck2 } from "lucide-react";
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
  /** Date de l'émargement à signer (YYYY-MM-DD). Par défaut : aujourd'hui (rattrapage des jours passés). */
  dateEmargement?: string;
  onSigned?: () => void;
  /** Appelé si l'apprenant ferme/refuse de signer. La signature reste optionnelle. */
  onSkipped?: () => void;
}

const getCurrentCreneauFromHour = (): CreneauKey => {
  const h = new Date().getHours();
  if (h < 12) return "matin";
  if (h < 17) return "apres_midi";
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

const MAX_FILE_SIZE_MB = 10;

export const EmargementFCModal = ({
  apprenantId,
  userId,
  apprenantNom,
  apprenantPrenom,
  creneau,
  mode = "fc",
  onSigned,
  onSkipped,
}: EmargementFCModalProps) => {
  const { toast } = useToast();
  const [tab, setTab] = useState<"present" | "absent">("present");
  const [signature, setSignature] = useState("");
  const [saving, setSaving] = useState(false);
  const [demi] = useState<CreneauKey>(creneau || getCurrentCreneauFromHour());
  const [done, setDone] = useState(false);

  // Absent state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [justifFile, setJustifFile] = useState<File | null>(null);
  const [motif, setMotif] = useState("");

  const handleSubmitPresent = async () => {
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
      absent: false,
      user_agent: navigator.userAgent.slice(0, 500),
    });
    setSaving(false);
    if (error) {
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

  const handleSubmitAbsent = async () => {
    if (!justifFile) {
      toast({
        title: "Justificatif requis",
        description: "Veuillez joindre un justificatif d'absence (obligatoire).",
        variant: "destructive",
      });
      return;
    }
    if (justifFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: `Le justificatif doit faire moins de ${MAX_FILE_SIZE_MB} Mo.`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const docType = `justificatif_absence_${todayISO()}_${demi}`;
      const titre = `Justificatif d'absence — ${new Date().toLocaleDateString("fr-FR")} (${creneauLabel(demi)})`;

      const formData = new FormData();
      formData.append("file", justifFile);
      formData.append("apprenant_id", apprenantId);
      formData.append("titre", titre);
      formData.append("type_document", docType);

      const { data, error } = await supabase.functions.invoke("upload-document-inscription", {
        body: formData,
      });
      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || "Upload échoué");
      }

      let justUrl: string = data?.publicUrl || "";
      if (!justUrl && data?.storagePath) {
        const { data: urlData } = supabase.storage
          .from("documents-inscription")
          .getPublicUrl(data.storagePath);
        justUrl = urlData?.publicUrl || "";
      }

      const { error: insErr } = await supabase.from("emargements_fc" as any).insert({
        apprenant_id: apprenantId,
        user_id: userId,
        date_emargement: todayISO(),
        demi_journee: demi,
        signature_data_url: null,
        absent: true,
        justificatif_url: justUrl,
        motif_absence: motif.trim() || null,
        user_agent: navigator.userAgent.slice(0, 500),
      } as any);

      if (insErr && insErr.code !== "23505") {
        throw new Error(insErr.message);
      }

      toast({
        title: "Absence enregistrée",
        description: "Votre justificatif a été transmis au centre.",
      });
      setDone(true);
      onSigned?.();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Impossible d'enregistrer votre absence.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (done) return null;

  const formationLabel = mode === "presentiel" ? "formation en présentiel" : "formation continue";

  const handleClose = () => {
    setDone(true);
    onSkipped?.();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {creneauIcon(demi)}
            Émargement — {creneauLabel(demi)}
          </DialogTitle>
          <DialogDescription>
            Bonjour <strong>{apprenantPrenom} {apprenantNom}</strong>, vous suivez une <strong>{formationLabel}</strong>.
            Merci de signer votre présence ou de déclarer une absence avec justificatif.
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

        {/* Toggle Présent / Absent */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={tab === "present" ? "default" : "outline"}
            onClick={() => setTab("present")}
            disabled={saving}
          >
            <UserCheck className="w-4 h-4 mr-2" /> Je suis présent
          </Button>
          <Button
            type="button"
            variant={tab === "absent" ? "destructive" : "outline"}
            onClick={() => setTab("absent")}
            disabled={saving}
          >
            <UserX className="w-4 h-4 mr-2" /> Je suis absent
          </Button>
        </div>

        {tab === "present" ? (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <PenTool className="w-4 h-4" /> Votre signature
            </p>
            <SignaturePad value={signature} onChange={setSignature} disabled={saving} />
            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              En signant, vous attestez de votre présence effective à ce créneau.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <Alert className="border-red-300 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-sm text-red-900">
                Un justificatif est <strong>obligatoire</strong> (arrêt de travail, convocation administrative,
                attestation médicale, etc.). Il sera transmis au centre et conservé dans votre dossier.
              </AlertDescription>
            </Alert>

            <div className="space-y-1">
              <label className="text-sm font-medium">Motif (facultatif)</label>
              <Textarea
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Précisez brièvement la raison de votre absence…"
                rows={2}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Justificatif <span className="text-red-600">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => setJustifFile(e.target.files?.[0] || null)}
                disabled={saving}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
              >
                {justifFile ? (
                  <>
                    <FileCheck2 className="w-4 h-4 mr-2 text-green-600" />
                    <span className="truncate">{justifFile.name}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Choisir un fichier (PDF ou image)
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">Max {MAX_FILE_SIZE_MB} Mo.</p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={saving}
            size="lg"
          >
            <X className="w-4 h-4 mr-2" /> Plus tard
          </Button>
          {tab === "present" ? (
            <Button
              onClick={handleSubmitPresent}
              disabled={saving || !signature}
              size="lg"
              className="flex-1"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement…</>
              ) : (
                <>Valider ma signature</>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleSubmitAbsent}
              disabled={saving || !justifFile}
              size="lg"
              variant="destructive"
              className="flex-1"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Envoi…</>
              ) : (
                <>Déclarer mon absence</>
              )}
            </Button>
          )}
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
  return /\bfc\b|fco|formation\s*continue|continue/.test(t) || /continue/.test(f);
};
