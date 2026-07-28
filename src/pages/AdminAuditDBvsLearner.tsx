import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { ALL_MODULES } from "@/components/cours-en-ligne/modules-config";

// ─── Types ────────────────────────────────────────────────────────────
interface Choix {
  lettre?: string;
  texte?: string;
  correct?: boolean;
}
interface Question {
  id?: number | string;
  type?: string;
  enonce?: string;
  choix?: Choix[];
  reponseCorrecte?: string | string[];
  reponseQRC?: string;
  manually_edited?: boolean;
  _editedAt?: string;
}
interface Exercice {
  id?: string;
  titre?: string;
  questions?: Question[];
}

// ─── Helpers ──────────────────────────────────────────────────────────
const norm = (s: any) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Ce que le SCORE côté apprenant considère comme la bonne réponse :
 * les lettres des choix dont `correct === true`, triées.
 * (cf. examens-blancs-consistency.ts:computeLearnerExpected)
 */
function learnerCorrect(q: Question): string {
  if ((q.type || "QCM").toUpperCase() === "QRC") {
    return norm(q.reponseQRC || "");
  }
  const letters = (q.choix || [])
    .filter((c) => c?.correct === true)
    .map((c) => String(c?.lettre || "").toUpperCase().trim())
    .filter(Boolean)
    .sort();
  return letters.join("|");
}

/**
 * Ce que l'ADMIN VOIT dans la correction : le champ texte `reponseCorrecte`
 * (celui affiché en vert dans la fiche question). C'est la « vérité admin ».
 * On le normalise en lettres A/B/C/D si possible pour comparaison directe.
 */
function adminDisplayed(q: Question): string {
  if ((q.type || "QCM").toUpperCase() === "QRC") {
    return norm(q.reponseQRC || "");
  }
  const raw = q.reponseCorrecte;
  if (raw == null) return "";
  const arr = Array.isArray(raw) ? raw : String(raw).split(/[,;|/]+/);
  const letters = arr
    .map((x) => String(x).trim().toUpperCase())
    .map((x) => {
      // Si l'admin a stocké le texte complet plutôt que la lettre,
      // on retrouve la lettre correspondante dans les choix.
      if (/^[A-Z]$/.test(x)) return x;
      const match = (q.choix || []).find(
        (c) => norm(c?.texte) === norm(x),
      );
      return match?.lettre?.toUpperCase() || x;
    })
    .filter(Boolean)
    .sort();
  return letters.join("|");
}

interface Divergence {
  moduleId: number;
  moduleName: string;
  exerciceId: string;
  exerciceTitre: string;
  questionId: string;
  type: string;
  enonce: string;
  admin: string;
  learner: string;
  choix: Choix[];
  manuallyEdited: boolean;
  editedAt?: string;
}

interface ModuleStat {
  id: number;
  name: string;
  ok: number;
  ko: number;
  qrc: number;
}

