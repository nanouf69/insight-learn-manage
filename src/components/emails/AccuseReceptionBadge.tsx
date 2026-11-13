import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, CheckCheck, Eye, AlertTriangle } from "lucide-react";
import { etapesSuiviEmail, alerteNonRemis } from "@/lib/suiviEmailEtats";

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

export function AccuseReceptionBadge({ accuse }: { accuse?: AccuseReception & { confirmed_at?: string | null } }) {
  if (!accuse) return null;
  const etapes = etapesSuiviEmail(accuse);
  const alerte = alerteNonRemis(accuse);
  const cls = "text-[10px] py-0 h-5 gap-1";
  return (
    <span className="inline-flex flex-wrap gap-1">
      {etapes.map((e) => {
        switch (e.code) {
          case "accepte":
            return <Badge key={e.code} variant="secondary" className={cls}><Check className="w-3 h-3" />Accepté par le service d'envoi{e.date ? ` le ${dt(e.date)}` : ""}</Badge>;
          case "remis":
            return <Badge key={e.code} variant="secondary" className={cls}><CheckCheck className="w-3 h-3" />Remis le {dt(e.date)}</Badge>;
          case "remis_inconnu":
            return <Badge key={e.code} variant={alerte ? "destructive" : "outline"} className={cls}>{alerte && <AlertTriangle className="w-3 h-3" />}Remise non vérifiée</Badge>;
          case "echec":
            return <Badge key={e.code} variant="destructive" className={cls}><AlertTriangle className="w-3 h-3" />Non délivré{e.erreur ? ` — ${e.erreur.slice(0, 60)}` : ""}</Badge>;
          case "ouvert_indice":
            return <Badge key={e.code} variant="outline" className={cls} title="Indice seulement : certaines messageries ouvrent l'e-mail automatiquement, d'autres bloquent ce suivi."><Eye className="w-3 h-3" />Ouverture détectée le {dt(e.date)}{e.nombre > 1 ? ` (${e.nombre}×)` : ""} — indice</Badge>;
          case "confirme":
            return <Badge key={e.code} className={cls}><CheckCheck className="w-3 h-3" />Réception confirmée par le destinataire le {dt(e.date)}</Badge>;
          case "non_confirme":
            return <Badge key={e.code} variant="outline" className={cls}>Réception non confirmée</Badge>;
        }
      })}
    </span>
  );
}
