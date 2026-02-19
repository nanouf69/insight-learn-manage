import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, Euro, TrendingUp, Clock, CheckCircle, AlertTriangle,
  Download, Filter, Receipt, CreditCard, Banknote, BarChart3,
  Building2, RefreshCw, Link2, ExternalLink, ArrowDownLeft, ArrowUpRight,
  CalendarIcon, CheckCheck
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

interface BridgeAccount {
  id: number;
  name: string;
  balance: number;
  status: string;
  iban: string;
  currency_code: string;
  type: string;
}

interface BridgeTransaction {
  id: number;
  description: string;
  amount: number;
  date: string;
  category_id: number;
  is_future: boolean;
  account_id: number;
}

// Unified "à payer" item
interface APayer {
  id: string;
  type: "apprenant" | "fournisseur";
  nom: string;
  description: string;
  montant: number;
  date_emission: string;
  statut: string;
  date_paiement: string | null;
  moyen_paiement: string | null;
  source_id: string; // facture id or fournisseur_facture id
}

const statutConfig: Record<string, { label: string; color: string }> = {
  payee: { label: "Payée", color: "bg-emerald-100 text-emerald-700" },
  paye: { label: "Payé", color: "bg-emerald-100 text-emerald-700" },
  en_attente: { label: "En attente", color: "bg-amber-100 text-amber-700" },
  en_retard: { label: "En retard", color: "bg-destructive/10 text-destructive" },
  annulee: { label: "Annulée", color: "bg-muted text-muted-foreground" },
};

const financementLabels: Record<string, string> = {
  particulier: "Particulier",
  professionnel: "Professionnel",
  opco: "OPCO",
  france_travail: "France Travail",
  cpf: "CPF",
};

const moyensPaiement = ["Virement", "Chèque", "Espèces", "Carte bancaire", "Prélèvement"];

const BRIDGE_USER_KEY = "ftransport_bridge_user";

