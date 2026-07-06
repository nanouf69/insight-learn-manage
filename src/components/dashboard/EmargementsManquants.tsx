import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PenLine, Phone, Mail, Sun, Moon, ChevronLeft, ChevronRight } from "lucide-react";

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const todayISO = () => isoDate(new Date());

const addDays = (iso: string, delta: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return isoDate(dt);
};

const formatDayLabel = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
};

const currentDemi = (): "matin" | "apres_midi" => (new Date().getHours() < 13 ? "matin" : "apres_midi");

interface Props {
  onNavigateToApprenant?: (id: string) => void;
}

interface ApprenantPresentiel {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  type_apprenant: string | null;
  formation_choisie: string | null;
  date_debut_cours_en_ligne: string | null;
  date_fin_cours_en_ligne: string | null;
}

interface EmargementSigne {
  apprenant_id: string;
  demi_journee: string | null;
  created_at: string | null;
  date_emargement: string | null;
}

const HISTORY_DAYS = 10;

export function EmargementsManquants({ onNavigateToApprenant }: Props) {
  const demi = currentDemi();
  const today = todayISO();
  const [dayOffset, setDayOffset] = useState(0); // 0 = aujourd'hui, 1 = hier, ...
  const selectedDay = useMemo(() => addDays(today, -dayOffset), [today, dayOffset]);
  const startDay = useMemo(() => addDays(today, -(HISTORY_DAYS - 1)), [today]);

  const { data, isLoading } = useQuery({
    queryKey: ["emargements-manquants", today, demi, startDay],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data: allApprenants, error: errA } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, email, telephone, type_apprenant, formation_choisie, date_debut_cours_en_ligne, date_fin_cours_en_ligne")
        .is("deleted_at", null)
        .lte("date_debut_cours_en_ligne", today)
        .gte("date_fin_cours_en_ligne", startDay);

      // Présentiels = tout sauf pure e-learning (suffixe "-e")
      const apprenants = (allApprenants || []).filter((a) => {
        const t = (a.type_apprenant || "").toLowerCase().trim();
        if (!t) return false;
        if (/-e$/.test(t)) return false;
        return true;
      });

      if (errA) throw errA;
      if (!apprenants || apprenants.length === 0) return { manquants: [], signesByDay: {} as Record<string, Array<EmargementSigne & { apprenant: ApprenantPresentiel }>> };

      const ids = apprenants.map((a) => a.id);

      // Signatures demi-journée en cours (pour "manquants" aujourd'hui)
      const { data: signesDemi, error: errS } = await supabase
        .from("emargements_fc")
        .select("apprenant_id")
        .eq("date_emargement", today)
        .eq("demi_journee", demi)
        .in("apprenant_id", ids);

      if (errS) throw errS;
      const signedSet = new Set(((signesDemi || []) as { apprenant_id: string }[]).map((s) => s.apprenant_id));

      // Signatures des 10 derniers jours
      const { data: signesHistorique, error: errJ } = await supabase
        .from("emargements_fc")
        .select("apprenant_id, demi_journee, created_at, date_emargement")
        .gte("date_emargement", startDay)
        .lte("date_emargement", today)
        .in("apprenant_id", ids)
        .order("created_at", { ascending: true });

      if (errJ) throw errJ;

      const apprenantsMap = new Map(apprenants.map((a) => [a.id, a]));
      const signesByDay: Record<string, Array<EmargementSigne & { apprenant: ApprenantPresentiel }>> = {};
      // signedKeys: `${day}|${apprenant_id}|${demi}` present
      const signedKeys = new Set<string>();
      for (const s of (signesHistorique || []) as EmargementSigne[]) {
        const a = apprenantsMap.get(s.apprenant_id);
        if (!a || !s.date_emargement) continue;
        (signesByDay[s.date_emargement] ||= []).push({ ...s, apprenant: a });
        if (s.demi_journee) signedKeys.add(`${s.date_emargement}|${s.apprenant_id}|${s.demi_journee}`);
      }

      // Manquants historiques par jour (matin + après-midi)
      const manquantsByDay: Record<string, Array<{ apprenant: ApprenantPresentiel; demi: "matin" | "apres_midi" }>> = {};
      const nowH = new Date().getHours();
      for (let off = 0; off < HISTORY_DAYS; off++) {
        const day = addDays(today, -off);
        const isToday = off === 0;
        const demis: Array<"matin" | "apres_midi"> = isToday
          ? nowH < 13 ? ["matin"] : ["matin", "apres_midi"]
          : ["matin", "apres_midi"];
        // Skip weekends (samedi=6, dimanche=0)
        const [yy, mm, dd] = day.split("-").map(Number);
        const dow = new Date(yy, mm - 1, dd).getDay();
        if (dow === 0 || dow === 6) continue;
        for (const a of apprenants) {
          if (a.date_debut_cours_en_ligne && a.date_debut_cours_en_ligne > day) continue;
          if (a.date_fin_cours_en_ligne && a.date_fin_cours_en_ligne < day) continue;
          for (const d of demis) {
            if (!signedKeys.has(`${day}|${a.id}|${d}`)) {
              (manquantsByDay[day] ||= []).push({ apprenant: a, demi: d });
            }
          }
        }
      }

      return {
        manquants: apprenants.filter((a) => !signedSet.has(a.id)),
        signesByDay,
        manquantsByDay,
      };
    },
  });

  const manquants = (data?.manquants ?? []) as ApprenantPresentiel[];
  const signesByDay = data?.signesByDay ?? {};
  const manquantsByDay = data?.manquantsByDay ?? {};
  const signesJourSelectionne = signesByDay[selectedDay] ?? [];
  const manquantsJourSelectionne = manquantsByDay[selectedDay] ?? [];



  const getTypeLabel = (a: ApprenantPresentiel) => {
    const s = `${a.type_apprenant || ""} ${a.formation_choisie || ""}`.toLowerCase();
    if (s.includes("taxi")) return "TAXI";
    if (s.includes("vtc")) return "VTC";
    return (a.type_apprenant || "").toUpperCase();
  };

  const demiLabel = demi === "matin" ? "Matin" : "Après-midi";
  const DemiIcon = demi === "matin" ? Sun : Moon;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-muted-foreground" />
            Émargements présentiels manquants
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 opacity-60">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const dayLabel = formatDayLabel(selectedDay);

  const SignesList = () => (
    <div className="mt-3 pt-3 border-t space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Ont signé {dayLabel} ({signesJourSelectionne.length})
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            disabled={dayOffset >= HISTORY_DAYS - 1}
            onClick={() => setDayOffset((v) => Math.min(HISTORY_DAYS - 1, v + 1))}
            title="Jour précédent"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="text-[10px] text-muted-foreground w-16 text-center">
            J-{dayOffset}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            disabled={dayOffset <= 0}
            onClick={() => setDayOffset((v) => Math.max(0, v - 1))}
            title="Jour suivant"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
      {signesJourSelectionne.length === 0 ? (
        <p className="text-xs text-muted-foreground italic px-1">Aucune signature ce jour-là.</p>
      ) : (
        <div className="space-y-1.5">
          {signesJourSelectionne.map((s) => {
            const a = s.apprenant;
            const heure = s.created_at
              ? new Date(s.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
              : "";
            const demiLbl = s.demi_journee === "matin" ? "Matin 09:00-12:30" : s.demi_journee === "apres_midi" ? "A-M 13:30-17:00" : "";
            return (
              <div
                key={`${s.apprenant_id}-${s.demi_journee}-${s.created_at}`}
                className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-emerald-50 border border-emerald-100 cursor-pointer hover:bg-emerald-100 transition-colors"
                onClick={() => onNavigateToApprenant?.(a.id)}
              >
                <p className="text-xs font-medium truncate">
                  {a.prenom} {a.nom}
                </p>
                <div className="flex items-center gap-1.5 shrink-0">
                  {demiLbl && (
                    <span className="text-[10px] text-emerald-700">
                      {demiLbl} {heure}
                    </span>
                  )}
                  <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 bg-white">
                    {getTypeLabel(a)}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="pt-2">
        <p className="text-xs font-medium text-amber-700 mb-1">
          N'ont pas signé {dayLabel} ({manquantsJourSelectionne.length})
        </p>
        {manquantsJourSelectionne.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-1">Aucun manquant ce jour-là.</p>
        ) : (
          <div className="space-y-1.5">
            {manquantsJourSelectionne.map((m, i) => {
              const a = m.apprenant;
              const demiLbl = m.demi === "matin" ? "Matin 09:00-12:30" : "Après-midi 13:30-17:00";
              return (
                <div
                  key={`${a.id}-${m.demi}-${i}`}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-amber-50 border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors"
                  onClick={() => onNavigateToApprenant?.(a.id)}
                >
                  <p className="text-xs font-medium truncate">
                    {a.prenom} {a.nom}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-amber-700">{demiLbl}</span>
                    <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 bg-white">
                      {getTypeLabel(a)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );




  if (manquants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-muted-foreground" />
            Émargements présentiels — {demiLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-2">
            Tous les apprenants ont signé 🎉
          </p>
          <SignesList />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700">
          <DemiIcon className="h-5 w-5" />
          Émargements manquants — {demiLabel}
          <Badge variant="outline" className="ml-2 border-amber-400 text-amber-700 bg-amber-50">
            {manquants.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {manquants.slice(0, 8).map((a) => (
          <div
            key={a.id}
            className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-1 cursor-pointer hover:bg-amber-100 transition-colors"
            onClick={() => onNavigateToApprenant?.(a.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-sm">
                {a.prenom} {a.nom}
              </p>
              <Badge variant="outline" className="text-xs shrink-0">
                {getTypeLabel(a)}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
        ))}
        {manquants.length > 8 && (
          <p className="text-xs text-center text-muted-foreground pt-2">
            Et {manquants.length - 8} autre(s)…
          </p>
        )}
        <SignesList />
      </CardContent>
    </Card>
  );
}
