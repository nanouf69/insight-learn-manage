import { Bell, Plus, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GlobalSearch } from "./GlobalSearch";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
  onSelectApprenant?: (id: string) => void;
  onNavigate?: (page: string) => void;
}

export function Header({ title, subtitle, onMenuClick, onSelectApprenant, onNavigate }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onMenuClick && (
            <button 
              onClick={onMenuClick}
              className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Global Search */}
          <GlobalSearch onSelectApprenant={onSelectApprenant} onNavigate={onNavigate} />

          {/* Quick Action */}
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nouvel apprenant</span>
          </Button>

          {/* Notifications */}
          <button className="relative p-2 hover:bg-muted rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
          </button>

          {/* User */}
          <div className="flex items-center gap-3 pl-4 border-l border-border">
            <Avatar className="w-9 h-9">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Marie" />
              <AvatarFallback>MC</AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <p className="text-sm font-medium">Marie Dupont</p>
              <p className="text-xs text-muted-foreground">Administrateur</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
