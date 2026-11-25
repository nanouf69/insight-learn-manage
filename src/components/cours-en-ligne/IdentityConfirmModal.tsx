import { useEffect, useState } from "react";
import { ShieldCheck, LogOut, UserCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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
export function IdentityConfirmModal({
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
  const photoUrl = photoUrls[photoIndex] ?? null;

  useEffect(() => {
    // Réinitialisation à chaque changement de compte ou fermeture
    setPhotoUrls([]);
    setPhotoIndex(0);
    if (!show || !apprenantId) return;
    let cancelled = false;
    (async () => {
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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl p-5 sm:p-6 max-w-md w-full text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">
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
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={`Photo de ${fullName}`}
                  className="h-full w-full object-cover"
                  onError={() => setPhotoIndex((i) => i + 1)}
                />
              ) : initials ? (
                <span className="text-2xl sm:text-3xl font-bold text-blue-700">
                  {initials}
                </span>
              ) : (
                <User className="h-10 w-10 text-blue-600" />
              )}
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

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="default"
            onClick={onDeny}
            className="flex-1 font-semibold py-4 sm:py-5"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Non, me déconnecter
          </Button>
          <Button
            size="default"
            onClick={onConfirm}
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
