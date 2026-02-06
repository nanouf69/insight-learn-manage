import { 
  LayoutDashboard, 
  GraduationCap, 
  Users, 
  Calendar, 
  FileText, 
  Settings,
  ChevronLeft,
  LogOut,
  CalendarDays,
  Building2,
  ClipboardList,
  Receipt,
  UserCog,
  Clock,
  ClipboardCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const menuItems = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "agenda", label: "Agenda", icon: Clock },
  { id: "planning", label: "Planning", icon: Calendar },
  { id: "sessions", label: "Sessions", icon: CalendarDays },
  { id: "formations", label: "Formations", icon: GraduationCap },
  { id: "formateurs", label: "Formateurs", icon: UserCog },
  { id: "organisations", label: "Organisations", icon: Building2 },
  { id: "crm", label: "Apprenants", icon: Users },
  { id: "examens", label: "Examen et Réussite", icon: ClipboardCheck },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "factures", label: "Factures", icon: Receipt },
  { id: "bpf", label: "BPF", icon: ClipboardList },
];

export function Sidebar({ currentPage, onNavigate, collapsed = false, onToggleCollapse }: SidebarProps) {
  return (
    <aside 
      className={cn(
        "bg-sidebar h-screen flex flex-col transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-6 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-sidebar-foreground">FormaCloud</span>
          </div>
        )}
        {collapsed && (
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mx-auto">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
        )}
        {onToggleCollapse && !collapsed && (
          <button 
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-sidebar-foreground/70" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              "nav-item w-full",
              currentPage === item.id && "nav-item-active"
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => onNavigate("settings")}
          className={cn(
            "nav-item w-full",
            currentPage === "settings" && "nav-item-active"
          )}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Paramètres</span>}
        </button>
        <button className="nav-item w-full text-destructive hover:text-destructive">
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
