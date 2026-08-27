import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { UpcomingSessions } from "@/components/dashboard/UpcomingSessions";
import { PaymentReminders } from "@/components/dashboard/PaymentReminders";
import { FormationsList } from "@/components/formations/FormationsList";
import { ApprenantsList } from "@/components/apprenants/ApprenantsList";
import { CRMDashboard } from "@/components/crm/CRMDashboard";
import { PlanningCalendar } from "@/components/planning/PlanningCalendar";
import { DocumentsList } from "@/components/documents/DocumentsList";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { RenouvellementsPage } from "@/components/renouvellements/RenouvellementsPage";
import { SessionsList } from "@/components/sessions/SessionsList";
import { OrganisationsList } from "@/components/organisations/OrganisationsList";
import { FormateursList } from "@/components/formateurs/FormateursList";
import { BPFForm } from "@/components/bpf/BPFForm";
import { FactureForm } from "@/components/factures/FactureForm";
import { ComptabilitePage } from "@/components/comptabilite/ComptabilitePage";
import { FinancialCharts } from "@/components/comptabilite/FinancialCharts";
import { AgendaView } from "@/components/agenda/AgendaView";
import { ExamenReussitePage } from "@/components/examens/ExamenReussitePage";
import { PlanningRdvCarteVtc } from "@/components/planning-rdv/PlanningRdvCarteVtc";
import CoursEnLignePage from "@/components/cours-en-ligne/CoursEnLignePage";
import { FournisseursPage } from "@/components/fournisseurs/FournisseursPage";
import { ApprenantsCorbeille } from "@/components/apprenants/ApprenantsCorbeille";
import { DiagnosticAccesGlobal } from "@/components/diagnostic/DiagnosticAccesGlobal";
import { FournisseurInvoiceAlerts } from "@/components/dashboard/FournisseurInvoiceAlerts";
import { SmallTransfersTable } from "@/components/dashboard/SmallTransfersTable";
import { PersonalFinancingTransfersTable } from "@/components/dashboard/PersonalFinancingTransfersTable";
import { ApprenantQuestionsPanel } from "@/components/dashboard/ApprenantQuestionsPanel";
import { EmargementsManquants } from "@/components/dashboard/EmargementsManquants";
import { EmargementsFinFormation } from "@/components/dashboard/EmargementsFinFormation";
import { CodesAccesEnvoyes } from "@/components/dashboard/CodesAccesEnvoyes";
import { FormationsBientotTerminees } from "@/components/dashboard/FormationsBientotTerminees";
import { CreneauxRdvAdmin } from "@/components/dashboard/CreneauxRdvAdmin";
import { GraduationCap, Users, ArrowDownCircle, ArrowUpCircle, Menu, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const pageConfig = {
  dashboard: { title: "Tableau de bord", subtitle: "Bienvenue, Marie !" },
  agenda: { title: "Agenda", subtitle: "Planifiez vos cours par heure" },
  planning: { title: "Planning", subtitle: "Planifiez vos sessions de formation" },
  sessions: { title: "Sessions", subtitle: "Gérez vos sessions de formation" },
  formations: { title: "Formations", subtitle: "Gérez votre catalogue de formations" },
  formateurs: { title: "Formateurs", subtitle: "Gérez votre équipe de formateurs" },
  organisations: { title: "Organisations", subtitle: "Gérez vos organisations clientes" },
  apprenants: { title: "Apprenants", subtitle: "Suivez vos apprenants" },
  examens: { title: "Examen et Réussite", subtitle: "Suivi des examens théoriques" },
  "rdv-carte-vtc": { title: "Planning RDV Carte VTC", subtitle: "Disponibilités pour les rendez-vous de création de carte professionnelle" },
  crm: { title: "CRM", subtitle: "Gérez vos contacts et prospects" },
  documents: { title: "Documents", subtitle: "Gérez vos documents administratifs" },
  factures: { title: "Factures", subtitle: "Créez et gérez vos factures" },
  comptabilite: { title: "Comptabilité", subtitle: "Suivi financier et catégorisation des factures" },
  settings: { title: "Paramètres", subtitle: "Configurez votre espace" },
  bpf: { title: "BPF", subtitle: "Bilan Pédagogique et Financier" },
  "cours-en-ligne": { title: "Cours en ligne", subtitle: "Gérez vos formations e-learning" },
  fournisseurs: { title: "Fournisseurs", subtitle: "Gérez vos fournisseurs et leurs espaces" },
  corbeille: { title: "Corbeille", subtitle: "Éléments supprimés — restaurer ou supprimer définitivement" },
  "diagnostic-acces": { title: "Diagnostic accès", subtitle: "État d'accès e-learning de tous les apprenants" },
  renouvellements: { title: "Renouvellements", subtitle: "Échéances véhicules, agréments TAXI/VTC et Qualiopi" },
  "creneaux-25-mai": { title: "Créneaux lundi 25 mai", subtitle: "Q/R avant l'examen du 26 mai — temps réel" },
};

const getInitialNavigationFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const section = params.get("section");
  return {
    page: section && section in pageConfig ? section : "dashboard",
    apprenantId: params.get("apprenant"),
  };
};

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const getErrorMessage = (err: unknown, fallback: string) => err instanceof Error ? err.message : fallback;

