import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { UpcomingSessions } from "@/components/dashboard/UpcomingSessions";
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
import { AgendaView } from "@/components/agenda/AgendaView";
import { GraduationCap, Users, Euro, TrendingUp } from "lucide-react";

const pageConfig = {
  dashboard: { title: "Tableau de bord", subtitle: "Bienvenue, Marie !" },
  agenda: { title: "Agenda", subtitle: "Planifiez vos cours par heure" },
  planning: { title: "Planning", subtitle: "Planifiez vos sessions de formation" },
  sessions: { title: "Sessions", subtitle: "Gérez vos sessions de formation" },
  formations: { title: "Formations", subtitle: "Gérez votre catalogue de formations" },
  formateurs: { title: "Formateurs", subtitle: "Gérez votre équipe de formateurs" },
  organisations: { title: "Organisations", subtitle: "Gérez vos organisations clientes" },
  apprenants: { title: "Apprenants", subtitle: "Suivez vos apprenants" },
  crm: { title: "CRM", subtitle: "Gérez vos contacts et prospects" },
  documents: { title: "Documents", subtitle: "Gérez vos documents administratifs" },
  factures: { title: "Factures", subtitle: "Créez et gérez vos factures" },
  settings: { title: "Paramètres", subtitle: "Configurez votre espace" },
  bpf: { title: "BPF", subtitle: "Bilan Pédagogique et Financier" },
};

const Index = () => {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
                title="CA ce mois" 
                value="24 500€" 
                change={15}
                icon={Euro}
                iconColor="success"
              />
              <StatCard 
                title="Taux de completion" 
                value="87%" 
                change={-2}
                icon={TrendingUp}
                iconColor="warning"
              />
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UpcomingSessions />
              <RecentActivity />
            </div>
          </div>
        );
      case "agenda":
        return <AgendaView />;
      case "formations":
        return <FormationsList />;
      case "apprenants":
        return <ApprenantsList />;
      case "crm":
        return <CRMDashboard />;
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
      case "bpf":
        return <BPFForm />;
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
        onNavigate={setCurrentPage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title={config.title}
          subtitle={config.subtitle}
        />
        
        <main className="flex-1 overflow-auto p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Index;
