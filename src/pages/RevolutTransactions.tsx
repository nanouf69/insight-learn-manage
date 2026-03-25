import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RevolutTransaction {
  id: string;
  created_at: string;
  completed_at?: string;
  state: string;
  reference?: string;
  description?: string;
  legs: {
    amount: number;
    currency: string;
    description?: string;
  }[];
  type?: string;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  completed: { label: "Complété", variant: "default" },
  pending: { label: "En attente", variant: "secondary" },
  declined: { label: "Refusé", variant: "destructive" },
  failed: { label: "Échoué", variant: "destructive" },
  reverted: { label: "Annulé", variant: "outline" },
  created: { label: "Créé", variant: "secondary" },
};

export default function RevolutTransactionsPage() {
  const [transactions, setTransactions] = useState<RevolutTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "revolut-transactions"
      );

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setTransactions(data?.transactions || []);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const formatAmount = (legs: RevolutTransaction["legs"]) => {
    if (!legs || legs.length === 0) return "—";
    const leg = legs[0];
    const formatted = new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: leg.currency,
    }).format(leg.amount);
    return formatted;
  };

  const getCurrency = (legs: RevolutTransaction["legs"]) => {
    if (!legs || legs.length === 0) return "—";
    return legs[0].currency;
  };

  const getDescription = (tx: RevolutTransaction) => {
    return tx.description || tx.reference || tx.legs?.[0]?.description || "—";
  };

  const getStatus = (state: string) => {
    const s = statusMap[state] || { label: state, variant: "outline" as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Transactions Revolut
            </h1>
            <p className="text-muted-foreground mt-1">
              Dernières transactions du compte Revolut Business
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchTransactions}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6 flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {loading
                ? "Chargement…"
                : `${transactions.length} transaction${transactions.length !== 1 ? "s" : ""}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : transactions.length === 0 && !error ? (
              <p className="text-center text-muted-foreground py-12">
                Aucune transaction trouvée.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Libellé</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Devise</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="whitespace-nowrap">
                          {tx.created_at
                            ? format(new Date(tx.created_at), "dd MMM yyyy HH:mm", { locale: fr })
                            : "—"}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {getDescription(tx)}
                        </TableCell>
                        <TableCell className="text-right font-mono whitespace-nowrap">
                          {formatAmount(tx.legs)}
                        </TableCell>
                        <TableCell>{getCurrency(tx.legs)}</TableCell>
                        <TableCell>{getStatus(tx.state)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
