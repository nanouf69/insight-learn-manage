import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  Euro, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Download,
  Filter,
  Receipt,
  CreditCard,
  Banknote,
  BarChart3
} from "lucide-react";
import { toast } from "sonner";

interface Facture {
  id: string;
  numero: string;
  client_nom: string;
  type_financement: string;
  montant_ht: number;
  montant_tva: number;
  montant_ttc: number;
  statut: string | null;
  date_emission: string;
  date_echeance: string | null;
  date_paiement: string | null;
  client_opco: string | null;
}

const statutConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  payee: { label: "Payée", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  en_attente: { label: "En attente", color: "bg-amber-100 text-amber-700", icon: Clock },
  en_retard: { label: "En retard", color: "bg-destructive/10 text-destructive", icon: AlertTriangle },
  annulee: { label: "Annulée", color: "bg-muted text-muted-foreground", icon: AlertTriangle },
};

const financementLabels: Record<string, string> = {
  particulier: "Particulier",
  professionnel: "Professionnel",
  opco: "OPCO",
  france_travail: "France Travail",
  cpf: "CPF",
};

export function ComptabilitePage() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<string>("all");
  const [filterFinancement, setFilterFinancement] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchFactures();
  }, []);

  const fetchFactures = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("factures")
      .select("*")
      .order("date_emission", { ascending: false });

    if (error) {
      toast.error("Erreur lors du chargement des factures");
      console.error(error);
    } else {
      setFactures(data || []);
    }
    setLoading(false);
  };

  const filteredFactures = useMemo(() => {
    return factures.filter((f) => {
      const matchSearch =
        f.numero.toLowerCase().includes(search.toLowerCase()) ||
        f.client_nom.toLowerCase().includes(search.toLowerCase());
      const matchStatut = filterStatut === "all" || f.statut === filterStatut;
      const matchFinancement = filterFinancement === "all" || f.type_financement === filterFinancement;
      return matchSearch && matchStatut && matchFinancement;
    });
  }, [factures, search, filterStatut, filterFinancement]);

  // Stats
  const totalCA = useMemo(() => factures.reduce((s, f) => f.statut !== "annulee" ? s + Number(f.montant_ttc) : s, 0), [factures]);
  const totalPaye = useMemo(() => factures.filter(f => f.statut === "payee").reduce((s, f) => s + Number(f.montant_ttc), 0), [factures]);
  const totalEnAttente = useMemo(() => factures.filter(f => f.statut === "en_attente").reduce((s, f) => s + Number(f.montant_ttc), 0), [factures]);
  const totalEnRetard = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return factures.filter(f => f.statut === "en_attente" && f.date_echeance && f.date_echeance < today).reduce((s, f) => s + Number(f.montant_ttc), 0);
  }, [factures]);

  // Par catégorie de financement
  const parFinancement = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    factures.forEach((f) => {
      if (f.statut === "annulee") return;
      const key = f.type_financement || "particulier";
      if (!map[key]) map[key] = { count: 0, total: 0 };
      map[key].count++;
      map[key].total += Number(f.montant_ttc);
    });
    return map;
  }, [factures]);

  const formatMontant = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("fr-FR");
  };

  const getStatutBadge = (statut: string | null) => {
    const s = statut || "en_attente";
    const config = statutConfig[s] || statutConfig.en_attente;
    return <Badge className={`${config.color} hover:${config.color}`}>{config.label}</Badge>;
  };

  const handleExportCSV = () => {
    const headers = ["Numéro", "Client", "Financement", "Montant HT", "TVA", "Montant TTC", "Statut", "Date émission", "Échéance", "Date paiement"];
    const rows = filteredFactures.map((f) => [
      f.numero, f.client_nom, financementLabels[f.type_financement] || f.type_financement,
      f.montant_ht, f.montant_tva, f.montant_ttc,
      statutConfig[f.statut || "en_attente"]?.label || f.statut,
      f.date_emission, f.date_echeance || "", f.date_paiement || "",
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comptabilite_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="factures" className="gap-2">
            <Receipt className="h-4 w-4" /> Toutes les factures
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Filter className="h-4 w-4" /> Par catégorie
          </TabsTrigger>
        </TabsList>

        {/* === VUE D'ENSEMBLE === */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
                    <p className="text-2xl font-bold">{formatMontant(totalCA)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Euro className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Encaissé</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatMontant(totalPaye)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">En attente</p>
                    <p className="text-2xl font-bold text-amber-600">{formatMontant(totalEnAttente)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">En retard</p>
                    <p className="text-2xl font-bold text-destructive">{formatMontant(totalEnRetard)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Répartition par financement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Répartition par type de financement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(parFinancement).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {key === "particulier" ? <CreditCard className="h-5 w-5 text-primary" /> : <Banknote className="h-5 w-5 text-primary" />}
                      </div>
                      <div>
                        <p className="font-medium">{financementLabels[key] || key}</p>
                        <p className="text-sm text-muted-foreground">{val.count} facture{val.count > 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <p className="font-semibold">{formatMontant(val.total)}</p>
                  </div>
                ))}
                {Object.keys(parFinancement).length === 0 && (
                  <p className="text-muted-foreground col-span-full text-center py-8">Aucune facture enregistrée</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === TOUTES LES FACTURES === */}
        <TabsContent value="factures" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par numéro ou client..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={filterStatut} onValueChange={setFilterStatut}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="payee">Payée</SelectItem>
                <SelectItem value="en_retard">En retard</SelectItem>
                <SelectItem value="annulee">Annulée</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterFinancement} onValueChange={setFilterFinancement}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Financement" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="particulier">Particulier</SelectItem>
                <SelectItem value="professionnel">Professionnel</SelectItem>
                <SelectItem value="opco">OPCO</SelectItem>
                <SelectItem value="france_travail">France Travail</SelectItem>
                <SelectItem value="cpf">CPF</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Chargement...</p>
                </div>
              ) : filteredFactures.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Receipt className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Aucune facture trouvée</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N°</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Financement</TableHead>
                      <TableHead className="text-right">Montant TTC</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Émission</TableHead>
                      <TableHead>Échéance</TableHead>
                      <TableHead>Paiement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFactures.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.numero}</TableCell>
                        <TableCell>{f.client_nom}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{financementLabels[f.type_financement] || f.type_financement}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatMontant(Number(f.montant_ttc))}</TableCell>
                        <TableCell>{getStatutBadge(f.statut)}</TableCell>
                        <TableCell>{formatDate(f.date_emission)}</TableCell>
                        <TableCell>{formatDate(f.date_echeance)}</TableCell>
                        <TableCell>{formatDate(f.date_paiement)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end text-sm text-muted-foreground">
            {filteredFactures.length} facture{filteredFactures.length > 1 ? "s" : ""} — Total: {formatMontant(filteredFactures.reduce((s, f) => s + Number(f.montant_ttc), 0))}
          </div>
        </TabsContent>

        {/* === PAR CATÉGORIE === */}
        <TabsContent value="categories" className="space-y-6">
          {Object.entries(parFinancement).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Aucune facture enregistrée</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(parFinancement).map(([key, val]) => {
              const catFactures = factures.filter(f => (f.type_financement || "particulier") === key && f.statut !== "annulee");
              return (
                <Card key={key}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {key === "particulier" ? <CreditCard className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
                        {financementLabels[key] || key}
                      </CardTitle>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">{val.count} facture{val.count > 1 ? "s" : ""}</p>
                        <p className="font-semibold">{formatMontant(val.total)}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>N°</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead className="text-right">Montant TTC</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Émission</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {catFactures.map((f) => (
                          <TableRow key={f.id}>
                            <TableCell className="font-medium">{f.numero}</TableCell>
                            <TableCell>{f.client_nom}</TableCell>
                            <TableCell className="text-right font-semibold">{formatMontant(Number(f.montant_ttc))}</TableCell>
                            <TableCell>{getStatutBadge(f.statut)}</TableCell>
                            <TableCell>{formatDate(f.date_emission)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
