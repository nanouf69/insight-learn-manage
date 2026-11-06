import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, RefreshCw, RotateCcw, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { apprenantsCompletsVisibles, chargerTauxCompletApprenant, type ApprenantTauxComplet } from "@/lib/apprenantsTauxComplets";
import { safeGetItem, safeSetItem } from "@/lib/safeStorage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const DEPUIS_SEPTEMBRE = "2026-09-01";
const CONCURRENCE = 2;

function lireRetires(key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(safeGetItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch { return []; }
}

async function analyserParPetitsGroupes(
  apprenants: Array<Pick<ApprenantTauxComplet, "id" | "prenom" | "nom" | "type_apprenant" | "formation_choisie">>,
  surResultat?: (row: ApprenantTauxComplet) => void,
) {
  const resultats: ApprenantTauxComplet[] = [];
  let suivant = 0;
  async function worker() {
    while (suivant < apprenants.length) {
      const index = suivant++;
      const resultat = await chargerTauxCompletApprenant(apprenants[index]);
      resultats[index] = resultat;
      surResultat?.(resultat);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCE, apprenants.length) }, worker));
  return resultats;
}

const formatTaux = (value: number | null) => value === null
  ? "—"
  : `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;

export function ApprenantsTauxComplets({ onNavigateToApprenant }: { onNavigateToApprenant: (id: string) => void }) {
  const { user } = useAuth();
  const [partiels, setPartiels] = useState<ApprenantTauxComplet[]>([]);
  const storageKey = `dashboard-taux-complets-retires:${user?.id ?? "sans-compte"}`;
  const [retraits, setRetraits] = useState<{ key: string; ids: string[] }>(() => ({ key: storageKey, ids: lireRetires(storageKey) }));
  const [aRetirer, setARetirer] = useState<ApprenantTauxComplet | null>(null);
  const [erreurRetrait, setErreurRetrait] = useState(false);

  useEffect(() => {
    const actualiser = () => setRetraits({ key: storageKey, ids: lireRetires(storageKey) });
    actualiser();
    window.addEventListener("storage", actualiser);
    return () => window.removeEventListener("storage", actualiser);
  }, [storageKey]);

  const idsRetires = retraits.key === storageKey ? retraits.ids : lireRetires(storageKey);
  const enregistrerRetraits = (ids: string[]) => {
    if (!user) return;
    const ok = safeSetItem(storageKey, JSON.stringify(ids));
    setErreurRetrait(!ok);
    if (ok) setRetraits({ key: storageKey, ids });
  };

  const query = useQuery({
    queryKey: ["apprenants-taux-complets", DEPUIS_SEPTEMBRE],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apprenants")
        .select("id,prenom,nom,type_apprenant,formation_choisie")
        .is("deleted_at", null)
        .gte("created_at", DEPUIS_SEPTEMBRE)
        .order("nom")
        .order("prenom");
        if (error) throw error;
        setPartiels([]);
        return analyserParPetitsGroupes(data ?? [], (row) => {
          setPartiels((courants) => [...courants.filter((courant) => courant.id !== row.id), row]);
        });
    },
  });

  const toutesLignes = query.isFetching ? partiels : (query.data ?? partiels);
  const lignes = apprenantsCompletsVisibles(toutesLignes, idsRetires)
    .sort((a, b) => `${a.nom ?? ""} ${a.prenom ?? ""}`.localeCompare(`${b.nom ?? ""} ${b.prenom ?? ""}`, "fr"));
  const erreurs = toutesLignes.filter((row) => row.erreur).length;

  return <Card>
    <CardHeader className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base"><CheckCircle2 className="h-5 w-5 text-success" />Formations à 100 %{!query.isFetching && !query.isError && ` (${lignes.length})`}</CardTitle>
        <div className="flex items-center gap-1">
          {idsRetires.length > 0 && <Button variant="ghost" size="sm" onClick={() => enregistrerRetraits([])}><RotateCcw className="mr-1 h-4 w-4" />Réafficher ({idsRetires.length})</Button>}
          <Button variant="ghost" size="icon" title="Actualiser les taux" aria-label="Actualiser les taux" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} /></Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Dossiers créés depuis le 1 septembre 2026 · au moins 100 % de jalons ou 100 % au taux total.</p>
    </CardHeader>
    <CardContent className="space-y-3">
      {erreurRetrait && <p role="alert" className="text-sm text-destructive">Retrait non enregistré. La personne reste dans la liste.</p>}
      {query.isError ? <p role="alert" className="text-sm text-destructive">Lecture impossible. Aucune liste à 100 % n’est affirmée.</p>
        : <>
          {query.isFetching && <p role="status" className="text-sm text-muted-foreground">Analyse des dossiers depuis septembre… Les apprenants à 100 % s’affichent dès leur vérification.</p>}
          {erreurs > 0 && <p role="alert" className="text-sm text-destructive">{erreurs} dossier(s) ont un taux indisponible et ne sont pas classés à 100 % sans preuve.</p>}
          {!lignes.length && !query.isFetching ? <p className="text-sm text-muted-foreground">{toutesLignes.some((row) => row.complet) ? "Tous les apprenants à 100 % sont masqués. Utilisez « Réafficher » pour les retrouver." : "Aucun apprenant à 100 % dans ce périmètre."}</p>
            : lignes.length > 0 ? <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {lignes.map((row) => <div key={row.id} className="flex items-center gap-2 rounded-lg border bg-card p-3">
                <Button variant="link" className="h-auto min-w-0 flex-1 justify-start whitespace-normal p-0 text-left font-medium" onClick={() => onNavigateToApprenant(row.id)}>{[row.prenom, row.nom].filter(Boolean).join(" ")}</Button>
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  <Badge variant={row.tauxJalons !== null && row.tauxJalons >= 100 ? "default" : "outline"}>Jalons {formatTaux(row.tauxJalons)}</Badge>
                  <Badge variant={row.tauxTotal !== null && row.tauxTotal >= 100 ? "default" : "outline"}>Total {formatTaux(row.tauxTotal)}</Badge>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 text-destructive" disabled={!user} title="Retirer de cette liste uniquement" aria-label={`Retirer ${[row.prenom, row.nom].filter(Boolean).join(" ")} de la liste des taux complets`} onClick={() => setARetirer(row)}><X className="h-4 w-4" /></Button>
              </div>)}
            </div>}
        </>}
    </CardContent>
    <AlertDialog open={aRetirer !== null} onOpenChange={(open) => { if (!open) setARetirer(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retirer {[aRetirer?.prenom, aRetirer?.nom].filter(Boolean).join(" ")} de cette liste ?</AlertDialogTitle>
          <AlertDialogDescription>Le dossier, les réponses, les signatures et les taux sont conservés. Ce retrait concerne uniquement cette liste, sur ce navigateur.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={() => { if (aRetirer) enregistrerRetraits([...new Set([...lireRetires(storageKey), aRetirer.id])]); }}>Retirer de la liste</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </Card>;
}
