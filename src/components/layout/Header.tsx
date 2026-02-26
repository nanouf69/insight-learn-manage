import { Bell, Plus, Menu, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GlobalSearch } from "./GlobalSearch";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
  onSelectApprenant?: (id: string) => void;
  onNavigate?: (page: string) => void;
  canGoBack?: boolean;
  onGoBack?: () => void;
}

export function Header({ title, subtitle, onMenuClick, onSelectApprenant, onNavigate, canGoBack, onGoBack }: HeaderProps) {
  const { profile } = useAuth();

  const displayName = profile?.full_name || "Administrateur";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <button 
              onClick={onMenuClick}
              className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          {canGoBack && onGoBack && (
            <Button
              variant="outline"
              size="sm"
              onClick={onGoBack}
              className="gap-1.5 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              Précédent
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <GlobalSearch onSelectApprenant={onSelectApprenant} onNavigate={onNavigate} />

          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nouvel apprenant</span>
          </Button>

          <button className="relative p-2 hover:bg-muted rounded-lg transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
          </button>

          <div className="flex items-center gap-3 pl-4 border-l border-border">
            <Avatar className="w-9 h-9">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${initials}`} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">Administrateur</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
