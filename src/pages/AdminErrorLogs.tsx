import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Search } from "lucide-react";

type ErrorLog = {
  id: string;
  created_at: string;
  last_seen_at: string;
  level: string;
  source: string;
  message: string;
  stack: string | null;
  component_stack: string | null;
  url: string | null;
  route: string | null;
  user_agent: string | null;
  user_id: string | null;
  user_email: string | null;
  context: Record<string, unknown> | null;
  count: number;
  resolved: boolean;
  fingerprint: string | null;
};

export default function AdminErrorLogs() {
  const { profile, loading } = useAuth();
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const isAdmin = profile?.role === "admin";

  const load = async () => {
    setFetching(true);
    let q = supabase
      .from("error_logs" as never)
      .select("*")
      .order("last_seen_at", { ascending: false })
      .limit(500);
    if (!showResolved) q = q.eq("resolved" as never, false as never);
    const { data, error } = await q;
    if (error) {
      toast.error("Impossible de charger les erreurs : " + error.message);
    } else {
      setLogs((data as unknown as ErrorLog[]) ?? []);
    }
    setFetching(false);
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, showResolved]);

  const toggleResolved = async (log: ErrorLog) => {
    const { error } = await supabase
      .from("error_logs" as never)
      .update({
        resolved: !log.resolved,
        resolved_at: !log.resolved ? new Date().toISOString() : null,
      } as never)
      .eq("id" as never, log.id as never);
    if (error) return toast.error(error.message);
    toast.success(!log.resolved ? "Marquée comme résolue" : "Réouverte");
    load();
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const s = search.toLowerCase();
    return logs.filter(
      (l) =>
        l.message.toLowerCase().includes(s) ||
        (l.route ?? "").toLowerCase().includes(s) ||
        (l.user_email ?? "").toLowerCase().includes(s) ||
        (l.source ?? "").toLowerCase().includes(s),
    );
  }, [logs, search]);

  const stats = useMemo(() => {
    const last24h = logs.filter((l) => Date.now() - new Date(l.last_seen_at).getTime() < 86_400_000);
    const totalCount = last24h.reduce((sum, l) => sum + (l.count || 1), 0);
    const usersAffected = new Set(
      last24h.filter((l) => l.user_email).map((l) => l.user_email),
    ).size;
    return {
      uniqueErrors: last24h.length,
      totalCount,
      usersAffected,
    };
  }, [logs]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Monitoring d'erreurs</h1>
          <p className="text-sm text-muted-foreground">
            Toutes les erreurs remontées automatiquement par l'application.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowResolved((v) => !v)}>
            {showResolved ? "Masquer résolues" : "Afficher résolues"}
          </Button>
          <Button variant="outline" onClick={load} disabled={fetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${fetching ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Erreurs uniques (24h)</div>
          <div className="text-2xl font-bold">{stats.uniqueErrors}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Occurrences totales (24h)</div>
          <div className="text-2xl font-bold">{stats.totalCount}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-xs text-muted-foreground">Utilisateurs impactés (24h)</div>
          <div className="text-2xl font-bold">{stats.usersAffected}</div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher (message, route, email...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {fetching && logs.length === 0 ? (
        <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground border rounded-lg">
          🎉 Aucune erreur {showResolved ? "" : "non résolue"} pour l'instant.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => (
            <div
              key={log.id}
              className={`border rounded-lg p-4 ${log.resolved ? "opacity-60 bg-muted/30" : "bg-card"}`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant={log.level === "error" ? "destructive" : "secondary"}>
                      {log.level}
                    </Badge>
                    <Badge variant="outline">{log.source}</Badge>
                    {log.count > 1 && <Badge variant="secondary">×{log.count}</Badge>}
                    {log.route && (
                      <span className="text-xs text-muted-foreground font-mono">{log.route}</span>
                    )}
                  </div>
                  <div className="font-medium text-sm break-words">{log.message}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Dernière : {new Date(log.last_seen_at).toLocaleString("fr-FR")}
                    {log.user_email && <> · {log.user_email}</>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                    {expanded === log.id ? "Réduire" : "Détails"}
                  </Button>
                  <Button
                    size="sm"
                    variant={log.resolved ? "outline" : "default"}
                    onClick={() => toggleResolved(log)}
                  >
                    {log.resolved ? <XCircle className="h-4 w-4 mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                    {log.resolved ? "Rouvrir" : "Résoudre"}
                  </Button>
                </div>
              </div>

              {expanded === log.id && (
                <div className="mt-4 space-y-3 text-xs">
                  {log.stack && (
                    <div>
                      <div className="font-semibold mb-1">Stack :</div>
                      <pre className="bg-muted p-2 rounded overflow-auto max-h-48 whitespace-pre-wrap">{log.stack}</pre>
                    </div>
                  )}
                  {log.component_stack && (
                    <div>
                      <div className="font-semibold mb-1">Composant :</div>
                      <pre className="bg-muted p-2 rounded overflow-auto max-h-48 whitespace-pre-wrap">{log.component_stack}</pre>
                    </div>
                  )}
                  {log.context && (
                    <div>
                      <div className="font-semibold mb-1">Contexte :</div>
                      <pre className="bg-muted p-2 rounded overflow-auto max-h-48">{JSON.stringify(log.context, null, 2)}</pre>
                    </div>
                  )}
                  <div className="text-muted-foreground">
                    URL : {log.url}<br />
                    UA : {log.user_agent}<br />
                    Fingerprint : <code>{log.fingerprint}</code>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
