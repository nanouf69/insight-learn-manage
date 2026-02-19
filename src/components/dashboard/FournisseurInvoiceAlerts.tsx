import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface FournisseurInvoiceAlertsProps {
  onNavigateToComptabilite?: () => void;
}

export function FournisseurInvoiceAlerts({ onNavigateToComptabilite }: FournisseurInvoiceAlertsProps) {
  const { data: facturesEnAttente, isLoading } = useQuery({
    queryKey: ["fournisseur-factures-en-attente"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fournisseur_factures")
        .select("*, fournisseurs!inner(nom)")
        .eq("statut", "en_attente")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const formatMontant = (n: number | null) =>
    n ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n) : "—";

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Receipt className="h-4 w-4 text-orange-500" />
            Factures fournisseurs à payer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-12 bg-muted rounded-lg" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={facturesEnAttente && facturesEnAttente.length > 0 ? "border-orange-200" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Receipt className="h-4 w-4 text-orange-500" />
            Factures fournisseurs à payer
            {facturesEnAttente && facturesEnAttente.length > 0 && (
              <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 ml-1">
                {facturesEnAttente.length}
              </Badge>
            )}
          </CardTitle>
          {onNavigateToComptabilite && (
            <Button variant="ghost" size="sm" onClick={onNavigateToComptabilite} className="h-7 text-xs gap-1">
              <ExternalLink className="h-3 w-3" /> Voir tout
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {!facturesEnAttente || facturesEnAttente.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">
            Aucune facture en attente 🎉
          </p>
        ) : (
          facturesEnAttente.slice(0, 5).map((f: any) => (
            <div
              key={f.id}
              className="p-3 rounded-lg bg-orange-50 border border-orange-100 flex items-start justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{(f.fournisseurs as any)?.nom || "Fournisseur"}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {f.description || f.nom_fichier}
                  {f.mois_annee ? ` — ${f.mois_annee}` : ""}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(f.created_at), { addSuffix: true, locale: fr })}
                </p>
              </div>
              <Badge variant="outline" className="text-orange-700 border-orange-300 shrink-0 text-xs">
                {formatMontant(f.montant)}
              </Badge>
            </div>
          ))
        )}
        {facturesEnAttente && facturesEnAttente.length > 5 && (
          <p className="text-xs text-center text-muted-foreground pt-1">
            Et {facturesEnAttente.length - 5} autre(s)...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
