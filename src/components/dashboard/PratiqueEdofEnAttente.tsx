import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { pratiqueEdofEnAttente } from "@/lib/pratiqueEdofEnAttente";
import { useEdofValides } from "@/components/examens/EdofValideBadge";
import { Button } from "@/components/ui/button";

export function PratiqueEdofEnAttente({ onNavigateToApprenant }: { onNavigateToApprenant: (id: string) => void }) {
  const edof = useEdofValides();
  const query = useQuery({
    queryKey: ["pratique-signee-edof-attente", "financement"],
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const [apprenants, signatures, inscriptions, reservations, configs] = await Promise.all([
        fetchAllRows<any>((f,t) => supabase.from("apprenants").select("id,nom,prenom,type_apprenant,mode_financement").is("deleted_at",null).order("id").range(f,t)),
        fetchAllRows<any>((f,t) => supabase.from("emargements_fc").select("id,apprenant_id,date_emargement,demi_journee,signature_data_url,signed_at,absent,masque").eq("masque",false).not("signature_data_url","is",null).order("id").range(f,t)),
        fetchAllRows<any>((f,t) => supabase.from("session_apprenants").select("id,apprenant_id,liste_attente,emargements_exclus,date_debut,date_fin,date_fin_personnalisee,heure_debut_personnalisee,heure_fin_personnalisee,sessions:session_id(type_session,statut,date_debut,date_fin,heure_debut,heure_fin)").order("id").range(f,t)),
        fetchAllRows<any>((f,t) => supabase.from("reservations_pratique").select("id,apprenant_id,date_choisie,type_formation,creneau").order("id").range(f,t)),
        fetchAllRows<any>((f,t) => supabase.from("planning_pratique_config").select("id,day_time_slots,updated_at").order("id").range(f,t)),
      ]);
      return apprenants.flatMap(a => {
        const dates = pratiqueEdofEnAttente(signatures.filter(s=>s.apprenant_id===a.id),inscriptions.filter(s=>s.apprenant_id===a.id),reservations.filter(s=>s.apprenant_id===a.id),configs,false,a.mode_financement);
        return dates.length ? [{...a,dates}] : [];
      }).sort((a,b)=>(a.nom ?? "").localeCompare(b.nom ?? "","fr"));
    },
  });
  const rows = (query.data ?? []).filter(a => !edof.data?.has(a.id));
  const erreur = query.isError || edof.isError;
  const chargement = query.isPending || edof.isPending;
  return <section className="space-y-3 border-y py-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><ClipboardCheck className="h-5 w-5" />Pratique signée — à valider sur EDOF{!erreur && !chargement && ` (${rows.length})`}</h2>
      <Button variant="ghost" size="icon" title="Actualiser le suivi EDOF" aria-label="Actualiser le suivi EDOF" onClick={() => { void query.refetch(); void edof.refetch(); }}><RefreshCw className="h-4 w-4" /></Button>
    </div>
    {erreur ? <p role="alert" className="text-destructive">Lecture impossible. La liste des validations EDOF reste à vérifier.</p>
      : chargement ? <p role="status" className="text-muted-foreground">Chargement…</p>
      : !rows.length ? <p className="text-muted-foreground">Aucune pratique signée en attente de validation EDOF.</p>
      : <div className="divide-y">{rows.map(a=><div key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
        <Button variant="link" className="h-auto whitespace-normal p-0 text-left" onClick={()=>onNavigateToApprenant(a.id)}>{[a.prenom,a.nom].filter(Boolean).join(" ")}</Button>
        <span className="text-sm text-muted-foreground">{a.dates.map((d:string)=>new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"Europe/Paris"})).join(" · ")}</span>
      </div>)}</div>}
  </section>;
}