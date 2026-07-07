import { UserCheck, LogOut } from "lucide-react";
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
 * Modal de confirmation d'identité affichée juste après la connexion
 * sur la plateforme de cours. L'apprenant doit valider qu'il est bien
 * la personne attendue ; sinon il est déconnecté.
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

  // Fallback civilité : si non renseigné, on affiche "Monsieur / Madame"
  const salutation = civilite === "M."
    ? "Monsieur"
    : civilite === "Mme"
      ? "Madame"
      : "Monsieur / Madame";

  const fullName = `${prenom || ""} ${nom || ""}`.trim();

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <UserCheck className="w-8 h-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">
            Confirmation d'identité
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Merci de confirmer votre identité avant d'accéder à votre formation.
          </p>
        </div>

        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <p className="text-base text-foreground">
            Êtes-vous bien <span className="font-bold">{salutation} {fullName}</span> ?
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={onDeny}
            className="flex-1 font-semibold"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Non, me déconnecter
          </Button>
          <Button
            size="lg"
            onClick={onConfirm}
            className="flex-1 font-semibold"
          >
            <UserCheck className="w-4 h-4 mr-2" />
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
