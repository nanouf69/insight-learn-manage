import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Apprenant {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  auth_user_id: string | null;
  modules_autorises: number[] | null;
  date_debut_cours_en_ligne: string | null;
  date_fin_cours_en_ligne: string | null;
  formation_choisie: string | null;
}

interface ConnexionAgg {
  apprenant_id: string;
  active_count: number;
  last_started: string | null;
  last_ended: string | null;
  last_reason: string | null;
}

type Statut = "ok" | "connecte" | "ghost" | "expire" | "attente" | "no_account" | "no_modules";

const STATUT_INFO: Record<Statut, { label: string; color: string; priority: number }> = {
  ghost: { label: "Sessions multiples", color: "bg-orange-500 text-white", priority: 1 },
  no_account: { label: "Pas de compte", color: "bg-destructive text-destructive-foreground", priority: 2 },
  no_modules: { label: "Aucun module", color: "bg-destructive text-destructive-foreground", priority: 3 },
  expire: { label: "Expiré", color: "bg-destructive text-destructive-foreground", priority: 4 },
  attente: { label: "En attente", color: "bg-yellow-500 text-white", priority: 5 },
  connecte: { label: "Connecté", color: "bg-green-600 text-white", priority: 6 },
  ok: { label: "Accès OK", color: "bg-green-600 text-white", priority: 7 },
};

interface Props {
  onOpenApprenant: (id: string) => void;
}

