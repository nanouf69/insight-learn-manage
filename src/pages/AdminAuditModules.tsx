import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Search, ChevronDown, ChevronRight } from "lucide-react";
import { T3P_EXERCICES } from "@/components/cours-en-ligne/exercices/t3p-exercices-data";
import { ANGLAIS_EXERCICES } from "@/components/cours-en-ligne/exercices/anglais-exercices-data";
import { FRANCAIS_EXERCICES } from "@/components/cours-en-ligne/exercices/francais-exercices-data";
import { GESTION_EXERCICES } from "@/components/cours-en-ligne/exercices/gestion-exercices-data";
import { SECURITE_ROUTIERE_EXERCICES } from "@/components/cours-en-ligne/exercices/securite-routiere-exercices-data";
import {
  REGLEMENTATION_NATIONALE_EXERCICES,
  REGLEMENTATION_LOCALE_EXERCICES,
  REGLEMENTATION_SPECIFIQUE_VTC_EXERCICES,
} from "@/components/cours-en-ligne/exercices/reglementation-exercices-data";
import { DEV_COMMERCIAL_EXERCICES } from "@/components/cours-en-ligne/exercices/dev-commercial-exercices-data";
import { ALL_MODULES } from "@/components/cours-en-ligne/modules-config";

interface Choix { lettre: string; texte: string; correct?: boolean }
interface SourceEntry { choix: Choix[]; matiere: string }

const SOURCES: { nom: string; data: any[] }[] = [
  { nom: "T3P", data: T3P_EXERCICES },
  { nom: "Anglais", data: ANGLAIS_EXERCICES },
  { nom: "Français", data: FRANCAIS_EXERCICES },
  { nom: "Gestion", data: GESTION_EXERCICES },
  { nom: "Sécurité Routière", data: SECURITE_ROUTIERE_EXERCICES },
  { nom: "Réglementation Nationale", data: REGLEMENTATION_NATIONALE_EXERCICES },
  { nom: "Réglementation Locale", data: REGLEMENTATION_LOCALE_EXERCICES },
  { nom: "Réglementation Spécifique VTC", data: REGLEMENTATION_SPECIFIQUE_VTC_EXERCICES },
  { nom: "Développement Commercial", data: DEV_COMMERCIAL_EXERCICES },
];

const normalize = (s: string) =>
  String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ").replace(/[^\p{L}\p{N} ]+/gu, "").trim();

const correctSig = (choix: Choix[]): string =>
  [...(choix ?? [])].filter(c => c.correct).map(c => c.lettre).sort().join(",");

const lettresSig = (choix: Choix[]): string =>
  [...(choix ?? [])].map(c => c.lettre).sort().join(",");

function buildSourceMap(): Map<string, SourceEntry> {
  const map = new Map<string, SourceEntry>();
  for (const { nom, data } of SOURCES) {
    for (const exo of data ?? []) {
      for (const q of exo.questions ?? []) {
        const key = normalize(q.enonce);
        if (!key) continue;
        if (!map.has(key)) map.set(key, { choix: q.choix ?? [], matiere: nom });
      }
    }
  }
  return map;
}

function compareChoix(source: Choix[], target: Choix[]): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  if (correctSig(source) !== correctSig(target)) {
    issues.push(`Bonnes réponses différentes (source: ${correctSig(source) || "∅"}, module: ${correctSig(target) || "∅"})`);
  }
  if (lettresSig(source) !== lettresSig(target)) {
    issues.push(`Options différentes (source: ${lettresSig(source)}, module: ${lettresSig(target)})`);
  }
  return { ok: issues.length === 0, issues };
}

interface ModuleQuestionDiff {
  moduleId: number;
  moduleName: string;
  exerciceTitre: string;
  matiere: string;
  enonce: string;
  sourceChoix: Choix[];
  moduleChoix: Choix[];
  issues: string[];
}

interface ModuleStat {
  id: number;
  name: string;
  ok: number;
  ko: number;
  hors_source: number;
}

