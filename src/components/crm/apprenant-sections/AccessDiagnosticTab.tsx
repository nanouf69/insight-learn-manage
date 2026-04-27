import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Monitor,
  KeyRound,
  Calendar as CalendarIcon,
  BookOpen,
  Loader2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  apprenant: any;
}

interface Connexion {
  id: string;
  started_at: string;
  ended_at: string | null;
  last_seen_at: string;
  last_action_at: string | null;
  end_reason: string | null;
  source: string;
  user_id: string;
}

const REASON_LABELS: Record<string, string> = {
  manual_close: "Fermeture manuelle",
  max_duration: "Durée maximale (7h) atteinte",
  no_response: "Aucune réponse au contrôle de présence (>35 min)",
  replaced_by_new_session: "Remplacée par une nouvelle session (autre appareil)",
  support_cleanup: "Nettoyage manuel par le support",
  already_closed: "Déjà fermée",
};

export function AccessDiagnosticTab({ apprenant }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connexions, setConnexions] = useState<Connexion[]>([]);
  const [cleaning, setCleaning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("apprenant_connexions")
      .select("id, started_at, ended_at, last_seen_at, last_action_at, end_reason, source, user_id")
      .eq("apprenant_id", apprenant.id)
      .order("started_at", { ascending: false })
      .limit(20);
    if (error) {
      toast.error("Erreur chargement connexions");
    } else {
      setConnexions((data as any) ?? []);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, [apprenant.id]);

  // ===== Diagnostics =====
  const today = useMemo(() => new Date(), []);

  const dateDebut = apprenant.date_debut_cours_en_ligne
    ? new Date(apprenant.date_debut_cours_en_ligne)
    : null;
  const dateFin = apprenant.date_fin_cours_en_ligne
    ? new Date(apprenant.date_fin_cours_en_ligne)
    : null;

  const hasAccount = !!apprenant.auth_user_id;
  const hasEmail = !!apprenant.email;
  const hasModules = Array.isArray(apprenant.modules_autorises) && apprenant.modules_autorises.length > 0;
  const isInPeriod = dateDebut && dateFin && today >= dateDebut && today <= dateFin;
  const periodNotStarted = dateDebut && today < dateDebut;
  const periodEnded = dateFin && today > dateFin;

  const activeConn = connexions.find((c) => !c.ended_at);
  const lastClosedConn = connexions.find((c) => !!c.ended_at);
  const ghostCount = connexions.filter((c) => !c.ended_at).length;

  // Compute the global status
  let globalStatus: { ok: boolean; label: string; reason: string; color: string };
  if (!hasAccount) {
    globalStatus = {
      ok: false,
      label: "BLOQUÉ",
      reason: "Aucun compte cours en ligne créé pour cet apprenant.",
      color: "bg-destructive text-destructive-foreground",
    };
  } else if (!hasModules) {
    globalStatus = {
      ok: false,
      label: "BLOQUÉ",
      reason: "Aucun module n'a été attribué à cet apprenant.",
      color: "bg-destructive text-destructive-foreground",
    };
  } else if (periodNotStarted) {
    globalStatus = {
      ok: false,
      label: "EN ATTENTE",
      reason: `La période d'accès n'a pas encore commencé (début prévu le ${format(dateDebut!, "dd/MM/yyyy", { locale: fr })}).`,
      color: "bg-yellow-500 text-white",
    };
  } else if (periodEnded) {
    globalStatus = {
      ok: false,
      label: "EXPIRÉ",
      reason: `La période d'accès est terminée depuis le ${format(dateFin!, "dd/MM/yyyy", { locale: fr })}.`,
      color: "bg-destructive text-destructive-foreground",
    };
  } else if (ghostCount > 1) {
    globalStatus = {
      ok: false,
      label: "PROBLÈME DÉTECTÉ",
      reason: `${ghostCount} sessions actives simultanées détectées — risque de boucle de déconnexion. Cliquez sur « Nettoyer les sessions ».`,
      color: "bg-orange-500 text-white",
    };
  } else if (activeConn) {
    globalStatus = {
      ok: true,
      label: "CONNECTÉ",
      reason: "Apprenant actuellement connecté à la plateforme.",
      color: "bg-green-600 text-white",
    };
  } else {
    globalStatus = {
      ok: true,
      label: "ACCÈS OK",
      reason: "Toutes les conditions sont remplies. L'apprenant peut se connecter normalement.",
      color: "bg-green-600 text-white",
    };
  }

  const cleanupSessions = async () => {
    if (!confirm("Fermer toutes les sessions actives de cet apprenant ?")) return;
    setCleaning(true);
    const { error } = await supabase
      .from("apprenant_connexions")
      .update({
        ended_at: new Date().toISOString(),
        end_reason: "support_cleanup",
      } as any)
      .eq("apprenant_id", apprenant.id)
      .is("ended_at", null);
    setCleaning(false);
    if (error) {
      toast.error("Erreur lors du nettoyage : " + error.message);
    } else {
      toast.success("Sessions fermées avec succès");
      load();
    }
  };

  const Item = ({ ok, label, value }: { ok: boolean | null; label: string; value: string }) => (
    <div className="flex items-start gap-3 py-2">
      {ok === true && <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />}
      {ok === false && <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />}
      {ok === null && <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground break-words">{value}</p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statut global */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Diagnostic d'accès
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRefreshing(true);
                  load();
                }}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Rafraîchir
              </Button>
              {ghostCount > 0 && (
                <Button variant="destructive" size="sm" onClick={cleanupSessions} disabled={cleaning}>
                  {cleaning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Nettoyer les sessions
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={`rounded-lg p-4 ${globalStatus.color}`}>
            <p className="text-lg font-bold">{globalStatus.label}</p>
            <p className="text-sm opacity-95 mt-1">{globalStatus.reason}</p>
          </div>
        </CardContent>
      </Card>

      {/* Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            Conditions d'accès
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <Item
            ok={hasEmail}
            label="Email renseigné"
            value={apprenant.email || "Aucun email enregistré"}
          />
          <Item
            ok={hasAccount}
            label="Compte cours en ligne"
            value={
              hasAccount
                ? `Créé (auth_user_id: ${apprenant.auth_user_id?.slice(0, 8)}…)`
                : "Aucun compte créé — l'apprenant ne peut pas se connecter"
            }
          />
          <Item
            ok={hasModules}
            label="Modules attribués"
            value={
              hasModules
                ? `${apprenant.modules_autorises.length} module(s) autorisé(s)`
                : "Aucun module attribué — accès vide"
            }
          />
          <Item
            ok={dateDebut ? !periodNotStarted : null}
            label="Date de début d'accès"
            value={
              dateDebut
                ? `${format(dateDebut, "dd/MM/yyyy", { locale: fr })}${
                    periodNotStarted ? " (pas encore commencée)" : ""
                  }`
                : "Non définie"
            }
          />
          <Item
            ok={dateFin ? !periodEnded : null}
            label="Date de fin d'accès"
            value={
              dateFin
                ? `${format(dateFin, "dd/MM/yyyy", { locale: fr })}${periodEnded ? " (expirée)" : ""}`
                : "Non définie"
            }
          />
        </CardContent>
      </Card>

      {/* Session courante */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Session courante
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeConn ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-600">
                  ACTIVE
                </Badge>
                <span className="text-muted-foreground">Source : {activeConn.source}</span>
              </div>
              <p>
                <strong>Démarrée :</strong>{" "}
                {format(new Date(activeConn.started_at), "dd/MM/yyyy HH:mm:ss", { locale: fr })}
              </p>
              <p>
                <strong>Dernière activité :</strong>{" "}
                {format(new Date(activeConn.last_seen_at), "dd/MM/yyyy HH:mm:ss", { locale: fr })}
              </p>
              {ghostCount > 1 && (
                <div className="mt-3 p-3 rounded bg-orange-100 dark:bg-orange-950 border border-orange-300 text-orange-900 dark:text-orange-200 text-xs">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  <strong>{ghostCount} sessions ouvertes en parallèle.</strong> Cela provoque
                  généralement la déconnexion en boucle. Cliquez sur « Nettoyer les sessions » en
                  haut à droite.
                </div>
              )}
            </div>
          ) : lastClosedConn ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">DÉCONNECTÉ</Badge>
              </div>
              <p>
                <strong>Dernière session :</strong>{" "}
                {format(new Date(lastClosedConn.started_at), "dd/MM/yyyy HH:mm", { locale: fr })} →{" "}
                {format(new Date(lastClosedConn.ended_at!), "HH:mm", { locale: fr })}
              </p>
              <p>
                <strong>Raison de fermeture :</strong>{" "}
                <span className="text-muted-foreground">
                  {REASON_LABELS[lastClosedConn.end_reason || ""] ||
                    lastClosedConn.end_reason ||
                    "Inconnue"}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune connexion enregistrée pour cet apprenant.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Historique des 20 dernières connexions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Historique récent (20 dernières)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connexions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune connexion enregistrée.</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {connexions.map((c) => {
                const duration = c.ended_at
                  ? Math.round(
                      (new Date(c.ended_at).getTime() - new Date(c.started_at).getTime()) / 60000,
                    )
                  : null;
                return (
                  <div
                    key={c.id}
                    className="flex items-start justify-between gap-2 py-2 border-b last:border-b-0 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        {format(new Date(c.started_at), "dd/MM/yyyy HH:mm:ss", { locale: fr })}
                        {duration !== null && (
                          <span className="text-muted-foreground"> ({duration} min)</span>
                        )}
                      </p>
                      <p className="text-muted-foreground">
                        {c.ended_at
                          ? REASON_LABELS[c.end_reason || ""] || c.end_reason || "Fermée"
                          : "En cours"}
                      </p>
                    </div>
                    <Badge variant={c.ended_at ? "outline" : "default"} className="shrink-0">
                      {c.ended_at ? "Fermée" : "Active"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
