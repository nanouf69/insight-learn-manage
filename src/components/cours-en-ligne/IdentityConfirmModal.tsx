import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, RotateCcw, X, ShieldCheck, LogOut, UserCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { uploadInscriptionDocument } from "@/lib/documentUpload";

interface IdentityConfirmModalProps {
  show: boolean;
  apprenantId?: string;
  prenom: string;
  nom: string;
  civilite?: "M." | "Mme" | null;
  onConfirm: () => void;
  onDeny: () => void;
}

/**
 * Modal de confirmation d'identité affichée à CHAQUE connexion
 * sur la plateforme de cours (présentiel ET e-learning).
 * L'apprenant doit valider qu'il est bien la personne attendue,
 * sinon il est déconnecté. Format compact et lisible.
 */
export function IdentityConfirmModal(props: IdentityConfirmModalProps) {
  // Le démontage libère la caméra et toute photo locale à la fermeture/changement de compte.
  return props.show ? <IdentityConfirmation key={props.apprenantId ?? "sans-dossier"} {...props} /> : null;
}

function IdentityConfirmation({
  show,
  apprenantId,
  prenom,
  nom,
  civilite,
  onConfirm,
  onDeny,
}: IdentityConfirmModalProps) {
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [loadingPhoto, setLoadingPhoto] = useState(true);
  const [storedPhotoLoaded, setStoredPhotoLoaded] = useState(false);
  const [livePhoto, setLivePhoto] = useState<string | null>(null);
  const [livePhotoFile, setLivePhotoFile] = useState<File | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraPending, setCameraPending] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [photoSaved, setPhotoSaved] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequest = useRef(0);
  const captureOperation = useRef<string | null>(null);
  const saveRequest = useRef(0);
  const photoUrl = photoUrls[photoIndex] ?? null;
  const displayedPhoto = livePhoto ?? photoUrl;

  function stopCamera() {
    cameraRequest.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function closeCamera() {
    stopCamera();
    setCameraOpen(false);
    setCameraPending(false);
    setVideoReady(false);
  }

  useEffect(() => () => {
    saveRequest.current += 1;
    stopCamera();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!cameraOpen || !video || !streamRef.current) return;
    const request = cameraRequest.current;
    video.srcObject = streamRef.current;
    void video.play().catch(() => {
      if (request !== cameraRequest.current) return;
      closeCamera();
      setCameraError("L’aperçu de la caméra ne peut pas démarrer. Vous pouvez réessayer ou confirmer sans photo.");
    });
  }, [cameraOpen]);

  useEffect(() => {
    setStoredPhotoLoaded(false);
  }, [photoUrl]);

  async function openCamera() {
    if (loadingPhoto || cameraPending || cameraOpen || savingPhoto) return;
    setCameraError(null);
    setSaveError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("La caméra n’est pas disponible sur ce navigateur ou appareil. Vous pouvez confirmer sans photo.");
      return;
    }
    stopCamera();
    const request = cameraRequest.current;
    setCameraPending(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "user" } },
      });
      if (request !== cameraRequest.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setVideoReady(false);
      setCameraOpen(true);
    } catch (error) {
      if (request !== cameraRequest.current) return;
      const name = error instanceof Error ? error.name : "";
      setCameraError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "L’accès à la caméra a été refusé. Vous pouvez l’autoriser dans votre navigateur ou confirmer sans photo."
          : name === "NotFoundError" || name === "OverconstrainedError"
            ? "Aucune caméra disponible n’a été trouvée. Vous pouvez confirmer sans photo."
            : "Impossible d’ouvrir la caméra. Elle est peut-être utilisée par une autre application. Vous pouvez confirmer sans photo.",
      );
    } finally {
      if (request === cameraRequest.current) setCameraPending(false);
    }
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !videoReady || !video.videoWidth || !video.videoHeight) return;
    try {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1024 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Capture indisponible");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      // La capture reste locale jusqu'au clic explicite sur « Enregistrer la photo ».
      const captured = canvas.toDataURL("image/jpeg", 0.85);
      if (!captured.startsWith("data:image/jpeg")) throw new Error("Capture indisponible");
      setLivePhoto(captured);
      setLivePhotoFile(fichierJpegDepuisDataUrl(captured));
      captureOperation.current = crypto.randomUUID();
      setPhotoSaved(false);
      setSaveError(null);
      closeCamera();
    } catch {
      closeCamera();
      setCameraError("La photo n’a pas pu être prise. Vous pouvez réessayer ou confirmer sans photo.");
    }
  }

  async function saveLivePhoto() {
    const file = livePhotoFile;
    if (!file || savingPhoto || photoSaved) return;
    if (!apprenantId) {
      setSaveError("Le dossier n’est pas disponible. Vous pouvez confirmer sans enregistrer cette photo.");
      return;
    }

    const operationId = captureOperation.current ?? crypto.randomUUID();
    captureOperation.current = operationId;
    const request = ++saveRequest.current;
    setSavingPhoto(true);
    setSaveError(null);
    setCameraError(null);

    try {
      const form = new FormData();
      form.set("file", file);
      form.set("apprenant_id", apprenantId);
      form.set("titre", "Photo d'identité");
      form.set("type_document", "photo_identite");
      const confirmation = await uploadInscriptionDocument(form, operationId);
      if (request !== saveRequest.current) return;

      setPhotoSaved(true);
      setLivePhotoFile(null);
      captureOperation.current = null;

      // Aucune URL publique : le nouveau fichier privé reste affiché localement,
      // et son lien signé sera aussi disponible immédiatement si sa signature aboutit.
      const storagePath = typeof confirmation?.storagePath === "string" ? confirmation.storagePath : "";
      if (storagePath) {
        try {
          const { data, error } = await supabase.storage
            .from("documents-inscription")
            .createSignedUrl(storagePath, 600);
          if (request === saveRequest.current && !error && data?.signedUrl) {
            setPhotoUrls((current) => [data.signedUrl, ...current.filter((url) => url !== data.signedUrl)]);
            setPhotoIndex(0);
          }
        } catch {
          // La photo est déjà enregistrée : l'aperçu local reste affiché.
        }
      }
    } catch (error) {
      if (request !== saveRequest.current) return;
      const detail = error instanceof Error && error.message
        ? error.message
        : "L’enregistrement a été interrompu.";
      setSaveError(`${detail} La capture reste disponible pour réessayer, ou vous pouvez confirmer sans l’enregistrer.`);
    } finally {
      if (request === saveRequest.current) setSavingPhoto(false);
    }
  }

  function finish(callback: () => void) {
    saveRequest.current += 1;
    captureOperation.current = null;
    closeCamera();
    setLivePhoto(null);
    setLivePhotoFile(null);
    setSavingPhoto(false);
    setSaveError(null);
    setPhotoSaved(false);
    callback();
  }

  useEffect(() => {
    // Réinitialisation à chaque changement de compte ou fermeture
    setPhotoUrls([]);
    setPhotoIndex(0);
    setStoredPhotoLoaded(false);
    if (!show || !apprenantId) {
      setLoadingPhoto(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("documents_inscription")
          .select("url, nom_fichier, statut")
          .eq("apprenant_id", apprenantId)
          .eq("type_document", "photo_identite")
          .order("created_at", { ascending: false })
          .limit(10);
        if (cancelled) return;
        if (error) {
          console.error("[IdentityConfirmModal] photo fetch error:", error);
          return;
        }
        const rows = (data || []).filter((d: any) => {
          const statut = String(d?.statut ?? "").toLowerCase();
          if (statut !== "valid" && statut !== "recu") return false;
          const url = String(d?.url ?? "");
          if (!url) return false;
          const isPdf =
            String(d?.nom_fichier ?? "").toLowerCase().endsWith(".pdf") ||
            url.split("?")[0].toLowerCase().endsWith(".pdf");
          return !isPdf;
        });
        const signed: string[] = [];
        for (const row of rows) {
          const path = extraireCheminObjet(String(row.url));
          if (!path) continue;
          try {
            const { data: s, error: e } = await supabase.storage
              .from("documents-inscription")
              .createSignedUrl(path, 600);
            if (!e && s?.signedUrl) signed.push(s.signedUrl);
          } catch {
            /* essayer la suivante */
          }
          if (cancelled) return;
        }
        if (!cancelled) setPhotoUrls(signed);
      } catch {
        // Une erreur de lecture ne doit jamais empêcher la confirmation sans photo.
      } finally {
        if (!cancelled) setLoadingPhoto(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [show, apprenantId]);

  if (!show) return null;

  const salutation =
    civilite === "M."
      ? "Monsieur"
      : civilite === "Mme"
        ? "Madame"
        : "Monsieur / Madame";

  const fullName = `${prenom || ""} ${nom || ""}`.trim();
  const initials = `${(prenom || "").charAt(0)}${(nom || "").charAt(0)}`.toUpperCase();

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="identity-confirm-title" className="bg-card border border-border rounded-xl shadow-2xl p-5 sm:p-6 max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="space-y-1">
          <h2 id="identity-confirm-title" className="text-lg sm:text-xl font-bold text-foreground">
            Confirmation d'identité
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Merci de confirmer votre identité avant d'accéder à votre formation.
          </p>
        </div>

        {/* Bloc de confirmation identique aux feuilles d'émargement, taille réduite */}
        <div className="border-2 sm:border-4 border-blue-500 bg-blue-50 rounded-lg py-4 px-3 sm:py-5 sm:px-4 shadow-md">
          <div className="flex flex-col items-center gap-3">
            <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden border-4 border-blue-500 bg-white flex items-center justify-center shadow-sm">
              {displayedPhoto ? (
                <img
                  key={displayedPhoto}
                  src={displayedPhoto}
                  alt={`Photo de ${fullName}`}
                  className={`h-full w-full object-cover ${!livePhoto && photoUrl && !storedPhotoLoaded ? "hidden" : ""}`}
                  onLoad={() => { if (!livePhoto && photoUrl) setStoredPhotoLoaded(true); }}
                  onError={() => {
                    if (livePhoto) {
                      setLivePhoto(null);
                      setLivePhotoFile(null);
                      captureOperation.current = null;
                      setPhotoSaved(false);
                      setCameraError("La photo ne peut pas être affichée. Vous pouvez réessayer ou confirmer sans photo.");
                    } else if (photoUrl) {
                      setStoredPhotoLoaded(false);
                      setPhotoIndex((i) => i + 1);
                    }
                  }}
                />
              ) : null}
              {(!displayedPhoto || (!livePhoto && photoUrl && !storedPhotoLoaded)) && (initials ? (
                <span className="text-2xl sm:text-3xl font-bold text-blue-700">
                  {initials}
                </span>
              ) : (
                <User className="h-10 w-10 text-blue-600" />
              ))}
            </div>
            <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
            <p className="text-base sm:text-lg font-bold text-blue-900">
              Êtes-vous bien
            </p>
            <p className="text-lg sm:text-xl font-extrabold text-blue-950 leading-tight">
              {salutation} {fullName} ?
            </p>
          </div>
        </div>

        {!loadingPhoto && (
          <div className="space-y-3">
            {cameraOpen ? (
              <>
                <video ref={videoRef} autoPlay muted playsInline aria-label="Aperçu de la caméra" onCanPlay={() => setVideoReady(true)} onError={() => {
                  closeCamera();
                  setCameraError("La caméra ne peut pas afficher d’aperçu. Vous pouvez confirmer sans photo.");
                }} className="w-full aspect-[4/3] max-h-56 rounded-lg bg-muted object-cover" />
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={takePhoto} disabled={!videoReady}><Camera className="mr-2 h-4 w-4" />Prendre la photo</Button>
                  <Button variant="outline" onClick={closeCamera}><X className="mr-2 h-4 w-4" />Fermer la caméra</Button>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap justify-center gap-2">
                {livePhotoFile && !photoSaved && (
                  <Button onClick={saveLivePhoto} disabled={savingPhoto}>
                    {savingPhoto && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {savingPhoto ? "Enregistrement…" : "Enregistrer la photo"}
                  </Button>
                )}
                <Button variant="outline" onClick={openCamera} disabled={cameraPending || savingPhoto}>
                  {livePhotoFile ? <RotateCcw className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
                  {cameraPending
                    ? "Ouverture de la caméra…"
                    : livePhotoFile
                      ? "Reprendre"
                      : photoUrl || livePhoto
                        ? "Changer la photo"
                        : "Prendre une photo en direct"}
                </Button>
                {cameraPending && <Button variant="outline" onClick={closeCamera}>Annuler</Button>}
              </div>
            )}
            {photoSaved && (
              <p role="status" className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
                <CheckCircle2 className="h-4 w-4" /> Photo enregistrée
              </p>
            )}
            {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
            {cameraError && <p role="alert" className="text-sm text-destructive">{cameraError}</p>}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="default"
            onClick={() => finish(onDeny)}
            className="flex-1 font-semibold py-4 sm:py-5"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Non, me déconnecter
          </Button>
          <Button
            size="default"
            onClick={() => finish(onConfirm)}
            className="flex-1 font-semibold py-4 sm:py-5"
          >
            <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Oui, c'est bien moi
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Cette vérification est obligatoire pour des raisons de sécurité et de conformité Qualiopi.
        </p>
      </div>
    </div>
  );
}

function fichierJpegDepuisDataUrl(dataUrl: string): File {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], "photo-identite.jpg", { type: "image/jpeg" });
}

/** Chemin d'objet dans documents-inscription (chemin brut ou ancienne URL HTTP). */
function extraireCheminObjet(valeur: string): string | null {
  const v = valeur.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) return v.replace(/^\/+/, "").replace(/^documents-inscription\//, "");
  const marqueur = "/documents-inscription/";
  const idx = v.indexOf(marqueur);
  if (idx < 0) return null;
  const chemin = v.slice(idx + marqueur.length).split("?")[0];
  try {
    return decodeURIComponent(chemin) || null;
  } catch {
    return chemin || null;
  }
}

export default IdentityConfirmModal;
