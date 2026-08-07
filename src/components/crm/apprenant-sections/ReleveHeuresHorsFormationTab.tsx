import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Globe, MapPin } from "lucide-react";
import { computePresenceHours, formatPresenceHours, isEveningTrainingValue, isFormationContinueValue } from "@/lib/emargementHours";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const MAX_SESSION_MS = 12 * 60 * 60 * 1000;

type Props = { apprenant: any };

type ConnexionRow = {
  apprenant_id: string;
  started_at: string;
  ended_at: string | null;
  last_seen_at: string | null;
};

type SessionInfo = {
  id: string;
  nom: string | null;
  date_debut: string;
  date_fin: string;
  type_session: string | null;
  lieu: string | null;
};

type ConnexionDetail = {
  start: Date;
  end: Date;
  durationHours: number;
};

type SessionReport = {
  session: SessionInfo;
  totalHours: number;
  presentielHours: number;
  isPratique: boolean;
  connexions: ConnexionDetail[];
};

export function ReleveHeuresHorsFormationTab({ apprenant }: Props) {
  const apprenantId = apprenant?.id;

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ["apprenant-sessions", apprenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_apprenants")
        .select("session_id, sessions:session_id(id, nom, date_debut, date_fin, type_session, lieu)")
        .eq("apprenant_id", apprenantId);
      if (error) throw error;
      return (data || [])
        .map((r: any) => r.sessions)
        .filter(Boolean) as SessionInfo[];
    },
    enabled: !!apprenantId,
  });

  const { data: connexions = [], isLoading: loadingConn } = useQuery({
    queryKey: ["apprenant-connexions-all", apprenantId],
    queryFn: async () => {
      const PAGE = 1000;
      let from = 0;
      const all: ConnexionRow[] = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from("apprenant_connexions")
          .select("apprenant_id, started_at, ended_at, last_seen_at")
          .eq("apprenant_id", apprenantId)
          .order("started_at", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const rows = (data || []) as ConnexionRow[];
        all.push(...rows);
        if (rows.length < PAGE) break;
        from += PAGE;
      }
      return all;
    },
    enabled: !!apprenantId,
  });

  const { data: emargements = [] } = useQuery({
    queryKey: ["apprenant-emargements-all", apprenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emargements_fc")
        .select("apprenant_id, date_emargement, demi_journee, absent")
        .eq("apprenant_id", apprenantId);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!apprenantId,
  });

  const isVTC = String(apprenant?.type_apprenant || "").toLowerCase().startsWith("vtc");

  const reports: SessionReport[] = useMemo(() => {
    if (!sessions.length) return [];
    return sessions
      .slice()
      .sort((a, b) => (b.date_debut || "").localeCompare(a.date_debut || ""))
      .map((session) => {
        const dStart = String(session.date_debut || "").slice(0, 10);
        const dEnd = String(session.date_fin || "").slice(0, 10);
        // Pour les VTC : on stoppe le décompte 2 jours après la date de fin de formation
        let dCutoff: string | null = null;
        if (isVTC && dEnd) {
          const d = new Date(dEnd);
          d.setDate(d.getDate() + 2);
          dCutoff = d.toISOString().slice(0, 10);
        }
        const details: ConnexionDetail[] = [];
        for (const row of connexions) {
          if (!row.started_at) continue;
          const day = String(row.started_at).slice(0, 10);
          // Hors période de formation
          if (dStart && dEnd && day >= dStart && day <= dEnd) continue;
          // VTC : ignorer les connexions plus de 2 jours après la fin
          if (dCutoff && day > dCutoff) continue;
          const start = new Date(row.started_at);
          const rawEnd = new Date(row.ended_at || row.last_seen_at || row.started_at);
          const endMs = Math.min(rawEnd.getTime(), start.getTime() + MAX_SESSION_MS);
          const end = new Date(endMs);
          const hours = Math.max(0, (endMs - start.getTime()) / 3600000);
          if (hours <= 0) continue;
          details.push({ start, end, durationHours: hours });
        }
        details.sort((a, b) => a.start.getTime() - b.start.getTime());
        const totalHours = details.reduce((s, d) => s + d.durationHours, 0);
        const sessTypeRaw = String(session.type_session || "");
        const sessNomRaw = String(session.nom || "");
        const isPratique = /pratique/i.test(sessTypeRaw) || /pratique/i.test(sessNomRaw);
        const isEvening = isEveningTrainingValue(sessTypeRaw, sessNomRaw);
        const presentielHours = computePresenceHours(emargements as any, {
          isEvening,
          isFormationContinue: isFormationContinueValue(sessTypeRaw, sessNomRaw),
          dateStart: dStart || null,
          dateEnd: dEnd || null,
        });

        return { session, totalHours, presentielHours, isPratique, connexions: details };
      });
  }, [sessions, connexions, emargements, isVTC]);


  const totalGlobal = reports.reduce((s, r) => s + r.totalHours, 0);

  const downloadCSV = () => {
    const rows: string[] = [];
    rows.push(
      [
        "Apprenant",
        "Session",
        "Type",
        "Période formation",
        "Date connexion",
        "Heure début",
        "Heure fin",
        "Durée (h)",
      ]
        .map(csvEscape)
        .join(";"),
    );
    const name = `${apprenant?.prenom || ""} ${apprenant?.nom || ""}`.trim();
    for (const r of reports) {
      const sLabel = r.session.nom || `Session du ${formatDate(r.session.date_debut)}`;
      const periode = `${formatDate(r.session.date_debut)} → ${formatDate(r.session.date_fin)}`;
      if (r.connexions.length === 0) {
        rows.push(
          [name, sLabel, r.session.type_session || "", periode, "—", "—", "—", "0"]
            .map(csvEscape)
            .join(";"),
        );
        continue;
      }
      for (const c of r.connexions) {
        rows.push(
          [
            name,
            sLabel,
            r.session.type_session || "",
            periode,
            format(c.start, "dd/MM/yyyy", { locale: fr }),
            format(c.start, "HH:mm"),
            format(c.end, "HH:mm"),
            c.durationHours.toFixed(2).replace(".", ","),
          ]
            .map(csvEscape)
            .join(";"),
        );
      }
      rows.push(
        [name, sLabel, "", "TOTAL SESSION", "", "", "", r.totalHours.toFixed(2).replace(".", ",")]
          .map(csvEscape)
          .join(";"),
      );
    }
    rows.push([name, "", "", "TOTAL GLOBAL", "", "", "", totalGlobal.toFixed(2).replace(".", ",")].map(csvEscape).join(";"));
    const blob = new Blob(["\ufeff" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `releve-heures-e-learning-${(apprenant?.nom || "apprenant").toLowerCase()}-${(apprenant?.prenom || "").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loading = loadingSessions || loadingConn;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Relevé des heures e-learning
        </CardTitle>
        <Button onClick={downloadCSV} disabled={loading || reports.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Télécharger CSV
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement…
          </div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune session pour cet apprenant.</p>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Total e-learning (hors présentiel) :</span>
              <Badge variant="secondary" className="text-base">
                {formatPresenceHours(totalGlobal)}
              </Badge>
              <span className="text-muted-foreground">Total présentiel (émargements signés) :</span>
              <Badge variant="secondary" className="text-base">
                {formatPresenceHours(reports.reduce((s, r) => s + r.presentielHours, 0))}
              </Badge>
            </div>

            {reports.map((r) => (
              <div key={r.session.id} className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">
                      {r.session.nom || `Session du ${formatDate(r.session.date_debut)}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(r.session.date_debut)} → {formatDate(r.session.date_fin)}
                      {r.session.type_session ? ` • ${r.session.type_session}` : ""}
                      {r.session.lieu ? ` • ${r.session.lieu}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50">
                      <MapPin className="w-3 h-3 mr-1" />
                      Présentiel : {formatPresenceHours(r.presentielHours)}
                    </Badge>
                    <Badge variant="outline">
                      <Globe className="w-3 h-3 mr-1" />
                      E-learning : {formatPresenceHours(r.totalHours)}
                    </Badge>
                  </div>

                </div>
                {r.connexions.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    Aucune connexion enregistrée.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground bg-background">
                      <tr>
                        <th className="text-left px-4 py-2">Date</th>
                        <th className="text-left px-4 py-2">Début</th>
                        <th className="text-left px-4 py-2">Fin</th>
                        <th className="text-right px-4 py-2">Durée</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.connexions.map((c, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-4 py-2">{format(c.start, "EEEE dd/MM/yyyy", { locale: fr })}</td>
                          <td className="px-4 py-2">{format(c.start, "HH:mm")}</td>
                          <td className="px-4 py-2">{format(c.end, "HH:mm")}</td>
                          <td className="px-4 py-2 text-right font-medium">
                            {formatPresenceHours(c.durationHours)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatDate(d?: string | null) {
  if (!d) return "—";
  try {
    return format(new Date(d), "dd/MM/yyyy", { locale: fr });
  } catch {
    return String(d);
  }
}

function csvEscape(v: string) {
  const s = String(v ?? "");
  if (/[";\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default ReleveHeuresHorsFormationTab;
