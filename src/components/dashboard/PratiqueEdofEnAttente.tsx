import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, RefreshCw, RotateCcw, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { pratiqueEdofEnAttente, listePratiqueEdofVisible } from "@/lib/pratiqueEdofEnAttente";
import { useEdofValides } from "@/components/examens/EdofValideBadge";
import { Button } from "@/components/ui/button";
import { estCandidatElearning } from "@/lib/examenElearningRelance";
import { bilanSignaturesPresentiel } from "@/lib/suiviPratiqueEdof";
import { chargerBilanSignaturesEdof, chargerClassificationSignatures } from "@/lib/signaturesManquantes";
import { compteurSignaturesFiche } from "@/lib/suiviPratiqueEdof";
import { SuiviElearningCell, SuiviPresentielCell } from "@/components/dashboard/SuiviPratiqueEdofCell";
import { useAuth } from "@/contexts/AuthContext";
import { safeGetItem, safeSetItem } from "@/lib/safeStorage";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

function lireRetires(key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(safeGetItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch { return []; }
}

export function PratiqueEdofEnAttente({ onNavigateToApprenant }: { onNavigateToApprenant: (id: string) => void }) {
  const { user } = useAuth();
  const storageKey = `dashboard-pratique-edof-retires:${user?.id ?? "sans-compte"}`;
  const [retraits, setRetraits] = useState<{ key: string; ids: string[] }>(() => ({ key: storageKey, ids: lireRetires(storageKey) }));
  const [aRetirer, setARetirer] = useState<{ id: string; nom: string } | null>(null);
  const [erreurRetrait, setErreurRetrait] = useState(false);
  useEffect(() => {
    const actualiser = () => setRetraits({ key: storageKey, ids: lireRetires(storageKey) });
    actualiser();
    window.addEventListener("storage", actualiser);
    return () => window.removeEventListener("storage", actualiser);
  }, [storageKey]);
  const retires = retraits.key === storageKey ? retraits.ids : lireRetires(storageKey);
  const enregistrerRetraits = (ids: string[]) => {
    if (!user) return;
    const ok = safeSetItem(storageKey, JSON.stringify(ids));
    setErreurRetrait(!ok);
    if (ok) setRetraits({ key: storageKey, ids });
  };
  const edof = useEdofValides();
  const query = useQuery({
    queryKey: ["pratique-signee-edof-attente", "financement"],
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const [apprenants, signatures, inscriptions, reservations, configs] = await Promise.all([
        fetchAllRows<any>((f,t) => supabase.from("apprenants").select("id,nom,prenom,email,type_apprenant,formation_choisie,modalite_formation,mode_financement,formation").is("deleted_at",null).order("id").range(f,t)),
        fetchAllRows<any>((f,t) => supabase.from("emargements_fc").select("id,apprenant_id,date_emargement,demi_journee,signature_data_url,signed_at,absent,masque").eq("masque",false).not("signature_data_url","is",null).order("id").range(f,t)),
        fetchAllRows<any>((f,t) => supabase.from("session_apprenants").select("id,apprenant_id,liste_attente,emargements_exclus,date_debut,date_fin,date_fin_personnalisee,heure_debut_personnalisee,heure_fin_personnalisee,sessions:session_id(type_session,statut,date_debut,date_fin,heure_debut,heure_fin)").order("id").range(f,t)),
        fetchAllRows<any>((f,t) => supabase.from("reservations_pratique").select("id,apprenant_id,date_choisie,type_formation,creneau").order("id").range(f,t)),
        fetchAllRows<any>((f,t) => supabase.from("planning_pratique_config").select("id,day_time_slots,updated_at").order("id").range(f,t)),
      ]);
      const lignes = apprenants.flatMap(a => {
        const dates = pratiqueEdofEnAttente(signatures.filter(s=>s.apprenant_id===a.id),inscriptions.filter(s=>s.apprenant_id===a.id),reservations.filter(s=>s.apprenant_id===a.id),configs,false,a.mode_financement);
        if (!dates.length) return [];
        const elearning = estCandidatElearning(a);
        return [{...a,dates,elearning,presentiel:null as { attendues: number; manquantes: number } | null}];
      });
      // Présentiel : mêmes chargeurs que la fiche apprenant (récapitulatif + liste rouge).
      return Promise.all(lignes.map(async (a) => {
        if (a.elearning) return a;
        try {
          const formation = [a.type_apprenant, a.formation_choisie, a.formation].filter(Boolean).join(" ");
          const [bilan, classification] = await Promise.all([chargerBilanSignaturesEdof(a.id, formation), chargerClassificationSignatures(a.id)]);
          return { ...a, presentiel: compteurSignaturesFiche(bilan, classification.attendus) };
        } catch { return a; }
      }));
    },
  });
  void 0;
  const _unused = () => {
      return [].flatMap(() => {
        return [];
      });
  };
  const rows = listePratiqueEdofVisible((query.data ?? []).filter(a => !edof.data?.has(a.id)), retires);
  const erreur = query.isError || edof.isError;
  const chargement = query.isPending || edof.isPending;
  return <section className="space-y-3 border-y py-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><ClipboardCheck className="h-5 w-5" />Pratique signée — à valider sur EDOF{!erreur && !chargement && ` (${rows.length})`}</h2>
      <div className="flex items-center gap-1">
        {retires.length > 0 && <Button variant="ghost" size="icon" title="Réafficher les personnes retirées" aria-label="Réafficher les personnes retirées" onClick={() => enregistrerRetraits([])}><RotateCcw className="h-4 w-4" /></Button>}
        <Button variant="ghost" size="icon" title="Actualiser le suivi EDOF" aria-label="Actualiser le suivi EDOF" onClick={() => { void query.refetch(); void edof.refetch(); }}><RefreshCw className="h-4 w-4" /></Button>
      </div>
    </div>
    {erreurRetrait && <p role="alert" className="text-destructive">Retrait non enregistré. La personne reste dans la liste.</p>}
    {erreur ? <p role="alert" className="text-destructive">Lecture impossible. La liste des validations EDOF reste à vérifier.</p>
      : chargement ? <p role="status" className="text-muted-foreground">Chargement…</p>
      : !rows.length ? <p className="text-muted-foreground">Aucune pratique signée en attente de validation EDOF.</p>
      : <div className="divide-y">
        <div className="grid grid-cols-[minmax(0,1fr)_2.5rem] gap-2 pb-2 text-sm font-semibold text-muted-foreground sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1.5fr)_2.5rem]">
          <span className="hidden sm:block">Apprenant</span><span className="sm:text-right">Dates de formation pratique</span><span className="hidden sm:block sm:text-right">Suivi</span><span />
        </div>
        {rows.map(a=><div key={a.id} className="grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-2 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1.5fr)_2.5rem]">
        <Button variant="link" className="h-auto whitespace-normal p-0 text-left" onClick={()=>onNavigateToApprenant(a.id)}>{[a.prenom,a.nom].filter(Boolean).join(" ")}</Button>
        <span className="col-start-1 row-start-2 text-sm text-muted-foreground sm:col-start-2 sm:row-start-1 sm:text-right">{[...a.dates].sort().reverse().map((d:string)=>new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"Europe/Paris"})).join(" · ")}</span>
        <div className="col-start-1 row-start-3 text-sm sm:col-start-3 sm:row-start-1 sm:text-right">{a.elearning ? <SuiviElearningCell apprenant={a} /> : <SuiviPresentielCell bilan={a.presentiel} />}</div>
        <Button variant="ghost" size="icon" className="col-start-2 row-start-1 text-destructive sm:col-start-4" disabled={!user} title="Retirer de cette liste uniquement" aria-label={`Retirer ${[a.prenom,a.nom].filter(Boolean).join(" ")} de la liste`} onClick={() => setARetirer({ id: a.id, nom: [a.prenom,a.nom].filter(Boolean).join(" ") })}><X className="h-4 w-4" /></Button>
      </div>)}</div>}
    <AlertDialog open={aRetirer !== null} onOpenChange={open => { if (!open) setARetirer(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Retirer {aRetirer?.nom} de cette liste ?</AlertDialogTitle><AlertDialogDescription>Son dossier et ses signatures sont conservés. Ce retrait concerne votre liste sur ce navigateur uniquement.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => { if (aRetirer) enregistrerRetraits([...new Set([...lireRetires(storageKey), aRetirer.id])]); }}>Retirer de la liste</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}