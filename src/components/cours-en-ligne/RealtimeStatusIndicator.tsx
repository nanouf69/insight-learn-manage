import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface RealtimeStatusIndicatorProps {
  status: string;
  onReconnect: () => void;
}

/**
 * Indicateur discret du statut de la connexion Supabase Realtime.
 * - SUBSCRIBED → point vert (connecté)
 * - CONNECTING / autres → point orange (en cours)
 * - CHANNEL_ERROR / CLOSED / TIMED_OUT → point rouge + bouton "Reconnecter"
 */
export const RealtimeStatusIndicator = ({ status, onReconnect }: RealtimeStatusIndicatorProps) => {
  const isOk = status === "SUBSCRIBED";
  const isError = status === "CHANNEL_ERROR" || status === "CLOSED" || status === "TIMED_OUT";

  const dotClass = isOk
    ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.7)]"
    : isError
      ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]"
      : "bg-amber-400 animate-pulse";

  const label = isOk
    ? "Synchronisation temps réel active"
    : isError
      ? `Connexion temps réel perdue (${status})`
      : `Connexion temps réel : ${status}`;

  return (
    <div className="flex items-center gap-2" title={label} aria-label={label}>
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotClass}`} />
      {isError && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={onReconnect}
        >
          <RefreshCw className="w-3 h-3" />
          Reconnecter
        </Button>
      )}
    </div>
  );
};
