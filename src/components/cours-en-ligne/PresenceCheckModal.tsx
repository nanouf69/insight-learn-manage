import { useEffect, useState } from "react";
import { AlertTriangle, Clock, UserCheck, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PresenceCheckModalProps {
  show: boolean;
  countdownSeconds: number;
  disconnectReason: string | null;
  onConfirm: () => void;
}

export function PresenceCheckModal({
  show,
  countdownSeconds,
  disconnectReason,
  onConfirm,
}: PresenceCheckModalProps) {
  // Show disconnect reason message
  if (disconnectReason) {
    const message =
      disconnectReason === "max_duration"
        ? "Vous avez atteint la durée maximale de session. Veuillez vous reconnecter pour continuer."
        : "Votre session a été fermée pour inactivité. Veuillez vous reconnecter pour continuer.";

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <LogOut className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Session terminée</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>
          <p className="text-xs text-muted-foreground">Redirection en cours…</p>
        </div>
      </div>
    );
  }

  if (!show) return null;

  const minutes = Math.floor(countdownSeconds / 60);
  const seconds = countdownSeconds % 60;
  const progressPercent = (countdownSeconds / 600) * 100;
  const isUrgent = countdownSeconds <= 120;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      {/* Semi-transparent backdrop - clickable through */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Modal - captures clicks */}
      <div className="relative pointer-events-auto bg-card border border-border rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${isUrgent ? "bg-destructive/10" : "bg-primary/10"}`}>
          {isUrgent ? (
            <AlertTriangle className="w-8 h-8 text-destructive" />
          ) : (
            <UserCheck className="w-8 h-8 text-primary" />
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">
            Êtes-vous toujours en formation ?
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Cliquez sur le bouton ci-dessous pour confirmer votre présence et continuer votre formation.
          </p>
        </div>

        {/* Countdown */}
        <div className="space-y-3">
          <div className={`text-3xl font-mono font-bold tabular-nums ${isUrgent ? "text-destructive" : "text-foreground"}`}>
            <Clock className="inline-block w-5 h-5 mr-2 -mt-1" />
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${isUrgent ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {isUrgent
              ? "⚠️ Temps restant limité — confirmez votre présence maintenant"
              : "Temps restant pour confirmer votre présence"}
          </p>
        </div>

        <Button
          size="lg"
          onClick={onConfirm}
          className="w-full text-base font-semibold py-6"
        >
          <UserCheck className="w-5 h-5 mr-2" />
          Oui, je suis présent
        </Button>
      </div>
    </div>
  );
}
