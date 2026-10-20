import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Clock3, CircleHelp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { etatChoixPratique, type DocChoixRow, type RevisionRow } from "@/lib/choixPratiqueEtat";

export function statutReinscription(doc: DocChoixRow | null, revisions: RevisionRow[]) {
  const etat = etatChoixPratique(doc, revisions);
  if (!etat?.demandeReinscription) return "inconnu";
  if (!etat.signe) return "attente";
  return etat.reinscription === "oui" ? "oui" : etat.reinscription === "non" ? "non" : "inconnu";
}

/** Declaration only: no inference from practical choice or CRM repassage membership. */
export function ReinscriptionExamenBadge({ apprenantId, dateExamen, documentId }: {
  apprenantId: string; dateExamen?: string | null; documentId?: string;
}) {
  const cle = dateExamen ? `examen_theorique:${String(dateExamen).slice(0, 10)}` : null;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["reinscription-examen-declaree", apprenantId, cle, documentId],
    queryFn: async () => {
      if (!cle && !documentId) return { doc: null, revisions: [] as RevisionRow[] };
      let query = supabase.from("documents_a_signer")
        .select("id, statut, choix, reinscription_examen, texte_fige, signed_at, signe_le_paris, envoye_le, created_at")
        .eq("apprenant_id", apprenantId).eq("modele_code", "echec_theorie_choix_pratique");
      if (documentId) query = query.eq("id", documentId);
      else if (cle) query = query.eq("cle_envoi", cle);
      const { data: docs, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (docs ?? []) as unknown as DocChoixRow[];
      const doc = rows.find((d) => d.statut === "signe" || d.envoye_le) ?? rows[0] ?? null;
      if (!doc) return { doc, revisions: [] as RevisionRow[] };
      const { data: revisions, error: revisionError } = await supabase.from("documents_a_signer_revisions")
        .select("document_id, choix, reinscription_examen, signe_le, signe_le_paris").eq("document_id", doc.id);
      if (revisionError) throw revisionError;
      return { doc, revisions: (revisions ?? []) as RevisionRow[] };
    },
  });
  if (isLoading) return <Badge variant="outline"><Clock3 className="mr-1 h-3 w-3" />Réinscription : chargement</Badge>;
  if (isError) return <Badge variant="outline"><CircleHelp className="mr-1 h-3 w-3" />Réinscription : indisponible</Badge>;
  const statut = statutReinscription(data?.doc ?? null, data?.revisions ?? []);
  const Icon = statut === "oui" ? CheckCircle2 : statut === "non" ? XCircle : statut === "attente" ? Clock3 : CircleHelp;
  const libelle = statut === "oui" ? "Oui (déclaré)" : statut === "non" ? "Non (déclaré)" : statut === "attente" ? "En attente" : "Non renseigné";
  return <Badge variant={statut === "oui" ? "default" : statut === "non" ? "destructive" : "outline"}
    title="Réponse signée de l’élève ; ne confirme pas une inscription officielle sur exament3p.fr.">
    <Icon className="mr-1 h-3 w-3 shrink-0" />Réinscription : {libelle}
  </Badge>;
}