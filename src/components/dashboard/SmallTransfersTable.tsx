import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Banknote } from "lucide-react";

interface MonthData {
  label: string; // e.g. "Janvier 2026"
  sortKey: string; // e.g. "2026-01"
  count50: number;
  count150: number;
  count200: number;
  total50: number;
  total150: number;
  total200: number;
  totalAll: number;
}

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export function SmallTransfersTable() {
  const [data, setData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: txns } = await supabase
        .from("transactions_bancaires")
        .select("montant, date_operation")
        .in("montant", [50, 150, 200]);

      if (!txns) { setLoading(false); return; }

      const map = new Map<string, MonthData>();

      txns.forEach(({ montant, date_operation }) => {
        const [y, m] = date_operation.split("-");
        const mIdx = parseInt(m, 10) - 1;
        const key = `${y}-${m}`;

        if (!map.has(key)) {
          map.set(key, {
            label: `${MOIS_FR[mIdx]} ${y}`,
            sortKey: key,
            count50: 0, count150: 0, count200: 0,
            total50: 0, total150: 0, total200: 0,
            totalAll: 0,
          });
        }

        const entry = map.get(key)!;
        if (montant === 50) { entry.count50++; entry.total50 += 50; }
        else if (montant === 150) { entry.count150++; entry.total150 += 150; }
        else if (montant === 200) { entry.count200++; entry.total200 += 200; }
        entry.totalAll += montant;
      });

      const sorted = Array.from(map.values()).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
      setData(sorted);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) return null;
  if (data.length === 0) return null;

  const grandTotal = data.reduce((s, d) => s + d.totalAll, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" />
          Virements reçus (50 / 150 / 200 €)
          <Badge variant="secondary" className="ml-auto">{fmt(grandTotal)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mois</TableHead>
              <TableHead className="text-center">50 €</TableHead>
              <TableHead className="text-center">150 €</TableHead>
              <TableHead className="text-center">200 €</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.sortKey}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell className="text-center">
                  {row.count50 > 0 ? (
                    <span>{row.count50} <span className="text-muted-foreground text-xs">({fmt(row.total50)})</span></span>
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {row.count150 > 0 ? (
                    <span>{row.count150} <span className="text-muted-foreground text-xs">({fmt(row.total150)})</span></span>
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {row.count200 > 0 ? (
                    <span>{row.count200} <span className="text-muted-foreground text-xs">({fmt(row.total200)})</span></span>
                  ) : (
                    <span className="text-muted-foreground">–</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold">{fmt(row.totalAll)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
