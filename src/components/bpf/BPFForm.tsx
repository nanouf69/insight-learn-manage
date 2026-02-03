import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Download, Save, FileText, Building2, Euro, Users, GraduationCap, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface BPFData {
  // Section A - Identification
  siret: string;
  codeNAF: string;
  numeroDeclaration: string;
  formeJuridique: string;
  denomination: string;
  adresse: string;
  adressePublique: "oui" | "non";
  telephone: string;
  email: string;
  
  // Section B - Informations générales
  exerciceDebut: string;
  exerciceFin: string;
  formationDistance: "oui" | "non";
  
  // Section C - Bilan financier (origine des produits)
  produitsEntreprises: string;
  produitsContratApprentissage: string;
  produitsContratProfessionnalisation: string;
  produitsPromotionAlternance: string;
  produitsTransitionPro: string;
  produitsCPF: string;
  produitsRecherchesEmploi: string;
  produitsNonSalaries: string;
  produitsPlanDevCompetences: string;
  produitsPouvPublicsAgents: string;
  produitsInstancesEuropeennes: string;
  produitsEtat: string;
  produitsConseilsRegionaux: string;
  produitsFranceTravail: string;
  produitsAutresPubliques: string;
  produitsIndividuels: string;
  produitsAutresOrganismes: string;
  produitsAutres: string;
  partCAFormation: string;
  
  // Section D - Charges
  totalCharges: string;
  salairesFormateurs: string;
  achatsPrestation: string;
  
  // Section E - Formateurs
  nombreFormateursInternes: string;
  heuresFormateursInternes: string;
  nombreFormateursExternes: string;
  heuresFormateursExternes: string;
  
  // Section F1 - Types de stagiaires
  nbSalariesPrives: string;
  heuresSalariesPrives: string;
  nbApprentis: string;
  heuresApprentis: string;
  nbRechercheEmploi: string;
  heuresRechercheEmploi: string;
  nbParticuliers: string;
  heuresParticuliers: string;
  nbAutresStagiaires: string;
  heuresAutresStagiaires: string;
  
  // Section F2 - Sous-traitance
  nbSoustraitance: string;
  heuresSoustraitance: string;
  
  // Section F3 - Objectifs
  nbDiplomeTitre: string;
  heuresDiplomeTitre: string;
  nbCertificationRS: string;
  heuresCertificationRS: string;
  nbCQPNonEnregistre: string;
  heuresCQPNonEnregistre: string;
  nbAutresFormations: string;
  heuresAutresFormations: string;
  nbBilansCompetences: string;
  heuresBilansCompetences: string;
  nbVAE: string;
  heuresVAE: string;
  
  // Section F4 - Spécialités
  specialite1Nom: string;
  specialite1Code: string;
  specialite1Nb: string;
  specialite1Heures: string;
  specialite2Nom: string;
  specialite2Code: string;
  specialite2Nb: string;
  specialite2Heures: string;
  specialite3Nom: string;
  specialite3Code: string;
  specialite3Nb: string;
  specialite3Heures: string;
  
  // Section G - Formations confiées
  nbFormationsConfiees: string;
  heuresFormationsConfiees: string;
  
  // Section H - Dirigeant
  dirigeantNom: string;
  dirigeantQualite: string;
  signatureLieu: string;
  signatureDate: string;
  signataireNom: string;
  signataireQualite: string;
  signataireEmail: string;
  signataireTel: string;
}

