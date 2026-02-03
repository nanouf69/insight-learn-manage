import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Users, Mail, Phone, MapPin } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const organisations = [
  {
    id: 1,
    name: "Tech Solutions SARL",
    type: "client",
    contact: "Marc Dubois",
    email: "contact@techsolutions.fr",
    phone: "01 23 45 67 89",
    address: "15 Rue de l'Innovation, 75001 Paris",
    apprenants: 24,
    formationsEnCours: 3,
  },
  {
    id: 2,
    name: "Groupe Industriel ABC",
    type: "client",
    contact: "Claire Moreau",
    email: "rh@groupe-abc.com",
    phone: "01 98 76 54 32",
    address: "Zone Industrielle Nord, 69000 Lyon",
    apprenants: 45,
    formationsEnCours: 5,
  },
  {
    id: 3,
    name: "StartUp Digital",
    type: "prospect",
    contact: "Thomas Petit",
    email: "thomas@startup-digital.io",
    phone: "06 12 34 56 78",
    address: "10 Avenue des Startups, 33000 Bordeaux",
    apprenants: 0,
    formationsEnCours: 0,
  },
  {
    id: 4,
    name: "Cabinet Conseil RH",
    type: "partenaire",
    contact: "Sophie Lambert",
    email: "s.lambert@conseil-rh.fr",
    phone: "01 45 67 89 01",
    address: "25 Boulevard Haussmann, 75008 Paris",
    apprenants: 12,
    formationsEnCours: 2,
  },
  {
    id: 5,
    name: "Mairie de Marseille",
    type: "client",
    contact: "Jean-Pierre Martin",
    email: "formation@mairie-marseille.fr",
    phone: "04 91 00 00 00",
    address: "Hôtel de Ville, 13001 Marseille",
    apprenants: 67,
    formationsEnCours: 8,
  },
];

const getTypeBadge = (type: string) => {
  switch (type) {
    case "client":
      return <Badge className="bg-primary/10 text-primary hover:bg-primary/10">Client</Badge>;
    case "prospect":
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Prospect</Badge>;
    case "partenaire":
      return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Partenaire</Badge>;
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
};

export function OrganisationsList() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organisations</h1>
          <p className="text-muted-foreground">Gérez vos organisations clientes et partenaires</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle organisation
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organisations.map((org) => (
          <Card key={org.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 bg-primary/10">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {org.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-foreground">{org.name}</h3>
                      <p className="text-sm text-muted-foreground">{org.contact}</p>
                    </div>
                  </div>
                  {getTypeBadge(org.type)}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{org.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{org.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{org.address}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{org.apprenants}</span>
                    <span className="text-muted-foreground">apprenants</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{org.formationsEnCours}</span>
                    <span className="text-muted-foreground">formations</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
