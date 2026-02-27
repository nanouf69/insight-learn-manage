import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
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
import { SessionsList } from "@/components/sessions/SessionsList";
import { OrganisationsList } from "@/components/organisations/OrganisationsList";
import { FormateursList } from "@/components/formateurs/FormateursList";
import { BPFForm } from "@/components/bpf/BPFForm";
import { FactureForm } from "@/components/factures/FactureForm";
import { ComptabilitePage } from "@/components/comptabilite/ComptabilitePage";
import { FinancialCharts } from "@/components/comptabilite/FinancialCharts";
import { AgendaView } from "@/components/agenda/AgendaView";
import { ExamenReussitePage } from "@/components/examens/ExamenReussitePage";
import CoursEnLignePage from "@/components/cours-en-ligne/CoursEnLignePage";
import { FournisseursPage } from "@/components/fournisseurs/FournisseursPage";
import { FournisseurInvoiceAlerts } from "@/components/dashboard/FournisseurInvoiceAlerts";
import { SmallTransfersTable } from "@/components/dashboard/SmallTransfersTable";
import { GraduationCap, Users, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
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
  crm: { title: "CRM", subtitle: "Gérez vos contacts et prospects" },
  documents: { title: "Documents", subtitle: "Gérez vos documents administratifs" },
  factures: { title: "Factures", subtitle: "Créez et gérez vos factures" },
  comptabilite: { title: "Comptabilité", subtitle: "Suivi financier et catégorisation des factures" },
  settings: { title: "Paramètres", subtitle: "Configurez votre espace" },
  bpf: { title: "BPF", subtitle: "Bilan Pédagogique et Financier" },
  "cours-en-ligne": { title: "Cours en ligne", subtitle: "Gérez vos formations e-learning" },
  fournisseurs: { title: "Fournisseurs", subtitle: "Gérez vos fournisseurs et leurs espaces" },
};

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const Index = () => {
  const { profile } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [pageHistory, setPageHistory] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [initialApprenantId, setInitialApprenantId] = useState<string | null>(null);
  const [totalEntrees, setTotalEntrees] = useState<number>(0);
  const [totalSorties, setTotalSorties] = useState<number>(0);
  const [fluxPeriode, setFluxPeriode] = useState<string>("");

  useEffect(() => {
    const fetchFlux = async () => {
      const { data } = await supabase
        .from("transactions_bancaires")
        .select("montant, date_operation");
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
  }, []);

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
          <div className="space-y-6 animate-fade-in">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <UpcomingSessions />
              <RecentActivity onNavigateToApprenant={handleNavigateToApprenant} />
              <div className="space-y-4">
                <PaymentReminders />
                <FournisseurInvoiceAlerts onNavigateToComptabilite={() => handleNavigate("comptabilite")} />
              </div>
            </div>

            {/* Financial Charts */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Analyse financière</h2>
              <FinancialCharts />
            </div>

            {/* Small Transfers */}
            <SmallTransfersTable />
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
      case "crm":
        return <CRMDashboard initialApprenantId={initialApprenantId} onApprenantClosed={() => setInitialApprenantId(null)} />;
      case "planning":
        return <PlanningCalendar />;
      case "sessions":
        return <SessionsList />;
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
      case "settings":
        return <SettingsPage />;
      default:
        return null;
    }
  };

  const config = pageConfig[currentPage as keyof typeof pageConfig];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar 
        currentPage={currentPage}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={config.title}
          subtitle={currentPage === 'dashboard' ? `Bienvenue, ${profile?.full_name?.split(' ')[0] || 'Admin'} !` : config.subtitle}
          onSelectApprenant={handleNavigateToApprenant}
          onNavigate={handleNavigate}
          canGoBack={pageHistory.length > 0}
          onGoBack={handleGoBack}
        />
        
        <main className="flex-1 overflow-auto p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Index;
