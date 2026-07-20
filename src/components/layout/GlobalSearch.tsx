import { useState, useEffect, useCallback } from "react";
import { Search, User, GraduationCap, Calendar, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { filterAndSortApprenants } from "@/lib/apprenantSearch";

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  type: "apprenant" | "formation" | "session";
}

interface GlobalSearchProps {
  onSelectApprenant?: (id: string) => void;
  onNavigate?: (page: string) => void;
}

export function GlobalSearch({ onSelectApprenant, onNavigate }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: allApprenants = [], isFetching: loadingApprenants } = useQuery({
    queryKey: ["global-search-apprenants"],
    enabled: open,
    staleTime: 60_000,
    queryFn: async () => {
      const columns = "id, nom, prenom, email, telephone, numero_dossier_cma, type_apprenant, formation_choisie";
      const pageSize = 1000;
      let from = 0;
      const rows: any[] = [];

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from("apprenants")
          .select(columns as any)
          .is("deleted_at" as any, null)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }

      return rows;
    },
  });

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const search = useCallback(async (term: string) => {
    const cleaned = term.trim().replace(/\s+/g, " ");
    if (cleaned.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const fullPattern = `%${cleaned}%`;
      const apprenantResults = filterAndSortApprenants(allApprenants, cleaned).slice(0, 20);

      const [formations, sessions] = await Promise.all([
        supabase
          .from("formations")
          .select("id, nom, description")
          .or(`nom.ilike.${fullPattern},description.ilike.${fullPattern}`)
          .limit(5),
        supabase
          .from("sessions")
          .select("id, nom, lieu, date_debut, date_fin")
          .or(`nom.ilike.${fullPattern},lieu.ilike.${fullPattern}`)
          .limit(5),
      ]);

      const mapped: SearchResult[] = [
        ...apprenantResults.map((a) => ({
          id: a.id,
          label: `${a.prenom} ${a.nom}`,
          sublabel: a.email || a.telephone || a.numero_dossier_cma || undefined,
          type: "apprenant" as const,
        })),
        ...(formations.data || []).map((f) => ({
          id: f.id,
          label: f.nom,
          sublabel: f.description?.substring(0, 60) || undefined,
          type: "formation" as const,
        })),
        ...(sessions.data || []).map((s) => ({
          id: s.id,
          label: s.nom || `Session ${s.date_debut}`,
          sublabel: s.lieu || undefined,
          type: "session" as const,
        })),
      ];

      setResults(
        Array.from(new Map(mapped.map((item) => [`${item.type}-${item.id}`, item])).values()),
      );
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, [allApprenants]);

  useEffect(() => {
    const timeout = setTimeout(() => search(query), 300);
    return () => clearTimeout(timeout);
  }, [query, search]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    setResults([]);

    if (result.type === "apprenant" && onSelectApprenant) {
      onSelectApprenant(result.id);
    } else if (result.type === "formation" && onNavigate) {
      onNavigate("formations");
    } else if (result.type === "session" && onNavigate) {
      onNavigate("sessions");
    }
  };

  const iconMap = {
    apprenant: User,
    formation: GraduationCap,
    session: Calendar,
  };

  const groupLabels = {
    apprenant: "Apprenants",
    formation: "Formations",
    session: "Sessions",
  };

  const grouped = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative hidden md:flex items-center gap-2 w-64 px-3 py-2 bg-muted/50 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors"
      >
        <Search className="w-4 h-4" />
        <span>Rechercher...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Rechercher un apprenant, formation, session..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {(loading || loadingApprenants) && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && !loadingApprenants && query.length >= 2 && results.length === 0 && (
            <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
          )}
          {!loading && !loadingApprenants &&
            Object.entries(grouped).map(([type, items]) => {
              const Icon = iconMap[type as keyof typeof iconMap];
              return (
                <CommandGroup key={type} heading={groupLabels[type as keyof typeof groupLabels]}>
                  {items.map((item) => (
                    <CommandItem
                      key={`${item.type}-${item.id}`}
                      value={`${item.label} ${item.sublabel || ""}`}
                      onSelect={() => handleSelect(item)}
                    >
                      <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span>{item.label}</span>
                        {item.sublabel && (
                          <span className="text-xs text-muted-foreground">{item.sublabel}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
