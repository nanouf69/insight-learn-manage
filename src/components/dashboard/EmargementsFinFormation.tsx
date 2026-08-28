import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Phone, Mail } from "lucide-react";
import { isPratiqueType } from "@/lib/sessionTypes";

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayISO = () => isoDate(new Date());
const addDays = (iso: string, delta: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return isoDate(dt);
};

interface Props {
  onNavigateToApprenant?: (id: string) => void;
}

type Slot = "matin" | "apres_midi" | "soir_1" | "soir_2";

const LOOKBACK_DAYS = 45;

export function EmargementsFinFormation({ onNavigateToApprenant }: Props) {
  const today = todayISO();
  const startDay = useMemo(() => addDays(today, -LOOKBACK_DAYS), [today]);

  const { data, isLoading } = useQuery({
    queryKey: ["emargements-fin-formation", today],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // 1. Apprenants dont la formation présentielle est terminée dans les 45 derniers jours
      const { data: apprenants, error: errA } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, email, telephone, type_apprenant, formation_choisie, date_debut_cours_en_ligne, date_fin_cours_en_ligne")
        .is("deleted_at", null)
        .lt("date_fin_cours_en_ligne", today)
        .gte("date_fin_cours_en_ligne", startDay);
      if (errA) throw errA;

      const presentiels = (apprenants || []).filter((a) => {
        const t = (a.type_apprenant || "").toLowerCase().trim();
        return t && !/-e$/.test(t);
      });
      if (presentiels.length === 0) return [];

      const ids = presentiels.map((a) => a.id);

      // 2. Sessions théoriques auxquelles ils sont inscrits
      const { data: sessionAppr, error: errSA } = await supabase
        .from("session_apprenants")
        .select("apprenant_id, date_debut, date_fin, date_fin_personnalisee, session:sessions!inner(date_debut, date_fin, type_session, creneaux, heure_debut, nom)")
        .in("apprenant_id", ids);
      if (errSA) throw errSA;

      // 3. Signatures existantes
      const { data: signes, error: errS } = await supabase
        .from("emargements_fc")
        .select("apprenant_id, date_emargement, demi_journee, absent")
        .in("apprenant_id", ids);
      if (errS) throw errS;

      const signedKeys = new Set<string>();
      for (const s of (signes || []) as any[]) {
        if (!s.date_emargement || !s.demi_journee) continue;
        signedKeys.add(`${s.apprenant_id}|${s.date_emargement}|${s.demi_journee}`);
      }

      // 4. Calcul créneaux attendus par apprenant (jours passés seulement)
      const expectedByAppr = new Map<string, Array<{ date: string; slot: Slot }>>();
      const sessionsByAppr = new Map<string, Array<{ start: string; end: string; nom: string; isEvening: boolean }>>();
      for (const sa of (sessionAppr || []) as any[]) {
        const sess = sa.session;
        if (!sess) continue;
        if (sess.type_session && isPratiqueType(sess.type_session)) continue;
        const start = (sa.date_debut && sa.date_debut > sess.date_debut ? sa.date_debut : sess.date_debut) as string;
        const endRaw = sa.date_fin_personnalisee || sa.date_fin || sess.date_fin;
        const end = (endRaw && endRaw < sess.date_fin ? endRaw : sess.date_fin) as string;
        if (!start || !end) continue;

        const creneauxStr = ((sess.creneaux as string[] | null) || []).join(" ").toLowerCase();
        const nomStr = (sess.nom || "").toLowerCase();
        const heureDeb = sess.heure_debut || "";
        const isEvening =
          creneauxStr.includes("soir") ||
          nomStr.includes("soir") ||
          /1[7-9]:|2[0-3]:/.test(creneauxStr) ||
          (heureDeb && parseInt(heureDeb.split(":")[0], 10) >= 17);
        const slots: Slot[] = isEvening ? ["soir_1", "soir_2"] : ["matin", "apres_midi"];

        const sList = sessionsByAppr.get(sa.apprenant_id) || [];
        sList.push({ start, end, nom: sess.nom || "", isEvening });
        sessionsByAppr.set(sa.apprenant_id, sList);

        const to = end < today ? end : addDays(today, -1);
        if (start > to) continue;
        let cursor = start;
        while (cursor <= to) {
          const [yy, mm, dd] = cursor.split("-").map(Number);
          const dow = new Date(yy, mm - 1, dd).getDay();
          if (dow !== 0 && dow !== 6) {
            const list = expectedByAppr.get(sa.apprenant_id) || [];
            for (const slot of slots) list.push({ date: cursor, slot });
            expectedByAppr.set(sa.apprenant_id, list);
          }
          cursor = addDays(cursor, 1);
        }
      }

      // 5. Compter les manquants par apprenant
      const results = presentiels
        .map((a) => {
          const expected = expectedByAppr.get(a.id) || [];
          if (expected.length === 0) return null;
          const missing = expected.filter((e) => !signedKeys.has(`${a.id}|${e.date}|${e.slot}`));
          return {
            apprenant: a,
            expected: expected.length,
            signed: expected.length - missing.length,
            missing: missing.length,
            sessions: sessionsByAppr.get(a.id) || [],
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null && r.missing > 0)

        .sort((a, b) => {
          const aEnd = a.apprenant.date_fin_cours_en_ligne || "";
          const bEnd = b.apprenant.date_fin_cours_en_ligne || "";
          if (aEnd !== bEnd) return bEnd.localeCompare(aEnd);
          return a.missing - b.missing;
        });

      return results;
    },
  });

  const results = data ?? [];

  const getTypeLabel = (a: any) => {
    const s = `${a.type_apprenant || ""} ${a.formation_choisie || ""}`.toLowerCase();
    if (s.includes("taxi")) return "TAXI";
    if (s.includes("vtc")) return "VTC";
    return (a.type_apprenant || "").toUpperCase();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-muted-foreground" />
            Émargements manquants — Fin de formation
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
    <Card className={results.length > 0 ? "border-rose-300" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-rose-700">
          <GraduationCap className="h-5 w-5" />
          Émargements manquants — Fin de formation
          {results.length > 0 && (
            <Badge variant="outline" className="ml-2 border-rose-400 text-rose-700 bg-rose-50">
              {results.length}
            </Badge>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Formations terminées ces {LOOKBACK_DAYS} derniers jours (20 signatures attendues pour 2 semaines).
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            Aucun émargement manquant en fin de formation 🎉
          </p>
        ) : (
          results.map(({ apprenant: a, expected, signed, missing, sessions }) => {
            const fmt = (iso: string) => {
              const [y, m, d] = iso.split("-").map(Number);
              return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
            };
            return (
            <div
              key={a.id}
              className="p-3 rounded-lg bg-rose-50 border border-rose-200 space-y-1 cursor-pointer hover:bg-rose-100 transition-colors"
              onClick={() => onNavigateToApprenant?.(a.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm">
                  {a.prenom} {a.nom}
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className="text-xs border-rose-400 text-rose-700 bg-white">
                    {missing} manquante{missing > 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {getTypeLabel(a)}
                  </Badge>
                </div>
              </div>
              {sessions.length > 0 && (
                <div className="text-xs text-rose-700 space-y-0.5">
                  {sessions.map((s, i) => (
                    <div key={i} className="truncate">
                      📅 {fmt(s.start)} → {fmt(s.end)} {s.isEvening ? "(soir)" : "(journée)"}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{signed}/{expected} signées</span>
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
            );
          })

        )}
      </CardContent>
    </Card>
  );
}
