import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Area
} from "recharts";

interface MonthData {
  mois: string;        // "jan. 26"
  moisKey: string;     // "2026-01"
  entrees: number;
  sorties: number;
  benefice: number;
  cumulEntrees: number;
  cumulBenefice: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm min-w-[180px]">
      <p className="font-semibold mb-2 text-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-medium">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// Accepts optional transactions prop (for comptable portal passing data from edge fn)
// or fetches from DB directly (for admin dashboard)
interface Props {
  transactions?: { montant: number; date_operation: string }[];
}

export function FinancialCharts({ transactions: externalTx }: Props) {
  const [transactions, setTransactions] = useState<{ montant: number; date_operation: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (externalTx) {
      setTransactions(externalTx);
      setLoading(false);
      return;
    }
    supabase
      .from("transactions_bancaires")
      .select("montant, date_operation")
      .then(({ data }) => {
        setTransactions(data || []);
        setLoading(false);
      });
  }, [externalTx]);

  const monthlyData = useMemo((): MonthData[] => {
    if (!transactions.length) return [];

    // Group by month
    const byMonth: Record<string, { entrees: number; sorties: number }> = {};
    transactions.forEach(({ montant, date_operation }) => {
      const key = date_operation.substring(0, 7); // "2026-01"
      if (!byMonth[key]) byMonth[key] = { entrees: 0, sorties: 0 };
      if (montant > 0) byMonth[key].entrees += montant;
      else byMonth[key].sorties += Math.abs(montant);
    });

    const sorted = Object.keys(byMonth).sort();
    let cumulEntrees = 0;
    let cumulBenefice = 0;

    return sorted.map((key) => {
      const { entrees, sorties } = byMonth[key];
      const benefice = entrees - sorties;
      cumulEntrees += entrees;
      cumulBenefice += benefice;
      const [year, month] = key.split("-");
      const d = new Date(Number(year), Number(month) - 1, 1);
      const mois = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      return { mois, moisKey: key, entrees, sorties, benefice, cumulEntrees, cumulBenefice };
    });
  }, [transactions]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-40">
          <div className="animate-pulse text-muted-foreground text-sm">Chargement des graphiques…</div>
        </CardContent>
      </Card>
    );
  }

  if (!monthlyData.length) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-40 text-center text-muted-foreground">
          <div>
            <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucune donnée bancaire disponible.<br />Importez un relevé pour voir les graphiques.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalCA = monthlyData[monthlyData.length - 1]?.cumulEntrees ?? 0;
  const totalBenefice = monthlyData[monthlyData.length - 1]?.cumulBenefice ?? 0;
  const totalSorties = monthlyData.reduce((s, m) => s + m.sorties, 0);

  return (
    <div className="space-y-4">
      {/* KPI Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">CA cumulé</p>
          <p className="text-lg font-bold text-primary">{fmt(totalCA)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Charges cumulées</p>
          <p className="text-lg font-bold text-orange-500">{fmt(totalSorties)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Bénéfice cumulé</p>
          <p className={`text-lg font-bold ${totalBenefice >= 0 ? "text-emerald-600" : "text-destructive"}`}>
            {fmt(totalBenefice)}
          </p>
        </div>
      </div>

      <Tabs defaultValue="mensuel">
        <TabsList className="grid grid-cols-2 w-full max-w-xs">
          <TabsTrigger value="mensuel">Par mois</TabsTrigger>
          <TabsTrigger value="cumule">Cumulé</TabsTrigger>
        </TabsList>

        {/* ======= VUE PAR MOIS ======= */}
        <TabsContent value="mensuel" className="space-y-4 mt-4">
          {/* CA Mensuel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Chiffre d'affaires mensuel (entrées vs sorties)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="entrees" name="Entrées (CA)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sorties" name="Sorties (Charges)" fill="hsl(var(--destructive) / 0.6)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bénéfice Mensuel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-emerald-600" />
                Bénéfice net mensuel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={monthlyData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={2} />
                  <Bar
                    dataKey="benefice"
                    name="Bénéfice net"
                    radius={[4, 4, 0, 0]}
                    fill="hsl(var(--primary))"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======= VUE CUMULÉE ======= */}
        <TabsContent value="cumule" className="space-y-4 mt-4">
          {/* CA Cumulé */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Chiffre d'affaires cumulé (prévisionnel)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={monthlyData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="cumulEntrees"
                    name="CA cumulé"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bénéfice Cumulé */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-emerald-600" />
                Bénéfice net cumulé (prévisionnel)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={monthlyData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={2} />
                  <Area
                    type="monotone"
                    dataKey="cumulBenefice"
                    name="Bénéfice cumulé"
                    stroke="hsl(142 76% 36%)"
                    fill="hsl(142 76% 36% / 0.15)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