export default function AdminAuditDBvsLearner() {
  const [loading, setLoading] = useState(true);
  const [divergences, setDivergences] = useState<Divergence[]>([]);
  const [stats, setStats] = useState<ModuleStat[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<number | "all">("all");
  const [onlyMismatches, setOnlyMismatches] = useState(true);

  const run = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("module_editor_state")
        .select("module_id, module_data, updated_at");
      if (error) throw error;

      const nameById = new Map(ALL_MODULES.map((m) => [m.id, m.nom]));
      const koList: Divergence[] = [];
      const statMap = new Map<number, ModuleStat>();

      for (const row of (data ?? []) as any[]) {
        const modId = Number(row.module_id);
        const modName = nameById.get(modId) || `Module ${modId}`;
        const stat: ModuleStat =
          statMap.get(modId) || { id: modId, name: modName, ok: 0, ko: 0, qrc: 0 };
        const exos: Exercice[] = Array.isArray(row.module_data?.exercices)
          ? row.module_data.exercices
          : [];
        for (const exo of exos) {
          for (const q of exo.questions || []) {
            if (!q) continue;
            const admin = adminDisplayed(q);
            const learner = learnerCorrect(q);
            const type = (q.type || "QCM").toUpperCase();
            if (type === "QRC") stat.qrc++;
            if (admin === learner && admin !== "") {
              stat.ok++;
            } else if (admin === "" && learner === "") {
              // Aucune bonne réponse renseignée du tout — signalé mais neutre
              stat.ok++;
            } else {
              stat.ko++;
              koList.push({
                moduleId: modId,
                moduleName: modName,
                exerciceId: String(exo.id || ""),
                exerciceTitre: String(exo.titre || ""),
                questionId: String(q.id ?? ""),
                type,
                enonce: q.enonce || "",
                admin,
                learner,
                choix: q.choix || [],
                manuallyEdited: Boolean(q.manually_edited),
                editedAt: q._editedAt,
              });
            }
          }
        }
        statMap.set(modId, stat);
      }

      setDivergences(koList);
      setStats([...statMap.values()].sort((a, b) => a.id - b.id));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    run();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return divergences.filter((d) => {
      if (moduleFilter !== "all" && d.moduleId !== moduleFilter) return false;
      if (s && !`${d.enonce} ${d.exerciceTitre} ${d.questionId}`.toLowerCase().includes(s))
        return false;
      return true;
    });
  }, [divergences, search, moduleFilter]);

  const global = useMemo(() => {
    const ok = stats.reduce((a, s) => a + s.ok, 0);
    const ko = stats.reduce((a, s) => a + s.ko, 0);
    const modKo = stats.filter((s) => s.ko > 0).length;
    return { ok, ko, modKo, total: ok + ko };
  }, [stats]);

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  return (
    <div className="container mx-auto py-6 space-y-4 max-w-7xl">
      <div className="flex items-center gap-2">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Audit DB vs Apprenant — Par question</h1>
          <p className="text-sm text-muted-foreground">
            Pour chaque question stockée dans <code>module_editor_state</code>, compare la
            « bonne réponse affichée à l'admin » (<code>reponseCorrecte</code>) avec la
            « bonne réponse utilisée pour noter l'apprenant » (
            <code>choix[].correct</code>). Toute divergence = risque de note faussée.
          </p>
        </div>
        <div className="ml-auto">
          <Button onClick={run} disabled={loading} variant="outline" size="sm">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Rafraîchir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Questions conformes</div>
            <div className="text-2xl font-bold text-green-700">{global.ok}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Divergences DB vs apprenant</div>
            <div className="text-2xl font-bold text-destructive">{global.ko}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Modules impactés</div>
            <div className="text-2xl font-bold text-orange-600">{global.modKo}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total analysé</div>
            <div className="text-2xl font-bold">{global.total}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">État par module</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {stats.map((m) => {
              const ok = m.ko === 0;
              return (
                <button
                  key={m.id}
                  onClick={() =>
                    setModuleFilter(moduleFilter === m.id ? "all" : m.id)
                  }
                  className={`text-left p-2 rounded border transition ${
                    moduleFilter === m.id ? "ring-2 ring-primary" : ""
                  } ${
                    ok
                      ? "border-green-500/40 bg-green-50 dark:bg-green-950/20"
                      : "border-destructive/40 bg-destructive/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold truncate">{m.name}</span>
                    {ok ? (
                      <Badge className="bg-green-600 hover:bg-green-600 shrink-0">OK</Badge>
                    ) : (
                      <Badge variant="destructive" className="shrink-0">
                        {m.ko} KO
                      </Badge>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    ✓ {m.ok} · ✗ {m.ko} · QRC {m.qrc}
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
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un énoncé, un ID de question…"
            className="pl-9"
          />
        </div>
        <select
          value={String(moduleFilter)}
          onChange={(e) =>
            setModuleFilter(e.target.value === "all" ? "all" : Number(e.target.value))
          }
          className="text-sm border rounded px-2 py-2 bg-background"
        >
          <option value="all">Tous les modules</option>
          {stats.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto text-green-600 mb-2" />
            Aucune divergence détectée avec ce filtre.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((d, idx) => {
            const key = `${d.moduleId}-${d.exerciceId}-${d.questionId}-${idx}`;
            const isOpen = expanded.has(key);
            return (
              <Card key={key} className="border-destructive/50">
                <button
                  className="w-full text-left p-4 flex items-start gap-3 hover:bg-muted/50 transition"
                  onClick={() => toggle(key)}
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 mt-1 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mt-1 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Divergence
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {d.moduleName}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {d.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        {d.exerciceTitre} · Q{d.questionId}
                      </span>
                      {d.manuallyEdited && (
                        <Badge variant="outline" className="text-[10px]">
                          édité manuellement
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm mt-1 line-clamp-2">{d.enonce}</p>
                    <div className="mt-2 flex gap-3 text-xs">
                      <span className="text-emerald-700">
                        Admin : <b>{d.admin || "∅"}</b>
                      </span>
                      <span className="text-destructive">
                        Apprenant : <b>{d.learner || "∅"}</b>
                      </span>
                    </div>
                  </div>
                </button>
                {isOpen && (
                  <CardContent className="pt-0 pb-4 border-t bg-muted/20">
                    <div className="mb-3 text-xs bg-destructive/10 border border-destructive/30 rounded p-2 flex gap-2 items-start">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <div>
                          <b>Admin affiche</b> <code>reponseCorrecte</code> = «{" "}
                          {d.admin || "∅"} »
                        </div>
                        <div>
                          <b>Apprenant est noté</b> sur <code>choix[].correct</code> = «{" "}
                          {d.learner || "∅"} »
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          L'apprenant peut voir/cocher une réponse marquée juste par le
                          moteur de notation alors que l'admin en voit une autre en
                          correction — ou l'inverse.
                        </div>
                      </div>
                    </div>
                    {d.type === "QCM" && (
                      <div className="border rounded p-3 bg-background">
                        <div className="text-xs font-semibold mb-2">
                          Choix stockés (source unique)
                        </div>
                        <ul className="space-y-1">
                          {d.choix.map((c, i) => {
                            const letter = String(c.lettre || "").toUpperCase();
                            const isLearner = d.learner
                              .split("|")
                              .includes(letter);
                            const isAdmin = d.admin.split("|").includes(letter);
                            return (
                              <li
                                key={i}
                                className="text-xs flex gap-2 items-start"
                              >
                                <span className="font-mono font-semibold shrink-0">
                                  {letter}.
                                </span>
                                <span
                                  className={
                                    c.correct
                                      ? "text-green-700 font-medium"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {c.correct ? "✓ " : "○ "}
                                  {c.texte}
                                </span>
                                {isAdmin && (
                                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px]">
                                    admin
                                  </Badge>
                                )}
                                {isLearner && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[10px]"
                                  >
                                    apprenant
                                  </Badge>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {d.editedAt && (
                      <div className="mt-2 text-[10px] text-muted-foreground">
                        Dernière édition manuelle : {d.editedAt}
                      </div>
                    )}
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
