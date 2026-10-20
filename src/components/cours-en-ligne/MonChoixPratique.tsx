import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { etatChoixPratique, libelleChoixLong, type DocChoixRow, type RevisionRow } from "@/lib/choixPratiqueEtat";

/** Encadré élève : son choix signé pour l'entraînement pratique (lecture seule, lien vers la page sécurisée). */
export function MonChoixPratique({ apprenantId }: { apprenantId: string }) {
  const { data, isError } = useQuery({
    queryKey: ["mon-choix-pratique", apprenantId],
    queryFn: async () => {
      const { data: docs, error } = await supabase.from("documents_a_signer")
        .select("id, token, statut, choix, reinscription_examen, texte_fige, signed_at, signe_le_paris, envoye_le, created_at")
        .eq("apprenant_id", apprenantId).eq("modele_code", "echec_theorie_choix_pratique")
        .order("created_at", { ascending: false }).limit(1);
      if (error) throw error;
      const doc = (docs?.[0] ?? null) as DocChoixRow | null;
      if (!doc) return null;
      const { data: revs, error: e2 } = await supabase.from("documents_a_signer_revisions")
        .select("document_id, choix, reinscription_examen, signe_le, signe_le_paris").eq("document_id", doc.id);
      if (e2) throw e2;
      return { doc, revs: (revs ?? []) as RevisionRow[] };
    },
  });
  if (isError || !data) return null;
  const e = etatChoixPratique(data.doc, data.revs);
  if (!e) return null;
  const lien = data.doc.token ? `/document-a-signer/${data.doc.token}` : null;
  return (
    <div className="w-full rounded-lg border bg-card shadow-sm p-4 space-y-2">
      <p className="font-semibold">Votre choix pour l'entraînement pratique</p>
      {e.signe ? (
        <>
          <p className="text-sm">{libelleChoixLong(e.choix)}</p>
          {e.demandeReinscription && (
            <p className="text-sm">Réinscription à l'examen théorique : <strong>{e.reinscription === "oui" ? "Oui" : e.reinscription === "non" ? "Non" : "—"}</strong></p>
          )}
          <p className="text-xs text-muted-foreground">Signé le {e.signeLeParis}{e.revisions.length ? " (choix modifié)" : ""}</p>
          {e.modificationOuverte && lien && (
            <Button asChild size="sm" variant="outline"><a href={lien}>Modifier mon choix (possible 4 jours après la signature)</a></Button>
          )}
        </>
      ) : (
        <>
          <p className="text-sm">Nous attendons votre réponse.</p>
          {lien && <Button asChild size="sm"><a href={lien}>Choisir et signer</a></Button>}
        </>
      )}
    </div>
  );
}