export function ComptabilitePage() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [fournisseurFactures, setFournisseurFactures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<string>("all");
  const [filterFinancement, setFilterFinancement] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("overview");

  // À payer state
  const [payerFilter, setPayerFilter] = useState<"tous" | "en_attente" | "paye">("tous");
  const [payerSearch, setPayerSearch] = useState("");
  // Per-row payment form state
  const [paymentDates, setPaymentDates] = useState<Record<string, Date | undefined>>({});
  const [paymentMoyens, setPaymentMoyens] = useState<Record<string, string>>({});
  const [savingPayment, setSavingPayment] = useState<Record<string, boolean>>({});

  // Bridge state
  const [bridgeUserUuid, setBridgeUserUuid] = useState<string | null>(null);
  const [bridgeAccounts, setBridgeAccounts] = useState<BridgeAccount[]>([]);
  const [bridgeTransactions, setBridgeTransactions] = useState<BridgeTransaction[]>([]);
  const [bridgeLoading, setBridgeLoading] = useState(false);
  const [bridgeConnected, setBridgeConnected] = useState(false);

  useEffect(() => {
    fetchFactures();
    fetchFournisseurFactures();
    const savedUser = localStorage.getItem(BRIDGE_USER_KEY);
    if (savedUser) {
      setBridgeUserUuid(savedUser);
      setBridgeConnected(true);
    }
  }, []);

  const fetchFournisseurFactures = async () => {
    const { data, error } = await supabase
      .from("fournisseur_factures")
      .select("*, fournisseurs!inner(nom)")
      .order("created_at", { ascending: false });
    if (!error && data) setFournisseurFactures(data);
  };

  const fetchFactures = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("factures")
      .select("*")
      .order("date_emission", { ascending: false });
    if (error) {
      toast.error("Erreur lors du chargement des factures");
    } else {
      setFactures(data || []);
    }
    setLoading(false);
  };

  // Build unified "à payer" list from factures apprenants + factures fournisseurs
  const aPayerItems = useMemo((): APayer[] => {
    const apprenantItems: APayer[] = factures
      .filter(f => f.statut !== "annulee")
      .map(f => ({
        id: `apprenant-${f.id}`,
        type: "apprenant",
        nom: f.client_nom,
        description: `Facture ${f.numero} — ${financementLabels[f.type_financement] || f.type_financement}`,
        montant: Number(f.montant_ttc),
        date_emission: f.date_emission,
        statut: f.statut === "payee" ? "paye" : (f.statut || "en_attente"),
        date_paiement: f.date_paiement,
        moyen_paiement: null,
        source_id: f.id,
      }));

    const fournisseurItems: APayer[] = fournisseurFactures.map(f => ({
      id: `fournisseur-${f.id}`,
      type: "fournisseur",
      nom: f.fournisseurs?.nom || "Fournisseur",
      description: f.description || f.nom_fichier,
      montant: Number(f.montant) || 0,
      date_emission: f.created_at,
      statut: f.statut || "en_attente",
      date_paiement: f.date_paiement || null,
      moyen_paiement: f.moyen_paiement || null,
      source_id: f.id,
    }));

    return [...apprenantItems, ...fournisseurItems].sort(
      (a, b) => new Date(b.date_emission).getTime() - new Date(a.date_emission).getTime()
    );
  }, [factures, fournisseurFactures]);

  const filteredAPayerItems = useMemo(() => {
    return aPayerItems.filter(item => {
      const matchSearch =
        item.nom.toLowerCase().includes(payerSearch.toLowerCase()) ||
        item.description.toLowerCase().includes(payerSearch.toLowerCase());
      const matchFilter =
        payerFilter === "tous" ||
        (payerFilter === "paye" && item.statut === "paye") ||
        (payerFilter === "en_attente" && item.statut !== "paye");
      return matchSearch && matchFilter;
    });
  }, [aPayerItems, payerSearch, payerFilter]);

  const totalAPayer = useMemo(() =>
    aPayerItems.filter(i => i.statut !== "paye").reduce((s, i) => s + i.montant, 0),
    [aPayerItems]
  );
  const totalPaye2 = useMemo(() =>
    aPayerItems.filter(i => i.statut === "paye").reduce((s, i) => s + i.montant, 0),
    [aPayerItems]
  );

  const handleMarquerPaye = async (item: APayer) => {
    const date = paymentDates[item.id];
    const moyen = paymentMoyens[item.id];
    if (!date) { toast.error("Veuillez sélectionner une date de paiement"); return; }
    if (!moyen) { toast.error("Veuillez sélectionner un moyen de paiement"); return; }

    setSavingPayment(prev => ({ ...prev, [item.id]: true }));
    const dateStr = format(date, "yyyy-MM-dd");

    try {
      if (item.type === "apprenant") {
        const { error } = await supabase
          .from("factures")
          .update({ statut: "payee", date_paiement: dateStr })
          .eq("id", item.source_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("fournisseur_factures")
          .update({ statut: "paye", date_paiement: dateStr, moyen_paiement: moyen })
          .eq("id", item.source_id);
        if (error) throw error;
      }
      toast.success(`Paiement enregistré pour ${item.nom}`);
      await Promise.all([fetchFactures(), fetchFournisseurFactures()]);
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement");
    }
    setSavingPayment(prev => ({ ...prev, [item.id]: false }));
  };

  const callBridge = async (action: string, extra: Record<string, string> = {}) => {
    const res = await supabase.functions.invoke("bridge-bank", {
      body: { action, ...extra },
    });
    if (res.error) throw new Error(res.error.message);
    return res.data;
  };

  const handleCreateBridgeUser = async () => {
    setBridgeLoading(true);
    try {
      const data = await callBridge("create_user");
      const uuid = data.uuid;
      setBridgeUserUuid(uuid);
      localStorage.setItem(BRIDGE_USER_KEY, uuid);
      toast.success("Utilisateur Bridge créé");
      const session = await callBridge("connect_session", { user_uuid: uuid });
      if (session.url) {
        window.open(session.url, "_blank");
        toast.info("Connectez votre banque dans la fenêtre qui s'ouvre");
        setBridgeConnected(true);
      }
    } catch (err) {
      toast.error("Erreur lors de la création Bridge: " + (err instanceof Error ? err.message : "Erreur inconnue"));
    }
    setBridgeLoading(false);
  };

  const handleReconnect = async () => {
    if (!bridgeUserUuid) return;
    setBridgeLoading(true);
    try {
      const session = await callBridge("connect_session", { user_uuid: bridgeUserUuid });
      if (session.url) window.open(session.url, "_blank");
    } catch (err) {
      toast.error("Erreur: " + (err instanceof Error ? err.message : "Erreur inconnue"));
    }
    setBridgeLoading(false);
  };

  const handleFetchAccounts = async () => {
    if (!bridgeUserUuid) return;
    setBridgeLoading(true);
    try {
      const data = await callBridge("list_accounts", { user_uuid: bridgeUserUuid });
      setBridgeAccounts(data.resources || []);
      toast.success(`${(data.resources || []).length} compte(s) récupéré(s)`);
    } catch (err) {
      toast.error("Erreur: " + (err instanceof Error ? err.message : "Erreur inconnue"));
    }
    setBridgeLoading(false);
  };

  const handleFetchTransactions = async () => {
    if (!bridgeUserUuid) return;
    setBridgeLoading(true);
    try {
      const data = await callBridge("list_transactions", { user_uuid: bridgeUserUuid });
      setBridgeTransactions(data.resources || []);
      toast.success(`${(data.resources || []).length} transaction(s) récupérée(s)`);
    } catch (err) {
      toast.error("Erreur: " + (err instanceof Error ? err.message : "Erreur inconnue"));
    }
    setBridgeLoading(false);
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

  const totalCA = useMemo(() => factures.reduce((s, f) => f.statut !== "annulee" ? s + Number(f.montant_ttc) : s, 0), [factures]);
  const totalPaye = useMemo(() => factures.filter(f => f.statut === "payee").reduce((s, f) => s + Number(f.montant_ttc), 0), [factures]);
  const totalEnAttente = useMemo(() => factures.filter(f => f.statut === "en_attente").reduce((s, f) => s + Number(f.montant_ttc), 0), [factures]);
  const totalEnRetard = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return factures.filter(f => f.statut === "en_attente" && f.date_echeance && f.date_echeance < today).reduce((s, f) => s + Number(f.montant_ttc), 0);
  }, [factures]);

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

  const nbAPayer = aPayerItems.filter(i => i.statut !== "paye").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="a-payer" className="gap-2 relative">
            <CheckCheck className="h-4 w-4" /> À payer / Payé
            {nbAPayer > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                {nbAPayer > 9 ? "9+" : nbAPayer}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="factures" className="gap-2">
            <Receipt className="h-4 w-4" /> Toutes les factures
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Filter className="h-4 w-4" /> Par catégorie
          </TabsTrigger>
          <TabsTrigger value="banque" className="gap-2">
            <Building2 className="h-4 w-4" /> Compte bancaire
          </TabsTrigger>
          <TabsTrigger value="fournisseurs" className="gap-2">
            <Receipt className="h-4 w-4" /> Factures fournisseurs
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

        {/* === À PAYER / PAYÉ === */}
        <TabsContent value="a-payer" className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total à régler</p>
                    <p className="text-2xl font-bold text-destructive">{formatMontant(totalAPayer)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total payé</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatMontant(totalPaye2)}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">En attente</p>
                    <p className="text-2xl font-bold text-amber-600">{nbAPayer}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={payerSearch} onChange={e => setPayerSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="flex gap-2">
              {(["tous", "en_attente", "paye"] as const).map(f => (
                <Button
                  key={f}
                  variant={payerFilter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPayerFilter(f)}
                >
                  {f === "tous" ? "Tous" : f === "en_attente" ? "À payer" : "Payés"}
                </Button>
              ))}
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {filteredAPayerItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <CheckCheck className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Aucune facture trouvée</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date de paiement</TableHead>
                      <TableHead>Moyen</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAPayerItems.map((item) => {
                      const isPaid = item.statut === "paye";
                      return (
                        <TableRow key={item.id} className={isPaid ? "opacity-60" : ""}>
                          <TableCell>
                            <Badge variant="outline" className={item.type === "fournisseur" ? "border-purple-300 text-purple-700" : "border-blue-300 text-blue-700"}>
                              {item.type === "fournisseur" ? "Fournisseur" : "Apprenant"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{item.nom}</TableCell>
                          <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{item.description}</TableCell>
                          <TableCell className="text-right font-semibold">{formatMontant(item.montant)}</TableCell>
                          <TableCell>{formatDate(item.date_emission)}</TableCell>
                          <TableCell>{getStatutBadge(item.statut)}</TableCell>
                          <TableCell>
                            {isPaid ? (
                              <span className="text-sm">{formatDate(item.date_paiement)}</span>
                            ) : (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn("w-[130px] justify-start text-left font-normal", !paymentDates[item.id] && "text-muted-foreground")}
                                  >
                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                    {paymentDates[item.id] ? format(paymentDates[item.id]!, "dd/MM/yyyy") : "Date..."}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={paymentDates[item.id]}
                                    onSelect={(d) => setPaymentDates(prev => ({ ...prev, [item.id]: d }))}
                                    initialFocus
                                    className="p-3 pointer-events-auto"
                                    locale={fr}
                                  />
                                </PopoverContent>
                              </Popover>
                            )}
                          </TableCell>
                          <TableCell>
                            {isPaid ? (
                              <span className="text-sm">{item.moyen_paiement || "—"}</span>
                            ) : (
                              <Select
                                value={paymentMoyens[item.id] || ""}
                                onValueChange={(v) => setPaymentMoyens(prev => ({ ...prev, [item.id]: v }))}
                              >
                                <SelectTrigger className="w-[130px] h-8 text-xs">
                                  <SelectValue placeholder="Moyen..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {moyensPaiement.map(m => (
                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                          <TableCell>
                            {isPaid ? (
                              <CheckCircle className="h-5 w-5 text-emerald-500" />
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleMarquerPaye(item)}
                                disabled={savingPayment[item.id]}
                                className="gap-1 h-8 text-xs"
                              >
                                <CheckCheck className="h-3 w-3" />
                                {savingPayment[item.id] ? "..." : "Marquer payé"}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
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

        {/* === COMPTE BANCAIRE === */}
        <TabsContent value="banque" className="space-y-6">
          {!bridgeConnected ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Building2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Connectez votre compte bancaire</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  Synchronisez votre compte BNP Paribas professionnel pour voir vos transactions en temps réel et les rapprocher de vos factures.
                </p>
                <Button onClick={handleCreateBridgeUser} disabled={bridgeLoading} className="gap-2" size="lg">
                  <Link2 className="h-5 w-5" />
                  {bridgeLoading ? "Connexion en cours..." : "Connecter ma banque"}
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  Connexion sécurisée via Bridge by Bankin' (agréé ACPR)
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Compte bancaire connecté</h3>
                    <p className="text-sm text-muted-foreground">BNP Paribas via Bridge</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleReconnect} disabled={bridgeLoading} className="gap-2" size="sm">
                    <ExternalLink className="h-4 w-4" /> Reconnecter
                  </Button>
                  <Button variant="outline" onClick={handleFetchAccounts} disabled={bridgeLoading} className="gap-2" size="sm">
                    <RefreshCw className={`h-4 w-4 ${bridgeLoading ? "animate-spin" : ""}`} /> Comptes
                  </Button>
                  <Button variant="outline" onClick={handleFetchTransactions} disabled={bridgeLoading} className="gap-2" size="sm">
                    <RefreshCw className={`h-4 w-4 ${bridgeLoading ? "animate-spin" : ""}`} /> Transactions
                  </Button>
                </div>
              </div>

              {bridgeAccounts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bridgeAccounts.map((account) => (
                    <Card key={account.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-sm">{account.name}</p>
                          <Badge variant="outline">{account.type}</Badge>
                        </div>
                        <p className="text-2xl font-bold">{formatMontant(account.balance)}</p>
                        {account.iban && (
                          <p className="text-xs text-muted-foreground mt-1">{account.iban}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {bridgeTransactions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Dernières transactions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bridgeTransactions.slice(0, 50).map((t) => (
                          <TableRow key={t.id}>
                            <TableCell>{formatDate(t.date)}</TableCell>
                            <TableCell className="flex items-center gap-2">
                              {t.amount >= 0 ? (
                                <ArrowDownLeft className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 text-destructive flex-shrink-0" />
                              )}
                              <span className="truncate">{t.description}</span>
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${t.amount >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                              {t.amount >= 0 ? "+" : ""}{formatMontant(t.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {bridgeAccounts.length === 0 && bridgeTransactions.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <RefreshCw className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">Cliquez sur "Comptes" ou "Transactions" pour synchroniser vos données bancaires</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* === FACTURES FOURNISSEURS === */}
        <TabsContent value="fournisseurs" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total factures fournisseurs</p>
                <p className="text-2xl font-bold">{fournisseurFactures.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Montant total</p>
                <p className="text-2xl font-bold text-destructive">
                  {formatMontant(fournisseurFactures.reduce((s, f) => s + (Number(f.montant) || 0), 0))}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Fournisseurs actifs</p>
                <p className="text-2xl font-bold">{new Set(fournisseurFactures.map(f => f.fournisseur_id)).size}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Factures fournisseurs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {fournisseurFactures.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Receipt className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Aucune facture fournisseur</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead>Fichier</TableHead>
                      <TableHead>Destinataire</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date paiement</TableHead>
                      <TableHead>Moyen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fournisseurFactures.map((f: any) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{f.fournisseurs?.nom || "—"}</TableCell>
                        <TableCell>{f.nom_fichier}</TableCell>
                        <TableCell><Badge variant="outline">{f.destinataire}</Badge></TableCell>
                        <TableCell className="text-right font-semibold">
                          {f.montant ? formatMontant(Number(f.montant)) : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{f.description || "—"}</TableCell>
                        <TableCell>{getStatutBadge(f.statut || "en_attente")}</TableCell>
                        <TableCell>{formatDate(f.date_paiement)}</TableCell>
                        <TableCell>{f.moyen_paiement || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
