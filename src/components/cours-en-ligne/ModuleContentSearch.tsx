import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, X, BookOpen, ClipboardList, MessageSquareText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { searchModuleContent, setSearchFocus, SEARCHABLE_MODULES, type ModuleSearchResult } from "./module-content-search";
import {
  exercicesAffichesPourRecherche,
  SEARCH_CANONICAL_QUIZ_IDS,
  type SearchCanonicalBinding,
  type SearchCanonicalRow,
} from "./module-search-display";

const KIND_LABEL: Record<ModuleSearchResult["kind"], string> = {
  cours: "Cours",
  exercice: "Exercice",
  question: "Question",
};

const KindIcon = ({ kind }: { kind: ModuleSearchResult["kind"] }) => {
  if (kind === "cours") return <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />;
  if (kind === "exercice") return <ClipboardList className="w-4 h-4 text-muted-foreground shrink-0" />;
  return <MessageSquareText className="w-4 h-4 text-muted-foreground shrink-0" />;
};

interface Props {
  onOpenModule: (module: { id: number; nom: string }) => void;
}

/** Recherche de notions, cours et exercices dans tous les modules (lecture seule) */
export default function ModuleContentSearch({ onOpenModule }: Props) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [overrides, setOverrides] = useState<Record<number, any>>({});
  const [loadingOverrides, setLoadingOverrides] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("module_editor_state").select("module_id, module_data");
      if (cancelled) return;
      const map: Record<number, any> = {};
      (data || []).forEach((row: any) => {
        if (row?.module_data && typeof row.module_data === "object") map[Number(row.module_id)] = row.module_data;
      });
      // Questions réellement affichées par les modules (banque + sélection) :
      // une question masquée de l'affichage ne doit pas être proposée.
      try {
        const quizIds = [...new Set(Object.values(SEARCH_CANONICAL_QUIZ_IDS).flat())];
        const rows: SearchCanonicalRow[] = [];
        for (let from = 0; ; from += 1000) {
          const { data: page, error } = await supabase
            .from("quiz_questions")
            .select("question_id,quiz_id,section_id,legacy_question_id,position,enonce,choix,explication,active")
            .in("quiz_id", quizIds)
            .order("question_id")
            .range(from, from + 999);
          if (error) throw error;
          rows.push(...((page ?? []) as unknown as SearchCanonicalRow[]));
          if (!page || page.length < 1000) break;
        }
        const { data: bindings, error: bErr } = await supabase
          .from("quiz_question_bindings")
          .select("module_id,quiz_id,exercise_id,section_id")
          .in("module_id", Object.keys(SEARCH_CANONICAL_QUIZ_IDS).map(Number));
        if (bErr) throw bErr;
        if (cancelled) return;
        for (const mod of SEARCHABLE_MODULES) {
          if (!SEARCH_CANONICAL_QUIZ_IDS[mod.id]) continue;
          const base = map[mod.id] && Array.isArray(map[mod.id].exercices) ? map[mod.id].exercices : mod.exercices;
          const exercices = exercicesAffichesPourRecherche(mod.id, base, rows, (bindings ?? []) as SearchCanonicalBinding[]);
          map[mod.id] = { ...(map[mod.id] ?? { cours: mod.cours }), exercices };
        }
      } catch (e) {
        console.warn("[Recherche modules] Banque de questions indisponible, recherche sur le contenu enregistré", e);
      }
      if (cancelled) return;
      setOverrides(map);
      setLoadingOverrides(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(
    () => (debounced.trim().length < 2 ? [] : searchModuleContent(debounced, overrides)),
    [debounced, overrides],
  );

  const grouped = useMemo(() => {
    const byModule = new Map<number, { nom: string; items: ModuleSearchResult[] }>();
    results.forEach((r) => {
      if (!byModule.has(r.moduleId)) byModule.set(r.moduleId, { nom: r.moduleNom, items: [] });
      byModule.get(r.moduleId)!.items.push(r);
    });
    return Array.from(byModule.entries());
  }, [results]);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une notion, un cours ou un exercice (ex : TVA, ceinture, licence...)"
            className="pl-9 pr-9"
          />
          {query && (
            <button
              type="button"
              aria-label="Effacer la recherche"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {loadingOverrides && query.trim().length >= 2 && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Chargement du contenu à jour…
          </p>
        )}

        {debounced.trim().length >= 2 && !loadingOverrides && results.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun cours, exercice ou question ne correspond à cette recherche.</p>
        )}

        {results.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              {results.length} résultat{results.length > 1 ? "s" : ""} dans {grouped.length} module
              {grouped.length > 1 ? "s" : ""}
            </p>
            <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
              {grouped.map(([moduleId, group]) => (
                <div key={moduleId} className="border rounded-lg">
                  <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/50 border-b">
                    <span className="font-medium text-sm">{group.nom}</span>
                    <Button size="sm" variant="outline" onClick={() => onOpenModule({ id: moduleId, nom: group.nom })}>
                      Ouvrir le module
                    </Button>
                  </div>
                  <ul className="divide-y">
                    {group.items.map((r) => (
                      <li
                        key={r.key}
                        role="button"
                        tabIndex={0}
                        title="Ouvrir dans l'éditeur"
                        data-target={`${r.exerciceId}-${r.questionId}`}
                        onClick={() => {
                          setSearchFocus(r.exerciceId != null ? { moduleId, exerciceId: r.exerciceId, questionId: r.questionId } : null);
                          onOpenModule({ id: moduleId, nom: group.nom });
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget as HTMLElement).click(); }}
                        className="px-3 py-2 flex items-start gap-2 cursor-pointer hover:bg-muted/40"
                      >
                        <KindIcon kind={r.kind} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-[11px]">{KIND_LABEL[r.kind]}</Badge>
                            <span className="text-sm font-medium break-words">{r.titre}</span>
                          </div>
                          {r.contexte && <p className="text-xs text-muted-foreground mt-0.5">{r.contexte}</p>}
                          {r.extrait && <p className="text-xs text-muted-foreground mt-1">{r.extrait}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