export default function AdminAuditModules() {
  const [loading, setLoading] = useState(true);
  const [diffs, setDiffs] = useState<ModuleQuestionDiff[]>([]);
  const [stats, setStats] = useState<ModuleStat[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<number | "all">("all");
  const [matiereFilter, setMatiereFilter] = useState<string>("all");

  const run = async () => {
    setLoading(true);
    try {
      const sourceMap = buildSourceMap();
      const { data, error } = await supabase
        .from("module_editor_state")
        .select("module_id, module_data");
      if (error) throw error;

      const moduleNameById = new Map(ALL_MODULES.map(m => [m.id, m.nom]));
      const koList: ModuleQuestionDiff[] = [];
      const statMap = new Map<number, ModuleStat>();

      for (const row of (data ?? []) as any[]) {
        const modId = row.module_id as number;
        const modName = moduleNameById.get(modId) ?? `Module ${modId}`;
        const stat: ModuleStat = statMap.get(modId) ?? { id: modId, name: modName, ok: 0, ko: 0, hors_source: 0 };

        const exos = Array.isArray(row.module_data?.exercices) ? row.module_data.exercices : [];
        for (const exo of exos) {
          const qs = Array.isArray(exo?.questions) ? exo.questions : [];
          for (const q of qs) {
            const key = normalize(q?.enonce ?? "");
            if (!key) continue;
            const src = sourceMap.get(key);
            if (!src) { stat.hors_source++; continue; }
            const target: Choix[] = Array.isArray(q?.choix) ? q.choix : [];
            const cmp = compareChoix(src.choix, target);
            if (cmp.ok) {
              stat.ok++;
            } else {
              stat.ko++;
              koList.push({
                moduleId: modId,
                moduleName: modName,
                exerciceTitre: String(exo?.titre ?? ""),
                matiere: src.matiere,
                enonce: q?.enonce ?? "",
                sourceChoix: src.choix,
                moduleChoix: target,
                issues: cmp.issues,
              });
            }
          }
        }
        statMap.set(modId, stat);
      }

      setDiffs(koList);
      setStats([...statMap.values()].sort((a, b) => a.id - b.id));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { run(); }, []);

  const matieres = useMemo(() => ["all", ...new Set(diffs.map(d => d.matiere))], [diffs]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return diffs.filter(d => {
      if (moduleFilter !== "all" && d.moduleId !== moduleFilter) return false;
      if (matiereFilter !== "all" && d.matiere !== matiereFilter) return false;
      if (s && !d.enonce.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [diffs, search, moduleFilter, matiereFilter]);

  const globalStats = useMemo(() => {
    const totalOk = stats.reduce((a, s) => a + s.ok, 0);
    const totalKo = stats.reduce((a, s) => a + s.ko, 0);
    const totalHors = stats.reduce((a, s) => a + s.hors_source, 0);
    return { totalOk, totalKo, totalHors, modulesKo: stats.filter(s => s.ko > 0).length };
  }, [stats]);

  const toggle = (key: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };

  const renderChoix = (choix: Choix[], other: Choix[]) => (
    <ul className="space-y-1">
      {choix.map(c => {
        const o = other.find(x => x.lettre === c.lettre);
        const correctMismatch = !!o && Boolean(o.correct) !== Boolean(c.correct);
        const textMismatch = !!o && normalize(o.texte) !== normalize(c.texte);
        return (
          <li key={c.lettre} className="text-xs flex gap-2 items-start">
            <span className="font-mono font-semibold shrink-0">{c.lettre}.</span>
            <span className={c.correct ? "text-green-700 font-medium" : "text-muted-foreground"}>
              {c.correct ? "✓ " : "○ "}{c.texte}
            </span>
            {correctMismatch && <Badge variant="destructive" className="text-[10px]">✗ réponse</Badge>}
            {textMismatch && !correctMismatch && <Badge variant="outline" className="text-[10px]">texte diff.</Badge>}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="container mx-auto py-6 space-y-4 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit de parité — Tous les modules</h1>
          <p className="text-sm text-muted-foreground">
            Compare chaque question stockée en base avec la source pédagogique
            (T3P, Anglais, Français, Gestion, Sécurité Routière, Réglementation, Dév. Commercial).
          </p>
        </div>
        <Button onClick={run} disabled={loading} variant="outline" size="sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Rafraîchir
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Questions conformes</div>
          <div className="text-2xl font-bold text-green-700">{globalStats.totalOk}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Questions divergentes</div>
          <div className="text-2xl font-bold text-destructive">{globalStats.totalKo}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Modules avec écarts</div>
          <div className="text-2xl font-bold text-orange-600">{globalStats.modulesKo}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Hors source (ignorées)</div>
          <div className="text-2xl font-bold text-muted-foreground">{globalStats.totalHors}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">État par module</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {stats.map(m => {
              const ok = m.ko === 0;
              return (
                <button
                  key={m.id}
                  onClick={() => setModuleFilter(moduleFilter === m.id ? "all" : m.id)}
                  className={`text-left p-2 rounded border transition ${
                    moduleFilter === m.id ? "ring-2 ring-primary" : ""
                  } ${ok ? "border-green-500/40 bg-green-50 dark:bg-green-950/20" : "border-destructive/40 bg-destructive/5"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold truncate">{m.name}</span>
                    {ok
                      ? <Badge className="bg-green-600 hover:bg-green-600 shrink-0">OK</Badge>
                      : <Badge variant="destructive" className="shrink-0">{m.ko} KO</Badge>}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    ✓ {m.ok} · ✗ {m.ko} · ⚪ {m.hors_source}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un énoncé…" className="pl-9" />
        </div>
        <select
          value={String(moduleFilter)}
          onChange={e => setModuleFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="text-sm border rounded px-2 py-2 bg-background"
        >
          <option value="all">Tous les modules</option>
          {stats.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select
          value={matiereFilter}
          onChange={e => setMatiereFilter(e.target.value)}
          className="text-sm border rounded px-2 py-2 bg-background"
        >
          {matieres.map(m => <option key={m} value={m}>{m === "all" ? "Toutes matières" : m}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto text-green-600 mb-2" />
          Aucune divergence à afficher avec ce filtre.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((d, idx) => {
            const key = `${d.moduleId}-${idx}`;
            const isOpen = expanded.has(key);
            return (
              <Card key={key} className="border-destructive/50">
                <button
                  className="w-full text-left p-4 flex items-start gap-3 hover:bg-muted/50 transition"
                  onClick={() => toggle(key)}
                >
                  {isOpen ? <ChevronDown className="h-4 w-4 mt-1 shrink-0" /> : <ChevronRight className="h-4 w-4 mt-1 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />KO</Badge>
                      <Badge variant="outline" className="text-[10px]">{d.moduleName}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{d.matiere}</Badge>
                      <span className="text-xs text-muted-foreground truncate">{d.exerciceTitre}</span>
                    </div>
                    <p className="text-sm mt-1 line-clamp-2">{d.enonce}</p>
                  </div>
                </button>
                {isOpen && (
                  <CardContent className="pt-0 pb-4 border-t bg-muted/20">
                    <div className="mb-3 text-xs bg-destructive/10 border border-destructive/30 rounded p-2 space-y-0.5">
                      {d.issues.map((i, k) => <div key={k}>• {i}</div>)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className="border rounded p-3 bg-green-50 dark:bg-green-950/20 border-green-500/40">
                        <div className="text-xs font-semibold text-green-700 mb-2">Source pédagogique (référence)</div>
                        {renderChoix(d.sourceChoix, d.moduleChoix)}
                      </div>
                      <div className="border rounded p-3 border-destructive/40 bg-destructive/5">
                        <div className="text-xs font-semibold mb-2">{d.moduleName}</div>
                        {renderChoix(d.moduleChoix, d.sourceChoix)}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
