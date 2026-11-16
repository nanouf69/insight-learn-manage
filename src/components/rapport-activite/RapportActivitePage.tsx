import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { chargerTous, chargerFc, compterAnnee } from "@/lib/reports/rapportActiviteDonnees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function RapportActivitePage() {
  const { data = [], isLoading, error } = useQuery({ queryKey: ["rapport-activite"], queryFn: chargerTous });
  const fcQ = useQuery({ queryKey: ["rapport-activite-fc"], queryFn: chargerFc });
  const [an, setAn] = useState<string>(String(new Date().getFullYear()));

  const { annees, stats, fc } = useMemo(() => compterAnnee(data, fcQ.data ?? [], an), [data, fcQ.data, an]);

  if (isLoading || fcQ.isLoading) return <p className="p-6 text-muted-foreground">Chargement…</p>;
  if (error || fcQ.error) return <p className="p-6 text-destructive">Erreur de lecture des données : aucune statistique affichée.</p>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rapport d'activité</h1>
          <p className="text-sm text-muted-foreground">Admis / non admis à l'examen théorique par formation, et stagiaires en formation continue ayant une facture.</p>
        </div>
        <Select value={an} onValueChange={setAn}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{annees.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {["VTC", "TAXI", "TA", "VA"].map(c => {
          const s = stats[c] ?? { oui: 0, non: 0 };
          const tot = s.oui + s.non;
          return (
            <Card key={c}>
              <CardHeader><CardTitle>Formation {c}</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Admis</span><b>{s.oui}</b></div>
                <div className="flex justify-between"><span>Non admis</span><b>{s.non}</b></div>
                <div className="flex justify-between"><span>Total des candidats</span><b>{tot}</b></div>
                <div className="flex justify-between text-primary"><span>Taux de réussite</span><b>{tot ? `${((s.oui / tot) * 100).toFixed(2)} %` : "—"}</b></div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(["FC VTC", "FC TAXI"] as const).map(c => (
        <Card key={c}>
          <CardHeader><CardTitle>Formation continue {c.replace("FC ", "")} ({fc[c].length})</CardTitle></CardHeader>
          <CardContent>
            {fc[c].length === 0 ? <p className="text-sm text-muted-foreground">Aucun stagiaire.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Prénom</TableHead><TableHead>Date de début</TableHead><TableHead>Date de fin</TableHead><TableHead>Facture(s)</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {[...fc[c]].sort((a, b) => (a.debut || "").localeCompare(b.debut || "") || (a.nom || "").localeCompare(b.nom || "")).map(r => (
                    <TableRow key={r.key}>
                      <TableCell className="font-medium">{(r.nom || "").toUpperCase()}</TableCell>
                      <TableCell>{r.prenom}</TableCell>
                      <TableCell>{r.debut || "—"}</TableCell>
                      <TableCell>{r.fin || "—"}</TableCell>
                      <TableCell className="text-xs">{r.factures.join(", ")}</TableCell>
                      <TableCell><Link className="text-primary underline" to={`/?apprenant=${r.apprenantId}`}>Ouvrir la fiche</Link></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
