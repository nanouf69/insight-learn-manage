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
    let title = "Session terminée";
    let message = "Votre session a été fermée. Veuillez vous reconnecter pour continuer.";
    let instructions: string[] = [];
    let icon = <LogOut className="w-8 h-8 text-destructive" />;
    let bgColor = "bg-destructive/10";

    if (disconnectReason === "max_duration") {
      title = "Durée maximale atteinte";
      message = "Vous êtes connecté depuis plus de 7 heures consécutives.";
      instructions = [
        "Reconnectez-vous simplement pour continuer votre formation",
        "Votre progression a été entièrement sauvegardée",
      ];
    } else if (disconnectReason === "no_response") {
      title = "Inactivité détectée";
      message = "Aucune activité n'a été détectée pendant plus de 35 minutes.";
      instructions = [
        "Reconnectez-vous pour reprendre là où vous en étiez",
        "Pensez à confirmer votre présence quand le message apparaît",
      ];
    } else if (
      disconnectReason === "replaced_by_new_session" ||
      disconnectReason === "no_active_session"
    ) {
      title = "Connexion sur un autre appareil";
      message =
        "Votre compte vient d'être ouvert sur un autre appareil ou onglet. Une seule session active est autorisée à la fois.";
      instructions = [
        "Fermez l'autre fenêtre/onglet/appareil où votre compte est ouvert",
        "Reconnectez-vous ici pour reprendre votre formation",
        "⚠️ N'ouvrez jamais vos cours sur 2 appareils en même temps",
        "Si personne d'autre n'utilise votre compte, changez votre mot de passe",
      ];
      bgColor = "bg-orange-500/10";
    }

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div className={`mx-auto w-16 h-16 rounded-full ${bgColor} flex items-center justify-center`}>
            {icon}
          </div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">{message}</p>

          {instructions.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-left space-y-2">
              <p className="font-semibold text-blue-900 dark:text-blue-200 text-sm">
                ✅ Que faire maintenant ?
              </p>
              <ul className="space-y-1.5 text-sm text-blue-900 dark:text-blue-100">
                {instructions.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-bold shrink-0">{i + 1}.</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button
            size="lg"
            onClick={() => {
              window.location.href = "/login";
            }}
            className="w-full font-semibold"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Se reconnecter
          </Button>

          <p className="text-xs text-muted-foreground">
            Besoin d'aide ?{" "}
            <a href="mailto:contact@ftransport.fr" className="text-primary font-semibold hover:underline">
              contact@ftransport.fr
            </a>
          </p>
        </div>
      </div>
    );
  }


  if (!show) return null;

  const minutes = Math.floor(countdownSeconds / 60);
  const seconds = countdownSeconds % 60;
  const maxSeconds = countdownSeconds > 300 ? 600 : 300;
  const progressPercent = (countdownSeconds / maxSeconds) * 100;
  const isUrgent = countdownSeconds <= 60;

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
