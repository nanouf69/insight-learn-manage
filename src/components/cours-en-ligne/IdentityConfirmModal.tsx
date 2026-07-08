import { ShieldCheck, LogOut, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IdentityConfirmModalProps {
  show: boolean;
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
 * sinon il est déconnecté. Format visuel volontairement grand.
 */
export function IdentityConfirmModal({
  show,
  prenom,
  nom,
  civilite,
  onConfirm,
  onDeny,
}: IdentityConfirmModalProps) {
  if (!show) return null;

  const salutation =
    civilite === "M."
      ? "Monsieur"
      : civilite === "Mme"
        ? "Madame"
        : "Monsieur / Madame";

  const fullName = `${prenom || ""} ${nom || ""}`.trim();

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 sm:p-8 max-w-lg w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">
            Confirmation d'identité
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Merci de confirmer votre identité avant d'accéder à votre formation.
          </p>
        </div>

        {/* Gros bloc de confirmation identique aux feuilles d'émargement */}
        <div className="border-4 border-blue-500 bg-blue-50 rounded-xl py-6 px-4 sm:py-8 sm:px-6 shadow-lg">
          <div className="flex flex-col items-center gap-3">
            <ShieldCheck className="h-10 w-10 sm:h-14 sm:w-14 text-blue-600" />
            <p className="text-xl sm:text-2xl font-bold text-blue-900">
              Êtes-vous bien
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-blue-950 leading-tight">
              {salutation} {fullName} ?
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={onDeny}
            className="flex-1 font-semibold py-5 sm:py-6"
          >
            <LogOut className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
            Non, me déconnecter
          </Button>
          <Button
            size="lg"
            onClick={onConfirm}
            className="flex-1 font-semibold py-5 sm:py-6"
          >
            <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
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
