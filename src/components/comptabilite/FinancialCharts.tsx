import { useEffect, useState, useMemo, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, BarChart3, Receipt } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Area
} from "recharts";

const SEUIL_IS_REDUIT = 42500; // 15% jusqu'ici
const TAUX_IS_REDUIT = 0.15;
const TAUX_IS_NORMAL = 0.25;

/** Calcule l'IS prévisionnel sur un bénéfice donné */
function calculerIS(benefice: number): number {
  if (benefice <= 0) return 0;
  if (benefice <= SEUIL_IS_REDUIT) {
    return benefice * TAUX_IS_REDUIT;
  }
  return SEUIL_IS_REDUIT * TAUX_IS_REDUIT + (benefice - SEUIL_IS_REDUIT) * TAUX_IS_NORMAL;
}

interface MonthData {
  mois: string;
  moisKey: string;
  entrees: number;
  sorties: number;
  benefice: number;
  beneficeNetIS: number;   // bénéfice après IS mensuel (approx.)
  cumulEntrees: number;
  cumulBenefice: number;
  cumulIS: number;
  cumulBeneficeNetIS: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const CustomTooltip = forwardRef<HTMLDivElement, any>(({ active, payload, label }: any, ref) => {
  if (!active || !payload?.length) return null;
  return (
    <div ref={ref} className="bg-background border rounded-lg shadow-lg p-3 text-sm min-w-[200px]">
      <p className="font-semibold mb-2 text-foreground">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-medium">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
});

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

    const byMonth: Record<string, { entrees: number; sorties: number }> = {};
    transactions.forEach(({ montant, date_operation }) => {
      const key = date_operation.substring(0, 7);
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

      // IS calculé sur le bénéfice cumulé au fil des mois (prévisionnel annualisé)
      const cumulIS = calculerIS(cumulBenefice);
      const cumulBeneficeNetIS = cumulBenefice - cumulIS;

      // IS mensuel approximatif (différentiel)
      const prevCumulIS = calculerIS(cumulBenefice - benefice);
      const isMonth = Math.max(0, cumulIS - prevCumulIS);
      const beneficeNetIS = benefice - isMonth;

      const [year, month] = key.split("-");
      const d = new Date(Number(year), Number(month) - 1, 1);
      const mois = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });

      return { mois, moisKey: key, entrees, sorties, benefice, beneficeNetIS, cumulEntrees, cumulBenefice, cumulIS, cumulBeneficeNetIS };
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

  const last = monthlyData[monthlyData.length - 1];
  const totalCA = last?.cumulEntrees ?? 0;
  const totalBenefice = last?.cumulBenefice ?? 0;
  const totalSorties = monthlyData.reduce((s, m) => s + m.sorties, 0);
  const totalIS = last?.cumulIS ?? 0;
  const totalBeneficeNetIS = last?.cumulBeneficeNetIS ?? 0;

  // Détail IS : tranche réduite vs normale
  const trancheReduite = Math.min(totalBenefice, SEUIL_IS_REDUIT);
  const trancheNormale = Math.max(0, totalBenefice - SEUIL_IS_REDUIT);

  return (
    <div className="space-y-4">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">CA cumulé</p>
          <p className="text-lg font-bold text-primary">{fmt(totalCA)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Charges cumulées</p>
          <p className="text-lg font-bold text-orange-500">{fmt(totalSorties)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Bénéfice brut</p>
          <p className={`text-lg font-bold ${totalBenefice >= 0 ? "text-emerald-600" : "text-destructive"}`}>
            {fmt(totalBenefice)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center bg-amber-50 dark:bg-amber-950/20">
          <p className="text-xs text-muted-foreground mb-1">IS prévisionnel</p>
          <p className="text-lg font-bold text-amber-600">{fmt(totalIS)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">15% / 25%</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center bg-emerald-50 dark:bg-emerald-950/20">
          <p className="text-xs text-muted-foreground mb-1">Bénéfice net après IS</p>
          <p className={`text-lg font-bold ${totalBeneficeNetIS >= 0 ? "text-emerald-600" : "text-destructive"}`}>
            {fmt(totalBeneficeNetIS)}
          </p>
        </div>
      </div>

      {/* Détail IS */}
      {totalBenefice > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-600" />
              Détail IS prévisionnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Tranche à 15% (≤ 42 500 €)</p>
                <p className="font-semibold">{fmt(trancheReduite)} × 15% = <span className="text-amber-600">{fmt(trancheReduite * 0.15)}</span></p>
              </div>
              {trancheNormale > 0 && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Tranche à 25% (&gt; 42 500 €)</p>
                  <p className="font-semibold">{fmt(trancheNormale)} × 25% = <span className="text-amber-600">{fmt(trancheNormale * 0.25)}</span></p>
                </div>
              )}
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Total IS à provisionner</p>
                <p className="font-bold text-amber-600 text-base">{fmt(totalIS)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="mensuel">
        <TabsList className="grid grid-cols-2 w-full max-w-xs">
          <TabsTrigger value="mensuel">Par mois</TabsTrigger>
          <TabsTrigger value="cumule">Cumulé</TabsTrigger>
        </TabsList>

        {/* ======= VUE PAR MOIS ======= */}
        <TabsContent value="mensuel" className="space-y-4 mt-4">
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-emerald-600" />
                Bénéfice mensuel — brut vs net après IS prévisionnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={2} />
                  <Bar dataKey="benefice" name="Bénéfice brut" fill="hsl(142 76% 36% / 0.4)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="beneficeNetIS" name="Bénéfice net après IS" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======= VUE CUMULÉE ======= */}
        <TabsContent value="cumule" className="space-y-4 mt-4">
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-emerald-600" />
                Bénéfice cumulé — brut vs net après IS prévisionnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={monthlyData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={2} />
                  <Area
                    type="monotone"
                    dataKey="cumulBenefice"
                    name="Bénéfice brut cumulé"
                    stroke="hsl(142 76% 36% / 0.6)"
                    fill="hsl(142 76% 36% / 0.08)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulBeneficeNetIS"
                    name="Bénéfice net après IS"
                    stroke="hsl(142 76% 36%)"
                    fill="hsl(142 76% 36% / 0.18)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cumulIS"
                    name="IS cumulé (provision)"
                    stroke="hsl(38 92% 50%)"
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    dot={{ r: 2 }}
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
