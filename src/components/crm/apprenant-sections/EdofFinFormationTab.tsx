import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type Ligne = { id: string; mis_fin_formation: boolean; commentaire: string | null; created_at: string };

/** Historique append-only : chaque changement ajoute une ligne, rien n'est écrasé. */
export function EdofFinFormationTab({ apprenantId }: { apprenantId: string }) {
  const qc = useQueryClient();
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [erreur, setErreur] = useState(false);
  const [commentaire, setCommentaire] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const charger = async () => {
    const { data, error } = await (supabase as any)
      .from("edof_fin_formation")
      .select("id,mis_fin_formation,commentaire,created_at")
      .eq("apprenant_id", apprenantId)
      .order("created_at", { ascending: false });
    if (error) { setErreur(true); return; }
    setErreur(false);
    setLignes(data ?? []);
  };
  useEffect(() => { charger(); }, [apprenantId]);

  const enregistrer = async (valeur: boolean) => {
    setEnvoi(true);
    const { error } = await (supabase as any)
      .from("edof_fin_formation")
      .insert({ apprenant_id: apprenantId, mis_fin_formation: valeur, commentaire: commentaire.trim() || null });
    setEnvoi(false);
    if (error) { toast.error("Enregistrement refusé : " + error.message); return; }
    setCommentaire("");
    toast.success("Statut EDOF enregistré");
    charger();
  };

  const actuel = lignes?.[0];
  const fmt = (d: string) => new Date(d).toLocaleString("fr-FR", { timeZone: "Europe/Paris" });

  return (
    <Card>
      <CardHeader><CardTitle>EDOF — Déjà validé ?</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {erreur ? (
          <p className="text-destructive">Statut indisponible (erreur de lecture).</p>
        ) : lignes === null ? (
          <p className="text-muted-foreground">Chargement…</p>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Statut actuel :</span>
            {!actuel ? <Badge variant="outline">Non renseigné</Badge>
              : actuel.mis_fin_formation ? <Badge>OUI — déjà validé sur EDOF</Badge>
              : <Badge variant="destructive">NON — pas encore validé sur EDOF</Badge>}
            {actuel && <span className="text-xs text-muted-foreground">le {fmt(actuel.created_at)}</span>}
          </div>
        )}
        <Input placeholder="Commentaire (facultatif)" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
        <div className="flex gap-2">
          <Button disabled={envoi || erreur} onClick={() => enregistrer(true).then(() => qc.invalidateQueries({ queryKey: ["edof-fin-formation-dernier", apprenantId] }))}>Oui, déjà validé sur EDOF</Button>
          <Button disabled={envoi || erreur} variant="outline" onClick={() => enregistrer(false).then(() => qc.invalidateQueries({ queryKey: ["edof-fin-formation-dernier", apprenantId] }))}>Non</Button>
        </div>
        {!!lignes?.length && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Historique</p>
            {lignes.map((l) => (
              <p key={l.id} className="text-sm text-muted-foreground">
                {fmt(l.created_at)} — {l.mis_fin_formation ? "Oui" : "Non"}{l.commentaire ? ` · ${l.commentaire}` : ""}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
