import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Loader2, RefreshCw, Search, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { T3P_EXERCICES } from "@/components/cours-en-ligne/exercices/t3p-exercices-data";

const T3P_MODULE_IDS = [2, 4, 9, 10, 25, 39];

interface Choix { lettre: string; texte: string; correct?: boolean }
interface Question { enonce: string; choix: Choix[] }

interface QuestionDiff {
  enonce: string;
  sourceChoix: Choix[];
  modulesData: Record<number, Choix[] | null>;
  status: "ok" | "ko_missing" | "ko_diff";
  issues: string[];
}

const normalize = (s: string) =>
  String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ").replace(/[^\p{L}\p{N} ]+/gu, "").trim();

const choixSignature = (choix: Choix[]): string =>
  [...(choix ?? [])]
    .sort((a, b) => (a.lettre ?? "").localeCompare(b.lettre ?? ""))
    .map((c) => `${c.lettre}:${normalize(c.texte)}=${c.correct ? "1" : "0"}`)
    .join("||");

const correctSignature = (choix: Choix[]): string =>
  [...(choix ?? [])]
    .filter((c) => c.correct)
    .map((c) => c.lettre)
    .sort()
    .join(",");

function buildSourceQuestions(): Question[] {
  return T3P_EXERCICES.flatMap((e) => e.questions ?? []);
}

async function fetchModulesQuestions(): Promise<Record<number, Question[]>> {
  const { data, error } = await supabase
    .from("module_editor_state")
    .select("module_id, module_data")
    .in("module_id", T3P_MODULE_IDS);
  if (error) throw error;

  const out: Record<number, Question[]> = {};
  for (const id of T3P_MODULE_IDS) out[id] = [];

  for (const row of (data ?? []) as any[]) {
    const modId = row.module_id;
    const md = row.module_data;
    const exos = Array.isArray(md?.exercices) ? md.exercices : [];
    for (const exo of exos) {
      const titre = String(exo?.titre ?? "");
      // Cible uniquement les exercices T3P (Bilan T3P inclus)
      if (!/T3P/i.test(titre)) continue;
      const qs = Array.isArray(exo?.questions) ? exo.questions : [];
      for (const q of qs) {
        out[modId].push({ enonce: q?.enonce ?? "", choix: Array.isArray(q?.choix) ? q.choix : [] });
      }
    }
  }
  return out;
}

function compareChoix(source: Choix[], target: Choix[]): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  if (correctSignature(source) !== correctSignature(target)) {
    issues.push(`Bonnes réponses différentes (source: ${correctSignature(source) || "∅"}, module: ${correctSignature(target) || "∅"})`);
  }
  const srcLetters = source.map((c) => c.lettre).sort().join(",");
  const tgtLetters = target.map((c) => c.lettre).sort().join(",");
  if (srcLetters !== tgtLetters) {
    issues.push(`Options différentes (source: ${srcLetters}, module: ${tgtLetters})`);
  }
  return { ok: issues.length === 0, issues };
}

