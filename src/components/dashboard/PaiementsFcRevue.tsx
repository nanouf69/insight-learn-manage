import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

type Paiement = { id: string; date_operation: string; montant: number; libelle: string; statut: string; historique: boolean; apprenant_id: string | null; candidats: string[]; motif: string | null };
type Dossier = { id: string; nom: string; prenom: string; email: string | null };

const STATUTS: Record<string, string> = {
  a_revoir: "À revoir", rapproche: "Rapproché", acces_envoye: "Accès envoyé", echec_envoi: "Échec d'envoi",
  ignore: "Ignoré", rembourse: "Remboursé", deja_servi: "Déjà servi",
};

export function PaiementsFcRevue() {
  const [rows, setRows] = useState<Paiement[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [actif, setActif] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [p, d, c] = await Promise.all([
      supabase.from("fc_paiements").select("*").order("date_operation", { ascending: false }).limit(500),
      supabase.from("apprenants").select("id, nom, prenom, email").ilike("type_apprenant", "continue%").limit(1000),
      supabase.from("fc_acces_config").select("actif").maybeSingle(),
    ]);
    if (p.error || d.error) { toast.error("Lecture impossible des paiements FC"); return; }
    setRows((p.data ?? []) as Paiement[]);
    setDossiers((d.data ?? []) as Dossier[]);
    setActif(c.data?.actif === true);
  }, []);
  useEffect(() => { load(); }, [load]);

  const call = async (body: Record<string, unknown>) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("fc-paiements", { body });
    setBusy(false);
    if (error || data?.error) toast.error(data?.error ?? "Action refusée");
    else toast.success(body.action === "classer" ? `${data.nouveaux} nouveau(x) paiement(s) classé(s)` : "Enregistré");
    load();
  };

  const nom = (id: string | null) => { const d = dossiers.find((x) => x.id === id); return d ? `${d.nom} ${d.prenom}` : "—"; };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
          <KeyRound className="h-5 w-5 text-primary" />
          Paiements FC — accès à valider
          <Badge variant={actif ? "default" : "secondary"}>{actif ? "Envoi automatique actif" : "Envoi désactivé"}</Badge>
          <Button size="sm" variant="outline" className="ml-auto" disabled={busy} onClick={() => call({ action: "classer" })}>Analyser les virements</Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Aucun paiement analysé.</p> : (
          <div className="max-h-[28rem] overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Libellé</TableHead><TableHead className="text-right">Montant</TableHead><TableHead>Stagiaire</TableHead><TableHead>Statut</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{new Date(r.date_operation).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="text-sm max-w-xs">{r.libelle}{r.motif && <div className="text-xs text-muted-foreground">{r.motif}</div>}</TableCell>
                    <TableCell className="text-right">{Number(r.montant).toFixed(2)} €</TableCell>
                    <TableCell className="text-sm">
                      {["a_revoir", "rapproche"].includes(r.statut) ? (
                        <select className="border rounded px-1 py-0.5 bg-background text-sm max-w-[12rem]" value={r.apprenant_id ?? ""} disabled={busy}
                          onChange={(e) => e.target.value && call({ action: "associer", paiement_id: r.id, apprenant_id: e.target.value })}>
                          <option value="">Choisir…</option>
                          {[...dossiers].sort((a, b) => Number(r.candidats.includes(b.id)) - Number(r.candidats.includes(a.id))).map((d) => (
                            <option key={d.id} value={d.id}>{d.nom} {d.prenom}{r.candidats.includes(d.id) ? " ★" : ""}</option>
                          ))}
                        </select>
                      ) : nom(r.apprenant_id)}
                    </TableCell>
                    <TableCell><Badge variant="outline">{STATUTS[r.statut] ?? r.statut}</Badge>{r.historique && <div className="text-xs text-muted-foreground">historique</div>}</TableCell>
                    <TableCell className="whitespace-nowrap space-x-1">
                      {["a_revoir", "rapproche"].includes(r.statut) && <Button size="sm" variant="ghost" disabled={busy} onClick={() => call({ action: "ignorer", paiement_id: r.id })}>Ignorer</Button>}
                      {["rapproche", "echec_envoi"].includes(r.statut) && r.apprenant_id && (
                        <Button size="sm" disabled={busy || !actif} title={actif ? "" : "Envoi désactivé"} onClick={() => confirm(`Envoyer les accès à ${nom(r.apprenant_id)} ?`) && call({ action: "envoyer", paiement_id: r.id })}>
                          {r.statut === "echec_envoi" ? "Renvoyer" : "Envoyer les accès"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
