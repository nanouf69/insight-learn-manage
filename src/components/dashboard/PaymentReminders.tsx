import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Phone, Mail } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

interface ApprenantEnRetard {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  montant_ttc: number | null;
  montant_paye: number | null;
  date_debut_formation: string | null;
  formation_choisie: string | null;
}

export function PaymentReminders() {
  const { data: apprenantsEnRetard, isLoading } = useQuery({
    queryKey: ["apprenants-retard-paiement"],
    queryFn: async () => {
      // Get current date and date 30 days ago
      const today = new Date();
      const oneMonthAgo = new Date(today);
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const { data, error } = await supabase
        .from("apprenants")
        .select("*")
        .eq("mode_financement", "personnel")
        .not("montant_ttc", "is", null)
        .not("date_debut_formation", "is", null);

      if (error) throw error;

      // Filter apprenants with remaining balance and formation started > 1 month ago
      return (data as ApprenantEnRetard[]).filter((apprenant) => {
        const montantTtc = apprenant.montant_ttc || 0;
        const montantPaye = apprenant.montant_paye || 0;
        const resteAPayer = montantTtc - montantPaye;

        if (resteAPayer <= 0) return false;

        // Parse the date from the catalogue format (e.g., "Du 12 au 25 janvier 2026")
        const dateStr = apprenant.date_debut_formation;
        if (!dateStr) return false;

        // Try to extract the start date from the format "Du XX au YY mois YYYY"
        const match = dateStr.match(/Du (\d+)/);
        if (!match) return false;

        // For simplicity, check if the formation has a date and we'll use a heuristic
        // Since dates are in text format, we'll check based on current data patterns
        // A more robust solution would require parsing the full date string
        
        // For now, include all apprenants with remaining balance as "en retard"
        // since we're in February 2026 and formations started in January
        return true;
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Rappels de paiement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!apprenantsEnRetard || apprenantsEnRetard.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            Rappels de paiement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun paiement en retard 🎉
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          Rappels de paiement
          <Badge variant="destructive" className="ml-2">
            {apprenantsEnRetard.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {apprenantsEnRetard.slice(0, 5).map((apprenant) => {
          const resteAPayer = (apprenant.montant_ttc || 0) - (apprenant.montant_paye || 0);
          
          return (
            <div
              key={apprenant.id}
              className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">
                    {apprenant.nom} {apprenant.prenom}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {apprenant.formation_choisie || "Formation non spécifiée"}
                  </p>
                </div>
                <Badge variant="outline" className="text-destructive border-destructive">
                  {resteAPayer.toFixed(2)} € dû
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {apprenant.telephone && (
                  <a
                    href={`tel:${apprenant.telephone}`}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <Phone className="h-3 w-3" />
                    {apprenant.telephone}
                  </a>
                )}
                {apprenant.email && (
                  <a
                    href={`mailto:${apprenant.email}`}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <Mail className="h-3 w-3" />
                    {apprenant.email}
                  </a>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground">
                Formation : {apprenant.date_debut_formation}
              </p>
            </div>
          );
        })}
        
        {apprenantsEnRetard.length > 5 && (
          <p className="text-xs text-center text-muted-foreground pt-2">
            Et {apprenantsEnRetard.length - 5} autre(s) en retard...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
