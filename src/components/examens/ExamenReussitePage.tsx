import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck } from "lucide-react";

export function ExamenReussitePage() {
  // Récupérer tous les apprenants avec examen en janvier
  const { data: apprenants, isLoading } = useQuery({
    queryKey: ['apprenants-examen-janvier'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apprenants')
        .select('*')
        .or('date_examen_theorique.ilike.%janvier%,date_examen_theorique.ilike.%Janvier%')
        .order('nom', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Inscrits à l'examen théorique - Janvier 2026
          </CardTitle>
        </CardHeader>
        <CardContent>
          {apprenants && apprenants.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Prénom</TableHead>
                    <TableHead>N° Dossier CMA</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date d'examen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apprenants.map((apprenant) => (
                    <TableRow key={apprenant.id}>
                      <TableCell className="font-medium">{apprenant.nom}</TableCell>
                      <TableCell>{apprenant.prenom}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{apprenant.numero_dossier_cma || "-"}</Badge>
                      </TableCell>
                      <TableCell>{apprenant.telephone || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {apprenant.email || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-primary/10 text-primary">
                          {apprenant.date_examen_theorique}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Aucun apprenant inscrit à l'examen de janvier
            </div>
          )}
          
          {apprenants && apprenants.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Total : {apprenants.length} apprenant(s) inscrit(s)
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
