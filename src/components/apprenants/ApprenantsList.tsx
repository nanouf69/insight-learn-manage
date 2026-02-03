import { useState } from "react";
import { Search, Filter, MoreVertical, Mail, Phone, MapPin, User, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ApprenantForm } from "./ApprenantForm";

interface Apprenant {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  codePostal: string;
  ville: string;
  company: string;
  formations: string[];
  progress: number;
  status: "inscrit" | "en_cours" | "termine";
  type: "prospect" | "client";
  avatar: string;
  modeFinancement: "cpf" | "personnel" | "opco" | "france_travail" | "autre";
}

const modesFinancementLabels = {
  cpf: { label: "CPF", class: "bg-purple-100 text-purple-700" },
  personnel: { label: "Personnel", class: "bg-gray-100 text-gray-700" },
  opco: { label: "OPCO", class: "bg-blue-100 text-blue-700" },
  france_travail: { label: "France Travail", class: "bg-orange-100 text-orange-700" },
  autre: { label: "Autre", class: "bg-slate-100 text-slate-700" },
};

const apprenants: Apprenant[] = [
  {
    id: 1,
    name: "Jean Martin",
    email: "jean.martin@email.com",
    phone: "06 12 34 56 78",
    address: "12 rue des Lilas",
    codePostal: "69001",
    ville: "Lyon",
    company: "Particulier",
    formations: ["Formation VTC"],
    progress: 75,
    status: "en_cours",
    type: "client",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jean",
    modeFinancement: "cpf",
  },
  {
    id: 2,
    name: "Sophie Bernard",
    email: "sophie.bernard@email.com",
    phone: "06 98 76 54 32",
    address: "45 avenue Jean Jaurès",
    codePostal: "69007",
    ville: "Lyon",
    company: "OPCO Mobilités",
    formations: ["Formation TAXI"],
    progress: 100,
    status: "termine",
    type: "client",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie",
    modeFinancement: "opco",
  },
  {
    id: 3,
    name: "Pierre Durand",
    email: "pierre.durand@email.com",
    phone: "06 55 44 33 22",
    address: "8 place Bellecour",
    codePostal: "69002",
    ville: "Lyon",
    company: "CPF",
    formations: ["Formation VTC avec frais d'examen"],
    progress: 45,
    status: "en_cours",
    type: "client",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pierre",
    modeFinancement: "cpf",
  },
  {
    id: 4,
    name: "Marie Leroy",
    email: "marie.leroy@email.com",
    phone: "06 11 22 33 44",
    address: "23 rue de la République",
    codePostal: "69003",
    ville: "Lyon",
    company: "",
    formations: ["Formation TAXI"],
    progress: 0,
    status: "inscrit",
    type: "prospect",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marie",
    modeFinancement: "personnel",
  },
  {
    id: 5,
    name: "Lucas Petit",
    email: "lucas.petit@email.com",
    phone: "06 77 88 99 00",
    address: "56 cours Lafayette",
    codePostal: "69006",
    ville: "Lyon",
    company: "France Travail",
    formations: ["Formation VTC"],
    progress: 30,
    status: "en_cours",
    type: "client",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas",
    modeFinancement: "france_travail",
  },
  {
    id: 6,
    name: "Ahmed Benali",
    email: "ahmed.benali@email.com",
    phone: "06 22 33 44 55",
    address: "18 rue Garibaldi",
    codePostal: "69003",
    ville: "Lyon",
    company: "",
    formations: ["Formation VTC (E-learning)"],
    progress: 0,
    status: "inscrit",
    type: "prospect",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmed",
    modeFinancement: "personnel",
  },
  {
    id: 7,
    name: "Fatima Diallo",
    email: "fatima.diallo@email.com",
    phone: "06 33 44 55 66",
    address: "7 place Carnot",
    codePostal: "69002",
    ville: "Lyon",
    company: "",
    formations: ["Formation TAXI pour chauffeur VTC"],
    progress: 0,
    status: "inscrit",
    type: "prospect",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Fatima",
    modeFinancement: "cpf",
  },
];

const statusLabels = {
  inscrit: { label: "Inscrit", class: "bg-blue-100 text-blue-700" },
  en_cours: { label: "En cours", class: "bg-amber-100 text-amber-700" },
  termine: { label: "Terminé", class: "bg-green-100 text-green-700" },
};

function ApprenantTable({ data, showType = false }: { data: Apprenant[]; showType?: boolean }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Apprenant</TableHead>
            <TableHead className="font-semibold">Contact</TableHead>
            <TableHead className="font-semibold">Adresse</TableHead>
            <TableHead className="font-semibold">Formations</TableHead>
            <TableHead className="font-semibold">Financement</TableHead>
            {showType && <TableHead className="font-semibold">Type</TableHead>}
            <TableHead className="font-semibold">Progression</TableHead>
            <TableHead className="font-semibold">Statut</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((apprenant) => (
            <TableRow key={apprenant.id} className="hover:bg-muted/50">
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
              <TableCell>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <div>{apprenant.address}</div>
                    <div className="text-muted-foreground">{apprenant.codePostal} {apprenant.ville}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {apprenant.formations.map((f, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {f}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={modesFinancementLabels[apprenant.modeFinancement].class}>
                  {modesFinancementLabels[apprenant.modeFinancement].label}
                </Badge>
              </TableCell>
              {showType && (
                <TableCell>
                  {apprenant.type === "prospect" ? (
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                      <User className="w-3 h-3 mr-1" />
                      Prospect
                    </Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                      <UserCheck className="w-3 h-3 mr-1" />
                      Client
                    </Badge>
                  )}
                </TableCell>
              )}
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
                <Badge className={statusLabels[apprenant.status].class}>
                  {statusLabels[apprenant.status].label}
                </Badge>
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
                    {apprenant.type === "prospect" && (
                      <DropdownMenuItem>Convertir en client</DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-destructive">Supprimer</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ApprenantsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("tous");

  const filteredApprenants = apprenants.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.ville.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const prospects = filteredApprenants.filter(a => a.type === "prospect");
  const clients = filteredApprenants.filter(a => a.type === "client");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header avec stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-card rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{apprenants.length}</p>
              <p className="text-sm text-muted-foreground">Total apprenants</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-card rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <User className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{prospects.length}</p>
              <p className="text-sm text-muted-foreground">Prospects</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-card rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{clients.length}</p>
              <p className="text-sm text-muted-foreground">Clients</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un apprenant..." 
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
        <ApprenantForm />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tous" className="gap-2">
            Tous
            <Badge variant="secondary" className="ml-1">{filteredApprenants.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="prospects" className="gap-2">
            <User className="w-4 h-4" />
            Prospects
            <Badge className="ml-1 bg-amber-100 text-amber-700">{prospects.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-2">
            <UserCheck className="w-4 h-4" />
            Clients
            <Badge className="ml-1 bg-green-100 text-green-700">{clients.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tous" className="mt-4">
          <ApprenantTable data={filteredApprenants} showType={true} />
        </TabsContent>

        <TabsContent value="prospects" className="mt-4">
          {prospects.length > 0 ? (
            <ApprenantTable data={prospects} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun prospect trouvé</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="clients" className="mt-4">
          {clients.length > 0 ? (
            <ApprenantTable data={clients} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucun client trouvé</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
