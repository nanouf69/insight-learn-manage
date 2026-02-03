import { Search, Filter, MoreVertical, Clock, Users, Euro } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormationForm } from "./FormationForm";

const formations = [
  {
    id: 1,
    title: "React Avancé",
    category: "Développement Web",
    duration: "21h",
    price: 1800,
    participants: 45,
    sessions: 3,
    status: "active",
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=250&fit=crop",
  },
  {
    id: 2,
    title: "UX/UI Design",
    category: "Design",
    duration: "14h",
    price: 1200,
    participants: 32,
    sessions: 2,
    status: "active",
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=250&fit=crop",
  },
  {
    id: 3,
    title: "Python Data Science",
    category: "Data",
    duration: "35h",
    price: 2500,
    participants: 28,
    sessions: 4,
    status: "active",
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=250&fit=crop",
  },
  {
    id: 4,
    title: "Management d'équipe",
    category: "Soft Skills",
    duration: "7h",
    price: 800,
    participants: 56,
    sessions: 6,
    status: "active",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=250&fit=crop",
  },
  {
    id: 5,
    title: "Marketing Digital",
    category: "Marketing",
    duration: "14h",
    price: 1100,
    participants: 0,
    sessions: 0,
    status: "draft",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop",
  },
];

export function FormationsList() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher une formation..." 
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
        <FormationForm />
      </div>

      {/* Formations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {formations.map((formation) => (
          <div 
            key={formation.id} 
            className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-200 animate-slide-up"
          >
            <div className="relative h-40 overflow-hidden">
              <img 
                src={formation.image} 
                alt={formation.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3">
                <span className={formation.status === "active" ? "badge-success" : "badge-warning"}>
                  {formation.status === "active" ? "Active" : "Brouillon"}
                </span>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-primary uppercase tracking-wide">
                    {formation.category}
                  </span>
                  <h3 className="text-lg font-semibold text-foreground mt-1">
                    {formation.title}
                  </h3>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Modifier</DropdownMenuItem>
                    <DropdownMenuItem>Dupliquer</DropdownMenuItem>
                    <DropdownMenuItem>Planifier session</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Supprimer</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {formation.duration}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {formation.participants}
                </span>
                <span className="flex items-center gap-1.5">
                  <Euro className="w-4 h-4" />
                  {formation.price}€
                </span>
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {formation.sessions} session{formation.sessions > 1 ? "s" : ""} planifiée{formation.sessions > 1 ? "s" : ""}
                </span>
                <Button variant="ghost" size="sm" className="text-primary">
                  Voir détails
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
