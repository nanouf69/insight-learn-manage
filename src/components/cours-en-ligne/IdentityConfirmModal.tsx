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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!show || !apprenantId) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("documents_inscription")
        .select("url, nom_fichier, statut")
        .eq("apprenant_id", apprenantId)
        .eq("type_document", "photo_identite")
        .order("created_at", { ascending: false })
        .limit(5);
      if (cancelled) return;
      if (error) {
        console.error("[IdentityConfirmModal] photo fetch error:", error);
        return;
      }
      const row = (data || []).find(
        (d: any) =>
          d?.url &&
          !(d.nom_fichier?.toLowerCase().endsWith(".pdf") ||
            d.url.toLowerCase().endsWith(".pdf"))
      );
      if (!row) return;
      let fullUrl = row.url as string;
      if (!fullUrl.startsWith("http")) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        fullUrl = `${supabaseUrl}/storage/v1/object/public/documents-inscription/${fullUrl}`;
      }
      setPhotoUrl(fullUrl);
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

export default IdentityConfirmModal;