export default function AdminAuditT3P() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<QuestionDiff[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "ko">("ko");
  const [search, setSearch] = useState("");

  const run = async () => {
    setLoading(true);
    try {
      const source = buildSourceQuestions();
      const modulesQ = await fetchModulesQuestions();

      const diffs: QuestionDiff[] = source.map((sq) => {
        const key = normalize(sq.enonce);
        const modulesData: Record<number, Choix[] | null> = {};
        const issues: string[] = [];
        let missing = 0;
        let diff = 0;

        for (const modId of T3P_MODULE_IDS) {
          const found = (modulesQ[modId] ?? []).find((q) => normalize(q.enonce) === key);
          if (!found) {
            modulesData[modId] = null;
            missing++;
            issues.push(`Module ${modId} : question absente`);
            continue;
          }
          modulesData[modId] = found.choix;
          const cmp = compareChoix(sq.choix, found.choix);
          if (!cmp.ok) {
            diff++;
            issues.push(`Module ${modId} : ${cmp.issues.join(" ; ")}`);
          }
        }

        const status: QuestionDiff["status"] =
          missing > 0 ? "ko_missing" : diff > 0 ? "ko_diff" : "ok";
        return { enonce: sq.enonce, sourceChoix: sq.choix, modulesData, status, issues };
      });
      setRows(diffs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { run(); }, []);

  const stats = useMemo(() => {
    const ok = rows.filter((r) => r.status === "ok").length;
    const koMissing = rows.filter((r) => r.status === "ko_missing").length;
    const koDiff = rows.filter((r) => r.status === "ko_diff").length;

    const perModule = T3P_MODULE_IDS.map((id) => {
      let mOk = 0, mKo = 0, mMissing = 0;
      for (const r of rows) {
        const c = r.modulesData[id];
        if (!c) { mMissing++; continue; }
        const cmp = compareChoix(r.sourceChoix, c);
        if (cmp.ok) mOk++; else mKo++;
      }
      return { id, ok: mOk, ko: mKo, missing: mMissing };
    });

    return { ok, koMissing, koDiff, perModule, total: rows.length };
  }, [rows]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "ko" && r.status === "ok") return false;
      if (s && !r.enonce.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [rows, filter, search]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };

  const renderChoixList = (choix: Choix[] | null | undefined, sourceChoix: Choix[]) => {
    if (!choix) return <span className="text-destructive text-xs">Absent</span>;
    return (
      <ul className="space-y-1">
        {choix.map((c) => {
          const src = sourceChoix.find((sc) => sc.lettre === c.lettre);
          const correctMismatch = !!src && Boolean(src.correct) !== Boolean(c.correct);
          const textMismatch = !!src && normalize(src.texte) !== normalize(c.texte);
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
  };

  return (
    <div className="container mx-auto py-6 space-y-4 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit de parité T3P</h1>
          <p className="text-sm text-muted-foreground">
            Comparaison automatique entre la source pédagogique et chaque module en base
            ({T3P_MODULE_IDS.join(", ")}).
          </p>
        </div>
        <Button onClick={run} disabled={loading} variant="outline" size="sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Rafraîchir
        </Button>
      </div>

      {/* Résumé global */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Questions source</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Parité OK</div>
          <div className="text-2xl font-bold text-green-700">{stats.ok}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Réponses divergentes</div>
          <div className="text-2xl font-bold text-destructive">{stats.koDiff}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Questions manquantes</div>
          <div className="text-2xl font-bold text-orange-600">{stats.koMissing}</div>
        </CardContent></Card>
      </div>

      {/* Résumé par module */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">État par module</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {stats.perModule.map((m) => {
              const totalKo = m.ko + m.missing;
              const ok = totalKo === 0;
              return (
                <div key={m.id} className={`p-3 rounded-lg border ${ok ? "border-green-500/40 bg-green-50 dark:bg-green-950/20" : "border-destructive/40 bg-destructive/5"}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Module {m.id}</span>
                    {ok
                      ? <Badge className="bg-green-600 hover:bg-green-600">OK</Badge>
                      : <Badge variant="destructive">KO</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    <div>✓ {m.ok} conformes</div>
                    {m.ko > 0 && <div className="text-destructive">✗ {m.ko} divergentes</div>}
                    {m.missing > 0 && <div className="text-orange-600">⚠ {m.missing} absentes</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un énoncé…" className="pl-9" />
        </div>
        <Button size="sm" variant={filter === "ko" ? "default" : "outline"} onClick={() => setFilter("ko")}>
          KO uniquement ({stats.koDiff + stats.koMissing})
        </Button>
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
          Tout ({stats.total})
        </Button>
      </div>

      {/* Liste des questions */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto text-green-600 mb-2" />
          Aucune question à afficher avec ce filtre.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r, idx) => {
            const key = `${idx}-${r.enonce.slice(0, 40)}`;
            const isOpen = expanded.has(key);
            return (
              <Card key={key} className={r.status === "ok" ? "" : "border-destructive/50"}>
                <button
                  className="w-full text-left p-4 flex items-start gap-3 hover:bg-muted/50 transition"
                  onClick={() => toggle(key)}
                >
                  {isOpen ? <ChevronDown className="h-4 w-4 mt-1 shrink-0" /> : <ChevronRight className="h-4 w-4 mt-1 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.status === "ok"
                        ? <Badge className="bg-green-600 hover:bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />OK</Badge>
                        : r.status === "ko_diff"
                          ? <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Réponses différentes</Badge>
                          : <Badge className="bg-orange-500 hover:bg-orange-500"><AlertTriangle className="h-3 w-3 mr-1" />Question absente</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {T3P_MODULE_IDS.filter((id) => {
                          const c = r.modulesData[id];
                          if (!c) return false;
                          return compareChoix(r.sourceChoix, c).ok;
                        }).length} / {T3P_MODULE_IDS.length} modules conformes
                      </span>
                    </div>
                    <p className="text-sm mt-1 line-clamp-2">{r.enonce}</p>
                  </div>
                </button>

                {isOpen && (
                  <CardContent className="pt-0 pb-4 border-t bg-muted/20">
                    {r.issues.length > 0 && (
                      <div className="mb-3 text-xs bg-destructive/10 border border-destructive/30 rounded p-2 space-y-0.5">
                        {r.issues.map((i, k) => <div key={k}>• {i}</div>)}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                      <div className="border rounded p-3 bg-green-50 dark:bg-green-950/20 border-green-500/40">
                        <div className="text-xs font-semibold text-green-700 mb-2">Source pédagogique (référence)</div>
                        {renderChoixList(r.sourceChoix, r.sourceChoix)}
                      </div>
                      {T3P_MODULE_IDS.map((id) => {
                        const c = r.modulesData[id];
                        const cmp = c ? compareChoix(r.sourceChoix, c) : { ok: false, issues: ["absente"] };
                        return (
                          <div key={id} className={`border rounded p-3 ${cmp.ok ? "border-border" : "border-destructive/40 bg-destructive/5"}`}>
                            <div className="text-xs font-semibold mb-2 flex items-center justify-between">
                              <span>Module {id}</span>
                              {cmp.ok
                                ? <Badge className="bg-green-600 hover:bg-green-600 text-[10px]">OK</Badge>
                                : <Badge variant="destructive" className="text-[10px]">KO</Badge>}
                            </div>
                            {renderChoixList(c, r.sourceChoix)}
                          </div>
                        );
                      })}
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
