import { Search, Filter, Plus, MoreVertical, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const apprenants = [
  {
    id: 1,
    name: "Jean Martin",
    email: "jean.martin@email.com",
    phone: "06 12 34 56 78",
    company: "TechCorp",
    formations: ["React Avancé", "UX Design"],
    progress: 75,
    status: "en_cours",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jean",
  },
  {
    id: 2,
    name: "Sophie Bernard",
    email: "sophie.bernard@email.com",
    phone: "06 98 76 54 32",
    company: "DesignStudio",
    formations: ["UX Design"],
    progress: 100,
    status: "termine",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie",
  },
  {
    id: 3,
    name: "Pierre Durand",
    email: "pierre.durand@email.com",
    phone: "06 55 44 33 22",
    company: "DataFlow",
    formations: ["Python Data Science"],
    progress: 45,
    status: "en_cours",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pierre",
  },
  {
    id: 4,
    name: "Marie Leroy",
    email: "marie.leroy@email.com",
    phone: "06 11 22 33 44",
    company: "InnoStart",
    formations: ["Management d'équipe"],
    progress: 0,
    status: "inscrit",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marie",
  },
  {
    id: 5,
    name: "Lucas Petit",
    email: "lucas.petit@email.com",
    phone: "06 77 88 99 00",
    company: "WebAgency",
    formations: ["React Avancé"],
    progress: 30,
    status: "en_cours",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas",
  },
];

const statusLabels = {
  inscrit: { label: "Inscrit", class: "badge-primary" },
  en_cours: { label: "En cours", class: "badge-warning" },
  termine: { label: "Terminé", class: "badge-success" },
};

export function ApprenantsList() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un apprenant..." 
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Ajouter un apprenant
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Apprenant</TableHead>
              <TableHead className="font-semibold">Contact</TableHead>
              <TableHead className="font-semibold">Entreprise</TableHead>
              <TableHead className="font-semibold">Formations</TableHead>
              <TableHead className="font-semibold">Progression</TableHead>
              <TableHead className="font-semibold">Statut</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apprenants.map((apprenant) => (
              <TableRow key={apprenant.id} className="table-row-hover">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={apprenant.avatar} />
                      <AvatarFallback>{apprenant.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{apprenant.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      {apprenant.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      {apprenant.phone}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{apprenant.company}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {apprenant.formations.map((f, i) => (
                      <span key={i} className="badge-primary text-xs">
                        {f}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${apprenant.progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">{apprenant.progress}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={statusLabels[apprenant.status as keyof typeof statusLabels].class}>
                    {statusLabels[apprenant.status as keyof typeof statusLabels].label}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Voir profil</DropdownMenuItem>
                      <DropdownMenuItem>Modifier</DropdownMenuItem>
                      <DropdownMenuItem>Envoyer email</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Supprimer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
