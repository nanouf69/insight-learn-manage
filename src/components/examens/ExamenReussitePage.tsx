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
                    <TableHead>Type</TableHead>
                    <TableHead>N° Dossier CMA</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date d'examen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apprenants.map((apprenant) => {
                    const typeLabel = {
                      'vtc': 'VTC',
                      'vtc-e': 'VTC E',
                      'vtc-e-presentiel': 'VTC E Présentiel',
                      'taxi': 'TAXI',
                      'taxi-e': 'TAXI E',
                      'taxi-e-presentiel': 'TAXI E Présentiel',
                      'ta': 'TA',
                      'ta-e': 'TA E',
                      'va': 'VA',
                      'va-e': 'VA E',
                    }[apprenant.type_apprenant || ''] || apprenant.type_apprenant || '-';

                    const typeColor = {
                      'vtc': 'bg-blue-100 text-blue-800',
                      'vtc-e': 'bg-blue-100 text-blue-800',
                      'vtc-e-presentiel': 'bg-blue-100 text-blue-800',
                      'taxi': 'bg-amber-100 text-amber-800',
                      'taxi-e': 'bg-amber-100 text-amber-800',
                      'taxi-e-presentiel': 'bg-amber-100 text-amber-800',
                      'ta': 'bg-purple-100 text-purple-800',
                      'ta-e': 'bg-purple-100 text-purple-800',
                      'va': 'bg-green-100 text-green-800',
                      'va-e': 'bg-green-100 text-green-800',
                    }[apprenant.type_apprenant || ''] || 'bg-gray-100 text-gray-800';

                    const isMissingCMA = !apprenant.numero_dossier_cma;
                    const isMissingPhone = !apprenant.telephone;
                    const isMissingEmail = !apprenant.email;

                    return (
                      <TableRow key={apprenant.id}>
                        <TableCell className="font-medium">{apprenant.nom}</TableCell>
                        <TableCell>{apprenant.prenom}</TableCell>
                        <TableCell>
                          <Badge className={typeColor}>{typeLabel}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={isMissingCMA ? "border-destructive text-destructive" : ""}>
                            {apprenant.numero_dossier_cma || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className={isMissingPhone ? "text-destructive font-medium" : ""}>
                          {apprenant.telephone || "-"}
                        </TableCell>
                        <TableCell className={`max-w-[200px] truncate ${isMissingEmail ? "text-destructive font-medium" : ""}`}>
                          {apprenant.email || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-primary/10 text-primary">
                            {apprenant.date_examen_theorique}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