const defaultBPFData: BPFData = {
  // Section A - Pré-rempli avec données ftransport
  siret: "53516371400044",
  codeNAF: "8559A",
  numeroDeclaration: "11770762377",
  formeJuridique: "SARL",
  denomination: "F.TRANSPORT",
  adresse: "123 Avenue de la Formation, 77000 Melun",
  adressePublique: "oui",
  telephone: "01 60 00 00 00",
  email: "contact@ftransport.fr",
  
  // Section B
  exerciceDebut: "2025-01-01",
  exerciceFin: "2025-12-31",
  formationDistance: "oui",
  
  // Section C - Valeurs par défaut
  produitsEntreprises: "",
  produitsContratApprentissage: "",
  produitsContratProfessionnalisation: "",
  produitsPromotionAlternance: "",
  produitsTransitionPro: "",
  produitsCPF: "",
  produitsRecherchesEmploi: "",
  produitsNonSalaries: "",
  produitsPlanDevCompetences: "",
  produitsPouvPublicsAgents: "",
  produitsInstancesEuropeennes: "",
  produitsEtat: "",
  produitsConseilsRegionaux: "",
  produitsFranceTravail: "",
  produitsAutresPubliques: "",
  produitsIndividuels: "",
  produitsAutresOrganismes: "",
  produitsAutres: "",
  partCAFormation: "100",
  
  // Section D
  totalCharges: "",
  salairesFormateurs: "",
  achatsPrestation: "",
  
  // Section E
  nombreFormateursInternes: "",
  heuresFormateursInternes: "",
  nombreFormateursExternes: "",
  heuresFormateursExternes: "",
  
  // Section F1
  nbSalariesPrives: "",
  heuresSalariesPrives: "",
  nbApprentis: "",
  heuresApprentis: "",
  nbRechercheEmploi: "",
  heuresRechercheEmploi: "",
  nbParticuliers: "",
  heuresParticuliers: "",
  nbAutresStagiaires: "",
  heuresAutresStagiaires: "",
  
  // Section F2
  nbSoustraitance: "",
  heuresSoustraitance: "",
  
  // Section F3
  nbDiplomeTitre: "",
  heuresDiplomeTitre: "",
  nbCertificationRS: "",
  heuresCertificationRS: "",
  nbCQPNonEnregistre: "",
  heuresCQPNonEnregistre: "",
  nbAutresFormations: "",
  heuresAutresFormations: "",
  nbBilansCompetences: "",
  heuresBilansCompetences: "",
  nbVAE: "",
  heuresVAE: "",
  
  // Section F4 - Spécialité transport
  specialite1Nom: "Transport en commun routier de voyageurs",
  specialite1Code: "311",
  specialite1Nb: "",
  specialite1Heures: "",
  specialite2Nom: "",
  specialite2Code: "",
  specialite2Nb: "",
  specialite2Heures: "",
  specialite3Nom: "",
  specialite3Code: "",
  specialite3Nb: "",
  specialite3Heures: "",
  
  // Section G
  nbFormationsConfiees: "",
  heuresFormationsConfiees: "",
  
  // Section H
  dirigeantNom: "",
  dirigeantQualite: "Gérant",
  signatureLieu: "Melun",
  signatureDate: "",
  signataireNom: "",
  signataireQualite: "Gérant",
  signataireEmail: "contact@ftransport.fr",
  signataireTel: "01 60 00 00 00",
};

