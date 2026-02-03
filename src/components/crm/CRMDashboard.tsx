import { Search, Filter, MoreVertical, Building2, Mail, Phone, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ContactForm } from "./ContactForm";

const contacts = [
  {
    id: 1,
    name: "Thomas Mercier",
    role: "DRH",
    company: "TechCorp",
    email: "thomas.mercier@techcorp.com",
    phone: "01 23 45 67 89",
    status: "prospect",
    value: 15000,
    lastContact: "Il y a 2 jours",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Thomas",
  },
  {
    id: 2,
    name: "Claire Dubois",
    role: "Responsable Formation",
    company: "InnoGroup",
    email: "claire.dubois@innogroup.fr",
    phone: "01 98 76 54 32",
    status: "negotiation",
    value: 8500,
    lastContact: "Aujourd'hui",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Claire",
  },
  {
    id: 3,
    name: "Marc Fontaine",
    role: "CEO",
    company: "StartupLab",
    email: "marc@startuplab.io",
    phone: "06 12 34 56 78",
    status: "client",
    value: 24000,
    lastContact: "Il y a 1 semaine",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marc",
  },
  {
    id: 4,
    name: "Julie Lambert",
    role: "Office Manager",
    company: "DesignCo",
    email: "julie.lambert@designco.fr",
    phone: "01 55 44 33 22",
    status: "lead",
    value: 3200,
    lastContact: "Il y a 3 jours",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Julie",
  },
];

const statusConfig = {
  lead: { label: "Lead", class: "bg-muted text-muted-foreground" },
  prospect: { label: "Prospect", class: "bg-primary/10 text-primary" },
  negotiation: { label: "Négociation", class: "bg-warning/10 text-warning" },
  client: { label: "Client", class: "bg-success/10 text-success" },
};

const pipelineStages = [
  { id: "lead", label: "Leads", count: 12, value: "18 500€" },
  { id: "prospect", label: "Prospects", count: 8, value: "45 000€" },
  { id: "negotiation", label: "Négociation", count: 4, value: "32 000€" },
  { id: "client", label: "Clients", count: 23, value: "156 000€" },
];

export function CRMDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Pipeline Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {pipelineStages.map((stage) => (
          <div key={stage.id} className="stat-card">
            <p className="text-sm font-medium text-muted-foreground">{stage.label}</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-bold text-foreground">{stage.count}</span>
              <span className="text-sm text-muted-foreground">contacts</span>
            </div>
            <p className="text-sm font-medium text-primary mt-1">{stage.value}</p>
          </div>
        ))}
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher un contact..." 
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
        <ContactForm />
      </div>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contacts.map((contact) => (
          <div 
            key={contact.id} 
            className="bg-card rounded-xl border border-border p-5 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={contact.avatar} />
                  <AvatarFallback>{contact.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-foreground">{contact.name}</h3>
                  <p className="text-sm text-muted-foreground">{contact.role}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Voir fiche</DropdownMenuItem>
                  <DropdownMenuItem>Modifier</DropdownMenuItem>
                  <DropdownMenuItem>Ajouter note</DropdownMenuItem>
                  <DropdownMenuItem>Planifier RDV</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">Supprimer</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                {contact.company}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                {contact.email}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                {contact.phone}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[contact.status as keyof typeof statusConfig].class}`}>
                  {statusConfig[contact.status as keyof typeof statusConfig].label}
                </span>
                <span className="text-sm font-medium text-foreground">{contact.value.toLocaleString()}€</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                {contact.lastContact}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
