import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { Question } from "./examens-blancs-data";
import {
  chargerQcmBilans,
  filtrerQcmBilans,
  type QcmBilan,
  type SourceBilanQcm,
} from "./qcmBilans";

const texteLisible = (value: unknown) => String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export function AjouterQcmMenu({
  matiereNom,
  onNouveau,
  onImporter,
}: {
  matiereNom: string;
  onNouveau: () => void;
  onImporter: (question: Question) => void;
}) {
  const [source, setSource] = useState<SourceBilanQcm | null>(null);
  const [rows, setRows] = useState<QcmBilan[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    void chargerQcmBilans(source)
      .then((data) => { if (!cancelled) setRows(data); })
      .catch(() => { if (!cancelled) { setRows([]); setError(true); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [source, reload]);

  const filtered = useMemo(() => filtrerQcmBilans(rows, query), [rows, query]);
  const sourceLabel = source === "examen" ? "Bilan examen" : "Bilan exercices";
  const close = () => { setSource(null); setQuery(""); setRows([]); setError(false); };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="gap-1">
            <Plus className="w-3 h-3" />
            Ajouter un QCM
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={onNouveau}>Créer un nouveau QCM</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSource("exercices")}>Reprendre dans un Bilan exercices</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setSource("examen")}>Reprendre dans un Bilan examen</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={source !== null} onOpenChange={(open) => { if (!open) close(); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Reprendre un QCM — {sourceLabel}</DialogTitle>
            <DialogDescription>
              La question sera copiée dans « {matiereNom} » avec un nouvel identifiant. Le bilan d’origine ne sera pas modifié.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher dans les énoncés et les propositions…"
              className="pl-9"
            />
          </div>
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement des QCM enregistrés…</p>
          ) : error ? (
            <div className="space-y-3" role="alert">
              <p className="text-sm text-destructive">Les QCM de cette source sont indisponibles. Aucune question n’a été ajoutée.</p>
              <Button variant="outline" size="sm" onClick={() => setReload((value) => value + 1)}>Réessayer</Button>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">{filtered.length} QCM affiché{filtered.length > 1 ? "s" : ""}{query ? " pour cette recherche" : ""}</p>
              <div className="min-h-0 overflow-y-auto divide-y rounded-lg border">
                {filtered.map((row) => (
                  <button
                    type="button"
                    key={row.key}
                    className="w-full px-4 py-3 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => { onImporter(row.question); close(); }}
                  >
                    <span className="block text-xs text-muted-foreground">{row.moduleNom} — {row.exerciceTitre}</span>
                    <span className="mt-1 block text-sm font-medium break-words">{texteLisible(row.question.enonce) || "Question sans énoncé"}</span>
                    <span className="mt-2 grid gap-1">
                      {(row.question.choix ?? []).map((choix, index) => (
                        <span key={`${choix.lettre}:${index}`} className={`flex items-start gap-2 text-xs ${choix.correct ? "text-primary font-medium" : "text-muted-foreground"}`}>
                          <span className="w-4 shrink-0">{choix.lettre}.</span>
                          <span className="flex-1 break-words">{texteLisible(choix.texte)}</span>
                          {choix.correct && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-label="Bonne réponse" />}
                        </span>
                      ))}
                    </span>
                  </button>
                ))}
                {!filtered.length && <p className="px-4 py-6 text-sm text-muted-foreground">Aucun QCM ne correspond à cette recherche.</p>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
