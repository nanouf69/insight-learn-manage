import { User, Building2, CreditCard, Bell, Shield, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SettingsPage() {
  return (
    <div className="max-w-4xl animate-fade-in">
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="organization" className="gap-2">
            <Building2 className="w-4 h-4" />
            Organisation
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Facturation
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div className="stat-card">
            <h3 className="text-lg font-semibold mb-4">Informations personnelles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input id="firstName" defaultValue="Marie" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input id="lastName" defaultValue="Dupont" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue="marie.dupont@formacloud.fr" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" defaultValue="06 12 34 56 78" />
              </div>
            </div>
            <Button className="mt-6">Enregistrer les modifications</Button>
          </div>

          <div className="stat-card">
            <h3 className="text-lg font-semibold mb-4">Sécurité</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Authentification à deux facteurs</p>
                  <p className="text-sm text-muted-foreground">Ajouter une couche de sécurité supplémentaire</p>
                </div>
                <Switch />
              </div>
              <Button variant="outline">Changer le mot de passe</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="organization" className="space-y-6">
          <div className="stat-card">
            <h3 className="text-lg font-semibold mb-4">Informations de l'organisme</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Nom de l'organisme</Label>
                <Input id="orgName" defaultValue="FormaCloud SARL" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siret">SIRET</Label>
                <Input id="siret" defaultValue="123 456 789 00012" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nda">Numéro de déclaration d'activité</Label>
                <Input id="nda" defaultValue="11 75 12345 67" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tva">N° TVA Intracommunautaire</Label>
                <Input id="tva" defaultValue="FR 12 345678901" />
              </div>
            </div>
            <Button className="mt-6">Enregistrer</Button>
          </div>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <div className="stat-card">
            <h3 className="text-lg font-semibold mb-4">Abonnement actuel</h3>
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
              <div>
                <p className="font-semibold text-lg">Plan Professionnel</p>
                <p className="text-sm text-muted-foreground">Facturation mensuelle</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">99€<span className="text-sm font-normal text-muted-foreground">/mois</span></p>
                <Button variant="outline" size="sm" className="mt-2">Changer de plan</Button>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <h3 className="text-lg font-semibold mb-4">Moyen de paiement</h3>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
              <CreditCard className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Visa •••• 4242</p>
                <p className="text-sm text-muted-foreground">Expire 12/2027</p>
              </div>
              <Button variant="ghost" size="sm" className="ml-auto">Modifier</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <div className="stat-card">
            <h3 className="text-lg font-semibold mb-4">Préférences de notification</h3>
            <div className="space-y-4">
              {[
                { title: "Nouvelles inscriptions", desc: "Recevoir une notification pour chaque nouvelle inscription" },
                { title: "Sessions à venir", desc: "Rappel 24h avant chaque session de formation" },
                { title: "Documents signés", desc: "Notification lorsqu'un document est signé" },
                { title: "Paiements reçus", desc: "Notification pour chaque paiement reçu" },
                { title: "Rappels de facturation", desc: "Rappel pour les factures en attente" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch defaultChecked={i < 3} />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
