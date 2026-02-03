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
  // Formations Présentiel
  {
    id: 1,
    title: "Formation Taxi",
    category: "Présentiel",
    duration: "140h",
    price: 1500,
    participants: 24,
    sessions: 3,
    status: "active",
    image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=250&fit=crop",
  },
  {
    id: 2,
    title: "Formation VTC",
    category: "Présentiel",
    duration: "140h",
    price: 1500,
    participants: 32,
    sessions: 4,
    status: "active",
    image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&h=250&fit=crop",
  },
  {
    id: 3,
    title: "Formation Taxi avec frais d'examen",
    category: "Présentiel",
    duration: "140h",
    price: 1800,
    participants: 18,
    sessions: 2,
    status: "active",
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=250&fit=crop",
  },
  {
    id: 4,
    title: "Formation VTC avec frais d'examen",
    category: "Présentiel",
    duration: "140h",
    price: 1800,
    participants: 22,
    sessions: 3,
    status: "active",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=250&fit=crop",
  },
  {
    id: 5,
    title: "Formation Taxi pour chauffeur VTC",
    category: "Présentiel",
    duration: "35h",
    price: 600,
    participants: 15,
    sessions: 2,
    status: "active",
    image: "https://images.unsplash.com/photo-1594535182038-1f8d4c5d4e60?w=400&h=250&fit=crop",
  },
  // Formations E-learning
  {
    id: 6,
    title: "Formation VTC",
    category: "E-learning",
    duration: "140h",
    price: 990,
    participants: 156,
    sessions: 0,
    status: "active",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=250&fit=crop",
  },
  {
    id: 7,
    title: "Formation Taxi",
    category: "E-learning",
    duration: "140h",
    price: 990,
    participants: 128,
    sessions: 0,
    status: "active",
    image: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=400&h=250&fit=crop",
  },
  {
    id: 8,
    title: "Formation Taxi pour chauffeur VTC",
    category: "E-learning",
    duration: "35h",
    price: 390,
    participants: 67,
    sessions: 0,
    status: "active",
    image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=250&fit=crop",
  },
  {
    id: 9,
    title: "Formation VTC pour chauffeur Taxi",
    category: "E-learning",
    duration: "35h",
    price: 390,
    participants: 45,
    sessions: 0,
    status: "active",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=250&fit=crop",
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
