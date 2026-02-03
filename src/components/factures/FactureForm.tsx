import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  Printer
} from "lucide-react";
import { toast } from "sonner";

// Informations de l'entreprise émettrice
const entrepriseEmettrice = {
  nom: "FTRANSPORT",
  slogan: "Spécialiste Formations Transport",
  adresse: "86 route de genas",
  codePostal: "69003",
  ville: "Lyon",
  siret: "82346156100016",
  telephone: "0428296091",
  email: "contact@ftransport.fr",
  declarationActivite: "84691511469",
  capital: "5000",
  nafApe: "8559B",
  rcs: "823461561",
  tvaIntra: "FR44823461561",
  prefectures: "69-18-001 et 69-16-15",
  // Coordonnées bancaires BNP Paribas
  banque: "BNP PARIBAS",
  iban: "FR76 3000 4014 1800 0101 2475 357",
  bic: "BNPAFRPPXXX",
  codeBanque: "30004",
  codeGuichet: "01418",
  numeroCompte: "0001024753",
  cleRib: "57",
  agence: "LYON-MONTCHAT"
};

interface LigneFacture {
  id: string;
  stagiaire: string;
  designation: string;
  dateDebut: string;
  dateFin: string;
  lieu: string;
  quantite: number;
  prixUnitaire: number;
  tvaType: "EXO" | "5.5" | "10" | "20";
  remise: number;
}

interface FactureData {
  numero: string;
  numeroInterne: string;
  date: string;
  dateEcheance: string;
  duplicata: boolean;
  
  // Type de financeur
  typeFinanceur: "particulier" | "professionnel";
  
  // Financeur particulier
  particulierNom: string;
  particulierPrenom: string;
  particulierAdresse: string;
  particulierCodePostal: string;
  particulierVille: string;
  particulierEmail: string;
  particulierTel: string;
  
  // Financeur professionnel (client)
  clientNom: string;
  clientAdresse: string;
  clientCodePostal: string;
  clientVille: string;
  clientPays: string;
  clientSiret: string;
  clientTvaIntra: string;
  clientPrefecture: string;
  
  // Références
  refDossier: string;
  refConvention: string;
  
  // Lignes de facture
  lignes: LigneFacture[];
  
  // Notes
  notes: string;
}

const formationsDisponibles = [
  { id: "vtc-soir", nom: "Formation VTC cours du soir", prix: 1599 },
  { id: "fimo-v", nom: "FIMO Voyageurs", prix: 2500 },
  { id: "fco-v", nom: "FCO Voyageurs", prix: 450 },
  { id: "titre-pro", nom: "Titre Professionnel Conducteur Transport en Commun", prix: 8500 },
  { id: "permis-d", nom: "Permis D", prix: 3200 },
  { id: "passerelle", nom: "Passerelle Permis D vers DE", prix: 1800 },
];

const generateNumeroFacture = () => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const num = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `${year}${month}${num}`;
};

const defaultFactureData: FactureData = {
  numero: "7",
  numeroInterne: generateNumeroFacture(),
  date: new Date().toISOString().split('T')[0],
  dateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  duplicata: false,
  
  typeFinanceur: "professionnel",
  
  particulierNom: "",
  particulierPrenom: "",
  particulierAdresse: "",
  particulierCodePostal: "",
  particulierVille: "",
  particulierEmail: "",
  particulierTel: "",
  
  clientNom: "",
  clientAdresse: "",
  clientCodePostal: "",
  clientVille: "",
  clientPays: "FRANCE",
  clientSiret: "",
  clientTvaIntra: "",
  clientPrefecture: "",
  
  refDossier: "",
  refConvention: "",
  
  lignes: [],
  
  notes: "",
};

