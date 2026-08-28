import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PenLine, Phone, Mail, Sun, Moon, ChevronLeft, ChevronRight } from "lucide-react";
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

      // Apprenants prévus en formation par jour (via session_apprenants + sessions théoriques)
      const { data: sessionAppr, error: errSA } = await supabase
        .from("session_apprenants")
        .select("apprenant_id, date_debut, date_fin, date_fin_personnalisee, session:sessions!inner(date_debut, date_fin, type_session, creneaux, heure_debut, nom)")
        .in("apprenant_id", ids);

      if (errSA) throw errSA;

      type Slot = "matin" | "apres_midi" | "soir_1" | "soir_2";
      // scheduledByDay: day -> apprenant_id -> Set of expected slots
      const scheduledByDay: Record<string, Map<string, Set<Slot>>> = {};
      for (const sa of (sessionAppr || []) as any[]) {
        const sess = sa.session;
        if (!sess) continue;
        if (sess.type_session && isPratiqueType(sess.type_session)) continue;
        const start = (sa.date_debut && sa.date_debut > sess.date_debut ? sa.date_debut : sess.date_debut) as string;
        const endRaw = sa.date_fin_personnalisee || sa.date_fin || sess.date_fin;
        const end = (endRaw && endRaw < sess.date_fin ? endRaw : sess.date_fin) as string;
        if (!start || !end) continue;

        // Détection soir
        const creneauxStr = ((sess.creneaux as string[] | null) || []).join(" ").toLowerCase();
        const nomStr = (sess.nom || "").toLowerCase();
        const heureDeb = sess.heure_debut || "";
        const isEvening =
          creneauxStr.includes("soir") ||
          nomStr.includes("soir") ||
          /1[7-9]:|2[0-3]:/.test(creneauxStr) ||
          (heureDeb && parseInt(heureDeb.split(":")[0], 10) >= 17);
        const slots: Slot[] = isEvening ? ["soir_1", "soir_2"] : ["matin", "apres_midi"];

        const from = start > startDay ? start : startDay;
        const to = end < today ? end : today;
        if (from > to) continue;
        let cursor = from;
        while (cursor <= to) {
          const map = (scheduledByDay[cursor] ||= new Map());
          const set = map.get(sa.apprenant_id) || new Set<Slot>();
          for (const s of slots) set.add(s);
          map.set(sa.apprenant_id, set);
          cursor = addDays(cursor, 1);
        }
      }

      const apprenantsMap = new Map(apprenants.map((a) => [a.id, a]));
      const signesByDay: Record<string, Array<EmargementSigne & { apprenant: ApprenantPresentiel }>> = {};
      const signedKeys = new Set<string>();
      for (const s of (signesHistorique || []) as EmargementSigne[]) {
        const a = apprenantsMap.get(s.apprenant_id);
        if (!a || !s.date_emargement) continue;
        (signesByDay[s.date_emargement] ||= []).push({ ...s, apprenant: a });
        if (s.demi_journee) signedKeys.add(`${s.date_emargement}|${s.apprenant_id}|${s.demi_journee}`);
      }

      // Manquants historiques par jour — uniquement les prévus, selon leurs créneaux
      const manquantsByDay: Record<string, Array<{ apprenant: ApprenantPresentiel; demi: Slot }>> = {};
      const now = new Date();
      const nowH = now.getHours();
      const nowM = now.getMinutes();
      const nowMin = nowH * 60 + nowM;
      for (let off = 0; off < HISTORY_DAYS; off++) {
        const day = addDays(today, -off);
        const isToday = off === 0;
        const [yy, mm, dd] = day.split("-").map(Number);
        const dow = new Date(yy, mm - 1, dd).getDay();
        if (dow === 0 || dow === 6) continue;
        const scheduled = scheduledByDay[day];
        if (!scheduled || scheduled.size === 0) continue;
        for (const [aid, slotSet] of scheduled) {
          const a = apprenantsMap.get(aid);
          if (!a) continue;
          for (const slot of slotSet) {
            // Ne pas afficher un créneau pas encore commencé aujourd'hui
            if (isToday) {
              const startMin =
                slot === "matin" ? 9 * 60
                : slot === "apres_midi" ? 13 * 60 + 30
                : slot === "soir_1" ? 17 * 60
                : 18 * 60 + 30;
              if (nowMin < startMin) continue;
            }
            if (!signedKeys.has(`${day}|${aid}|${slot}`)) {
              (manquantsByDay[day] ||= []).push({ apprenant: a, demi: slot });
            }
          }
        }
      }

      const scheduledToday = scheduledByDay[today] ?? new Map<string, Set<Slot>>();
      const currentSlot: Slot = demi;
      return {
        manquants: apprenants.filter((a) => {
          const slots = scheduledToday.get(a.id);
          return slots && slots.has(currentSlot) && !signedSet.has(a.id);
        }),
        signesByDay,
        manquantsByDay,
      };
    },
  });

  const manquants = (data?.manquants ?? []) as ApprenantPresentiel[];
  const signesByDay = data?.signesByDay ?? {};
  const manquantsByDay = data?.manquantsByDay ?? {};
  const signesJourSelectionne = (signesByDay[selectedDay] ?? []).slice().sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
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
            const demiLbl = s.demi_journee === "matin" ? "Matin 09:00-12:30" : s.demi_journee === "apres_midi" ? "A-M 13:30-17:00" : s.demi_journee === "soir_1" ? "Soir 17:00-18:30" : s.demi_journee === "soir_2" ? "Soir 18:30-21:00" : "";
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
              const demiLbl = m.demi === "matin" ? "Matin 09:00-12:30" : m.demi === "apres_midi" ? "Après-midi 13:30-17:00" : m.demi === "soir_1" ? "Soir 17:00-18:30" : "Soir 18:30-21:00";
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
