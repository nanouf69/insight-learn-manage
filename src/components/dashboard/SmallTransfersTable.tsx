import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Banknote } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface Txn {
  montant: number;
  date_operation: string;
  libelle: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export function SmallTransfersTable() {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("transactions_bancaires")
        .select("montant, date_operation, libelle")
        .in("montant", [50, 150, 200])
        .order("date_operation", { ascending: false });

      setTxns(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return null;
  if (txns.length === 0) return null;

  const grandTotal = txns.reduce((s, t) => s + t.montant, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" />
          Virements reçus (50 / 150 / 200 €)
          <Badge variant="secondary" className="ml-auto">{txns.length} virements · {fmt(grandTotal)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txns.map((t, i) => (
                <TableRow key={i}>
                  <TableCell className="whitespace-nowrap">
                    {format(parseISO(t.date_operation), "dd MMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell className="text-sm">{t.libelle}</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(t.montant)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
