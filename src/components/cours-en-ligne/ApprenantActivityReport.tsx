import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Printer, Clock, BookOpen, Calendar, ArrowLeft, BarChart3, ChevronsUpDown, Check, CheckCircle2, XCircle, Car, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, differenceInMinutes, parseISO, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { computePresenceHours, formatPresenceHours } from "@/lib/emargementHours";
import { FORMATION_MODULES, ALL_MODULES } from "./modules-config";
import { VTC_COURS_DATA } from "./vtc-cours-data";
import { TAXI_COURS_DATA } from "./taxi-cours-data";
import { TA_COURS_DATA } from "./ta-cours-data";
import { VA_COURS_DATA } from "./va-cours-data";
import { BILAN_EXERCICES_VTC } from "./bilan-exercices-vtc-data";
import { BILAN_EXERCICES_FC_VTC } from "./bilan-exercices-fc-vtc-data";
import { BILAN_EXERCICES_TAXI } from "./bilan-exercices-taxi-data";
import { BILAN_EXERCICES_TA } from "./bilan-exercices-ta-data";
import { BILAN_EXERCICES_VA } from "./bilan-exercices-va-data";
import { FORMULES_DATA } from "./formules-data";
import { CONNAISSANCES_VILLE_TAXI_DATA } from "./connaissances-ville-taxi-data";
import { CONTROLE_CONNAISSANCES_TAXI_DATA } from "./controle-connaissances-taxi-data";
import { EQUIPEMENTS_TAXI_DATA } from "./equipements-taxi-data";
import { getSessionEndMs, getSessionDurationMinutes, getAccessCutoffMs, filterSessionsWithinAccess } from "@/lib/reports/session-duration";
import { fetchPratiqueSlotDetails, type PratiqueSlotDetail } from "@/lib/pratiqueSlots";

// Build a static map: exercice_id → human-readable title
const EXERCICE_TITLE_MAP = new Map<string, string>();

// Helper to register exercises from a module
const registerModuleExercises = (moduleId: number, exercices: { id: number; titre: string }[]) => {
  exercices.forEach(exo => {
    EXERCICE_TITLE_MAP.set(`module_${moduleId}_exo_${exo.id}`, exo.titre);
  });
};

// Main course modules
[VTC_COURS_DATA, TAXI_COURS_DATA, TA_COURS_DATA, VA_COURS_DATA, FORMULES_DATA, CONNAISSANCES_VILLE_TAXI_DATA, CONTROLE_CONNAISSANCES_TAXI_DATA, EQUIPEMENTS_TAXI_DATA].forEach(mod => {
  registerModuleExercises(mod.id, mod.exercices || []);
});

// Bilan modules (exercises reused with different module IDs)
registerModuleExercises(4, BILAN_EXERCICES_VTC);   // 4.BILAN EXERCICES VTC
registerModuleExercises(9, BILAN_EXERCICES_TAXI);   // 4.BILAN EXERCICES TAXI
registerModuleExercises(27, BILAN_EXERCICES_TA);    // 4.BILAN EXERCICES TA
registerModuleExercises(29, BILAN_EXERCICES_VA);    // 4.BILAN EXERCICES VA
registerModuleExercises(81, BILAN_EXERCICES_FC_VTC); // BILAN EXERCICES FORMATION CONTINUE VTC

// Module name map for fallback
const MODULE_NAME_MAP = new Map<number, string>();
ALL_MODULES.forEach(m => MODULE_NAME_MAP.set(m.id, m.nom));

interface Apprenant {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  type_apprenant: string | null;
  formation_choisie: string | null;
  heures_totales: number | null;
  heures_elearning: number | null;
  heures_presentiel: number | null;
  date_examen_theorique: string | null;
  resultat_examen: string | null;
  date_debut_cours_en_ligne: string | null;
  date_fin_cours_en_ligne: string | null;
}

interface Connexion {
  id: string;
  started_at: string;
  ended_at: string | null;
  last_seen_at: string;
  current_module: string | null;
}

interface ExerciceComplete {
  id: string;
  exercice_id: string;
  completed: boolean;
  updated_at: string;
}

interface QuizResult {
  id: string;
  quiz_titre: string;
  matiere_nom: string | null;
  completed_at: string;
}

interface EmargementRow {
  apprenant_id: string;
  date_emargement: string;
  demi_journee: string;
  absent: boolean | null;
}

const MAX_SESSION_DURATION_MS = 7 * 60 * 60 * 1000;

interface ModuleActivite {
  id: string;
  module_id: number;
  module_nom: string;
  action_type: string;
  occurred_at: string;
}

