import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

/** Historique (lecture seule) des candidats décalés depuis / vers la session sélectionnée. */
export function DecalesExamenTheorique({ dateExamen }: { dateExamen: string }) {
  const { data = [] } = useQuery({
    queryKey: ["decalages-examen-theorique", dateExamen],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("examen_theorique_decalages")
        .select("*")
        .or(`ancienne_date.eq.${dateExamen},nouvelle_date.eq.${dateExamen}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
  const filiere = (t?: string | null) => (/taxi|^ta/i.test(t ?? "") ? "TAXI" : "VTC");

  return (
    <Card data-testid="decales-examen-theorique">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Décalés — examen théorique ({data.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-4 text-center text-sm italic text-muted-foreground">Aucun décalage pour cette session.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead><TableHead>Prénom</TableHead><TableHead>Filière</TableHead>
                <TableHead>Ancienne session</TableHead><TableHead>Nouvelle session</TableHead>
                <TableHead>Date du décalage</TableHead><TableHead>Par</TableHead><TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.apprenant_nom}</TableCell>
                  <TableCell>{d.apprenant_prenom}</TableCell>
                  <TableCell>{filiere(d.type_apprenant)}</TableCell>
                  <TableCell>{d.ancienne_date}</TableCell>
                  <TableCell className="font-semibold">{d.nouvelle_date}</TableCell>
                  <TableCell>{new Date(d.created_at).toLocaleString("fr-FR")}</TableCell>
                  <TableCell className="text-xs">{d.auteur_email ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{d.ancienne_date === dateExamen ? "📅 Décalé (sortant)" : "Arrivé (décalé)"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
