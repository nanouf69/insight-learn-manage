import { useState, useEffect, useCallback } from "react";
import { Search, User, GraduationCap, Calendar, Loader2 } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";

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
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const searchTerm = `%${term}%`;

      const [apprenants, formations, sessions] = await Promise.all([
        supabase
          .from("apprenants")
          .select("id, nom, prenom, email, telephone")
          .or(`nom.ilike.${searchTerm},prenom.ilike.${searchTerm},email.ilike.${searchTerm},telephone.ilike.${searchTerm}`)
          .limit(5),
        supabase
          .from("formations")
          .select("id, nom, description")
          .or(`nom.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(5),
        supabase
          .from("sessions")
          .select("id, nom, lieu, date_debut, date_fin")
          .or(`nom.ilike.${searchTerm},lieu.ilike.${searchTerm}`)
          .limit(5),
      ]);

      const mapped: SearchResult[] = [
        ...(apprenants.data || []).map((a) => ({
          id: a.id,
          label: `${a.prenom} ${a.nom}`,
          sublabel: a.email || a.telephone || undefined,
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

      setResults(mapped);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

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

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Rechercher un apprenant, formation, session..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
          )}
          {!loading &&
            Object.entries(grouped).map(([type, items]) => {
              const Icon = iconMap[type as keyof typeof iconMap];
              return (
                <CommandGroup key={type} heading={groupLabels[type as keyof typeof groupLabels]}>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
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
