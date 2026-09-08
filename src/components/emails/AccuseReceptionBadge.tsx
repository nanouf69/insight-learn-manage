import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, CheckCheck, Eye, AlertTriangle } from "lucide-react";

export interface AccuseReception {
  id: string;
  apprenant_id: string | null;
  destinataire: string;
  sujet: string | null;
  statut: string;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  last_opened_at: string | null;
  open_count: number;
  failed_at: string | null;
  erreur: string | null;
}

export const normalizeSujet = (s: string | null | undefined) =>
  (s || "").replace(/^(?:re|fwd|tr|fw)\s*:\s*/gi, "").trim().toLowerCase();

/** Retrouve l'accusé correspondant à un email envoyé (même sujet, envoi le plus proche). */
export function findAccuse(
  accuses: AccuseReception[],
  sujet: string | null | undefined,
  sentAt: string | null | undefined,
): AccuseReception | undefined {
  const key = normalizeSujet(sujet);
  if (!key || !sentAt) return undefined;
  const ts = new Date(sentAt).getTime();
  let best: AccuseReception | undefined;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const a of accuses) {
    if (normalizeSujet(a.sujet) !== key) continue;
    const delta = Math.abs(new Date(a.sent_at).getTime() - ts);
    if (delta < bestDelta && delta <= 30 * 60 * 1000) {
      best = a;
      bestDelta = delta;
    }
  }
  return best;
}

const dt = (v: string | null) => (v ? format(new Date(v), "dd/MM/yyyy HH:mm", { locale: fr }) : "");

export function AccuseReceptionBadge({ accuse }: { accuse?: AccuseReception }) {
  if (!accuse) return null;

  if (accuse.statut === "echec") {
    return (
      <Badge variant="destructive" className="text-[10px] py-0 h-5 gap-1">
        <AlertTriangle className="w-3 h-3" />
        Non délivré{accuse.erreur ? ` — ${accuse.erreur.slice(0, 60)}` : ""}
      </Badge>
    );
  }

  if (accuse.statut === "ouvert" || accuse.opened_at) {
    return (
      <Badge className="text-[10px] py-0 h-5 gap-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border border-emerald-300">
        <Eye className="w-3 h-3" />
        Ouvert le {dt(accuse.opened_at)}
        {accuse.open_count > 1 ? ` (${accuse.open_count}×)` : ""}
      </Badge>
    );
  }

  if (accuse.delivered_at || accuse.statut === "remis") {
    return (
      <Badge className="text-[10px] py-0 h-5 gap-1 bg-blue-100 text-blue-800 hover:bg-blue-100 border border-blue-300">
        <CheckCheck className="w-3 h-3" />
        Bien remis{accuse.delivered_at ? ` le ${dt(accuse.delivered_at)}` : ""}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="text-[10px] py-0 h-5 gap-1">
      <Check className="w-3 h-3" />
      Envoyé — pas encore ouvert
    </Badge>
  );
}
