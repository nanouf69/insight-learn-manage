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

interface Apprenant {
  id: string;
  nom: string | null;
  prenom: string | null;
  type_apprenant: string | null;
  formation_choisie: string | null;
}

interface MatchedTxn extends Txn {
  apprenant?: Apprenant;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function PersonalFinancingTransfersTable() {
  const [rows, setRows] = useState<MatchedTxn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: txData, error: txErr }, { data: apData, error: apErr }] = await Promise.all([
        supabase
          .from("transactions_bancaires")
          .select("montant, date_operation, libelle")
          .gt("montant", 0)
          .order("date_operation", { ascending: false })
          .limit(2000),
        supabase
          .from("apprenants")
          .select("id, nom, prenom, type_apprenant, formation_choisie, mode_financement")
          .eq("mode_financement", "personnel"),
      ]);

      if (txErr || apErr) {
        console.error("PersonalFinancingTransfersTable error:", txErr, apErr);
        setLoading(false);
        return;
      }

      // Exclude formation continue learners
      const apprenants = (apData ?? []).filter(
        (a) => !(a.type_apprenant ?? "").toLowerCase().startsWith("continue"),
      ) as Apprenant[];

      const matched: MatchedTxn[] = [];
      for (const t of txData ?? []) {
        const lib = norm(t.libelle ?? "");
        if (!lib) continue;
        const ap = apprenants.find((a) => {
          const nom = norm(a.nom ?? "");
          const prenom = norm(a.prenom ?? "");
          if (!nom || nom.length < 2) return false;
          return lib.includes(nom) && (prenom.length < 2 || lib.includes(prenom));
        });
        if (ap) matched.push({ ...t, apprenant: ap });
      }

      setRows(matched);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return null;
  if (rows.length === 0) return null;

  const grandTotal = rows.reduce((s, t) => s + t.montant, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" />
          Virements reçus — Financement personnel (autres formations)
          <Badge variant="secondary" className="ml-auto">
            {rows.length} virements · {fmt(grandTotal)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Apprenant</TableHead>
                <TableHead>Formation</TableHead>
                <TableHead>Libellé</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t, i) => (
                <TableRow key={i}>
                  <TableCell className="whitespace-nowrap">
                    {format(parseISO(t.date_operation), "dd MMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-medium">
                    {t.apprenant?.prenom} {t.apprenant?.nom}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.apprenant?.formation_choisie || t.apprenant?.type_apprenant}
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