function ApprenantCombobox({ apprenants, selectedId, onSelect }: {
  apprenants: Apprenant[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = apprenants.find((a) => a.id === selectedId);
  const label = selected
    ? `${selected.prenom} ${selected.nom} ${selected.type_apprenant ? `(${selected.type_apprenant})` : ""}`
    : "Rechercher un élève...";

  const filtered = search.trim().length >= 2
    ? apprenants.filter((a) => {
        const q = search.toLowerCase();
        return a.nom.toLowerCase().includes(q) || a.prenom.toLowerCase().includes(q) || (a.email || "").toLowerCase().includes(q);
      })
    : [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Taper un nom ou prénom (min. 2 lettres)..." value={search} onValueChange={setSearch} />
          <CommandList>
            {search.trim().length < 2 ? (
              <CommandEmpty>Tapez au moins 2 lettres pour rechercher.</CommandEmpty>
            ) : filtered.length === 0 ? (
              <CommandEmpty>Aucun élève trouvé.</CommandEmpty>
            ) : (
              <CommandGroup heading={`${filtered.length} résultat(s)`}>
                {filtered.slice(0, 50).map((a) => (
                  <CommandItem
                    key={a.id}
                    value={a.id}
                    onSelect={() => { onSelect(a.id); setOpen(false); setSearch(""); }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", selectedId === a.id ? "opacity-100" : "opacity-0")} />
                    {a.prenom} {a.nom} {a.type_apprenant ? `(${a.type_apprenant})` : ""} — {a.email || "pas d'email"}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface Props {
  onBack?: () => void;
  lockedApprenantId?: string;
}

export default function ApprenantActivityReport({ onBack, lockedApprenantId }: Props) {
  const [apprenants, setApprenants] = useState<Apprenant[]>([]);
  const [selectedId, setSelectedId] = useState<string>(lockedApprenantId || "");
  const [connexionsAll, setConnexions] = useState<Connexion[]>([]);
  const [allHistoryMinutes, setAllHistoryMinutes] = useState<number>(0);
  const [activites, setActivites] = useState<ModuleActivite[]>([]);
  const [completedModuleIds, setCompletedModuleIds] = useState<Set<number>>(new Set());
  const [exercicesCompletes, setExercicesCompletes] = useState<ExerciceComplete[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [emargements, setEmargements] = useState<EmargementRow[]>([]);
  const [pratiqueDetails, setPratiqueDetails] = useState<PratiqueSlotDetail[]>([]);
  const [loading, setLoading] = useState(false);
  // Par défaut on affiche TOUT l'historique (conservé à vie), jamais une fenêtre glissante.
  const [period, setPeriod] = useState<"7" | "30" | "90" | "all" | "custom">("all");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  const printRef = useRef<HTMLDivElement>(null);
  const [editingConn, setEditingConn] = useState<{ id: string; started_at: string; ended_at: string } | null>(null);
  const [savingConn, setSavingConn] = useState(false);

  // Convert an ISO/datetime string to the `YYYY-MM-DDTHH:mm` format
  // required by <input type="datetime-local"> (local timezone).
  const toLocalInput = (iso: string | null | undefined): string => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openEditConn = (c: Connexion) => {
    setEditingConn({
      id: c.id,
      started_at: toLocalInput(c.started_at),
      ended_at: toLocalInput(c.ended_at || c.last_seen_at),
    });
  };

  const saveEditConn = async () => {
    if (!editingConn) return;
    if (!editingConn.started_at) {
      toast({ title: "Date de début requise", variant: "destructive" });
      return;
    }
    const startedISO = new Date(editingConn.started_at).toISOString();
    const endedISO = editingConn.ended_at ? new Date(editingConn.ended_at).toISOString() : null;
    if (endedISO && new Date(endedISO) <= new Date(startedISO)) {
      toast({ title: "La fin doit être après le début", variant: "destructive" });
      return;
    }
    setSavingConn(true);
    const patch: any = { started_at: startedISO, ended_at: endedISO };
    if (endedISO) patch.last_seen_at = endedISO;
    const { error } = await supabase
      .from("apprenant_connexions" as any)
      .update(patch)
      .eq("id", editingConn.id);
    setSavingConn(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setConnexions((prev) => prev.map((c) =>
      c.id === editingConn.id
        ? { ...c, started_at: startedISO, ended_at: endedISO, last_seen_at: endedISO || c.last_seen_at }
        : c,
    ));
    setEditingConn(null);
    toast({ title: "Connexion mise à jour" });
  };


  // Load apprenants list
  useEffect(() => {
    const load = async () => {
      let all: Apprenant[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data } = await supabase
          .from("apprenants")
          .select("id, nom, prenom, email, type_apprenant, formation_choisie, heures_totales, heures_elearning, heures_presentiel, date_examen_theorique, resultat_examen, date_debut_cours_en_ligne, date_fin_cours_en_ligne")
          .not("auth_user_id", "is", null)
          .order("nom")
          .range(from, from + PAGE - 1);
        const batch = (data as Apprenant[]) || [];
        all = all.concat(batch);
        if (batch.length < PAGE) break;
        from += PAGE;
      }
      setApprenants(all);
    };
    load();
  }, []);

  // Load connexions & activities for selected apprenant
  useEffect(() => {
    if (!selectedId) {
      setConnexions([]);
      setActivites([]);
      setPratiqueDetails([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      const since = period === "custom"
        ? (customStart || "2000-01-01")
        : period === "all"
          ? "2000-01-01"
          : format(subDays(new Date(), parseInt(period)), "yyyy-MM-dd");
      // Bornes hautes (inclusives) pour la période personnalisée
      const untilDate = period === "custom" && customEnd ? customEnd : null;
      const untilTs = untilDate ? `${untilDate}T23:59:59.999` : null;

      // Pagination complète : l'historique est conservé à vie, on ne doit jamais
      // le tronquer au cap de 1000 lignes de l'API.
      const fetchAllRows = async (table: string, cols: string, dateCol: string) => {
        const PAGE = 1000;
        let from = 0;
        let out: any[] = [];
        // eslint-disable-next-line no-constant-condition
        while (true) {
          let q = supabase
            .from(table as any)
            .select(cols)
            .eq("apprenant_id", selectedId)
            .gte(dateCol, since);
          if (untilTs) q = q.lte(dateCol, untilTs);
          const { data } = await q
            .order(dateCol, { ascending: false })
            .range(from, from + PAGE - 1);
          const batch = (data as any[]) || [];
          out = out.concat(batch);
          if (batch.length < PAGE) break;
          from += PAGE;
        }
        return { data: out };
      };

      const withUntil = (q: any, col: string, isDateOnly = false) =>
        untilDate ? q.lte(col, isDateOnly ? untilDate : untilTs) : q;

      const [connRes, actRes, complRes, exRes, qrRes, emgRes, pratiqueRes] = await Promise.all([
        fetchAllRows("apprenant_connexions", "id, started_at, ended_at, last_seen_at, last_action_at, current_module", "started_at"),
        fetchAllRows("apprenant_module_activites", "id, module_id, module_nom, action_type, occurred_at", "occurred_at"),

        supabase
          .from("apprenant_module_completion")
          .select("module_id")
          .eq("apprenant_id", selectedId)
          .eq("status", "completed"),
        withUntil(
          supabase
            .from("reponses_apprenants")
            .select("id, exercice_id, completed, updated_at")
            .eq("apprenant_id", selectedId)
            .eq("completed", true)
            .gte("updated_at", since),
          "updated_at",
        ).order("updated_at", { ascending: false }),
        withUntil(
          supabase
            .from("apprenant_quiz_results")
            .select("id, quiz_titre, matiere_nom, completed_at")
            .eq("apprenant_id", selectedId)
            .gte("completed_at", since),
          "completed_at",
        ).order("completed_at", { ascending: false }),
        withUntil(
          supabase
            .from("emargements_fc")
            .select("apprenant_id, date_emargement, demi_journee, absent")
            .eq("apprenant_id", selectedId)
            .gte("date_emargement", since),
          "date_emargement",
          true,
        ).order("date_emargement", { ascending: false }),
        fetchPratiqueSlotDetails(selectedId),
      ]);


      setConnexions(((connRes.data as any[]) || []) as Connexion[]);
      setActivites(((actRes.data as any[]) || []) as ModuleActivite[]);
      setCompletedModuleIds(new Set(((complRes.data as any[]) || []).map((r: any) => r.module_id as number)));
      setExercicesCompletes(((exRes.data as any[]) || []) as ExerciceComplete[]);
      setQuizResults(((qrRes.data as any[]) || []) as QuizResult[]);
      setEmargements(((emgRes.data as any[]) || []) as EmargementRow[]);
      setPratiqueDetails(pratiqueRes.filter((row) => row.date >= since && (!untilDate || row.date <= untilDate)));
      setLoading(false);
    };
    load();
  }, [selectedId, period, customStart, customEnd]);

  // Charge TOUT l'historique (indépendant du filtre période) pour le taux de réalisation
  useEffect(() => {
    if (!selectedId) { setAllHistoryMinutes(0); return; }
    let cancelled = false;
    (async () => {
      const PAGE = 1000;
      const fetchAll = async (table: string, cols: string, orderCol: string) => {
        let from = 0; let out: any[] = [];
        while (true) {
          const { data } = await supabase.from(table as any).select(cols).eq("apprenant_id", selectedId).order(orderCol, { ascending: false }).range(from, from + PAGE - 1);
          const batch = (data as any[]) || [];
          out = out.concat(batch);
          if (batch.length < PAGE) break;
          from += PAGE;
        }
        return out;
      };
      const [conns, mods, exos, quizz] = await Promise.all([
        fetchAll("apprenant_connexions", "started_at, ended_at, last_seen_at, last_action_at", "started_at"),
        fetchAll("apprenant_module_activites", "occurred_at, action_type, module_nom", "occurred_at"),
        fetchAll("reponses_apprenants", "updated_at, completed", "updated_at"),
        fetchAll("apprenant_quiz_results", "completed_at", "completed_at"),
      ]);
      if (cancelled) return;
      const isAccueil = (n?: string | null) => !!n && /accueil|liste\s+des\s+modules/i.test(n);
      const tsArr = [
        ...mods.filter((m: any) => (m.action_type === "open_module" || m.action_type === "open_section" || m.action_type === "open_cours") && !isAccueil(m.module_nom)).map((m: any) => Date.parse(m.occurred_at)),
        ...exos.filter((e: any) => e.completed).map((e: any) => Date.parse(e.updated_at)),
        ...quizz.map((q: any) => Date.parse(q.completed_at)),
      ].filter(t => !Number.isNaN(t)).sort((a, b) => a - b);
      const cutoffAll = getAccessCutoffMs(
        apprenants.find((a) => a.id === selectedId)?.date_fin_cours_en_ligne ?? null,
      );
      let total = 0;
      for (const c of conns) {
        const start = Date.parse(c.started_at);
        if (Number.isNaN(start)) continue;
        // Aucune heure comptabilisée après la fin d'accès à la formation
        if (cutoffAll && start > cutoffAll) continue;
        const end = getSessionEndMs(c as any, cutoffAll);

        if (end <= start) continue;
        let lo = 0, hi = tsArr.length - 1, found = false;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          const v = tsArr[mid];
          if (v < start) lo = mid + 1;
          else if (v > end) hi = mid - 1;
          else { found = true; break; }
        }
        if (found) total += Math.max(0, Math.floor((end - start) / 60000));
      }
      setAllHistoryMinutes(total);
    })();
    return () => { cancelled = true; };
  }, [selectedId, apprenants]);

  const selectedApprenant = apprenants.find((a) => a.id === selectedId);

  // Fin d'accès à la formation : aucune connexion / minute n'est comptée au-delà
  const accessCutoffMs = useMemo(
    () => getAccessCutoffMs(selectedApprenant?.date_fin_cours_en_ligne ?? null),
    [selectedApprenant?.date_fin_cours_en_ligne],
  );
  const connexions = useMemo(
    () => filterSessionsWithinAccess(connexionsAll as any[], accessCutoffMs) as Connexion[],
    [connexionsAll, accessCutoffMs],
  );

  const getCappedSessionEnd = (connexion: Connexion) => new Date(getSessionEndMs(connexion as any, accessCutoffMs));


  // Une connexion n'est comptabilisée que si l'apprenant a réellement ouvert
  // un module/section pédagogique OU complété un exercice/quiz pendant la fenêtre.
  // Rester sur "Accueil — Liste des modules" ne compte pas.
  const hasPedagogicalActivity = (connexion: Connexion) => {
    const start = parseISO(connexion.started_at);
    const end = getCappedSessionEnd(connexion);
    const isAccueil = (nom?: string | null) =>
      !!nom && /accueil|liste\s+des\s+modules/i.test(nom);
    const inWindow = (iso: string) => {
      const t = parseISO(iso);
      return t >= start && t <= end;
    };
    // Fallback pour anciennes sessions sans logs d'activité :
    // si current_module est un vrai module (pas l'accueil), compter la session.
    if (connexion.current_module && !isAccueil(connexion.current_module)) return true;
    if (activites.some(a =>
      inWindow(a.occurred_at)
      && (a.action_type === "open_module" || a.action_type === "open_section" || a.action_type === "open_cours")
      && !isAccueil(a.module_nom)
    )) return true;
    if (exercicesCompletes.some(e => inWindow(e.updated_at))) return true;
    if (quizResults.some(q => inWindow(q.completed_at))) return true;
    return false;
  };

  const getSessionMinutes = (connexion: Connexion) => {
    if (!hasPedagogicalActivity(connexion)) return 0;
    return getSessionDurationMinutes(connexion as any, accessCutoffMs);
  };

  // Présentiel : les journées pratiques utilisent la durée exacte du planning.
  const pratiqueRows = useMemo(() => {
    const byDate = new Map<string, { date: string; slots: Set<string>; hours: number }>();
    for (const row of emargements) {
      if (row.absent) continue;
      const date = String(row.date_emargement || "").slice(0, 10);
      const slot = String(row.demi_journee || "").trim().toLowerCase();
      if (!date || !slot) continue;
      if (!byDate.has(date)) byDate.set(date, { date, slots: new Set(), hours: 0 });
      byDate.get(date)!.slots.add(slot);
    }
    const rows: { date: string; label: string; hours: number }[] = [];
    const pratiqueByDate = new Map(pratiqueDetails.map((detail) => [detail.date, detail]));
    for (const { date, slots } of byDate.values()) {
      const pratique = pratiqueByDate.get(date);
      if (pratique) {
        rows.push({ date, label: `Pratique · ${pratique.label}`, hours: pratique.minutes / 60 });
        pratiqueByDate.delete(date);
        continue;
      }
      let hours = 0;
      const hasSoir = slots.has("soir") || slots.has("soir_1") || slots.has("soir_2");
      if (hasSoir) {
        hours = Math.min(
          (slots.has("soir") ? 4 : 0) +
            (slots.has("soir_1") ? 1.5 : 0) +
            (slots.has("soir_2") ? 2.5 : 0),
          4,
        );
      } else {
        hours = Math.min((slots.has("matin") ? 3 : 0) + (slots.has("apres_midi") ? 3 : 0), 6);
      }
      const labels: string[] = [];
      if (slots.has("matin")) labels.push("Matin");
      if (slots.has("apres_midi")) labels.push("Après-midi");
      if (slots.has("soir") || slots.has("soir_1") || slots.has("soir_2")) labels.push("Soir");
      rows.push({ date, label: labels.join(" + ") || "Présentiel", hours });
    }
    for (const pratique of pratiqueByDate.values()) {
      rows.push({ date: pratique.date, label: `Pratique · ${pratique.label}`, hours: pratique.minutes / 60 });
    }
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [emargements, pratiqueDetails]);

  // Synthèse des taux : e-learning (plafonné au volume prévu), présentiel (confirmé) et total
  const taux = useMemo(() => {
    const a = selectedApprenant;
    const requiredElearning =
      Number(a?.heures_elearning) ||
      Math.max(0, (Number(a?.heures_totales) || 0) - (Number(a?.heures_presentiel) || 0));
    const requiredPresentiel = Number(a?.heures_presentiel) || 0;
    const requiredTotal =
      Number(a?.heures_totales) || requiredElearning + requiredPresentiel;

    const doneElearningRaw = allHistoryMinutes / 60;
    const doneElearning = requiredElearning > 0
      ? Math.min(doneElearningRaw, requiredElearning)
      : doneElearningRaw;
    const donePresentielRaw = pratiqueRows.reduce((s, p) => s + (p.hours || 0), 0);
    const donePresentiel = requiredPresentiel > 0
      ? Math.min(donePresentielRaw, requiredPresentiel)
      : donePresentielRaw;

    const pct = (done: number, req: number) =>
      req > 0 ? Math.min(100, Math.round((done / req) * 100)) : 0;

    return {
      requiredElearning,
      requiredPresentiel,
      requiredTotal,
      doneElearning,
      doneElearningRaw,
      donePresentiel,
      doneTotal: doneElearning + donePresentiel,
      pctElearning: pct(doneElearning, requiredElearning),
      pctPresentiel: pct(donePresentiel, requiredPresentiel),
      pctTotal: pct(doneElearning + donePresentiel, requiredTotal),
    };
  }, [selectedApprenant, allHistoryMinutes, pratiqueRows]);



  // Merge connexions + pratique into table rows sorted by date desc
  const tableRows = useMemo(() => {
    const connRows = connexions.map((c) => ({
      type: "connexion" as const,
      id: c.id,
      date: c.started_at.slice(0, 10),
      sortKey: c.started_at,
      data: c,
    }));
    const pratRows = pratiqueRows.map((p, i) => ({
      type: "pratique" as const,
      id: `prat_${p.date}_${i}`,
      date: p.date,
      sortKey: p.date + "T00:00:00",
      data: p,
    }));
    return [...connRows, ...pratRows].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  }, [connexions, pratiqueRows]);
  const resolveExerciceTitle = (exerciceId: string): string => {
    // Check static map first
    const mapped = EXERCICE_TITLE_MAP.get(exerciceId);
    if (mapped) return mapped;
    // Fallback: parse module_X_exo_Y → module name
    const match = exerciceId.match(/^module_(\d+)_exo_(\d+)$/);
    if (match) {
      const modName = MODULE_NAME_MAP.get(parseInt(match[1]));
      if (modName) return `${modName} — Exo ${match[2]}`;
    }
    return exerciceId;
  };

  // Shorten matiere_nom: "A - Transport Public..." → "A - T3P"
  const shortenMatiere = (m: string): string => {
    const map: Record<string, string> = {
      "A": "T3P", "B": "Gestion", "C": "Sécurité routière",
      "D": "Français", "E": "Anglais",
      "F(V)": "Dév. commercial VTC", "F(T)": "Réglem. TAXI",
      "G(V)": "Réglem. VTC", "G(T)": "Ville TAXI",
    };
    const match = m.match(/^([A-G](?:\([VT]\))?)\s*-/);
    if (match) return `${match[1]} - ${map[match[1]] || m.split(" - ").slice(1).join(" - ").substring(0, 30)}`;
    return m.length > 40 ? m.substring(0, 40) + "…" : m;
  };

  // Get exercise/quiz titles + cours/parties completed during a connexion time window
  const getExerciceNamesDuringConnexion = (connexion: Connexion) => {
    const start = parseISO(connexion.started_at);
    const end = getCappedSessionEnd(connexion);
    const titles: string[] = [];

    // Cours, parties & sections consultés (module activities)
    // On ignore la page d'accueil qui n'est pas un vrai module pédagogique.
    const isAccueil = (nom?: string | null) =>
      !!nom && /accueil|liste\s+des\s+modules/i.test(nom);
    const moduleActs = activites.filter(a => {
      const t = parseISO(a.occurred_at);
      return t >= start && t <= end
        && (a.action_type === "open_module" || a.action_type === "open_cours" || a.action_type === "open_section")
        && !isAccueil(a.module_nom);
    });
    const seenModules = new Set<string>();
    moduleActs.forEach(a => {
      const key = `${a.action_type}_${a.module_id}_${a.module_nom}`;
      if (!seenModules.has(key)) {
        seenModules.add(key);
        const icon = a.action_type === "open_section" ? "🧭" : "📖";
        titles.push(`${icon} ${a.module_nom}`);
      }
    });

    // Exercices complétés
    exercicesCompletes.filter(e => {
      const t = parseISO(e.updated_at);
      return t >= start && t <= end;
    }).forEach(e => titles.push(resolveExerciceTitle(e.exercice_id)));
    return titles;
  };

  // Get quiz/examen titles completed during a connexion time window
  const getCoursDuringConnexion = (connexion: Connexion) => {
    const start = parseISO(connexion.started_at);
    const end = getCappedSessionEnd(connexion);
    const titles: string[] = [];
    quizResults.filter(q => {
      const t = parseISO(q.completed_at);
      return t >= start && t <= end;
    }).forEach(q => {
      const matiere = q.matiere_nom ? ` — ${shortenMatiere(q.matiere_nom)}` : "";
      titles.push(`${q.quiz_titre}${matiere}`);
    });
    return titles;
  };


  const totalMinutes = connexions.reduce((sum, c) => {
    return sum + getSessionMinutes(c);
  }, 0);

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  // Modules consultés (unique)
  const uniqueModules = [...new Map(activites.filter(a => a.action_type === "open_module").map((a) => [a.module_id, a.module_nom])).entries()];

  // All formation modules for this student (use type_apprenant as key)
  const formationModules = (() => {
    const ta = selectedApprenant?.type_apprenant?.toLowerCase()?.trim() || "";
    const fc = selectedApprenant?.formation_choisie?.toLowerCase()?.trim() || "";
    const def = FORMATION_MODULES[ta] || FORMATION_MODULES[fc] || null;
    return def?.modules || [];
  })();
  // Chart data: connexion par jour
  const chartData = (() => {
    const days = period === "all" ? 30 : parseInt(period);
    const map = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      map.set(d, 0);
    }
    connexions.forEach((c) => {
      const day = format(parseISO(c.started_at), "yyyy-MM-dd");
      const mins = getSessionMinutes(c);
      map.set(day, (map.get(day) || 0) + mins);
    });
    return [...map.entries()].map(([date, minutes]) => ({
      date: format(parseISO(date), "dd MMM", { locale: fr }),
      minutes,
    }));
  })();

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
      <head>
        <title>Rapport d'activité — ${selectedApprenant?.prenom} ${selectedApprenant?.nom}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          h2 { font-size: 16px; margin-top: 24px; margin-bottom: 8px; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; }
          .subtitle { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
          .stats { display: flex; gap: 24px; margin-bottom: 20px; }
          .stat-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; flex: 1; text-align: center; }
          .stat-value { font-size: 28px; font-weight: bold; }
          .stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
          th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; }
          th { background: #f3f4f6; font-weight: 600; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; background: #e0e7ff; color: #3730a3; }
          .footer { margin-top: 40px; font-size: 11px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>Rapport d'activité — ${selectedApprenant?.prenom} ${selectedApprenant?.nom}</h1>
        <p class="subtitle">
          ${selectedApprenant?.email || "Pas d'email"} · ${selectedApprenant?.type_apprenant || "—"}<br/>
          Période : ${period === "all" ? "Tout l'historique" : period === "custom" ? `du ${customStart ? format(new Date(customStart), "dd/MM/yyyy") : "…"} au ${customEnd ? format(new Date(customEnd), "dd/MM/yyyy") : "…"}` : `${period} derniers jours`} · Généré le ${format(new Date(), "dd/MM/yyyy à HH:mm", { locale: fr })}
        </p>

        <div class="stats">
          <div class="stat-card">
            <div class="stat-value">${connexions.length}</div>
            <div class="stat-label">Connexions</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${totalHours}h${remainingMinutes.toString().padStart(2, "0")}</div>
            <div class="stat-label">Temps total</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${uniqueModules.length}</div>
            <div class="stat-label">Modules consultés</div>
          </div>
        </div>

        ${period === "custom" ? "" : `
        <h2>Taux de réalisation</h2>
        <div class="stats">
          <div class="stat-card">
            <div class="stat-value">${taux.pctElearning}%</div>
            <div class="stat-label">Connexion e-learning<br/>${taux.doneElearning.toFixed(1)}h / ${taux.requiredElearning}h</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${taux.pctPresentiel}%</div>
            <div class="stat-label">Présentiel<br/>${taux.donePresentiel.toFixed(1)}h / ${taux.requiredPresentiel}h</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${taux.pctTotal}%</div>
            <div class="stat-label">TOTAL formation<br/>${taux.doneTotal.toFixed(1)}h / ${taux.requiredTotal}h</div>
          </div>
        </div>`}


        <h2>Détail des connexions</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Heure début</th>
              <th>Heure fin</th>
              <th>Durée</th>
              <th>Module consulté</th>
              <th>Quiz / Examens réalisés</th>
              <th>Cours & Exercices effectués</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows.map((row) => {
              if (row.type === "pratique") {
                const p = row.data;
                return `<tr style="background:#fffbeb;">
                  <td><strong>${format(parseISO(p.date), "dd/MM/yyyy", { locale: fr })}</strong></td>
                  <td colspan="2"><span class="badge" style="background:#fef3c7;color:#92400e;">🚗 Présentiel — ${p.label}</span></td>
                  <td><strong>${formatPresenceHours(p.hours)}</strong></td>
                  <td colspan="3" style="color:#6b7280;font-style:italic;">Journée de pratique</td>
                </tr>`;
              }
              const c = row.data;
              const start = parseISO(c.started_at);
              const end = getCappedSessionEnd(c);
              const mins = getSessionMinutes(c);
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              const coursNames = getCoursDuringConnexion(c);
              const exNames = getExerciceNamesDuringConnexion(c);
              return `<tr>
                <td>${format(start, "dd/MM/yyyy", { locale: fr })}</td>
                <td>${format(start, "HH:mm", { locale: fr })}</td>
                <td>${c.ended_at ? format(end, "HH:mm", { locale: fr }) : "En cours"}</td>
                <td>${h}h${m.toString().padStart(2, "0")}</td>
                <td>${c.current_module || "—"}</td>
                <td>${coursNames.length > 0 ? coursNames.join(", ") : "—"}</td>
                <td>${exNames.length > 0 ? exNames.join(", ") : "—"}</td>
              </tr>`;
            }).join("")}
            ${tableRows.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:#9ca3af;">Aucune connexion</td></tr>' : ""}
          </tbody>
        </table>

        <h2>Modules de la formation</h2>
        <table>
          <thead>
            <tr>
              <th>Module</th>
              <th>Nombre d'accès</th>
              <th>Dernière consultation</th>
              <th>Terminé</th>
            </tr>
          </thead>
          <tbody>
            ${formationModules.length > 0 ? formationModules.map((mod) => {
              const modActivites = activites.filter(a => a.module_id === mod.id && a.action_type === "open_module");
              const last = modActivites[0];
              const done = completedModuleIds.has(mod.id);
              return `<tr>
                <td>${mod.label}</td>
                <td>${modActivites.length}</td>
                <td>${last ? format(parseISO(last.occurred_at), "dd/MM/yyyy à HH:mm", { locale: fr }) : "—"}</td>
                <td style="color:${done ? '#16a34a' : '#dc2626'};font-weight:600">${done ? "✅ Oui" : "❌ Non"}</td>
              </tr>`;
            }).join("") : uniqueModules.map(([modId, modNom]) => {
              const modActivites = activites.filter(a => a.module_id === modId && a.action_type === "open_module");
              const last = modActivites[0];
              const done = completedModuleIds.has(modId);
              return `<tr>
                <td>${modNom}</td>
                <td>${modActivites.length}</td>
                <td>${last ? format(parseISO(last.occurred_at), "dd/MM/yyyy à HH:mm", { locale: fr }) : "—"}</td>
                <td style="color:${done ? '#16a34a' : '#dc2626'};font-weight:600">${done ? "✅ Oui" : "❌ Non"}</td>
              </tr>`;
            }).join("")}
            ${formationModules.length === 0 && uniqueModules.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#9ca3af;">Aucun module</td></tr>' : ""}
          </tbody>
        </table>

        <h2>Historique des actions</h2>
        <table>
          <thead>
            <tr>
              <th>Date & Heure</th>
              <th>Module</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${activites.slice(0, 100).map((a) => `<tr>
              <td>${format(parseISO(a.occurred_at), "dd/MM/yyyy HH:mm", { locale: fr })}</td>
              <td>${a.module_nom}</td>
              <td><span class="badge">${a.action_type === "open_module" ? "Ouverture" : a.action_type}</span></td>
            </tr>`).join("")}
            ${activites.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#9ca3af;">Aucune activité</td></tr>' : ""}
          </tbody>
        </table>

        <div class="footer">
          FTRANSPORT — Rapport généré automatiquement
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold">Rapport d'activité élève</h2>
            <p className="text-sm text-muted-foreground">Connexions, heures et modules consultés</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {selectedId && selectedApprenant && (() => {
            const dateExam = selectedApprenant.date_examen_theorique;
            const resultat = (selectedApprenant.resultat_examen || "").toLowerCase().trim();
            const reussi = /admis|reussi|réussi|ok|valid/i.test(resultat);
            const echoue = /ajourn|echec|échec|refus|ko/i.test(resultat);
            let dateExamStr = "—";
            if (dateExam) {
              try { dateExamStr = format(parseISO(dateExam), "dd/MM/yyyy", { locale: fr }); }
              catch { dateExamStr = dateExam; }
            }
            return (
              <div className="hidden md:flex items-center gap-3 border rounded-lg px-4 py-2 bg-muted/40">
                {period !== "custom" && (
                  <>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Connexion (e-learning)</div>
                      <div className={cn("text-lg font-bold", taux.pctElearning >= 100 ? "text-green-600" : taux.pctElearning >= 50 ? "text-primary" : "text-orange-500")}>
                        {taux.pctElearning}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {taux.doneElearning.toFixed(1)}h / {taux.requiredElearning}h
                      </div>
                    </div>
                    <div className="w-px h-10 bg-border" />
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Présentiel</div>
                      <div className={cn("text-lg font-bold", taux.pctPresentiel >= 100 ? "text-green-600" : taux.pctPresentiel > 0 ? "text-primary" : "text-orange-500")}>
                        {taux.pctPresentiel}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {taux.donePresentiel.toFixed(1)}h / {taux.requiredPresentiel}h
                      </div>
                    </div>
                    <div className="w-px h-10 bg-border" />
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Total formation</div>
                      <div className={cn("text-lg font-bold", taux.pctTotal >= 100 ? "text-green-600" : taux.pctTotal >= 50 ? "text-primary" : "text-orange-500")}>
                        {taux.pctTotal}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {taux.doneTotal.toFixed(1)}h / {taux.requiredTotal}h
                      </div>
                    </div>
                    <div className="w-px h-10 bg-border" />
                  </>
                )}


                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Examen théorique</div>
                  <div className="text-sm font-semibold">{dateExamStr}</div>
                  {resultat ? (
                    <Badge variant={reussi ? "default" : echoue ? "destructive" : "secondary"} className="text-[10px] mt-0.5">
                      {reussi ? "✅ Réussi" : echoue ? "❌ Échoué" : resultat}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] mt-0.5">En attente</Badge>
                  )}
                </div>
              </div>
            );
          })()}
          {selectedId && (
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              Imprimer le rapport
            </Button>
          )}
        </div>
      </div>

      {/* Sélection apprenant + période */}
      <div className="flex flex-wrap gap-4">
        {!lockedApprenantId && (
          <div className="flex-1 min-w-[250px]">
            <label className="text-sm font-medium mb-1 block">Sélectionner un élève :</label>
            <ApprenantCombobox
              apprenants={apprenants}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        )}
        <div className="w-48">
          <label className="text-sm font-medium mb-1 block">Période :</label>
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 derniers jours</SelectItem>
              <SelectItem value="30">30 derniers jours</SelectItem>
              <SelectItem value="90">90 derniers jours</SelectItem>
              <SelectItem value="all">Tout l'historique</SelectItem>
              <SelectItem value="custom">Dates personnalisées</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {period === "custom" && (
          <>
            <div className="w-40">
              <label className="text-sm font-medium mb-1 block">Du :</label>
              <input
                type="date"
                value={customStart}
                max={customEnd || undefined}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div className="w-40">
              <label className="text-sm font-medium mb-1 block">Au :</label>
              <input
                type="date"
                value={customEnd}
                min={customStart || undefined}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
          </>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {!loading && selectedId && (
        <div ref={printRef} className="space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <Calendar className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-3xl font-bold">{connexions.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Connexions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-3xl font-bold">{totalHours}h{remainingMinutes.toString().padStart(2, "0")}</p>
                <p className="text-xs text-muted-foreground mt-1">Temps total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <BookOpen className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-3xl font-bold">{uniqueModules.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Modules consultés</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <BarChart3 className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-3xl font-bold">
                  {connexions.length > 0
                    ? `${Math.round(totalMinutes / connexions.length)}min`
                    : "—"
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">Durée moyenne / session</p>
              </CardContent>
            </Card>
          </div>

          {/* Graphique connexion par jour */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Temps de connexion par jour (minutes)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v} min`, "Temps"]} />
                  <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Détail des connexions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Détail des connexions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Heure début</TableHead>
                    <TableHead>Heure fin</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Module consulté</TableHead>
                    <TableHead>Quiz / Examens réalisés</TableHead>
                    <TableHead>Cours & Exercices effectués</TableHead>
                    <TableHead className="w-[70px] text-center print:hidden">Éditer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Aucune connexion enregistrée
                      </TableCell>
                    </TableRow>
                  )}
                  {tableRows.map((row) => {
                    if (row.type === "pratique") {
                      const p = row.data as typeof pratiqueRows[0];
                      return (
                        <TableRow key={row.id} className="bg-amber-50/60 dark:bg-amber-950/20">
                          <TableCell className="font-medium text-amber-700 dark:text-amber-400">
                            {format(parseISO(p.date), "dd/MM/yyyy", { locale: fr })}
                          </TableCell>
                          <TableCell colSpan={2}>
                            <Badge variant="outline" className="gap-1 text-amber-700 border-amber-300 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">
                              <Car className="w-3 h-3" />
                              Présentiel — {p.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-amber-700 dark:text-amber-400">
                            {formatPresenceHours(p.hours)}
                          </TableCell>
                          <TableCell colSpan={3} className="text-muted-foreground italic">
                            Journée de pratique
                          </TableCell>
                          <TableCell className="print:hidden" />
                        </TableRow>
                      );
                    }
                    const c = row.data as Connexion;
                    const start = parseISO(c.started_at);
                    const end = getCappedSessionEnd(c);
                    const mins = getSessionMinutes(c);
                    const h = Math.floor(mins / 60);
                    const m = mins % 60;
                    const coursNames = getCoursDuringConnexion(c);
                    const exNames = getExerciceNamesDuringConnexion(c);
                    // Derive last consulted module/section from activities if current_module is empty
                    const isAccueilLabel = (s?: string | null) =>
                      !!s && /accueil|liste\s+des\s+modules/i.test(s);
                    const sessionActs = activites
                      .filter(a => {
                        const t = parseISO(a.occurred_at);
                        return t >= start && t <= end
                          && (a.action_type === "open_module" || a.action_type === "open_section")
                          && !isAccueilLabel(a.module_nom);
                      })
                      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

                    // Fallback for historical sessions (no activity tracking):
                    // infer modules from exercices completed and quiz/exams done during the window
                    const inferredModules = new Set<string>();
                    exercicesCompletes
                      .filter(e => {
                        const t = parseISO(e.updated_at);
                        return t >= start && t <= end;
                      })
                      .forEach(e => {
                        const match = e.exercice_id.match(/^module_(\d+)_exo_\d+$/);
                        if (match) {
                          const name = MODULE_NAME_MAP.get(parseInt(match[1]));
                          if (name) inferredModules.add(name);
                        }
                      });
                    quizResults
                      .filter(q => {
                        const t = parseISO(q.completed_at);
                        return t >= start && t <= end;
                      })
                      .forEach(q => {
                        if (q.matiere_nom) inferredModules.add(shortenMatiere(q.matiere_nom));
                        else if (q.quiz_titre) inferredModules.add(q.quiz_titre);
                      });

                    const trackedLabel = (!isAccueilLabel(c.current_module) ? c.current_module : null)
                      || sessionActs.find(a => a.action_type === "open_module")?.module_nom
                      || sessionActs[0]?.module_nom
                      || null;
                    const inferredLabel = inferredModules.size > 0
                      ? `${[...inferredModules].join(", ")} (déduit)`
                      : null;
                    const moduleLabel = trackedLabel || inferredLabel;
                    const hasRealActivity = !!moduleLabel;
                    return (
                      <TableRow key={c.id}>
                        <TableCell>{format(start, "dd/MM/yyyy", { locale: fr })}</TableCell>
                        <TableCell>{format(start, "HH:mm", { locale: fr })}</TableCell>
                        <TableCell>
                          {c.ended_at
                            ? format(end, "HH:mm", { locale: fr })
                            : <Badge variant="secondary" className="text-xs">En cours</Badge>
                          }
                        </TableCell>
                        <TableCell className="font-medium">{h}h{m.toString().padStart(2, "0")}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {hasRealActivity
                            ? moduleLabel
                            : <span className="italic text-xs text-orange-600">Aucun module / quiz ouvert (page d'accueil uniquement)</span>}
                        </TableCell>
                        <TableCell>
                          {coursNames.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {coursNames.map((name, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">{name}</Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {exNames.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {exNames.map((name, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{name}</Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center print:hidden">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Modifier date/heure"
                            onClick={() => openEditConn(c)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Modules de la formation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Modules de la formation {selectedApprenant?.formation_choisie ? `(${selectedApprenant.formation_choisie.toUpperCase()})` : ""}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                   <TableRow>
                     <TableHead>Module</TableHead>
                     <TableHead>Nombre d'accès</TableHead>
                     <TableHead>Dernière consultation</TableHead>
                     <TableHead>Terminé</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {formationModules.length === 0 && uniqueModules.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                         Aucun module
                       </TableCell>
                     </TableRow>
                   )}
                   {(formationModules.length > 0 ? formationModules.map((mod) => {
                     const modActivites = activites.filter(a => a.module_id === mod.id && a.action_type === "open_module");
                     const last = modActivites[0];
                     const done = completedModuleIds.has(mod.id);
                     return (
                       <TableRow key={mod.id}>
                         <TableCell className="font-medium">{mod.label}</TableCell>
                         <TableCell>{modActivites.length || "—"}</TableCell>
                         <TableCell>
                           {last ? format(parseISO(last.occurred_at), "dd/MM/yyyy à HH:mm", { locale: fr }) : "—"}
                         </TableCell>
                         <TableCell>
                           {done ? (
                             <span className="inline-flex items-center gap-1 text-green-600 font-semibold"><CheckCircle2 className="w-4 h-4" /> Oui</span>
                           ) : (
                             <span className="inline-flex items-center gap-1 text-red-500 font-semibold"><XCircle className="w-4 h-4" /> Non</span>
                           )}
                         </TableCell>
                       </TableRow>
                     );
                   }) : uniqueModules.map(([modId, modNom]) => {
                     const modActivites = activites.filter(a => a.module_id === modId && a.action_type === "open_module");
                     const last = modActivites[0];
                     const done = completedModuleIds.has(modId);
                     return (
                       <TableRow key={modId}>
                         <TableCell className="font-medium">{modNom}</TableCell>
                         <TableCell>{modActivites.length}</TableCell>
                         <TableCell>
                           {last ? format(parseISO(last.occurred_at), "dd/MM/yyyy à HH:mm", { locale: fr }) : "—"}
                         </TableCell>
                         <TableCell>
                           {done ? (
                             <span className="inline-flex items-center gap-1 text-green-600 font-semibold"><CheckCircle2 className="w-4 h-4" /> Oui</span>
                           ) : (
                             <span className="inline-flex items-center gap-1 text-red-500 font-semibold"><XCircle className="w-4 h-4" /> Non</span>
                           )}
                         </TableCell>
                       </TableRow>
                     );
                   }))}
                 </TableBody>
               </Table>
             </CardContent>
           </Card>
        </div>
      )}

      {!selectedId && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <BarChart3 className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">Sélectionnez un élève</p>
          <p className="text-sm">pour voir son rapport d'activité détaillé</p>
        </div>
      )}

      <Dialog open={!!editingConn} onOpenChange={(o) => { if (!o) setEditingConn(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la connexion</DialogTitle>
            <DialogDescription>
              Ajustez la date et les heures de début/fin. Les durées et le rapport sont recalculés automatiquement.
            </DialogDescription>
          </DialogHeader>
          {editingConn && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="edit-conn-start">Début</Label>
                <Input
                  id="edit-conn-start"
                  type="datetime-local"
                  value={editingConn.started_at}
                  onChange={(e) => setEditingConn({ ...editingConn, started_at: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-conn-end">Fin</Label>
                <Input
                  id="edit-conn-end"
                  type="datetime-local"
                  value={editingConn.ended_at}
                  onChange={(e) => setEditingConn({ ...editingConn, ended_at: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Laisser vide pour une session « en cours ».</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingConn(null)} disabled={savingConn}>Annuler</Button>
            <Button onClick={saveEditConn} disabled={savingConn}>
              {savingConn ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

