import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarClock, Phone, Mail, X, RotateCcw } from "lucide-react";
import { getSessionEndMs, getSessionDurationMinutes, getAccessCutoffMs } from "@/lib/reports/session-duration";
import { toast } from "sonner";
import { PRATIQUE_TYPES } from "@/lib/sessionTypes";

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
const LOOKBACK_DAYS = 60;
const DISMISS_KEY = "formations-bientot-terminees-masques";

const loadDismissed = (): string[] => {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};
const MAX_SESSION_MS = 7 * 60 * 60 * 1000;

const HEURES_REQUISES: Record<string, number> = {
  "vtc-e": 60,
  "taxi-e": 90,
  "continue-vtc": 14,
  "continue-taxi": 14,
  "ta-e": 35,
  "va-e": 7,
};

interface Props {
  onNavigateToApprenant?: (id: string) => void;
}

async function fetchAllPaged<T>(builder: () => any): Promise<T[]> {
  const PAGE = 1000;
  let from = 0;
  let all: T[] = [];
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await builder().range(from, from + PAGE - 1);
    if (error) throw error;
    const batch = (data as T[]) || [];
    all = all.concat(batch);
    if (batch.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function isAccueilModule(nom?: string | null): boolean {
  return !!nom && /accueil|liste\s+des\s+modules/i.test(nom);
}

export function FormationsBientotTerminees({ onNavigateToApprenant }: Props) {
  const today = todayISO();
  const endHorizon = useMemo(() => addDays(today, LOOKAHEAD_DAYS), [today]);
  const startHorizon = useMemo(() => addDays(today, -LOOKBACK_DAYS), [today]);
  const [dismissed, setDismissed] = useState<string[]>(() => loadDismissed());

  const persistDismissed = (ids: string[]) => {
    setDismissed(ids);
    try { localStorage.setItem(DISMISS_KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  };

  const dismiss = (id: string) => {
    // Always re-read the latest localStorage value to avoid overwriting concurrent/other-tab changes.
    const latest = loadDismissed();
    if (latest.includes(id)) return;
    const next = [...latest, id];
    persistDismissed(next);
    toast.success("Apprenant masqué", {
      description: "Il ne réapparaîtra plus dans cette liste. Utilisez « Réafficher » si besoin.",
      duration: 2500,
    });
  };

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
        .gte("date_fin_cours_en_ligne", startHorizon)
        .lte("date_fin_cours_en_ligne", endHorizon);
      if (error) throw error;

      const isElearning = (a: any) => {
        const s = `${a.type_apprenant || ""} ${a.formation_choisie || ""}`.toLowerCase();
        return s.includes("learning") || s.includes("elearning") || s.includes("e-learning") || s.includes("en ligne");
      };
      const list = ((apprenants || []) as any[]).filter(isElearning);
      if (list.length === 0) return [];

      // Présentiel : uniquement si la présence est confirmée sur une session de type "pratique"
      const confirmedPresentiel = new Set<string>();
      const lastPresentielByAppr = new Map<string, string>();
      {
        const { data: sa } = await supabase
          .from("session_apprenants")
          .select("apprenant_id, presence_pratique, sessions!inner(type_session, date_debut, date_fin)")
          .in("apprenant_id", list.map((a) => a.id))
          .in("sessions.type_session", PRATIQUE_TYPES);
        ((sa || []) as any[]).forEach((r) => {
          if ((r.presence_pratique || "").toLowerCase() === "present") {
            confirmedPresentiel.add(r.apprenant_id);
            const d = r.sessions?.date_fin || r.sessions?.date_debut;
            if (d) {
              const prev = lastPresentielByAppr.get(r.apprenant_id);
              if (!prev || d > prev) lastPresentielByAppr.set(r.apprenant_id, d);
            }
          }
        });
      }



      // Calcule les heures effectives par apprenant (même règle que le Rapport d'activité)
      const results = await Promise.all(
        list.map(async (a) => {
          try {
            const [conns, mods, exos, quizz] = await Promise.all([
              fetchAllPaged<any>(() =>
                supabase
                  .from("apprenant_connexions" as any)
                  .select("started_at, ended_at, last_seen_at, last_action_at")
                  .eq("apprenant_id", a.id)
              ),
              fetchAllPaged<any>(() =>
                supabase
                  .from("apprenant_module_activites" as any)
                  .select("occurred_at, action_type, module_nom")
                  .eq("apprenant_id", a.id)
              ),
              fetchAllPaged<any>(() =>
                supabase
                  .from("reponses_apprenants")
                  .select("updated_at")
                  .eq("apprenant_id", a.id)
                  .eq("completed", true)
              ),
              fetchAllPaged<any>(() =>
                supabase
                  .from("apprenant_quiz_results" as any)
                  .select("completed_at")
                  .eq("apprenant_id", a.id)
              ),
            ]);

            const actTimestamps: number[] = [
              ...mods
                .filter((m: any) =>
                  (m.action_type === "open_module" || m.action_type === "open_section" || m.action_type === "open_cours") &&
                  !isAccueilModule(m.module_nom)
                )
                .map((m: any) => Date.parse(m.occurred_at)),
              ...exos.map((e: any) => Date.parse(e.updated_at)),
              ...quizz.map((q: any) => Date.parse(q.completed_at)),
            ].filter((t) => !Number.isNaN(t)).sort((x, y) => x - y);

            // Aucune heure/minute comptée après la fin d'accès à la formation
            const cutoffMs = getAccessCutoffMs(a.date_fin_cours_en_ligne);
            const validConns = cutoffMs
              ? conns.filter((c: any) => {
                  const s = Date.parse(c.started_at);
                  return Number.isNaN(s) || s <= cutoffMs;
                })
              : conns;
            const boundedActTimestamps = cutoffMs
              ? actTimestamps.filter((t) => t <= cutoffMs)
              : actTimestamps;

            let totalMs = 0;
            if (boundedActTimestamps.length > 0) {
              for (const c of validConns) {
                const start = Date.parse(c.started_at);
                if (Number.isNaN(start)) continue;
                const end = getSessionEndMs(c as any, cutoffMs);
                if (end <= start) continue;
                // dichotomie : une activité pédagogique doit exister dans la session
                let lo = 0, hi = boundedActTimestamps.length - 1, found = false;
                while (lo <= hi) {
                  const mid = (lo + hi) >> 1;
                  const v = boundedActTimestamps[mid];
                  if (v < start) lo = mid + 1;
                  else if (v > end) hi = mid - 1;
                  else { found = true; break; }
                }
                if (found) totalMs += end - start;
              }
            }

            const done = totalMs / 3600000;
            // Dernier jour de connexion e-learning : uniquement dans les dates de formation.
            // Toute connexion postérieure à la fin d'accès est ignorée (non affichée).
            const connCandidates = [
              ...validConns.map((c: any) => Date.parse(c.ended_at || c.last_seen_at || c.started_at)),
              ...boundedActTimestamps,
            ].filter((t: number) => Number.isFinite(t) && t > 0 && (!cutoffMs || t <= cutoffMs));

            const lastConnexion = connCandidates.length > 0 ? new Date(Math.max(...connCandidates)) : null;

            const lastPresentiel = lastPresentielByAppr.get(a.id) || null;
            const requiredElearning =
              Number(a.heures_elearning) ||
              HEURES_REQUISES[(a.type_apprenant || "").toLowerCase()] ||
              60;
            const requiredPresentiel = Number(a.heures_presentiel) || 0;
            const required =
              Number(a.heures_totales) || requiredElearning + requiredPresentiel;
            const presentiel = confirmedPresentiel.has(a.id) ? requiredPresentiel : 0;
            // Les heures e-learning sont plafonnées au volume prévu (ex. 90h),
            // le présentiel n'est ajouté que s'il est confirmé => pas de 100% sans présentiel.
            const doneCapped = Math.min(done, requiredElearning) + presentiel;
            const percent = required > 0 ? Math.min(100, Math.round((doneCapped / required) * 100)) : 0;
            const remainingDays = daysBetween(today, a.date_fin_cours_en_ligne);
            return { apprenant: a, done, required: requiredElearning, presentiel, percent, remainingDays, lastConnexion, lastPresentiel };
          } catch (err) {
            console.error("[FormationsBientotTerminees] apprenant load error", a.id, err);
            const required = Number(a.heures_elearning) || HEURES_REQUISES[(a.type_apprenant || "").toLowerCase()] || 60;
            return { apprenant: a, done: 0, required, presentiel: confirmedPresentiel.has(a.id) ? Number(a.heures_presentiel) || 0 : 0, percent: 0, remainingDays: daysBetween(today, a.date_fin_cours_en_ligne), lastConnexion: null as Date | null, lastPresentiel: lastPresentielByAppr.get(a.id) || null };
          }

        })
      );

      return results.sort((x, y) => x.remainingDays - y.remainingDays);
    },
  });


  const all = data ?? [];
  const visible = all.filter((r: any) => !dismissed.includes(r.apprenant.id));
  // Sécurité d'affichage : si TOUT a été masqué, on réaffiche quand même la liste
  // (sinon la carte reste vide et l'information devient inaccessible).
  const allHidden = all.length > 0 && visible.length === 0;
  const results = allHidden ? all : visible;
  const hiddenCount = all.length - visible.length;


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
          Accès e-learning terminés depuis moins de {LOOKBACK_DAYS} jours ou se terminant dans les {LOOKAHEAD_DAYS} prochains jours, avec taux de réalisation.
        </p>
        {hiddenCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 self-start text-xs text-muted-foreground"
            onClick={() => {
              persistDismissed([]);
              try { localStorage.removeItem(DISMISS_KEY); } catch { /* ignore */ }
            }}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            {allHidden
              ? `Tout était masqué (${hiddenCount}) — cliquer pour réinitialiser`
              : `Réafficher ${hiddenCount} masquée(s)`}
          </Button>
        )}

      </CardHeader>
      <CardContent className="space-y-2">
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            Aucune formation à afficher.
          </p>
        ) : (
          results.map(({ apprenant: a, done, required, presentiel, percent, remainingDays, lastConnexion, lastPresentiel }) => (
            <div
              key={a.id}
              className={`p-3 rounded-lg border space-y-1.5 cursor-pointer transition-colors ${
                remainingDays < 0
                  ? "bg-muted/40 border-border hover:bg-muted"
                  : "bg-amber-50 border-amber-200 hover:bg-amber-100"
              }`}
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    title="Retirer de la liste"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismiss(a.id);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
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
                <span className={`font-medium ${remainingDays < 0 ? "text-muted-foreground" : "text-amber-800"}`}>
                  Fin le {fmt(a.date_fin_cours_en_ligne)} (
                  {remainingDays === 0
                    ? "aujourd'hui"
                    : remainingDays < 0
                      ? `terminée il y a ${Math.abs(remainingDays)}j`
                      : `dans ${remainingDays}j`}
                  )
                </span>

                <span>
                  {done.toFixed(1)}h / {required}h
                </span>
                <span title="Heures à réaliser en présentiel">
                  Présentiel : {presentiel}h
                </span>
                <span className="font-semibold text-destructive" title="Dernier jour de connexion e-learning">
                  Dernière connexion :{" "}
                  {lastConnexion
                    ? lastConnexion.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" })
                    : "—"}
                </span>
                <span className="font-semibold text-destructive" title="Dernier jour de présentiel confirmé">
                  Dernier présentiel : {lastPresentiel ? fmt(lastPresentiel) : "—"}
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
