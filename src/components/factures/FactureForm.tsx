import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, 
  GraduationCap, 
  Package, 
  Users, 
  Building2, 
  User,
  Plus,
  Trash2,
  Download,
  Send,
  Euro
} from "lucide-react";
import { toast } from "sonner";

interface LigneFacture {
  id: string;
  type: "formation" | "produit" | "service";
  designation: string;
  quantite: number;
  prixUnitaire: number;
  tva: number;
}

interface FactureData {
  numero: string;
  date: string;
  dateEcheance: string;
  
  // Type de financeur
  typeFinanceur: "particulier" | "professionnel";
  
  // Financeur particulier
  particulierNom: string;
  particulierPrenom: string;
  particulierAdresse: string;
  particulierEmail: string;
  particulierTel: string;
  
  // Financeur professionnel
  entrepriseNom: string;
  entrepriseSiret: string;
  entrepriseAdresse: string;
  entrepriseContact: string;
  entrepriseEmail: string;
  entrepriseTel: string;
  
  // OPCO / Organisme financeur
  opcoNom: string;
  opcoNumero: string;
  
  // Lignes de facture
  lignes: LigneFacture[];
  
  // Notes
  notes: string;
  conditionsPaiement: string;
}

const formationsDisponibles = [
  { id: "fimo", nom: "FIMO Voyageurs", prix: 2500 },
  { id: "fco", nom: "FCO Voyageurs", prix: 450 },
  { id: "titre-pro", nom: "Titre Professionnel Conducteur Transport en Commun", prix: 8500 },
  { id: "permis-d", nom: "Permis D", prix: 3200 },
  { id: "passerelle", nom: "Passerelle Permis D vers DE", prix: 1800 },
];

const servicesDisponibles = [
  { id: "eval", nom: "Évaluation préalable", prix: 150 },
  { id: "accomp", nom: "Accompagnement administratif", prix: 200 },
  { id: "certif", nom: "Frais de certification", prix: 350 },
];

const defaultFactureData: FactureData = {
  numero: `FAC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`,
  date: new Date().toISOString().split('T')[0],
  dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  
  typeFinanceur: "professionnel",
  
  particulierNom: "",
  particulierPrenom: "",
  particulierAdresse: "",
  particulierEmail: "",
  particulierTel: "",
  
  entrepriseNom: "",
  entrepriseSiret: "",
  entrepriseAdresse: "",
  entrepriseContact: "",
  entrepriseEmail: "",
  entrepriseTel: "",
  
  opcoNom: "",
  opcoNumero: "",
  
  lignes: [],
  
  notes: "",
  conditionsPaiement: "Paiement à 30 jours. En cas de retard, des pénalités de retard seront appliquées.",
};