const withTimeout = <T,>(operation: PromiseLike<T>, ms = 10000): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Chargement trop long")), ms);
    Promise.resolve(operation)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });

const Index = () => {
  const location = useLocation();
  const { profile, user, loading } = useAuth();
  const initialNavigation = getInitialNavigationFromUrl();
  const [currentPage, setCurrentPage] = useState(initialNavigation.page);
  const [pageHistory, setPageHistory] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [initialApprenantId, setInitialApprenantId] = useState<string | null>(initialNavigation.apprenantId);
  const [totalEntrees, setTotalEntrees] = useState<number>(0);
  const [totalSorties, setTotalSorties] = useState<number>(0);
  const [fluxPeriode, setFluxPeriode] = useState<string>("");
  const [sendingRelance, setSendingRelance] = useState(false);
  const [relanceDialogOpen, setRelanceDialogOpen] = useState(false);
  const [relanceApprenants, setRelanceApprenants] = useState<Array<{ id: string; nom: string; prenom: string; email: string; formation_choisie?: string; type_apprenant?: string }>>([]);
  const [relanceSelected, setRelanceSelected] = useState<Set<string>>(new Set());
  const [relanceFilter, setRelanceFilter] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get("section");
    const apprenantId = params.get("apprenant");
    const state = location.state as { section?: string; apprenantId?: string } | null;

    if (state?.section && state.section in pageConfig) {
      setCurrentPage(state.section);
    } else if (section && section in pageConfig) {
      setCurrentPage(section);
    }

    const targetApprenantId = state?.apprenantId || apprenantId;
    if (targetApprenantId) {
      setInitialApprenantId(targetApprenantId);
      setCurrentPage("crm");
    }
  }, [location.search, location.state]);

  const openRelanceDialog = async () => {
    setRelanceDialogOpen(true);
    setLoadingPreview(true);
    try {
      const { data, error } = await supabase.functions.invoke('relance-dossier-bienvenue', {
        body: { preview: true },
      });
      if (error) throw error;
      const list = data?.apprenants || [];
      setRelanceApprenants(list);
      setRelanceSelected(new Set(list.map((a: any) => a.id)));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Erreur lors du chargement"));
      setRelanceDialogOpen(false);
    } finally {
      setLoadingPreview(false);
    }
  };

  const toggleRelanceOne = (id: string) => {
    setRelanceSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleRelanceDossierBienvenue = async () => {
    if (relanceSelected.size === 0) {
      toast.error("Sélectionnez au moins un apprenant");
      return;
    }
    setSendingRelance(true);
    try {
      const excludedIds = relanceApprenants
        .map(a => a.id)
        .filter(id => !relanceSelected.has(id));
      const { data, error } = await supabase.functions.invoke('relance-dossier-bienvenue', {
        body: { apprenant_ids: Array.from(relanceSelected), excluded_ids: excludedIds },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`${data.sent} email(s) envoyé(s)`);
        setRelanceDialogOpen(false);
      } else {
        toast.error(data?.error || "Erreur lors de l'envoi");
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Erreur lors de l'envoi des relances"));
    } finally {
      setSendingRelance(false);
    }
  };

  const handleSaveChoicesOnly = async () => {
    setSendingRelance(true);
    try {
      const excludedIds = relanceApprenants
        .map(a => a.id)
        .filter(id => !relanceSelected.has(id));
      const includedIds = Array.from(relanceSelected);
      const { data, error } = await supabase.functions.invoke('relance-dossier-bienvenue', {
        body: { save_only: true, apprenant_ids: includedIds, excluded_ids: excludedIds },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Choix enregistrés (${excludedIds.length} exclus, aucun email envoyé)`);
        setRelanceDialogOpen(false);
      } else {
        toast.error(data?.error || "Erreur lors de l'enregistrement");
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Erreur lors de l'enregistrement"));
    } finally {
      setSendingRelance(false);
    }
  };


  useEffect(() => {
    if (!user) return;

    const fetchFlux = async () => {
      const { data } = await withTimeout(
        supabase
          .from("transactions_bancaires")
          .select("montant, date_operation"),
      ).catch((error) => {
        console.error("Dashboard flux loading failed:", error);
        return { data: null };
      });
      if (!data) return;
      let entrees = 0;
      let sorties = 0;
      let minDate: Date | null = null;
      let maxDate: Date | null = null;
      data.forEach(({ montant, date_operation }) => {
        if (montant > 0) entrees += montant;
        else sorties += montant;
        if (date_operation) {
          const d = new Date(date_operation);
          if (!minDate || d < minDate) minDate = d;
          if (!maxDate || d > maxDate) maxDate = d;
        }
      });
      setTotalEntrees(entrees);
      setTotalSorties(Math.abs(sorties));
      if (minDate && maxDate) {
        const fmtMois = (d: Date) =>
          d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
        const min = fmtMois(minDate);
        const max = fmtMois(maxDate);
        setFluxPeriode(min === max ? min : `${min} – ${max}`);
      }
    };

    fetchFlux();
  }, [user]);

  const handleNavigate = (page: string) => {
    if (page !== currentPage) {
      setPageHistory(prev => [...prev, currentPage]);
    }
    setCurrentPage(page);
  };

  const handleGoBack = () => {
    if (pageHistory.length > 0) {
      const prev = pageHistory[pageHistory.length - 1];
      setPageHistory(h => h.slice(0, -1));
      setCurrentPage(prev);
    }
  };

  const handleNavigateToApprenant = (apprenantId: string) => {
    setInitialApprenantId(apprenantId);
    handleNavigate("crm");
  };

  const renderContent = () => {
    switch (currentPage) {
      case "dashboard":
        return (
            <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard 
                title="Formations actives" 
                value={12} 
                change={8}
                icon={GraduationCap}
                iconColor="primary"
              />
              <StatCard 
                title="Apprenants" 
                value={156} 
                change={12}
                icon={Users}
                iconColor="accent"
              />
              <StatCard 
                title="Total entré (relevés)" 
                value={fmt(totalEntrees)}
                icon={ArrowDownCircle}
                iconColor="success"
                subtitle={fluxPeriode || undefined}
              />
              <StatCard 
                title="Total sorti (relevés)" 
                value={fmt(totalSorties)}
                icon={ArrowUpCircle}
                iconColor="warning"
                subtitle={fluxPeriode || undefined}
              />
            </div>

            {/* Actions rapides */}
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={openRelanceDialog} 
                disabled={sendingRelance || loadingPreview}

                variant="outline"
                className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                {sendingRelance ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sendingRelance ? "Envoi en cours..." : "📋 Relancer dossiers bienvenue incomplets"}
              </Button>
            </div>

            {/* Codes d'accès envoyés aujourd'hui */}
            <CodesAccesEnvoyes onNavigateToApprenant={handleNavigateToApprenant} />

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <UpcomingSessions />
              <div className="space-y-4">
                <RecentActivity onNavigateToApprenant={handleNavigateToApprenant} />
                <FormationsBientotTerminees onNavigateToApprenant={handleNavigateToApprenant} />
              </div>
              <div className="space-y-4">
                <EmargementsManquants onNavigateToApprenant={handleNavigateToApprenant} />
                <EmargementsFinFormation onNavigateToApprenant={handleNavigateToApprenant} />
                <PaymentReminders />
                <FournisseurInvoiceAlerts onNavigateToComptabilite={() => handleNavigate("comptabilite")} />
              </div>

            </div>

            {/* Questions des apprenants */}
            <ApprenantQuestionsPanel />

            {/* Financial Charts */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Analyse financière</h2>
              <FinancialCharts />
            </div>

            {/* Small Transfers */}
            <SmallTransfersTable />

            {/* Personal financing transfers (other formations) */}
            <PersonalFinancingTransfersTable />
          </div>
        );
      case "agenda":
        return <AgendaView />;
      case "formations":
        return <FormationsList />;
      case "apprenants":
        return <ApprenantsList />;
      case "examens":
        return <ExamenReussitePage />;
      case "rdv-carte-vtc":
        return <PlanningRdvCarteVtc />;
      case "crm":
        return <CRMDashboard initialApprenantId={initialApprenantId} onApprenantClosed={() => setInitialApprenantId(null)} />;
      case "planning":
        return <PlanningCalendar />;
      case "sessions":
        return <SessionsList onNavigateToApprenant={handleNavigateToApprenant} />;
      case "formateurs":
        return <FormateursList />;
      case "organisations":
        return <OrganisationsList />;
      case "documents":
        return <DocumentsList />;
      case "factures":
        return <FactureForm />;
      case "comptabilite":
        return <ComptabilitePage />;
      case "bpf":
        return <BPFForm />;
      case "cours-en-ligne":
        return <CoursEnLignePage />;
      case "fournisseurs":
        return <FournisseursPage />;
      case "corbeille":
        return <ApprenantsCorbeille />;
      case "diagnostic-acces":
        return <DiagnosticAccesGlobal onOpenApprenant={handleNavigateToApprenant} />;
      case "creneaux-25-mai":
        return <CreneauxRdvAdmin />;
      case "renouvellements":
        return <RenouvellementsPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return null;
    }
  };

  const config = pageConfig[currentPage as keyof typeof pageConfig];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleMobileNavigate = (page: string) => {
    handleNavigate(page);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="fixed top-3 left-3 z-50 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-primary text-primary-foreground md:hidden shadow-lg"
        aria-label="Menu"
      >
        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - desktop always visible, mobile as overlay */}
      <div className={`
        fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar 
          currentPage={currentPage}
          onNavigate={handleMobileNavigate}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Header 
          title={config.title}
          subtitle={currentPage === 'dashboard' ? `Bienvenue, ${profile?.full_name?.split(' ')[0] || 'Admin'} !` : config.subtitle}
          onSelectApprenant={handleNavigateToApprenant}
          onNavigate={handleNavigate}
          canGoBack={pageHistory.length > 0}
          onGoBack={handleGoBack}
        />
        
        <main className="flex-1 overflow-auto p-3 sm:p-6">
          <ErrorBoundary>
            {renderContent()}
          </ErrorBoundary>
        </main>
      </div>

      <Dialog open={relanceDialogOpen} onOpenChange={setRelanceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Relancer les dossiers bienvenue incomplets</DialogTitle>
            <DialogDescription>
              Cochez les apprenants à qui envoyer la relance. Décochez ceux que vous ne voulez pas relancer.
            </DialogDescription>
          </DialogHeader>

          {loadingPreview ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement…
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 py-2">
                <Input
                  placeholder="Filtrer par nom, prénom ou email…"
                  value={relanceFilter}
                  onChange={(e) => setRelanceFilter(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRelanceSelected(new Set(relanceApprenants.map(a => a.id)))}
                >
                  Tout cocher
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRelanceSelected(new Set())}
                >
                  Tout décocher
                </Button>
              </div>
              <div className="flex-1 overflow-auto border rounded-md divide-y">
                {relanceApprenants.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground">Aucun apprenant éligible.</div>
                )}
                {relanceApprenants
                  .filter(a => {
                    const q = relanceFilter.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      a.nom?.toLowerCase().includes(q) ||
                      a.prenom?.toLowerCase().includes(q) ||
                      a.email?.toLowerCase().includes(q)
                    );
                  })
                  .map((a) => (
                    <label key={a.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={relanceSelected.has(a.id)}
                        onCheckedChange={() => toggleRelanceOne(a.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{a.prenom} {a.nom}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {a.email} {a.formation_choisie ? `• ${a.formation_choisie}` : ''}
                        </div>
                      </div>
                    </label>
                  ))}
              </div>
              <div className="text-sm text-muted-foreground pt-2">
                {relanceSelected.size} / {relanceApprenants.length} sélectionné(s)
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRelanceDialogOpen(false)} disabled={sendingRelance}>
              Annuler
            </Button>
            <Button
              variant="secondary"
              onClick={handleSaveChoicesOnly}
              disabled={sendingRelance || loadingPreview}
            >
              Enregistrer les choix (sans envoyer)
            </Button>
            <Button
              onClick={handleRelanceDossierBienvenue}
              disabled={sendingRelance || loadingPreview || relanceSelected.size === 0}
              className="gap-2"
            >
              {sendingRelance ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Envoyer ({relanceSelected.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};


export default Index;
