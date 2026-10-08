import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Repeat, Loader2 } from "lucide-react";
import { detecterPrelevements, type TxPrelev } from "@/lib/prelevementsRecurrents";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

/** Lecture seule : détecte les sorties d'argent qui reviennent chaque mois ou tous les 2 mois. */
export function PrelevementsTab() {
  const [txs, setTxs] = useState<TxPrelev[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session) { setLoading(false); return; }
      const all: TxPrelev[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from("transactions_bancaires")
          .select("date_operation, libelle, montant, fournisseur_client")
          .lt("montant", 0)
          .order("date_operation", { ascending: true })
          .range(from, from + 999);
        if (error) { console.error("PrelevementsTab:", error); break; }
        all.push(...((data ?? []) as TxPrelev[]));
        if (!data || data.length < 1000) break;
      }
      setTxs(all);
      setLoading(false);
    })();
  }, []);

  const groupes = useMemo(() => detecterPrelevements(txs), [txs]);
  const totalMensuel = groupes.reduce((s, g) => s + g.coutMensuel, 0);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
          <Repeat className="h-5 w-5 text-primary" /> Prélèvements récurrents (mensuels / bimestriels)
          <Badge variant="secondary" className="ml-auto">
            {groupes.length} sociétés · ≈ {fmt(totalMensuel)} / mois
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {groupes.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">Aucun paiement récurrent détecté.</p>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Société</TableHead>
                  <TableHead>Fréquence</TableHead>
                  <TableHead className="text-right">Montant habituel</TableHead>
                  <TableHead className="text-right">Nb</TableHead>
                  <TableHead className="text-right">Montant total</TableHead>
                  <TableHead>Dernier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupes.map((g) => (
                  <TableRow key={g.cle}>
                    <TableCell className="font-semibold">
                      {g.societe}
                      <div className="text-xs text-muted-foreground font-normal truncate max-w-[320px]">{g.exempleLibelle}</div>
                    </TableCell>
                    <TableCell><Badge variant={g.frequence === "Mensuel" ? "default" : "outline"}>{g.frequence}</Badge></TableCell>
                    <TableCell className="text-right">{fmt(g.montantHabituel)}</TableCell>
                    <TableCell className="text-right">{g.nombre}</TableCell>
                    <TableCell className="text-right font-bold">{fmt(g.total)}</TableCell>
                    <TableCell className="whitespace-nowrap">{new Date(g.dernier).toLocaleDateString("fr-FR")}</TableCell>
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