export function FactureForm() {
  const [data, setData] = useState<FactureData>(defaultFactureData);

  const updateField = <K extends keyof FactureData>(field: K, value: FactureData[K]) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const ajouterLigne = () => {
    const nouvelleLigne: LigneFacture = {
      id: crypto.randomUUID(),
      stagiaire: "",
      designation: "",
      dateDebut: "",
      dateFin: "",
      lieu: `${entrepriseEmettrice.adresse} ${entrepriseEmettrice.codePostal} ${entrepriseEmettrice.ville}`,
      quantite: 1,
      prixUnitaire: 0,
      tvaType: "EXO",
      remise: 0,
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

  const selectFormation = (formationId: string, ligneId: string) => {
    const formation = formationsDisponibles.find(f => f.id === formationId);
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

  const getTvaRate = (tvaType: string) => {
    switch (tvaType) {
      case "5.5": return 5.5;
      case "10": return 10;
      case "20": return 20;
      default: return 0;
    }
  };

  const calculerLigneHT = (ligne: LigneFacture) => {
    const total = ligne.quantite * ligne.prixUnitaire;
    return total - (total * ligne.remise / 100);
  };

  const calculerTotalHT = () => {
    return data.lignes.reduce((sum, l) => sum + calculerLigneHT(l), 0);
  };

  const calculerTotalTVA = () => {
    return data.lignes.reduce((sum, l) => {
      const ht = calculerLigneHT(l);
      return sum + (ht * getTvaRate(l.tvaType) / 100);
    }, 0);
  };

  const calculerTotalTTC = () => {
    return calculerTotalHT() + calculerTotalTVA();
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handlePrint = () => {
    window.print();
    toast.success("Impression lancée");
  };

  const handleExport = () => {
    // Générer un HTML de la facture
    const factureHTML = generateFactureHTML();
    const blob = new Blob([factureHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Facture_${data.numeroInterne}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Facture exportée avec succès");
  };

  const generateFactureHTML = () => {
    const lignesHTML = data.lignes.map(l => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${l.stagiaire}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">
          ${l.designation}<br>
          <small>Du ${formatDate(l.dateDebut)} au ${formatDate(l.dateFin)}</small><br>
          <small>Lieu : ${l.lieu}</small>
        </td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${l.tvaType}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${l.prixUnitaire.toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${l.quantite.toFixed(2)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${l.remise || ''}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${calculerLigneHT(l).toFixed(2)}</td>
      </tr>
    `).join('');

    const clientInfo = data.typeFinanceur === "particulier" 
      ? `${data.particulierPrenom} ${data.particulierNom}<br>${data.particulierAdresse}<br>${data.particulierCodePostal} ${data.particulierVille}`
      : `${data.clientNom}<br>${data.clientAdresse}<br>${data.clientCodePostal} ${data.clientVille}<br>${data.clientPays}<br>SIRET : ${data.clientSiret}<br>TVA Intracommunautaire : ${data.clientTvaIntra}`;

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${data.numeroInterne}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
    .logo-sub { font-size: 14px; color: #666; }
    .title { text-align: right; }
    .title h1 { font-size: 18px; margin: 0; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .info-box { width: 48%; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f3f4f6; padding: 10px; border: 1px solid #ddd; text-align: left; }
    .totals { text-align: right; margin-top: 20px; }
    .bank-info { margin-top: 30px; padding: 15px; background: #f9fafb; border: 1px solid #e5e7eb; }
    .footer { margin-top: 30px; font-size: 10px; color: #666; text-align: center; border-top: 1px solid #ddd; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">🚌 ${entrepriseEmettrice.nom}</div>
      <div class="logo-sub">${entrepriseEmettrice.slogan}</div>
    </div>
    <div class="title">
      <h1>FACTURE ${data.duplicata ? 'DUPLICATA ' : ''}N°${data.numero}</h1>
      <p>Numéro : ${data.numeroInterne}</p>
      <p>Date de facturation : ${formatDate(data.date)}</p>
      <p>Date d'échéance : ${formatDate(data.dateEcheance)}</p>
    </div>
  </div>

  <div class="info-row">
    <div class="info-box">
      <strong>Émetteur :</strong><br>
      ${entrepriseEmettrice.nom}<br>
      ${entrepriseEmettrice.adresse}<br>
      ${entrepriseEmettrice.codePostal} ${entrepriseEmettrice.ville}<br>
      SIRET : ${entrepriseEmettrice.siret}<br>
      Tél.: ${entrepriseEmettrice.telephone}<br>
      Email: ${entrepriseEmettrice.email}<br>
      Déclaration d'activité n° ${entrepriseEmettrice.declarationActivite}
      ${data.refDossier ? `<br>Réf dossier : ${data.refDossier}` : ''}
    </div>
    <div class="info-box">
      <strong>Adressée à :</strong><br>
      ${clientInfo}
      ${data.refConvention ? `<br>Réf à rappeler : ${data.refConvention}` : ''}
    </div>
  </div>

  <h3>Désignation</h3>
  <table>
    <thead>
      <tr>
        <th>Stagiaire</th>
        <th>Formation</th>
        <th>TVA</th>
        <th>P.U. HT</th>
        <th>Qté</th>
        <th>Rem</th>
        <th>Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${lignesHTML}
    </tbody>
  </table>

  <div class="totals">
    <p><strong>Total HT :</strong> ${calculerTotalHT().toFixed(2)} €</p>
    <p><strong>Total TVA :</strong> ${calculerTotalTVA().toFixed(2)} €</p>
    <p style="font-size: 16px;"><strong>Total TTC :</strong> ${calculerTotalTTC().toFixed(2)} €</p>
  </div>

  <div class="bank-info">
    <h4>Règlement par virement, nos coordonnées bancaires :</h4>
    <table style="width: auto;">
      <tr><td><strong>Banque :</strong></td><td>${entrepriseEmettrice.banque}</td></tr>
      <tr><td><strong>Code banque :</strong></td><td>${entrepriseEmettrice.codeBanque}</td></tr>
      <tr><td><strong>Code guichet :</strong></td><td>${entrepriseEmettrice.codeGuichet}</td></tr>
      <tr><td><strong>Numéro de compte :</strong></td><td>${entrepriseEmettrice.numeroCompte}</td></tr>
      <tr><td><strong>Clé RIB :</strong></td><td>${entrepriseEmettrice.cleRib}</td></tr>
      <tr><td><strong>Code IBAN :</strong></td><td>${entrepriseEmettrice.iban}</td></tr>
      <tr><td><strong>Code BIC/SWIFT :</strong></td><td>${entrepriseEmettrice.bic}</td></tr>
    </table>
  </div>

  <div class="footer">
    <p>Centre de formation agrée par la préfecture n°${entrepriseEmettrice.prefectures}</p>
    <p>TVA non applicable - article 293 B du CGI</p>
    <p>« Membre d'un centre de gestion agréé, le règlement par chèque est accepté »</p>
    <p>Aucun escompte ne sera applicable à cette facture.</p>
    <p>En application de l'article 441-6 du Code de commerce, tout règlement effectué au delà du délai de paiement sera majoré d'un intérêt égal à 3 fois le taux d'intérêt légal. En outre, une indemnité forfaitaire pour frais de recouvrement de 40 € sera due.</p>
    <hr>
    <p>SASU FTRANSPORT - Capital de ${entrepriseEmettrice.capital} € - SIRET : ${entrepriseEmettrice.siret}</p>
    <p>NAF-APE : ${entrepriseEmettrice.nafApe} - RCS/RM : ${entrepriseEmettrice.rcs} - Num. TVA : ${entrepriseEmettrice.tvaIntra}</p>
    <p>www.ftransport.fr</p>
  </div>
</body>
</html>
    `;
  };

  const handleEnvoyer = () => {
    const email = data.typeFinanceur === "particulier" ? data.particulierEmail : "";
    const sujet = encodeURIComponent(`Facture N°${data.numeroInterne} - ${entrepriseEmettrice.nom}`);
    const corps = encodeURIComponent(`Bonjour,\n\nVeuillez trouver ci-joint la facture N°${data.numeroInterne}.\n\nMontant TTC : ${calculerTotalTTC().toFixed(2)} €\n\nCordialement,\n${entrepriseEmettrice.nom}`);
    window.location.href = `mailto:${email}?subject=${sujet}&body=${corps}`;
    toast.success("Ouverture du client email...");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Création de Facture</h2>
          <p className="text-muted-foreground">
            Format conforme à votre modèle de facturation
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleEnvoyer} variant="outline">
            <Send className="w-4 h-4 mr-2" />
            Envoyer
          </Button>
          <Button onClick={handlePrint} variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Imprimer
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Aperçu de l'en-tête */}
      <Card className="bg-gradient-to-r from-primary/10 to-transparent border-primary/20">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xl">🚌</span>
                <div>
                  <h3 className="text-2xl font-bold text-primary">{entrepriseEmettrice.nom}</h3>
                  <p className="text-muted-foreground italic">{entrepriseEmettrice.slogan}</p>
                </div>
              </div>
              <div className="mt-4 text-sm space-y-1">
                <p>{entrepriseEmettrice.adresse}</p>
                <p>{entrepriseEmettrice.codePostal} {entrepriseEmettrice.ville}</p>
                <p>SIRET : {entrepriseEmettrice.siret}</p>
                <p>Tél : {entrepriseEmettrice.telephone}</p>
                <p>Email : {entrepriseEmettrice.email}</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold">
                FACTURE {data.duplicata && <span className="text-orange-500">DUPLICATA</span>} N°{data.numero}
              </h2>
              <p className="text-muted-foreground">Numéro : {data.numeroInterne}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Infos facture */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Informations de la facture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero">N° Facture</Label>
              <Input 
                id="numero" 
                value={data.numero} 
                onChange={(e) => updateField('numero', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numeroInterne">Numéro interne</Label>
              <Input 
                id="numeroInterne" 
                value={data.numeroInterne} 
                onChange={(e) => updateField('numeroInterne', e.target.value)}
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
          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={data.duplicata}
                onChange={(e) => updateField('duplicata', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Duplicata</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="refDossier">Réf dossier</Label>
              <Input 
                id="refDossier" 
                placeholder="Nom du stagiaire principal"
                value={data.refDossier} 
                onChange={(e) => updateField('refDossier', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refConvention">Réf Convention à rappeler</Label>
              <Input 
                id="refConvention" 
                placeholder="Convention num 2024..."
                value={data.refConvention} 
                onChange={(e) => updateField('refConvention', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="prestations" className="space-y-4">
        <TabsList className="grid grid-cols-2 gap-2 h-auto">
          <TabsTrigger value="prestations" className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Prestations / Formations
          </TabsTrigger>
          <TabsTrigger value="financeur" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Financeur (Client)
          </TabsTrigger>
        </TabsList>

        {/* Onglet Prestations */}
        <TabsContent value="prestations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Désignation
                </span>
                <Button size="sm" onClick={ajouterLigne}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une ligne
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.lignes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune ligne ajoutée</p>
                  <p className="text-sm">Cliquez sur "Ajouter une ligne" pour commencer</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* En-tête du tableau */}
                  <div className="hidden md:grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                    <div className="col-span-2">Stagiaire</div>
                    <div className="col-span-3">Formation</div>
                    <div className="col-span-1">TVA</div>
                    <div className="col-span-1">P.U. HT</div>
                    <div className="col-span-1">Qté</div>
                    <div className="col-span-1">Rem %</div>
                    <div className="col-span-2">Total HT</div>
                    <div className="col-span-1"></div>
                  </div>

                  {data.lignes.map((ligne) => (
                    <div key={ligne.id} className="p-4 border rounded-lg space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                        <div className="md:col-span-2 space-y-1">
                          <Label className="md:hidden">Stagiaire</Label>
                          <Input 
                            value={ligne.stagiaire}
                            onChange={(e) => updateLigne(ligne.id, 'stagiaire', e.target.value)}
                            placeholder="Nom Prénom"
                          />
                        </div>
                        
                        <div className="md:col-span-3 space-y-1">
                          <Label className="md:hidden">Formation</Label>
                          <Select onValueChange={(v) => selectFormation(v, ligne.id)}>
                            <SelectTrigger>
                              <SelectValue placeholder={ligne.designation || "Sélectionner"} />
                            </SelectTrigger>
                            <SelectContent>
                              {formationsDisponibles.map(f => (
                                <SelectItem key={f.id} value={f.id}>
                                  {f.nom}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="md:col-span-1 space-y-1">
                          <Label className="md:hidden">TVA</Label>
                          <Select 
                            value={ligne.tvaType}
                            onValueChange={(v) => updateLigne(ligne.id, 'tvaType', v as LigneFacture['tvaType'])}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EXO">EXO</SelectItem>
                              <SelectItem value="5.5">5,5%</SelectItem>
                              <SelectItem value="10">10%</SelectItem>
                              <SelectItem value="20">20%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="md:col-span-1 space-y-1">
                          <Label className="md:hidden">P.U. HT</Label>
                          <Input 
                            type="number"
                            min="0"
                            step="0.01"
                            value={ligne.prixUnitaire}
                            onChange={(e) => updateLigne(ligne.id, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        
                        <div className="md:col-span-1 space-y-1">
                          <Label className="md:hidden">Qté</Label>
                          <Input 
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={ligne.quantite}
                            onChange={(e) => updateLigne(ligne.id, 'quantite', parseFloat(e.target.value) || 1)}
                          />
                        </div>
                        
                        <div className="md:col-span-1 space-y-1">
                          <Label className="md:hidden">Remise %</Label>
                          <Input 
                            type="number"
                            min="0"
                            max="100"
                            value={ligne.remise || ""}
                            onChange={(e) => updateLigne(ligne.id, 'remise', parseFloat(e.target.value) || 0)}
                            placeholder=""
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center font-medium justify-end">
                            {calculerLigneHT(ligne).toFixed(2)} €
                          </div>
                        </div>
                        
                        <div className="md:col-span-1 flex justify-end">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => supprimerLigne(ligne.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Détails de la formation */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
                        <div className="space-y-2">
                          <Label>Date début</Label>
                          <Input 
                            type="date"
                            value={ligne.dateDebut}
                            onChange={(e) => updateLigne(ligne.id, 'dateDebut', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Date fin</Label>
                          <Input 
                            type="date"
                            value={ligne.dateFin}
                            onChange={(e) => updateLigne(ligne.id, 'dateFin', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Lieu</Label>
                          <Input 
                            value={ligne.lieu}
                            onChange={(e) => updateLigne(ligne.id, 'lieu', e.target.value)}
                          />
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
                      <div className="flex justify-between text-sm">
                        <span>Total HT</span>
                        <span className="font-medium">{calculerTotalHT().toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total TVA</span>
                        <span className="font-medium">{calculerTotalTVA().toFixed(2)} €</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total TTC</span>
                        <span className="text-primary">{calculerTotalTTC().toFixed(2)} €</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Coordonnées bancaires */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Règlement par virement, coordonnées bancaires</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Banque :</span>
                  <p className="font-medium">{entrepriseEmettrice.banque}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Code banque :</span>
                  <p className="font-medium">{entrepriseEmettrice.codeBanque}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Code guichet :</span>
                  <p className="font-medium">{entrepriseEmettrice.codeGuichet}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">N° compte :</span>
                  <p className="font-medium">{entrepriseEmettrice.numeroCompte}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Clé RIB :</span>
                  <p className="font-medium">{entrepriseEmettrice.cleRib}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">IBAN :</span>
                  <p className="font-medium font-mono">{entrepriseEmettrice.iban}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">BIC/SWIFT :</span>
                  <p className="font-medium font-mono">{entrepriseEmettrice.bic}</p>
                </div>
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
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="particulier" id="particulier" />
                  <Label htmlFor="particulier" className="flex items-center gap-2 cursor-pointer">
                    <User className="w-4 h-4" />
                    Particulier
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="professionnel" id="professionnel" />
                  <Label htmlFor="professionnel" className="flex items-center gap-2 cursor-pointer">
                    <Building2 className="w-4 h-4" />
                    Professionnel / Organisme
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
                  Client particulier
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input 
                      value={data.particulierNom}
                      onChange={(e) => updateField('particulierNom', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prénom</Label>
                    <Input 
                      value={data.particulierPrenom}
                      onChange={(e) => updateField('particulierPrenom', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Adresse</Label>
                    <Input 
                      value={data.particulierAdresse}
                      onChange={(e) => updateField('particulierAdresse', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Code postal</Label>
                    <Input 
                      value={data.particulierCodePostal}
                      onChange={(e) => updateField('particulierCodePostal', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ville</Label>
                    <Input 
                      value={data.particulierVille}
                      onChange={(e) => updateField('particulierVille', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      value={data.particulierEmail}
                      onChange={(e) => updateField('particulierEmail', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input 
                      value={data.particulierTel}
                      onChange={(e) => updateField('particulierTel', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Client professionnel / Organisme financeur
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Raison sociale</Label>
                    <Input 
                      value={data.clientNom}
                      onChange={(e) => updateField('clientNom', e.target.value)}
                      placeholder="Ex: Caisse des Dépôts et Consignations"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Adresse</Label>
                    <Input 
                      value={data.clientAdresse}
                      onChange={(e) => updateField('clientAdresse', e.target.value)}
                      placeholder="Ex: 56, rue de Lille"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Code postal</Label>
                    <Input 
                      value={data.clientCodePostal}
                      onChange={(e) => updateField('clientCodePostal', e.target.value)}
                      placeholder="75356"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ville</Label>
                    <Input 
                      value={data.clientVille}
                      onChange={(e) => updateField('clientVille', e.target.value)}
                      placeholder="PARIS 07 SP"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pays</Label>
                    <Input 
                      value={data.clientPays}
                      onChange={(e) => updateField('clientPays', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SIRET</Label>
                    <Input 
                      value={data.clientSiret}
                      onChange={(e) => updateField('clientSiret', e.target.value)}
                      placeholder="180.020.026.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>TVA Intracommunautaire</Label>
                    <Input 
                      value={data.clientTvaIntra}
                      onChange={(e) => updateField('clientTvaIntra', e.target.value)}
                      placeholder="FR77180020026"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Préfecture n°</Label>
                    <Input 
                      value={data.clientPrefecture}
                      onChange={(e) => updateField('clientPrefecture', e.target.value)}
                      placeholder="16-15, n°69-18-001"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Notes et mentions légales */}
      <Card>
        <CardHeader>
          <CardTitle>Notes et mentions légales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Notes additionnelles</Label>
            <Textarea 
              value={data.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Notes particulières pour cette facture..."
              rows={3}
            />
          </div>
          
          <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
            <p>Centre de formation agrée par la préfecture n°{entrepriseEmettrice.prefectures}</p>
            <p className="font-medium">TVA non applicable - article 293 B du CGI</p>
            <p>« Membre d'un centre de gestion agréé, le règlement par chèque est accepté »</p>
            <p className="text-muted-foreground">Aucun escompte ne sera applicable à cette facture.</p>
            <p className="text-muted-foreground text-xs">
              En application de l'article 441-6 du Code de commerce, tout règlement effectué au delà du délai de paiement 
              sera majoré d'un intérêt égal à 3 fois le taux d'intérêt légal. En outre, une indemnité forfaitaire pour 
              frais de recouvrement de 40 € sera due.
            </p>
          </div>

          <Separator />
          
          <div className="text-center text-sm text-muted-foreground">
            <p>SASU FTRANSPORT - Capital de {entrepriseEmettrice.capital} € - SIRET : {entrepriseEmettrice.siret}</p>
            <p>NAF-APE : {entrepriseEmettrice.nafApe} - RCS/RM : {entrepriseEmettrice.rcs} - Num. TVA : {entrepriseEmettrice.tvaIntra}</p>
            <p>www.ftransport.fr</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