export function FactureForm() {
  const [data, setData] = useState<FactureData>(defaultFactureData);

  const updateField = <K extends keyof FactureData>(field: K, value: FactureData[K]) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const ajouterLigne = (type: "formation" | "produit" | "service") => {
    const nouvelleLigne: LigneFacture = {
      id: crypto.randomUUID(),
      type,
      designation: "",
      quantite: 1,
      prixUnitaire: 0,
      tva: 0,
    };
    setData(prev => ({ ...prev, lignes: [...prev.lignes, nouvelleLigne] }));
  };

  const supprimerLigne = (id: string) => {
    setData(prev => ({ ...prev, lignes: prev.lignes.filter(l => l.id !== id) }));
  };

  const updateLigne = (id: string, field: keyof LigneFacture, value: string | number) => {
    setData(prev => ({
      ...prev,
      lignes: prev.lignes.map(l => l.id === id ? { ...l, [field]: value } : l)
    }));
  };

  const selectFormation = (id: string, ligneId: string) => {
    const formation = formationsDisponibles.find(f => f.id === id);
    if (formation) {
      setData(prev => ({
        ...prev,
        lignes: prev.lignes.map(l => l.id === ligneId ? { 
          ...l, 
          designation: formation.nom, 
          prixUnitaire: formation.prix 
        } : l)
      }));
    }
  };

  const selectService = (id: string, ligneId: string) => {
    const service = servicesDisponibles.find(s => s.id === id);
    if (service) {
      setData(prev => ({
        ...prev,
        lignes: prev.lignes.map(l => l.id === ligneId ? { 
          ...l, 
          designation: service.nom, 
          prixUnitaire: service.prix 
        } : l)
      }));
    }
  };

  const calculerTotalHT = () => {
    return data.lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire), 0);
  };

  const calculerTotalTVA = () => {
    return data.lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire * l.tva / 100), 0);
  };

  const calculerTotalTTC = () => {
    return calculerTotalHT() + calculerTotalTVA();
  };

  const handleExport = () => {
    const client = data.typeFinanceur === "particulier" 
      ? `${data.particulierPrenom} ${data.particulierNom}`
      : data.entrepriseNom;

    const lignesTexte = data.lignes.map(l => 
      `- ${l.designation}: ${l.quantite} x ${l.prixUnitaire}€ = ${l.quantite * l.prixUnitaire}€`
    ).join('\n');

    const content = `
FACTURE N° ${data.numero}
========================

Date: ${data.date}
Échéance: ${data.dateEcheance}

CLIENT
------
${data.typeFinanceur === "particulier" ? `
Nom: ${data.particulierPrenom} ${data.particulierNom}
Adresse: ${data.particulierAdresse}
Email: ${data.particulierEmail}
Tél: ${data.particulierTel}
` : `
Entreprise: ${data.entrepriseNom}
SIRET: ${data.entrepriseSiret}
Adresse: ${data.entrepriseAdresse}
Contact: ${data.entrepriseContact}
Email: ${data.entrepriseEmail}
Tél: ${data.entrepriseTel}
${data.opcoNom ? `OPCO: ${data.opcoNom} (${data.opcoNumero})` : ''}
`}

DÉTAIL
------
${lignesTexte}

TOTAUX
------
Total HT: ${calculerTotalHT().toFixed(2)}€
Total TVA: ${calculerTotalTVA().toFixed(2)}€
Total TTC: ${calculerTotalTTC().toFixed(2)}€

CONDITIONS
----------
${data.conditionsPaiement}

${data.notes ? `Notes: ${data.notes}` : ''}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Facture_${data.numero}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Facture exportée avec succès");
  };

  const handleEnvoyer = () => {
    const email = data.typeFinanceur === "particulier" ? data.particulierEmail : data.entrepriseEmail;
    if (!email) {
      toast.error("Veuillez renseigner l'email du client");
      return;
    }
    window.location.href = `mailto:${email}?subject=Facture ${data.numero} - F.Transport&body=Veuillez trouver ci-joint la facture ${data.numero}.`;
    toast.success("Ouverture du client email...");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Création de Facture</h2>
          <p className="text-muted-foreground">
            Générez vos factures pour formations et services
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleEnvoyer} variant="outline">
            <Send className="w-4 h-4 mr-2" />
            Envoyer
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Infos facture */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Informations de la facture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero">N° Facture</Label>
              <Input 
                id="numero" 
                value={data.numero} 
                onChange={(e) => updateField('numero', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date de facturation</Label>
              <Input 
                id="date" 
                type="date"
                value={data.date} 
                onChange={(e) => updateField('date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateEcheance">Date d'échéance</Label>
              <Input 
                id="dateEcheance" 
                type="date"
                value={data.dateEcheance} 
                onChange={(e) => updateField('dateEcheance', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="prestations" className="space-y-4">
        <TabsList className="grid grid-cols-2 gap-2 h-auto">
          <TabsTrigger value="prestations" className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Formations / Produits / Services
          </TabsTrigger>
          <TabsTrigger value="financeur" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Financeur
          </TabsTrigger>
        </TabsList>

        {/* Onglet Prestations */}
        <TabsContent value="prestations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Lignes de facture
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => ajouterLigne("formation")}>
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Formation
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => ajouterLigne("service")}>
                    <Package className="w-4 h-4 mr-2" />
                    Service
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => ajouterLigne("produit")}>
                    <Plus className="w-4 h-4 mr-2" />
                    Autre
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.lignes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune ligne ajoutée</p>
                  <p className="text-sm">Cliquez sur les boutons ci-dessus pour ajouter des formations ou services</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.lignes.map((ligne, index) => (
                    <div key={ligne.id} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          Ligne {index + 1} - {ligne.type === "formation" ? "Formation" : ligne.type === "service" ? "Service" : "Produit"}
                        </span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => supprimerLigne(ligne.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {ligne.type === "formation" ? (
                          <div className="space-y-2 md:col-span-2">
                            <Label>Formation</Label>
                            <Select onValueChange={(v) => selectFormation(v, ligne.id)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner une formation" />
                              </SelectTrigger>
                              <SelectContent>
                                {formationsDisponibles.map(f => (
                                  <SelectItem key={f.id} value={f.id}>
                                    {f.nom} - {f.prix}€
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : ligne.type === "service" ? (
                          <div className="space-y-2 md:col-span-2">
                            <Label>Service</Label>
                            <Select onValueChange={(v) => selectService(v, ligne.id)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un service" />
                              </SelectTrigger>
                              <SelectContent>
                                {servicesDisponibles.map(s => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.nom} - {s.prix}€
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="space-y-2 md:col-span-2">
                            <Label>Désignation</Label>
                            <Input 
                              value={ligne.designation}
                              onChange={(e) => updateLigne(ligne.id, 'designation', e.target.value)}
                              placeholder="Description du produit/service"
                            />
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <Label>Quantité</Label>
                          <Input 
                            type="number"
                            min="1"
                            value={ligne.quantite}
                            onChange={(e) => updateLigne(ligne.id, 'quantite', parseInt(e.target.value) || 1)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Prix unitaire HT (€)</Label>
                          <Input 
                            type="number"
                            min="0"
                            step="0.01"
                            value={ligne.prixUnitaire}
                            onChange={(e) => updateLigne(ligne.id, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>TVA (%)</Label>
                          <Select 
                            value={String(ligne.tva)}
                            onValueChange={(v) => updateLigne(ligne.id, 'tva', parseFloat(v))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0% (Exonéré)</SelectItem>
                              <SelectItem value="5.5">5,5%</SelectItem>
                              <SelectItem value="10">10%</SelectItem>
                              <SelectItem value="20">20%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 md:col-span-3">
                          <Label>Total ligne</Label>
                          <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center font-medium">
                            {(ligne.quantite * ligne.prixUnitaire * (1 + ligne.tva / 100)).toFixed(2)}€ TTC
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {data.lignes.length > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-end">
                    <div className="w-full md:w-1/3 space-y-2">
                      <div className="flex justify-between">
                        <span>Total HT</span>
                        <span className="font-medium">{calculerTotalHT().toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Total TVA</span>
                        <span>{calculerTotalTVA().toFixed(2)}€</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total TTC</span>
                        <span className="text-primary">{calculerTotalTTC().toFixed(2)}€</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes et conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="conditionsPaiement">Conditions de paiement</Label>
                <Textarea 
                  id="conditionsPaiement"
                  value={data.conditionsPaiement}
                  onChange={(e) => updateField('conditionsPaiement', e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (facultatif)</Label>
                <Textarea 
                  id="notes"
                  value={data.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Notes complémentaires..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Financeur */}
        <TabsContent value="financeur" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Type de financeur</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup 
                value={data.typeFinanceur}
                onValueChange={(v) => updateField('typeFinanceur', v as "particulier" | "professionnel")}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${data.typeFinanceur === "particulier" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                  <RadioGroupItem value="particulier" id="particulier" />
                  <Label htmlFor="particulier" className="flex items-center gap-2 cursor-pointer">
                    <User className="w-5 h-5" />
                    <div>
                      <div className="font-medium">Particulier</div>
                      <div className="text-sm text-muted-foreground">Personne physique finançant à titre personnel</div>
                    </div>
                  </Label>
                </div>
                <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${data.typeFinanceur === "professionnel" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                  <RadioGroupItem value="professionnel" id="professionnel" />
                  <Label htmlFor="professionnel" className="flex items-center gap-2 cursor-pointer">
                    <Building2 className="w-5 h-5" />
                    <div>
                      <div className="font-medium">Professionnel</div>
                      <div className="text-sm text-muted-foreground">Entreprise, OPCO, organisme financeur</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {data.typeFinanceur === "particulier" ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Informations du particulier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="particulierNom">Nom</Label>
                    <Input 
                      id="particulierNom"
                      value={data.particulierNom}
                      onChange={(e) => updateField('particulierNom', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="particulierPrenom">Prénom</Label>
                    <Input 
                      id="particulierPrenom"
                      value={data.particulierPrenom}
                      onChange={(e) => updateField('particulierPrenom', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="particulierAdresse">Adresse</Label>
                    <Input 
                      id="particulierAdresse"
                      value={data.particulierAdresse}
                      onChange={(e) => updateField('particulierAdresse', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="particulierEmail">Email</Label>
                    <Input 
                      id="particulierEmail"
                      type="email"
                      value={data.particulierEmail}
                      onChange={(e) => updateField('particulierEmail', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="particulierTel">Téléphone</Label>
                    <Input 
                      id="particulierTel"
                      value={data.particulierTel}
                      onChange={(e) => updateField('particulierTel', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Informations de l'entreprise
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="entrepriseNom">Raison sociale</Label>
                      <Input 
                        id="entrepriseNom"
                        value={data.entrepriseNom}
                        onChange={(e) => updateField('entrepriseNom', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="entrepriseSiret">N° SIRET</Label>
                      <Input 
                        id="entrepriseSiret"
                        value={data.entrepriseSiret}
                        onChange={(e) => updateField('entrepriseSiret', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="entrepriseAdresse">Adresse</Label>
                      <Input 
                        id="entrepriseAdresse"
                        value={data.entrepriseAdresse}
                        onChange={(e) => updateField('entrepriseAdresse', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="entrepriseContact">Nom du contact</Label>
                      <Input 
                        id="entrepriseContact"
                        value={data.entrepriseContact}
                        onChange={(e) => updateField('entrepriseContact', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="entrepriseEmail">Email</Label>
                      <Input 
                        id="entrepriseEmail"
                        type="email"
                        value={data.entrepriseEmail}
                        onChange={(e) => updateField('entrepriseEmail', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="entrepriseTel">Téléphone</Label>
                      <Input 
                        id="entrepriseTel"
                        value={data.entrepriseTel}
                        onChange={(e) => updateField('entrepriseTel', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="w-5 h-5" />
                    OPCO / Organisme financeur (facultatif)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="opcoNom">Nom de l'OPCO</Label>
                      <Select onValueChange={(v) => updateField('opcoNom', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un OPCO" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OPCO Mobilités">OPCO Mobilités</SelectItem>
                          <SelectItem value="OPCO EP">OPCO EP</SelectItem>
                          <SelectItem value="OPCO Atlas">OPCO Atlas</SelectItem>
                          <SelectItem value="OPCO Santé">OPCO Santé</SelectItem>
                          <SelectItem value="OPCO Commerce">OPCO Commerce</SelectItem>
                          <SelectItem value="Constructys">Constructys</SelectItem>
                          <SelectItem value="AFDAS">AFDAS</SelectItem>
                          <SelectItem value="Uniformation">Uniformation</SelectItem>
                          <SelectItem value="Autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="opcoNumero">N° de prise en charge</Label>
                      <Input 
                        id="opcoNumero"
                        value={data.opcoNumero}
                        onChange={(e) => updateField('opcoNumero', e.target.value)}
                        placeholder="Numéro de dossier OPCO"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