export function BPFForm() {
  const [data, setData] = useState<BPFData>(defaultBPFData);

  const updateField = (field: keyof BPFData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const calculateTotalProduits = () => {
    const fields = [
      'produitsEntreprises', 'produitsContratApprentissage', 'produitsContratProfessionnalisation',
      'produitsPromotionAlternance', 'produitsTransitionPro', 'produitsCPF',
      'produitsRecherchesEmploi', 'produitsNonSalaries', 'produitsPlanDevCompetences',
      'produitsPouvPublicsAgents', 'produitsInstancesEuropeennes', 'produitsEtat',
      'produitsConseilsRegionaux', 'produitsFranceTravail', 'produitsAutresPubliques',
      'produitsIndividuels', 'produitsAutresOrganismes', 'produitsAutres'
    ] as const;
    
    return fields.reduce((sum, field) => sum + (parseFloat(data[field]) || 0), 0);
  };

  const calculateTotalOrganismesGestionnaires = () => {
    const fields = [
      'produitsContratApprentissage', 'produitsContratProfessionnalisation',
      'produitsPromotionAlternance', 'produitsTransitionPro', 'produitsCPF',
      'produitsRecherchesEmploi', 'produitsNonSalaries', 'produitsPlanDevCompetences'
    ] as const;
    
    return fields.reduce((sum, field) => sum + (parseFloat(data[field]) || 0), 0);
  };

  const handleSave = () => {
    localStorage.setItem('bpf_data', JSON.stringify(data));
    toast.success("Bilan pédagogique et financier sauvegardé");
  };

  const handleExport = () => {
    const content = `
BILAN PÉDAGOGIQUE ET FINANCIER ${data.exerciceDebut.slice(0,4)}
==============================================

A. IDENTIFICATION DE L'ORGANISME
--------------------------------
SIRET: ${data.siret}
Code NAF: ${data.codeNAF}
N° Déclaration: ${data.numeroDeclaration}
Forme juridique: ${data.formeJuridique}
Dénomination: ${data.denomination}
Adresse: ${data.adresse}
Téléphone: ${data.telephone}
Email: ${data.email}

B. INFORMATIONS GÉNÉRALES
-------------------------
Exercice comptable: du ${data.exerciceDebut} au ${data.exerciceFin}
Formation à distance: ${data.formationDistance}

C. BILAN FINANCIER - ORIGINE DES PRODUITS
-----------------------------------------
Produits des entreprises: ${data.produitsEntreprises}€
Total organismes gestionnaires: ${calculateTotalOrganismesGestionnaires()}€
  - Contrats d'apprentissage: ${data.produitsContratApprentissage}€
  - Contrats de professionnalisation: ${data.produitsContratProfessionnalisation}€
  - Promotion/reconversion alternance: ${data.produitsPromotionAlternance}€
  - Projets transition professionnelle: ${data.produitsTransitionPro}€
  - Compte Personnel Formation (CPF): ${data.produitsCPF}€
  - Dispositifs recherche d'emploi: ${data.produitsRecherchesEmploi}€
  - Dispositifs non-salariés: ${data.produitsNonSalaries}€
  - Plan développement compétences: ${data.produitsPlanDevCompetences}€
Pouvoirs publics (agents): ${data.produitsPouvPublicsAgents}€
Instances européennes: ${data.produitsInstancesEuropeennes}€
État: ${data.produitsEtat}€
Conseils régionaux: ${data.produitsConseilsRegionaux}€
France Travail: ${data.produitsFranceTravail}€
Autres ressources publiques: ${data.produitsAutresPubliques}€
Contrats individuels: ${data.produitsIndividuels}€
Autres organismes: ${data.produitsAutresOrganismes}€
Autres produits: ${data.produitsAutres}€

TOTAL PRODUITS: ${calculateTotalProduits()}€
Part CA formation: ${data.partCAFormation}%

D. CHARGES
----------
Total charges: ${data.totalCharges}€
Salaires formateurs: ${data.salairesFormateurs}€
Achats prestations: ${data.achatsPrestation}€

E. FORMATEURS
-------------
Formateurs internes: ${data.nombreFormateursInternes} (${data.heuresFormateursInternes}h)
Formateurs externes: ${data.nombreFormateursExternes} (${data.heuresFormateursExternes}h)

F. STAGIAIRES
-------------
Salariés privés: ${data.nbSalariesPrives} (${data.heuresSalariesPrives}h)
Apprentis: ${data.nbApprentis} (${data.heuresApprentis}h)
Recherche d'emploi: ${data.nbRechercheEmploi} (${data.heuresRechercheEmploi}h)
Particuliers: ${data.nbParticuliers} (${data.heuresParticuliers}h)
Autres: ${data.nbAutresStagiaires} (${data.heuresAutresStagiaires}h)

H. DIRIGEANT
------------
Nom: ${data.dirigeantNom}
Qualité: ${data.dirigeantQualite}
Lieu: ${data.signatureLieu}
Date: ${data.signatureDate}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BPF_${data.exerciceDebut.slice(0,4)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("BPF exporté avec succès");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Bilan Pédagogique et Financier</h2>
          <p className="text-muted-foreground">
            À transmettre avant le 30 avril à la DREETS via{" "}
            <a 
              href="https://www.monactiviteformation.emploi.gouv.fr" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              monactiviteformation.emploi.gouv.fr
            </a>
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} variant="outline">
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      <Tabs defaultValue="identification" className="space-y-4">
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 gap-2 h-auto">
          <TabsTrigger value="identification" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">A. Identification</span>
            <span className="sm:hidden">A</span>
          </TabsTrigger>
          <TabsTrigger value="financier" className="flex items-center gap-2">
            <Euro className="w-4 h-4" />
            <span className="hidden sm:inline">C/D. Financier</span>
            <span className="sm:hidden">C/D</span>
          </TabsTrigger>
          <TabsTrigger value="formateurs" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">E. Formateurs</span>
            <span className="sm:hidden">E</span>
          </TabsTrigger>
          <TabsTrigger value="stagiaires" className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            <span className="hidden sm:inline">F/G. Stagiaires</span>
            <span className="sm:hidden">F/G</span>
          </TabsTrigger>
        </TabsList>

        {/* Section A - Identification */}
        <TabsContent value="identification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                A. Identification de l'organisme de formation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siret">Numéro SIRET</Label>
                  <Input 
                    id="siret" 
                    value={data.siret} 
                    onChange={(e) => updateField('siret', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codeNAF">Code NAF</Label>
                  <Input 
                    id="codeNAF" 
                    value={data.codeNAF} 
                    onChange={(e) => updateField('codeNAF', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numeroDeclaration">N° Déclaration d'activité</Label>
                  <Input 
                    id="numeroDeclaration" 
                    value={data.numeroDeclaration} 
                    onChange={(e) => updateField('numeroDeclaration', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="formeJuridique">Forme juridique</Label>
                  <Input 
                    id="formeJuridique" 
                    value={data.formeJuridique} 
                    onChange={(e) => updateField('formeJuridique', e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="denomination">Nom / Dénomination</Label>
                  <Input 
                    id="denomination" 
                    value={data.denomination} 
                    onChange={(e) => updateField('denomination', e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <Label htmlFor="adresse">Adresse</Label>
                  <Input 
                    id="adresse" 
                    value={data.adresse} 
                    onChange={(e) => updateField('adresse', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Adresse publique ?</Label>
                  <RadioGroup 
                    value={data.adressePublique} 
                    onValueChange={(v) => updateField('adressePublique', v)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="oui" id="adresse-oui" />
                      <Label htmlFor="adresse-oui">Oui</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="non" id="adresse-non" />
                      <Label htmlFor="adresse-non">Non</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input 
                    id="telephone" 
                    value={data.telephone} 
                    onChange={(e) => updateField('telephone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email de contact</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={data.email} 
                    onChange={(e) => updateField('email', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                B. Informations générales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="exerciceDebut">Début exercice comptable</Label>
                  <Input 
                    id="exerciceDebut" 
                    type="date"
                    value={data.exerciceDebut} 
                    onChange={(e) => updateField('exerciceDebut', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exerciceFin">Fin exercice comptable</Label>
                  <Input 
                    id="exerciceFin" 
                    type="date"
                    value={data.exerciceFin} 
                    onChange={(e) => updateField('exerciceFin', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Formation à distance (e-learning, classes virtuelles) ?</Label>
                <RadioGroup 
                  value={data.formationDistance} 
                  onValueChange={(v) => updateField('formationDistance', v)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="oui" id="distance-oui" />
                    <Label htmlFor="distance-oui">Oui</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="non" id="distance-non" />
                    <Label htmlFor="distance-non">Non</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                H. Personne ayant la qualité de dirigeant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dirigeantNom">Nom et prénom du dirigeant</Label>
                  <Input 
                    id="dirigeantNom" 
                    value={data.dirigeantNom} 
                    onChange={(e) => updateField('dirigeantNom', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dirigeantQualite">Qualité</Label>
                  <Input 
                    id="dirigeantQualite" 
                    value={data.dirigeantQualite} 
                    onChange={(e) => updateField('dirigeantQualite', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signatureLieu">Lieu</Label>
                  <Input 
                    id="signatureLieu" 
                    value={data.signatureLieu} 
                    onChange={(e) => updateField('signatureLieu', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signatureDate">Date</Label>
                  <Input 
                    id="signatureDate" 
                    type="date"
                    value={data.signatureDate} 
                    onChange={(e) => updateField('signatureDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signataireEmail">Email</Label>
                  <Input 
                    id="signataireEmail" 
                    type="email"
                    value={data.signataireEmail} 
                    onChange={(e) => updateField('signataireEmail', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signataireTel">Téléphone</Label>
                  <Input 
                    id="signataireTel" 
                    value={data.signataireTel} 
                    onChange={(e) => updateField('signataireTel', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Section C/D - Financier */}
        <TabsContent value="financier" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="w-5 h-5" />
                C. Bilan financier HT - Origine des produits
              </CardTitle>
              <CardDescription>
                Indiquez les montants en euros hors taxes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Produits provenant des entreprises</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="produitsEntreprises">1. Formation des salariés (€)</Label>
                    <Input 
                      id="produitsEntreprises" 
                      type="number"
                      value={data.produitsEntreprises} 
                      onChange={(e) => updateField('produitsEntreprises', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">2. Produits des organismes gestionnaires des fonds</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="produitsContratApprentissage">a. Contrats d'apprentissage (€)</Label>
                    <Input 
                      id="produitsContratApprentissage" 
                      type="number"
                      value={data.produitsContratApprentissage} 
                      onChange={(e) => updateField('produitsContratApprentissage', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="produitsContratProfessionnalisation">b. Contrats de professionnalisation (€)</Label>
                    <Input 
                      id="produitsContratProfessionnalisation" 
                      type="number"
                      value={data.produitsContratProfessionnalisation} 
                      onChange={(e) => updateField('produitsContratProfessionnalisation', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="produitsPromotionAlternance">c. Promotion/reconversion alternance (€)</Label>
                    <Input 
                      id="produitsPromotionAlternance" 
                      type="number"
                      value={data.produitsPromotionAlternance} 
                      onChange={(e) => updateField('produitsPromotionAlternance', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="produitsTransitionPro">d. Projets transition professionnelle (€)</Label>
                    <Input 
                      id="produitsTransitionPro" 
                      type="number"
                      value={data.produitsTransitionPro} 
                      onChange={(e) => updateField('produitsTransitionPro', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="produitsCPF">e. Compte Personnel Formation - CPF (€)</Label>
                    <Input 
                      id="produitsCPF" 
                      type="number"
                      value={data.produitsCPF} 
                      onChange={(e) => updateField('produitsCPF', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="produitsRecherchesEmploi">f. Dispositifs recherche d'emploi (€)</Label>
                    <Input 
                      id="produitsRecherchesEmploi" 
                      type="number"
                      value={data.produitsRecherchesEmploi} 
                      onChange={(e) => updateField('produitsRecherchesEmploi', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="produitsNonSalaries">g. Dispositifs non-salariés (€)</Label>
                    <Input 
                      id="produitsNonSalaries" 
                      type="number"
                      value={data.produitsNonSalaries} 
                      onChange={(e) => updateField('produitsNonSalaries', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="produitsPlanDevCompetences">h. Plan développement compétences (€)</Label>
                    <Input 
                      id="produitsPlanDevCompetences" 
                      type="number"
                      value={data.produitsPlanDevCompetences} 
                      onChange={(e) => updateField('produitsPlanDevCompetences', e.target.value)}
                    />
                  </div>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="font-medium">Total organismes gestionnaires: {calculateTotalOrganismesGestionnaires().toLocaleString()}€</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Produits des pouvoirs publics</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="produitsPouvPublicsAgents">3. Formation agents publics (€)</Label>
                    <Input 
                      id="produitsPouvPublicsAgents" 
                      type="number"
                      value={data.produitsPouvPublicsAgents} 
                      onChange={(e) => updateField('produitsPouvPublicsAgents', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="produitsInstancesEuropeennes">4. Instances européennes (€)</Label>
                    <Input 
                      id="produitsInstancesEuropeennes" 
                      type="number"
                      value={data.produitsInstancesEuropeennes} 
                      onChange={(e) => updateField('produitsInstancesEuropeennes', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="produitsEtat">5. État (€)</Label>
                    <Input 
                      id="produitsEtat" 
                      type="number"
                      value={data.produitsEtat} 
                      onChange={(e) => updateField('produitsEtat', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="produitsConseilsRegionaux">6. Conseils régionaux (€)</Label>
                    <Input 
                      id="produitsConseilsRegionaux" 
                      type="number"
                      value={data.produitsConseilsRegionaux} 
                      onChange={(e) => updateField('produitsConseilsRegionaux', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="produitsFranceTravail">7. France Travail (€)</Label>
                    <Input 
                      id="produitsFranceTravail" 
                      type="number"
                      value={data.produitsFranceTravail} 
                      onChange={(e) => updateField('produitsFranceTravail', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="produitsAutresPubliques">8. Autres ressources publiques (€)</Label>
                    <Input 
                      id="produitsAutresPubliques" 
                      type="number"
                      value={data.produitsAutresPubliques} 
                      onChange={(e) => updateField('produitsAutresPubliques', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Autres produits</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="produitsIndividuels">9. Contrats individuels à leurs frais (€)</Label>
                    <Input 
                      id="produitsIndividuels" 
                      type="number"
                      value={data.produitsIndividuels} 
                      onChange={(e) => updateField('produitsIndividuels', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="produitsAutresOrganismes">10. Autres organismes de formation (€)</Label>
                    <Input 
                      id="produitsAutresOrganismes" 
                      type="number"
                      value={data.produitsAutresOrganismes} 
                      onChange={(e) => updateField('produitsAutresOrganismes', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="produitsAutres">11. Autres produits formation (€)</Label>
                    <Input 
                      id="produitsAutres" 
                      type="number"
                      value={data.produitsAutres} 
                      onChange={(e) => updateField('produitsAutres', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partCAFormation">Part CA formation (%)</Label>
                    <Input 
                      id="partCAFormation" 
                      type="number"
                      min="0"
                      max="100"
                      value={data.partCAFormation} 
                      onChange={(e) => updateField('partCAFormation', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-primary/10 p-4 rounded-lg">
                <p className="text-lg font-bold text-primary">
                  TOTAL DES PRODUITS: {calculateTotalProduits().toLocaleString()}€
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="w-5 h-5" />
                D. Bilan financier HT - Charges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalCharges">Total des charges (€)</Label>
                  <Input 
                    id="totalCharges" 
                    type="number"
                    value={data.totalCharges} 
                    onChange={(e) => updateField('totalCharges', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salairesFormateurs">dont Salaires formateurs (€)</Label>
                  <Input 
                    id="salairesFormateurs" 
                    type="number"
                    value={data.salairesFormateurs} 
                    onChange={(e) => updateField('salairesFormateurs', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="achatsPrestation">dont Achats prestations (€)</Label>
                  <Input 
                    id="achatsPrestation" 
                    type="number"
                    value={data.achatsPrestation} 
                    onChange={(e) => updateField('achatsPrestation', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Section E - Formateurs */}
        <TabsContent value="formateurs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                E. Personnes dispensant des heures de formation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombreFormateursInternes">Formateurs internes (nombre)</Label>
                    <Input 
                      id="nombreFormateursInternes" 
                      type="number"
                      value={data.nombreFormateursInternes} 
                      onChange={(e) => updateField('nombreFormateursInternes', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heuresFormateursInternes">Heures dispensées (internes)</Label>
                    <Input 
                      id="heuresFormateursInternes" 
                      type="number"
                      value={data.heuresFormateursInternes} 
                      onChange={(e) => updateField('heuresFormateursInternes', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombreFormateursExternes">Formateurs externes / sous-traitance (nombre)</Label>
                    <Input 
                      id="nombreFormateursExternes" 
                      type="number"
                      value={data.nombreFormateursExternes} 
                      onChange={(e) => updateField('nombreFormateursExternes', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heuresFormateursExternes">Heures dispensées (externes)</Label>
                    <Input 
                      id="heuresFormateursExternes" 
                      type="number"
                      value={data.heuresFormateursExternes} 
                      onChange={(e) => updateField('heuresFormateursExternes', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Section F/G - Stagiaires */}
        <TabsContent value="stagiaires" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                F-1. Types de stagiaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 font-medium text-sm text-muted-foreground mb-2">
                  <div>Type de stagiaire</div>
                  <div>Nombre</div>
                  <div>Heures totales</div>
                </div>
                
                {[
                  { label: "a. Salariés employeurs privés", nbField: "nbSalariesPrives", heuresField: "heuresSalariesPrives" },
                  { label: "b. Apprentis", nbField: "nbApprentis", heuresField: "heuresApprentis" },
                  { label: "c. Personnes en recherche d'emploi", nbField: "nbRechercheEmploi", heuresField: "heuresRechercheEmploi" },
                  { label: "d. Particuliers à leurs frais", nbField: "nbParticuliers", heuresField: "heuresParticuliers" },
                  { label: "e. Autres stagiaires", nbField: "nbAutresStagiaires", heuresField: "heuresAutresStagiaires" },
                ].map((row) => (
                  <div key={row.nbField} className="grid grid-cols-3 gap-4 items-center">
                    <Label className="text-sm">{row.label}</Label>
                    <Input 
                      type="number"
                      value={data[row.nbField as keyof BPFData]} 
                      onChange={(e) => updateField(row.nbField as keyof BPFData, e.target.value)}
                    />
                    <Input 
                      type="number"
                      value={data[row.heuresField as keyof BPFData]} 
                      onChange={(e) => updateField(row.heuresField as keyof BPFData, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>F-2. Activité sous-traitée</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nbSoustraitance">Nombre stagiaires sous-traités</Label>
                  <Input 
                    id="nbSoustraitance" 
                    type="number"
                    value={data.nbSoustraitance} 
                    onChange={(e) => updateField('nbSoustraitance', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heuresSoustraitance">Heures totales sous-traitées</Label>
                  <Input 
                    id="heuresSoustraitance" 
                    type="number"
                    value={data.heuresSoustraitance} 
                    onChange={(e) => updateField('heuresSoustraitance', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>F-3. Objectif général des prestations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 font-medium text-sm text-muted-foreground mb-2">
                  <div>Objectif</div>
                  <div>Nombre</div>
                  <div>Heures</div>
                </div>
                
                {[
                  { label: "a. Diplôme/titre RNCP", nbField: "nbDiplomeTitre", heuresField: "heuresDiplomeTitre" },
                  { label: "b. Certification RS", nbField: "nbCertificationRS", heuresField: "heuresCertificationRS" },
                  { label: "c. CQP non enregistré", nbField: "nbCQPNonEnregistre", heuresField: "heuresCQPNonEnregistre" },
                  { label: "d. Autres formations pro", nbField: "nbAutresFormations", heuresField: "heuresAutresFormations" },
                  { label: "e. Bilans de compétences", nbField: "nbBilansCompetences", heuresField: "heuresBilansCompetences" },
                  { label: "f. VAE", nbField: "nbVAE", heuresField: "heuresVAE" },
                ].map((row) => (
                  <div key={row.nbField} className="grid grid-cols-3 gap-4 items-center">
                    <Label className="text-sm">{row.label}</Label>
                    <Input 
                      type="number"
                      value={data[row.nbField as keyof BPFData]} 
                      onChange={(e) => updateField(row.nbField as keyof BPFData, e.target.value)}
                    />
                    <Input 
                      type="number"
                      value={data[row.heuresField as keyof BPFData]} 
                      onChange={(e) => updateField(row.heuresField as keyof BPFData, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>F-4. Spécialités de formation</CardTitle>
              <CardDescription>Indiquez les 3 principales spécialités</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 font-medium text-sm text-muted-foreground">
                  <div>Spécialité</div>
                  <div>Code NSF</div>
                  <div>Nombre</div>
                  <div>Heures</div>
                </div>
                
                {[1, 2, 3].map((num) => (
                  <div key={num} className="grid grid-cols-4 gap-4 items-center">
                    <Input 
                      placeholder={`Spécialité ${num}`}
                      value={data[`specialite${num}Nom` as keyof BPFData]} 
                      onChange={(e) => updateField(`specialite${num}Nom` as keyof BPFData, e.target.value)}
                    />
                    <Input 
                      placeholder="Code"
                      value={data[`specialite${num}Code` as keyof BPFData]} 
                      onChange={(e) => updateField(`specialite${num}Code` as keyof BPFData, e.target.value)}
                    />
                    <Input 
                      type="number"
                      value={data[`specialite${num}Nb` as keyof BPFData]} 
                      onChange={(e) => updateField(`specialite${num}Nb` as keyof BPFData, e.target.value)}
                    />
                    <Input 
                      type="number"
                      value={data[`specialite${num}Heures` as keyof BPFData]} 
                      onChange={(e) => updateField(`specialite${num}Heures` as keyof BPFData, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>G. Formations confiées par un autre organisme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nbFormationsConfiees">Nombre de stagiaires</Label>
                  <Input 
                    id="nbFormationsConfiees" 
                    type="number"
                    value={data.nbFormationsConfiees} 
                    onChange={(e) => updateField('nbFormationsConfiees', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heuresFormationsConfiees">Heures totales</Label>
                  <Input 
                    id="heuresFormationsConfiees" 
                    type="number"
                    value={data.heuresFormationsConfiees} 
                    onChange={(e) => updateField('heuresFormationsConfiees', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}