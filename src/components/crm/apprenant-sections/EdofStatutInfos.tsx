import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { chargerBilanSignaturesEdof } from "@/lib/signaturesManquantes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/** Encadré Infos : possibilité de valider sur EDOF + statut « déjà validé » (historique append-only). */
export function EdofStatutInfos({ apprenant, onOuvrirOnglet }: { apprenant: any; onOuvrirOnglet: () => void }) {
  const qc = useQueryClient();
  const [envoi, setEnvoi] = useState(false);
  const formation = [apprenant?.type_apprenant, apprenant?.formation_choisie, apprenant?.formation].filter(Boolean).join(" ");
  const elearning = /e-?learning/i.test(formation);

  const bilan = useQuery({
    queryKey: ["apprenant-bilan-signatures-edof", apprenant.id, formation],
    enabled: !!apprenant?.id && !elearning,
    queryFn: () => chargerBilanSignaturesEdof(apprenant.id, formation),
  });
  const statut = useQuery({
    queryKey: ["edof-fin-formation-dernier", apprenant.id],
    enabled: !!apprenant?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("edof_fin_formation")
        .select("mis_fin_formation,created_at").eq("apprenant_id", apprenant.id)
        .order("created_at", { ascending: false }).limit(1);
      if (error) throw error;
      return (data?.[0] ?? null) as { mis_fin_formation: boolean; created_at: string } | null;
    },
  });

  const marquerValide = async () => {
    setEnvoi(true);
    const { error } = await (supabase as any).from("edof_fin_formation")
      .insert({ apprenant_id: apprenant.id, mis_fin_formation: true, commentaire: "Validé sur EDOF (depuis Infos)" });
    setEnvoi(false);
    if (error) { toast.error("Enregistrement refusé : " + error.message); return; }
    toast.success("EDOF marqué comme validé");
    qc.invalidateQueries({ queryKey: ["edof-fin-formation-dernier", apprenant.id] });
  };

  const fmt = (d: string) => new Date(d).toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  const dejaValide = statut.data?.mis_fin_formation === true;

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <p className="font-semibold">EDOF</p>
        {statut.isError ? (
          <p className="text-sm text-destructive">Statut EDOF indisponible (erreur de lecture).</p>
        ) : statut.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : dejaValide ? (
          <p className="text-base font-bold text-primary">Déjà validé sur EDOF — le {fmt(statut.data!.created_at)}</p>
        ) : (
          <>
            {elearning ? (
              <p className="text-sm text-muted-foreground">Formation e-learning : pas de total de signatures à contrôler.</p>
            ) : bilan.isError ? (
              <p className="text-sm text-destructive">Possibilité de valider sur EDOF : indisponible (erreur de lecture).</p>
            ) : !bilan.data ? (
              <p className="text-sm text-muted-foreground">Calcul des signatures…</p>
            ) : bilan.data.complet && !bilan.data.excedent ? (
              <p className="text-base font-bold text-destructive">Possibilité de valider sur EDOF ({bilan.data.total} / {bilan.data.objectifTotal} signatures)</p>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground">Pas encore possible de valider sur EDOF ({bilan.data.total} / {bilan.data.objectifTotal} signatures{bilan.data.excedent ? ", excédent à vérifier" : ""})</p>
            )}
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" disabled={envoi} onClick={marquerValide}>C'est fait : déjà validé sur EDOF</Button>
              <Button size="sm" variant="outline" onClick={onOuvrirOnglet}>Voir l'historique EDOF</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
