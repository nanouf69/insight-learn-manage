import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Mail, CheckCheck, Eye, AlertTriangle, RefreshCw } from "lucide-react";
import { AccuseReceptionBadge, type AccuseReception } from "./AccuseReceptionBadge";

const PERIODES = [
  { id: "7", label: "7 jours" },
  { id: "30", label: "30 jours" },
  { id: "90", label: "90 jours" },
  { id: "all", label: "Tout" },
];

const FILTRES = [
  { id: "all", label: "Tous" },
  { id: "ouvert", label: "Ouverts" },
  { id: "remis", label: "Bien remis" },
  { id: "envoye", label: "Sans ouverture" },
  { id: "echec", label: "Échecs" },
];

export default function SuiviEmailsPage() {
  const [periode, setPeriode] = useState("30");
  const [filtre, setFiltre] = useState("all");
  const [recherche, setRecherche] = useState("");

  const { data: accuses = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["email-accuses", periode],
    queryFn: async () => {
      let query = supabase
        .from("email_accuses")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(1000);

      if (periode !== "all") {
        const since = new Date();
        since.setDate(since.getDate() - Number(periode));
        query = query.gte("sent_at", since.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AccuseReception[];
    },
  });

  const stats = useMemo(() => {
    const total = accuses.length;
    const ouverts = accuses.filter((a) => a.opened_at || a.statut === "ouvert").length;
    const remis = accuses.filter((a) => a.delivered_at || a.statut === "remis" || a.opened_at).length;
    const echecs = accuses.filter((a) => a.statut === "echec").length;
    return { total, ouverts, remis, echecs };
  }, [accuses]);

  const lignes = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return accuses.filter((a) => {
      if (filtre === "ouvert" && !(a.opened_at || a.statut === "ouvert")) return false;
      if (filtre === "remis" && !(a.delivered_at || a.statut === "remis")) return false;
      if (filtre === "envoye" && (a.opened_at || a.statut === "echec")) return false;
      if (filtre === "echec" && a.statut !== "echec") return false;
      if (q && !`${a.destinataire} ${a.sujet ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [accuses, filtre, recherche]);

  const tauxOuverture = stats.total ? Math.round((stats.ouverts / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Suivi des emails</h1>
          <p className="text-sm text-muted-foreground">
            Accusés de réception : emails bien remis, ouverts et échecs d'envoi.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Mail className="w-4 h-4" /> Emails envoyés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCheck className="w-4 h-4" /> Bien remis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{stats.remis}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="w-4 h-4" /> Ouverts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">{stats.ouverts}</p>
            <p className="text-xs text-muted-foreground">{tauxOuverture}% des envois</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Échecs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{stats.echecs}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PERIODES.map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant={periode === p.id ? "default" : "outline"}
                onClick={() => setPeriode(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTRES.map((f) => (
              <Badge
                key={f.id}
                variant={filtre === f.id ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setFiltre(f.id)}
              >
                {f.label}
              </Badge>
            ))}
          </div>
          <Input
            placeholder="Rechercher un destinataire ou un objet..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Chargement...</p>
          ) : lignes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Aucun email sur cette période.
            </p>
          ) : (
            <div className="space-y-2">
              {lignes.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border rounded-lg p-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a.sujet || "(sans objet)"}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.destinataire}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <AccuseReceptionBadge accuse={a} />
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(a.sent_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
