import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { etatChoixPratique, LIBELLE_CHOIX_COURT, type DocChoixRow, type RevisionRow } from "@/lib/choixPratiqueEtat";

const oui = (v: string | null | undefined) => (v === "oui" ? "Oui" : v === "non" ? "Non" : "—");

/** Badges CRM : choix pratique signé + réinscription examen, avec historique complet (lecture seule). */
export function ChoixPratiqueBadges({ apprenantId }: { apprenantId: string }) {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["choix-pratique-crm", apprenantId],
    queryFn: async () => {
      const { data: docs, error } = await supabase.from("documents_a_signer")
        .select("id, token, statut, choix, reinscription_examen, texte_fige, signed_at, signe_le_paris, envoye_le, created_at")
        .eq("apprenant_id", apprenantId).eq("modele_code", "echec_theorie_choix_pratique")
        .order("created_at", { ascending: false }).limit(1);
      if (error) throw error;
      const doc = (docs?.[0] ?? null) as DocChoixRow | null;
      if (!doc) return { doc: null, revs: [] as RevisionRow[] };
      const { data: revs, error: e2 } = await supabase.from("documents_a_signer_revisions")
        .select("document_id, choix, reinscription_examen, signe_le, signe_le_paris").eq("document_id", doc.id);
      if (e2) throw e2;
      return { doc, revs: (revs ?? []) as RevisionRow[] };
    },
  });
  if (isLoading) return null;
  if (isError) return <Badge variant="outline">Choix pratique : lecture impossible</Badge>;
  const e = etatChoixPratique(data?.doc ?? null, data?.revs ?? []);
  if (!e || (!e.signe && !e.envoyeLe)) return null;
  if (!e.signe) {
    return (
      <>
        <Badge variant="outline">Choix pratique : en attente de réponse</Badge>
        <Badge variant="outline">Réinscription examen : {e.demandeReinscription ? "en attente" : "non demandée"}</Badge>
      </>
    );
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="flex flex-wrap gap-2">
          <Badge variant={e.choix === "renonce" ? "destructive" : "default"}>Choix pratique : {LIBELLE_CHOIX_COURT[e.choix ?? ""] ?? "—"}{e.revisions.length ? " (modifié)" : ""}</Badge>
          <Badge variant={e.reinscription === "oui" ? "default" : e.reinscription === "non" ? "destructive" : "outline"}>
            Réinscription examen : {e.demandeReinscription ? oui(e.reinscription) : "non demandée"}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 text-sm space-y-2">
        <p className="font-semibold">Historique des choix signés</p>
        <p>1re signature — {e.origine.signeLeParis} : {LIBELLE_CHOIX_COURT[e.origine.choix ?? ""] ?? "—"}{e.demandeReinscription ? ` · réinscription ${oui(e.origine.reinscription)}` : ""}</p>
        {e.revisions.map((r, i) => (
          <p key={i}>Modification {i + 1} — {r.signe_le_paris} : {LIBELLE_CHOIX_COURT[r.choix] ?? r.choix}{e.demandeReinscription ? ` · réinscription ${oui(r.reinscription_examen)}` : ""}</p>
        ))}
        <p className="text-xs text-muted-foreground">{e.modificationOuverte ? "L'élève peut encore modifier son choix (4 jours après la 1re signature)." : "Délai de modification terminé."}</p>
      </PopoverContent>
    </Popover>
  );
}
