import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, PenTool, ShieldCheck, Sun, Moon, Sunset, AlertTriangle, X, UserCheck, UserX, Upload, FileCheck2 } from "lucide-react";
import { SignaturePad } from "@/components/onboarding/SignaturePad";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { CreneauKey } from "@/lib/agendaSlots";
import { creneauLabel, creneauHoraire } from "@/lib/agendaSlots";
import { checkSignatureAgainstReferences } from "@/lib/signatureSimilarity";

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
  /**
   * Créneaux supplémentaires à émarger avec la MÊME signature, en un seul clic.
   * Utilisé pour la formation pratique : matin + après-midi signés en une fois.
   */
  extraCreneaux?: CreneauKey[];
  replaceExisting?: boolean;
  required?: boolean;
  onSigned?: () => void;
  /** Appelé si l'apprenant ferme/refuse de signer. La signature reste optionnelle. */
  onSkipped?: () => void;
}

const getCurrentCreneauFromHour = (): CreneauKey => {
  const h = new Date().getHours();
  const m = new Date().getMinutes();
  if (h < 12) return "matin";
  if (h < 17) return "apres_midi";
  return h < 18 || (h === 18 && m < 30) ? "soir_1" : "soir_2";
};


const todayISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const saveEmargement = async (payload: Record<string, unknown>) => {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const { data: { session } } = await supabase.auth.getSession();

  if (!baseUrl || !apikey || !session?.access_token) {
    throw new Error("Session apprenant expirée. Merci de vous reconnecter.");
  }

  const response = await fetch(`${baseUrl}/functions/v1/save-emargement-apprenant`, {
    method: "POST",
    headers: {
      apikey,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.error) {
    throw new Error(result?.error || "Impossible d'enregistrer votre émargement.");
  }
  return result;
};

const creneauIcon = (k: CreneauKey) => {
  if (k === "matin") return <Sun className="w-5 h-5 text-amber-500" />;
  if (k === "apres_midi") return <Moon className="w-5 h-5 text-indigo-500" />;
  return <Sunset className="w-5 h-5 text-orange-500" />;
};

const MAX_FILE_SIZE_MB = 10;

const buildTypedSignatureDataUrl = (text: string) => {
  const value = text.trim();
  if (!value || typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 260;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "76px 'Brush Script MT', 'Segoe Script', cursive";
  ctx.fillText(value, canvas.width / 2, canvas.height / 2 + 8, canvas.width - 80);
  return canvas.toDataURL("image/png");
};

export const EmargementFCModal = ({
  apprenantId,
  userId,
  apprenantNom,
  apprenantPrenom,
  creneau,
  mode = "fc",
  dateEmargement,
  extraCreneaux,
  replaceExisting = false,
  required = false,
  onSigned,
  onSkipped,
}: EmargementFCModalProps) => {
  const { toast } = useToast();
  const defaultTypedSignature = `${apprenantPrenom} ${apprenantNom}`.trim();
  const [tab, setTab] = useState<"present" | "absent">("present");
  const [signatureMode, setSignatureMode] = useState<"draw" | "typed">("typed");
  const [signature, setSignature] = useState("");
  const [typedSignature, setTypedSignature] = useState(defaultTypedSignature);
  const [saving, setSaving] = useState(false);
  const [demi] = useState<CreneauKey>(creneau || getCurrentCreneauFromHour());
  const [done, setDone] = useState(false);
  // Identity already confirmed globally via IdentityConfirmModal (with photo) after login.
  // Skip the redundant in-modal identity gate to avoid a double confirmation.
  const [identityConfirmed, setIdentityConfirmed] = useState(true);
  const [confirmPresenceLieu, setConfirmPresenceLieu] = useState(false);
  const effectiveDate = dateEmargement || todayISO();
  const extras = (extraCreneaux || []).filter((c) => c && c !== demi);
  const allCreneaux: CreneauKey[] = [demi, ...extras];
  const isMultiCreneau = extras.length > 0;
  const isRattrapage = effectiveDate !== todayISO();
  const dateLabel = (() => {
    const [y, m, d] = effectiveDate.split("-").map((x) => parseInt(x, 10));
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return dt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  })();

  // Absent state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [justifFile, setJustifFile] = useState<File | null>(null);
  const [motif, setMotif] = useState("");

  useEffect(() => {
    setTypedSignature((current) => current.trim() ? current : defaultTypedSignature);
  }, [defaultTypedSignature]);

  const handleSubmitPresent = async () => {
    const signatureToSave = signature;
    if (!signatureToSave) {
      toast({
        title: "Signature requise",
        description: "Veuillez dessiner votre signature avant de valider.",
        variant: "destructive",
      });
      return;
    }
    if (!confirmPresenceLieu) {
      toast({
        title: "Confirmation requise",
        description: "Vous devez cocher la case attestant votre présence sur le lieu de formation.",
        variant: "destructive",
      });
      return;
    }
    if (!identityConfirmed) {
      toast({
        title: "Identité non confirmée",
        description: "Merci de confirmer votre identité avant de signer.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      // Vérification anti-gribouillage : comparer avec les précédentes signatures dessinées
      if (signatureMode === "draw") {
        try {
          const { data: prev } = await supabase
            .from("emargements_fc")
            .select("signature_data_url")
            .eq("apprenant_id", apprenantId)
            .eq("absent", false)
            .not("signature_data_url", "is", null)
            .order("date_emargement", { ascending: false })
            .limit(8);
          const refs = (prev || [])
            .map((r: { signature_data_url: string | null }) => r.signature_data_url || "")
            .filter((u: string) => u && u.startsWith("data:image"));
          const check = await checkSignatureAgainstReferences(signatureToSave, refs);
          if (!check.ok) {
            toast({
              title: "Signature mal faite",
              description: check.reason || "La signature a été mal faite. Merci de re-signer.",
              variant: "destructive",
            });
            setSignature("");
            setSaving(false);
            return;
          }
        } catch {
          // En cas d'échec de vérification (offline, RLS), on n'empêche pas la signature
        }
      }

      // Formation pratique : matin + après-midi signés en une seule fois.
      for (const c of allCreneaux) {
        await saveEmargement({
          apprenant_id: apprenantId,
          user_id: userId,
          date_emargement: effectiveDate,
          demi_journee: c,
          signature_data_url: signatureToSave,
          absent: false,
          replace_existing: replaceExisting,
          user_agent: navigator.userAgent.slice(0, 500),
          confirme_presence_lieu: confirmPresenceLieu,
          confirme_identite: identityConfirmed,
        });
      }
      toast({
        title: "Émargement validé",
        description: isMultiCreneau
          ? `Signatures ${allCreneaux.map((c) => creneauLabel(c).toLowerCase()).join(" et ")} enregistrées. Bonne formation !`
          : `Signature ${creneauLabel(demi).toLowerCase()} enregistrée. Bonne formation !`,
      });
      setDone(true);
      onSigned?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Impossible d'enregistrer votre signature.";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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

    if (!identityConfirmed) {
      toast({
        title: "Identité non confirmée",
        description: "Merci de confirmer votre identité avant de déclarer une absence.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const docType = `justificatif_absence_${effectiveDate}_${demi}`;
      const titre = `Justificatif d'absence — ${dateLabel} (${creneauLabel(demi)})`;

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

      await saveEmargement({
        apprenant_id: apprenantId,
        user_id: userId,
        date_emargement: effectiveDate,
        demi_journee: demi,
        signature_data_url: null,
        absent: true,
        justificatif_url: justUrl,
        motif_absence: motif.trim() || null,
        user_agent: navigator.userAgent.slice(0, 500),
        confirme_identite: identityConfirmed,
      });

      toast({
        title: "Absence enregistrée",
        description: "Votre justificatif a été transmis au centre.",
      });
      setDone(true);
      onSigned?.();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Impossible d'enregistrer votre absence.";
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (done) return null;

  const formationLabel = mode === "presentiel" ? "formation en présentiel" : "formation continue";

  const handleClose = () => {
    if (required) return;
    setDone(true);
    onSkipped?.();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {creneauIcon(demi)}
            {isRattrapage ? "Rattrapage d'émargement" : "Émargement"} — {creneauLabel(demi)}
          </DialogTitle>
          <DialogDescription>
            Bonjour <strong>{apprenantPrenom} {apprenantNom}</strong>, vous suivez une <strong>{formationLabel}</strong>.
            {isRattrapage
              ? " Un créneau passé n'a pas été émargé. Merci de signer votre présence ou de déclarer une absence avec justificatif."
              : " Merci de signer votre présence ou de déclarer une absence avec justificatif."}
          </DialogDescription>
        </DialogHeader>

        {!identityConfirmed ? (
          <>
            <Alert className="border-4 border-blue-500 bg-blue-50 py-6 px-4 sm:py-8 sm:px-6 shadow-lg rounded-xl">
              <ShieldCheck className="h-10 w-10 sm:h-14 sm:w-14 text-blue-600 mt-1 sm:mt-2" />
              <AlertDescription className="text-blue-900 ml-2 sm:ml-3">
                <div className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
                  Avant de signer, merci de confirmer votre identité.
                </div>
                <div className="text-2xl sm:text-3xl break-words leading-tight">
                  Êtes-vous bien <strong className="text-blue-700">{apprenantPrenom} {apprenantNom}</strong> ?
                </div>
              </AlertDescription>
            </Alert>
            <DialogFooter className="flex-col-reverse sm:flex-row gap-3">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto text-base sm:text-lg py-5 sm:py-6"
                onClick={async () => {
                  toast({
                    title: "Identité incorrecte",
                    description: "Vous allez être déconnecté pour des raisons de sécurité.",
                    variant: "destructive",
                  });
                  try { await supabase.auth.signOut(); } catch { /* noop */ }
                  window.location.href = "/login";
                }}
              >
                <UserX className="w-5 h-5 sm:w-6 sm:h-6 mr-2" /> Non, ce n'est pas moi
              </Button>
              <Button
                size="lg"
                className="w-full sm:flex-1 text-base sm:text-lg py-5 sm:py-6"
                onClick={() => setIdentityConfirmed(true)}
              >
                <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 mr-2" /> Oui, c'est bien moi
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>



        <Alert className={isRattrapage ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"}>
          <AlertTriangle className={`h-4 w-4 ${isRattrapage ? "text-red-600" : "text-amber-600"}`} />
          <AlertDescription className={`text-sm ${isRattrapage ? "text-red-900" : "text-amber-900"}`}>
            {isRattrapage && <><strong>Créneau passé à régulariser.</strong><br /></>}
            Date : <strong>{dateLabel}</strong>
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
            <label className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmPresenceLieu}
                onChange={(e) => setConfirmPresenceLieu(e.target.checked)}
                disabled={saving}
                className="mt-0.5 h-4 w-4 shrink-0 accent-amber-600"
                required
              />
              <span className="text-sm text-amber-900">
                <strong>Je confirme que je suis bien au lieu de formation</strong> pour ce créneau ({creneauLabel(demi)} — {creneauHoraire(demi)}).
              </span>
            </label>
            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
              En signant et en cochant la case, vous attestez sur l'honneur de votre présence effective sur le lieu de formation.
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
          {!required && (
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={saving}
              size="lg"
            >
              <X className="w-4 h-4 mr-2" /> Plus tard
            </Button>
          )}
          {tab === "present" ? (
            <Button
              onClick={handleSubmitPresent}
              disabled={saving || !signature || !confirmPresenceLieu}
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
          </>
        )}
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
