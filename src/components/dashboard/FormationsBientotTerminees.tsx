import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, Phone, Mail } from "lucide-react";

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayISO = () => isoDate(new Date());
const addDays = (iso: string, delta: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return isoDate(dt);
};
const daysBetween = (fromIso: string, toIso: string) => {
  const [y1, m1, d1] = fromIso.split("-").map(Number);
  const [y2, m2, d2] = toIso.split("-").map(Number);
  const a = new Date(y1, m1 - 1, d1).getTime();
  const b = new Date(y2, m2 - 1, d2).getTime();
  return Math.round((b - a) / 86400000);
};

const LOOKAHEAD_DAYS = 30;
const MAX_SESSION_MS = 12 * 60 * 60 * 1000;

interface Props {
  onNavigateToApprenant?: (id: string) => void;
}

export function FormationsBientotTerminees({ onNavigateToApprenant }: Props) {
  const today = todayISO();
  const endHorizon = useMemo(() => addDays(today, LOOKAHEAD_DAYS), [today]);

  const { data, isLoading } = useQuery({
    queryKey: ["formations-bientot-terminees", today],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data: apprenants, error } = await supabase
        .from("apprenants")
        .select(
          "id, nom, prenom, email, telephone, type_apprenant, formation_choisie, date_fin_cours_en_ligne, heures_totales, heures_elearning, heures_presentiel"
        )
        .is("deleted_at", null)
        .gte("date_fin_cours_en_ligne", today)
        .lte("date_fin_cours_en_ligne", endHorizon);
      if (error) throw error;

      const isElearning = (a: any) => {
        const s = `${a.type_apprenant || ""} ${a.formation_choisie || ""}`.toLowerCase();
        return s.includes("learning") || s.includes("elearning") || s.includes("e-learning") || s.includes("en ligne");
      };
      const list = ((apprenants || []) as any[]).filter(isElearning);
      if (list.length === 0) return [];

      const ids = list.map((a) => a.id);

      // Récupère toutes les connexions (paginé)
      const durations = new Map<string, number>(); // apprenant_id -> hours
      const PAGE = 1000;
      let from = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data: cx, error: e2 } = await supabase
          .from("apprenant_connexions")
          .select("apprenant_id, started_at, ended_at, last_seen_at")
          .in("apprenant_id", ids)
          .range(from, from + PAGE - 1);
        if (e2) throw e2;
        const rows = (cx || []) as any[];
        for (const row of rows) {
          if (!row.started_at) continue;
          const start = new Date(row.started_at).getTime();
          const rawEnd = new Date(row.ended_at || row.last_seen_at || row.started_at).getTime();
          const end = Math.min(rawEnd, start + MAX_SESSION_MS);
          const hours = Math.max(0, (end - start) / 3600000);
          durations.set(row.apprenant_id, (durations.get(row.apprenant_id) || 0) + hours);
        }
        if (rows.length < PAGE) break;
        from += PAGE;
      }

      return list
        .map((a) => {
          const done = durations.get(a.id) || 0;
          const required =
            Number(a.heures_totales) ||
            Number(a.heures_elearning) ||
            66;
          const percent = Math.min(100, Math.round((done / required) * 100));
          const remainingDays = daysBetween(today, a.date_fin_cours_en_ligne);
          return { apprenant: a, done, required, percent, remainingDays };
        })
        .sort((x, y) => x.remainingDays - y.remainingDays);
    },
  });

  const results = data ?? [];

  const getTypeLabel = (a: any) => {
    const s = `${a.type_apprenant || ""} ${a.formation_choisie || ""}`.toLowerCase();
    if (s.includes("taxi")) return "TAXI";
    if (s.includes("vtc")) return "VTC";
    return (a.type_apprenant || "").toUpperCase();
  };

  const percentColor = (p: number) =>
    p >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-300"
    : p >= 50 ? "text-amber-700 bg-amber-50 border-amber-300"
    : "text-rose-700 bg-rose-50 border-rose-300";

  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
            Formations bientôt terminées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 opacity-60">
            {[1, 2].map((i) => <div key={i} className="h-14 bg-muted rounded-lg" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={results.length > 0 ? "border-amber-300" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700">
          <CalendarClock className="h-5 w-5" />
          Formations bientôt terminées
          {results.length > 0 && (
            <Badge variant="outline" className="ml-2 border-amber-400 text-amber-700 bg-amber-50">
              {results.length}
            </Badge>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Accès e-learning se terminant dans les {LOOKAHEAD_DAYS} prochains jours, avec taux de réalisation.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            Aucune formation ne se termine dans les {LOOKAHEAD_DAYS} prochains jours.
          </p>
        ) : (
          results.map(({ apprenant: a, done, required, percent, remainingDays }) => (
            <div
              key={a.id}
              className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-1.5 cursor-pointer hover:bg-amber-100 transition-colors"
              onClick={() => onNavigateToApprenant?.(a.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm">
                  {a.prenom} {a.nom}
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className={`text-xs ${percentColor(percent)}`}>
                    {percent}%
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getTypeLabel(a)}
                  </Badge>
                </div>
              </div>
              <div className="w-full h-1.5 bg-white rounded-full overflow-hidden border border-amber-200">
                <div
                  className={
                    percent >= 80 ? "h-full bg-emerald-500"
                    : percent >= 50 ? "h-full bg-amber-500"
                    : "h-full bg-rose-500"
                  }
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="font-medium text-amber-800">
                  Fin le {fmt(a.date_fin_cours_en_ligne)} ({remainingDays === 0 ? "aujourd'hui" : `dans ${remainingDays}j`})
                </span>
                <span>
                  {done.toFixed(1)}h / {required}h
                </span>
                {a.telephone && (
                  <a
                    href={`tel:${a.telephone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    <Phone className="h-3 w-3" />
                    {a.telephone}
                  </a>
                )}
                {a.email && (
                  <a
                    href={`mailto:${a.email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 hover:text-foreground truncate"
                  >
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{a.email}</span>
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