export function DiagnosticAccesGlobal({ onOpenApprenant }: Props) {
  const [loading, setLoading] = useState(true);
  const [apprenants, setApprenants] = useState<Apprenant[]>([]);
  const [aggMap, setAggMap] = useState<Map<string, ConnexionAgg>>(new Map());
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<string>("all");
  const [cleaningId, setCleaningId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    // 1. Apprenants actifs
    const { data: apps, error: e1 } = await supabase
      .from("apprenants")
      .select(
        "id, nom, prenom, email, auth_user_id, modules_autorises, date_debut_cours_en_ligne, date_fin_cours_en_ligne, formation_choisie",
      )
      .is("deleted_at", null)
      .order("nom");
    if (e1) {
      toast.error("Erreur chargement apprenants");
      setLoading(false);
      return;
    }

    // 2. Toutes connexions des 30 derniers jours (limit raisonnable)
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data: conns, error: e2 } = await supabase
      .from("apprenant_connexions")
      .select("apprenant_id, started_at, ended_at, end_reason")
      .gte("started_at", since.toISOString())
      .order("started_at", { ascending: false })
      .limit(5000);
    if (e2) {
      toast.error("Erreur chargement sessions");
    }

    const map = new Map<string, ConnexionAgg>();
    (conns ?? []).forEach((c: any) => {
      const cur = map.get(c.apprenant_id) ?? {
        apprenant_id: c.apprenant_id,
        active_count: 0,
        last_started: null,
        last_ended: null,
        last_reason: null,
      };
      if (!c.ended_at) cur.active_count += 1;
      if (!cur.last_started || c.started_at > cur.last_started) {
        cur.last_started = c.started_at;
        cur.last_ended = c.ended_at;
        cur.last_reason = c.end_reason;
      }
      map.set(c.apprenant_id, cur);
    });

    setApprenants((apps as any) ?? []);
    setAggMap(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const computeStatut = (a: Apprenant, agg?: ConnexionAgg): Statut => {
    const today = new Date();
    if (!a.auth_user_id) return "no_account";
    if (!a.modules_autorises || a.modules_autorises.length === 0) return "no_modules";
    const fin = a.date_fin_cours_en_ligne ? new Date(a.date_fin_cours_en_ligne) : null;
    const debut = a.date_debut_cours_en_ligne ? new Date(a.date_debut_cours_en_ligne) : null;
    if (fin && today > fin) return "expire";
    if (debut && today < debut) return "attente";
    if (agg && agg.active_count > 1) return "ghost";
    if (agg && agg.active_count === 1) return "connecte";
    return "ok";
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apprenants
      .map((a) => {
        const agg = aggMap.get(a.id);
        const statut = computeStatut(a, agg);
        return { a, agg, statut };
      })
      .filter(({ a, statut }) => {
        if (filterStatut !== "all" && statut !== filterStatut) return false;
        if (!q) return true;
        const hay = `${a.nom} ${a.prenom} ${a.email ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((x, y) => {
        const dp = STATUT_INFO[x.statut].priority - STATUT_INFO[y.statut].priority;
        if (dp !== 0) return dp;
        return `${x.a.nom} ${x.a.prenom}`.localeCompare(`${y.a.nom} ${y.a.prenom}`);
      });
  }, [apprenants, aggMap, search, filterStatut]);

  const counts = useMemo(() => {
    const c: Record<Statut, number> = {
      ghost: 0,
      no_account: 0,
      no_modules: 0,
      expire: 0,
      attente: 0,
      connecte: 0,
      ok: 0,
    };
    apprenants.forEach((a) => {
      c[computeStatut(a, aggMap.get(a.id))] += 1;
    });
    return c;
  }, [apprenants, aggMap]);

  const cleanupGhost = async (apprenantId: string) => {
    setCleaningId(apprenantId);
    const { error } = await supabase
      .from("apprenant_connexions")
      .update({
        ended_at: new Date().toISOString(),
        end_reason: "support_cleanup",
      } as any)
      .eq("apprenant_id", apprenantId)
      .is("ended_at", null);
    setCleaningId(null);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Sessions fermées");
      load();
    }
  };

  const cleanupAllGhosts = async () => {
    const ghostIds = rows.filter((r) => r.statut === "ghost").map((r) => r.a.id);
    if (ghostIds.length === 0) return;
    if (
      !confirm(
        `Fermer toutes les sessions multiples pour ${ghostIds.length} apprenant(s) ? Cette action résoudra les boucles de déconnexion en cours.`,
      )
    )
      return;
    const { error } = await supabase
      .from("apprenant_connexions")
      .update({
        ended_at: new Date().toISOString(),
        end_reason: "support_cleanup",
      } as any)
      .in("apprenant_id", ghostIds)
      .is("ended_at", null);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success(`${ghostIds.length} apprenant(s) nettoyé(s)`);
      load();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compteurs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {(Object.keys(STATUT_INFO) as Statut[])
          .sort((a, b) => STATUT_INFO[a].priority - STATUT_INFO[b].priority)
          .map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatut(filterStatut === s ? "all" : s)}
              className={`rounded-lg p-3 text-left transition border-2 ${
                filterStatut === s ? "border-primary" : "border-transparent"
              } ${STATUT_INFO[s].color}`}
            >
              <p className="text-2xl font-bold">{counts[s]}</p>
              <p className="text-xs opacity-95">{STATUT_INFO[s].label}</p>
            </button>
          ))}
      </div>

      {/* Recherche & actions */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher (nom, prénom, email)…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatut} onValueChange={setFilterStatut}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {(Object.keys(STATUT_INFO) as Statut[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUT_INFO[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Rafraîchir
            </Button>
            {counts.ghost > 0 && (
              <Button variant="destructive" size="sm" onClick={cleanupAllGhosts}>
                <AlertTriangle className="w-4 h-4 mr-2" />
                Nettoyer toutes les sessions multiples ({counts.ghost})
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {rows.length} apprenant(s) affiché(s) sur {apprenants.length}
          </p>
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Diagnostic d'accès — tous les apprenants
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-2">Apprenant</th>
                  <th className="py-2 pr-2">Statut</th>
                  <th className="py-2 pr-2">Compte</th>
                  <th className="py-2 pr-2">Modules</th>
                  <th className="py-2 pr-2">Période</th>
                  <th className="py-2 pr-2">Sessions actives</th>
                  <th className="py-2 pr-2">Dernière activité</th>
                  <th className="py-2 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map(({ a, agg, statut }) => {
                  const info = STATUT_INFO[statut];
                  const fin = a.date_fin_cours_en_ligne;
                  const debut = a.date_debut_cours_en_ligne;
                  return (
                    <tr key={a.id} className="hover:bg-muted/30">
                      <td className="py-2 pr-2">
                        <p className="font-medium">
                          {a.nom} {a.prenom}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {a.email || "—"}
                        </p>
                      </td>
                      <td className="py-2 pr-2">
                        <Badge className={info.color}>{info.label}</Badge>
                      </td>
                      <td className="py-2 pr-2">
                        {a.auth_user_id ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                      </td>
                      <td className="py-2 pr-2 text-xs">
                        {a.modules_autorises?.length ?? 0}
                      </td>
                      <td className="py-2 pr-2 text-xs">
                        {debut && fin ? (
                          <>
                            {format(new Date(debut), "dd/MM/yy", { locale: fr })} →{" "}
                            {format(new Date(fin), "dd/MM/yy", { locale: fr })}
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-2">
                        {agg && agg.active_count > 0 ? (
                          <Badge
                            variant={agg.active_count > 1 ? "destructive" : "default"}
                            className={agg.active_count === 1 ? "bg-green-600" : ""}
                          >
                            {agg.active_count}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-xs text-muted-foreground">
                        {agg?.last_started
                          ? format(new Date(agg.last_started), "dd/MM HH:mm", { locale: fr })
                          : "—"}
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <div className="flex justify-end gap-1">
                          {statut === "ghost" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => cleanupGhost(a.id)}
                              disabled={cleaningId === a.id}
                            >
                              {cleaningId === a.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                "Nettoyer"
                              )}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenApprenant(a.id)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Ouvrir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground text-sm">
                      Aucun apprenant ne correspond à ces critères.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
