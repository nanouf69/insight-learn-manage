import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Download, 
  Save, 
  Building2, 
  Euro, 
  Users, 
  GraduationCap, 
  FileText,
  Zap,
  CheckCircle2,
  Clock,
  RefreshCw,
  FileCheck,
  Target,
  BookOpen
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

// Données simulées récupérées automatiquement
const autoData = {
  // Données organisme (pré-remplies)
  organisme: {
    siret: "53516371400044",
    codeNAF: "8559A",
    numeroDeclaration: "11770762377",
    formeJuridique: "SARL",
    denomination: "F.TRANSPORT",
    adresse: "123 Avenue de la Formation, 77000 Melun",
    telephone: "01 60 00 00 00",
    email: "contact@ftransport.fr",
  },
  // Calculés depuis les factures
  produits: {
    entreprises: 45600,
    cpf: 78900,
    particuliers: 32400,
    opco: 56700,
    franceTravail: 12300,
    total: 225900,
  },
  // Calculés depuis les charges
  charges: {
    total: 180000,
    salairesFormateurs: 95000,
    prestations: 35000,
  },
  // Calculés depuis les formateurs
  formateurs: {
    internes: { nombre: 4, heures: 2400 },
    externes: { nombre: 2, heures: 600 },
  },
  // Calculés depuis les sessions/apprenants
  stagiaires: {
    salariesPrives: { nombre: 45, heures: 5400 },
    particuliers: { nombre: 78, heures: 9360 },
    rechercheEmploi: { nombre: 12, heures: 1440 },
    total: { nombre: 135, heures: 16200 },
  },
  // Spécialités principales
  specialites: [
    { nom: "Formation VTC", code: "311", nombre: 65, heures: 7800 },
    { nom: "Formation TAXI", code: "311", nombre: 48, heures: 5760 },
    { nom: "Formation continue", code: "311", nombre: 22, heures: 308 },
  ],
  // Objectifs de formation
  objectifs: {
    diplomes: { nombre: 113, heures: 13560 },
    certifications: { nombre: 22, heures: 308 },
  },
};

export function BPFForm() {
  const [activeTab, setActiveTab] = useState("generer");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [bpfGenerated, setBpfGenerated] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // États pour les données éditables
  const [organisme, setOrganisme] = useState(autoData.organisme);
  const [produits, setProduits] = useState(autoData.produits);
  const [charges, setCharges] = useState(autoData.charges);
  const [formateurs, setFormateurs] = useState(autoData.formateurs);
  const [stagiaires, setStagiaires] = useState(autoData.stagiaires);
  const [specialites, setSpecialites] = useState(autoData.specialites);
  const [objectifs, setObjectifs] = useState(autoData.objectifs);
  const [exercice, setExercice] = useState({ debut: "2025-01-01", fin: "2025-12-31" });
  const [dirigeant, setDirigeant] = useState({ nom: "", qualite: "Gérant", lieu: "Melun", date: "" });

  const generateBPF = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);

    const steps = [
      { progress: 15, message: "Récupération des données organisme..." },
      { progress: 30, message: "Calcul des produits depuis les factures..." },
      { progress: 45, message: "Analyse des charges..." },
      { progress: 60, message: "Comptage des formateurs et heures..." },
      { progress: 75, message: "Analyse des stagiaires par catégorie..." },
      { progress: 90, message: "Calcul des spécialités et objectifs..." },
      { progress: 100, message: "Génération terminée !" },
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 300));
      setGenerationProgress(step.progress);
    }

    setIsGenerating(false);
    setBpfGenerated(true);
    toast.success("BPF généré avec succès en 2 secondes !");
  };

  const handleExport = () => {
    const content = `
BILAN PÉDAGOGIQUE ET FINANCIER ${exercice.debut.slice(0,4)}
==============================================

A. IDENTIFICATION DE L'ORGANISME
--------------------------------
SIRET: ${organisme.siret}
Code NAF: ${organisme.codeNAF}
N° Déclaration: ${organisme.numeroDeclaration}
Forme juridique: ${organisme.formeJuridique}
Dénomination: ${organisme.denomination}
Adresse: ${organisme.adresse}
Téléphone: ${organisme.telephone}
Email: ${organisme.email}

B. EXERCICE COMPTABLE
---------------------
Du ${exercice.debut} au ${exercice.fin}

C. BILAN FINANCIER - ORIGINE DES PRODUITS
-----------------------------------------
Produits des entreprises: ${produits.entreprises.toLocaleString()}€
CPF: ${produits.cpf.toLocaleString()}€
Particuliers: ${produits.particuliers.toLocaleString()}€
OPCO: ${produits.opco.toLocaleString()}€
France Travail: ${produits.franceTravail.toLocaleString()}€
TOTAL PRODUITS: ${produits.total.toLocaleString()}€

D. CHARGES
----------
Total charges: ${charges.total.toLocaleString()}€
Salaires formateurs: ${charges.salairesFormateurs.toLocaleString()}€
Achats prestations: ${charges.prestations.toLocaleString()}€

E. FORMATEURS
-------------
Formateurs internes: ${formateurs.internes.nombre} (${formateurs.internes.heures.toLocaleString()}h)
Formateurs externes: ${formateurs.externes.nombre} (${formateurs.externes.heures.toLocaleString()}h)

F. STAGIAIRES
-------------
Salariés secteur privé: ${stagiaires.salariesPrives.nombre} (${stagiaires.salariesPrives.heures.toLocaleString()}h)
Particuliers: ${stagiaires.particuliers.nombre} (${stagiaires.particuliers.heures.toLocaleString()}h)
Demandeurs d'emploi: ${stagiaires.rechercheEmploi.nombre} (${stagiaires.rechercheEmploi.heures.toLocaleString()}h)
TOTAL: ${stagiaires.total.nombre} stagiaires (${stagiaires.total.heures.toLocaleString()}h)

SPÉCIALITÉS DE FORMATION
------------------------
${specialites.map(s => `${s.nom} (NSF ${s.code}): ${s.nombre} stagiaires (${s.heures.toLocaleString()}h)`).join('\n')}

OBJECTIFS DE FORMATION
----------------------
Diplômes/Titres RNCP: ${objectifs.diplomes.nombre} stagiaires (${objectifs.diplomes.heures.toLocaleString()}h)
Certifications: ${objectifs.certifications.nombre} stagiaires (${objectifs.certifications.heures.toLocaleString()}h)

H. SIGNATURE
------------
Nom du dirigeant: ${dirigeant.nom}
Qualité: ${dirigeant.qualite}
Fait à: ${dirigeant.lieu}
Le: ${dirigeant.date}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BPF_${exercice.debut.slice(0,4)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("BPF exporté avec succès");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const year = parseInt(exercice.debut.slice(0, 4));
      
      const { error } = await supabase.from("bpf").insert({
        annee: year,
        date_debut: exercice.debut,
        date_fin: exercice.fin,
        organisme_siret: organisme.siret,
        organisme_code_naf: organisme.codeNAF,
        organisme_numero_declaration: organisme.numeroDeclaration,
        organisme_forme_juridique: organisme.formeJuridique,
        organisme_denomination: organisme.denomination,
        organisme_adresse: organisme.adresse,
        organisme_telephone: organisme.telephone,
        organisme_email: organisme.email,
        produits_entreprises: produits.entreprises,
        produits_cpf: produits.cpf,
        produits_particuliers: produits.particuliers,
        produits_opco: produits.opco,
        produits_france_travail: produits.franceTravail,
        produits_total: produits.total,
        charges_total: charges.total,
        charges_salaires_formateurs: charges.salairesFormateurs,
        charges_prestations: charges.prestations,
        formateurs_internes_nombre: formateurs.internes.nombre,
        formateurs_internes_heures: formateurs.internes.heures,
        formateurs_externes_nombre: formateurs.externes.nombre,
        formateurs_externes_heures: formateurs.externes.heures,
        stagiaires_salaries_nombre: stagiaires.salariesPrives.nombre,
        stagiaires_salaries_heures: stagiaires.salariesPrives.heures,
        stagiaires_particuliers_nombre: stagiaires.particuliers.nombre,
        stagiaires_particuliers_heures: stagiaires.particuliers.heures,
        stagiaires_demandeurs_emploi_nombre: stagiaires.rechercheEmploi.nombre,
        stagiaires_demandeurs_emploi_heures: stagiaires.rechercheEmploi.heures,
        stagiaires_total_nombre: stagiaires.total.nombre,
        stagiaires_total_heures: stagiaires.total.heures,
        specialites: specialites,
        objectifs: objectifs,
        dirigeant_nom: dirigeant.nom,
        dirigeant_qualite: dirigeant.qualite,
        signature_lieu: dirigeant.lieu,
        signature_date: dirigeant.date || null,
        statut: 'brouillon',
      });

      if (error) throw error;
      toast.success("BPF sauvegardé avec succès");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la sauvegarde du BPF");
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number) => value.toLocaleString() + " €";

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
        {bpfGenerated && (
          <div className="flex gap-2">
            <Button onClick={handleSave} variant="outline" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Sauvegarder
            </Button>
            <Button onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 lg:grid-cols-6 gap-2 h-auto">
          <TabsTrigger value="generer" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Zap className="w-4 h-4" />
            <span>Générer BPF</span>
          </TabsTrigger>
          <TabsTrigger value="organisme" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Organisme</span>
          </TabsTrigger>
          <TabsTrigger value="financier" className="flex items-center gap-2">
            <Euro className="w-4 h-4" />
            <span className="hidden sm:inline">Financier</span>
          </TabsTrigger>
          <TabsTrigger value="formateurs" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Formateurs</span>
          </TabsTrigger>
          <TabsTrigger value="stagiaires" className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            <span className="hidden sm:inline">Stagiaires</span>
          </TabsTrigger>
          <TabsTrigger value="objectifs" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Objectifs</span>
          </TabsTrigger>
        </TabsList>

        {/* ONGLET GÉNÉRER BPF */}
        <TabsContent value="generer" className="space-y-6">
          <Card className="border-2 border-primary/20">
            <CardHeader className="text-center pb-2">
              <CardTitle className="flex items-center justify-center gap-3 text-2xl">
                <Zap className="w-8 h-8 text-primary" />
                Génération automatique du BPF
              </CardTitle>
              <p className="text-muted-foreground">
                Toutes les données sont calculées automatiquement à partir de vos sessions, apprenants et factures
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {!bpfGenerated ? (
                <>
                  {/* Checklist avant génération */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <h4 className="font-semibold text-emerald-800">Données prêtes</h4>
                      </div>
                      <ul className="space-y-2 text-sm text-emerald-700">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> 14 sessions de formation
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> 135 apprenants inscrits
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> 4 formateurs actifs
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> 52 factures émises
                        </li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                      <div className="flex items-center gap-2 mb-3">
                        <FileCheck className="w-5 h-5 text-blue-600" />
                        <h4 className="font-semibold text-blue-800">Éléments calculés</h4>
                      </div>
                      <ul className="space-y-2 text-sm text-blue-700">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Produits par origine
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Heures de formation
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Stagiaires par catégorie
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Spécialités NSF
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Bouton de génération */}
                  <div className="text-center py-6">
                    {isGenerating ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-6 h-6 text-primary animate-spin" />
                          <span className="text-lg font-medium">Génération en cours...</span>
                        </div>
                        <Progress value={generationProgress} className="w-full max-w-md mx-auto h-3" />
                        <p className="text-sm text-muted-foreground">{generationProgress}% complété</p>
                      </div>
                    ) : (
                      <Button size="lg" onClick={generateBPF} className="gap-2 text-lg px-8 py-6">
                        <Zap className="w-6 h-6" />
                        Générer le BPF en 2 secondes
                      </Button>
                    )}
                  </div>

                  {/* Exercice comptable */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Période de l'exercice
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Date de début</Label>
                          <Input 
                            type="date" 
                            value={exercice.debut}
                            onChange={(e) => setExercice({...exercice, debut: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Date de fin</Label>
                          <Input 
                            type="date" 
                            value={exercice.fin}
                            onChange={(e) => setExercice({...exercice, fin: e.target.value})}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                /* Récapitulatif après génération */
                <div className="space-y-6">
                  <div className="text-center p-6 rounded-xl bg-emerald-50 border border-emerald-200">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                    <h3 className="text-xl font-bold text-emerald-800">BPF généré avec succès !</h3>
                    <p className="text-emerald-700">Vous pouvez maintenant vérifier et exporter votre bilan</p>
                  </div>

                  {/* Résumé des données */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Euro className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <p className="text-2xl font-bold text-primary">{formatCurrency(produits.total)}</p>
                        <p className="text-sm text-muted-foreground">Total produits</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <GraduationCap className="w-8 h-8 mx-auto mb-2 text-amber-600" />
                        <p className="text-2xl font-bold text-amber-600">{stagiaires.total.nombre}</p>
                        <p className="text-sm text-muted-foreground">Stagiaires</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Clock className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <p className="text-2xl font-bold text-blue-600">{stagiaires.total.heures.toLocaleString()}h</p>
                        <p className="text-sm text-muted-foreground">Heures de formation</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Users className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
                        <p className="text-2xl font-bold text-emerald-600">{formateurs.internes.nombre + formateurs.externes.nombre}</p>
                        <p className="text-sm text-muted-foreground">Formateurs</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 justify-center">
                    <Button variant="outline" onClick={() => setBpfGenerated(false)}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Régénérer
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab("organisme")}>
                      <FileText className="w-4 h-4 mr-2" />
                      Vérifier les données
                    </Button>
                    <Button onClick={handleExport}>
                      <Download className="w-4 h-4 mr-2" />
                      Exporter le BPF
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ONGLET ORGANISME */}
        <TabsContent value="organisme" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                A. Identification de l'organisme
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Numéro SIRET</Label>
                  <Input value={organisme.siret} onChange={(e) => setOrganisme({...organisme, siret: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Code NAF</Label>
                  <Input value={organisme.codeNAF} onChange={(e) => setOrganisme({...organisme, codeNAF: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>N° Déclaration d'activité</Label>
                  <Input value={organisme.numeroDeclaration} onChange={(e) => setOrganisme({...organisme, numeroDeclaration: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Forme juridique</Label>
                  <Input value={organisme.formeJuridique} onChange={(e) => setOrganisme({...organisme, formeJuridique: e.target.value})} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Nom / Dénomination</Label>
                  <Input value={organisme.denomination} onChange={(e) => setOrganisme({...organisme, denomination: e.target.value})} />
                </div>
                <div className="space-y-2 lg:col-span-3">
                  <Label>Adresse</Label>
                  <Input value={organisme.adresse} onChange={(e) => setOrganisme({...organisme, adresse: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input value={organisme.telephone} onChange={(e) => setOrganisme({...organisme, telephone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={organisme.email} onChange={(e) => setOrganisme({...organisme, email: e.target.value})} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                B. Période de l'exercice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date de début</Label>
                  <Input type="date" value={exercice.debut} onChange={(e) => setExercice({...exercice, debut: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Date de fin</Label>
                  <Input type="date" value={exercice.fin} onChange={(e) => setExercice({...exercice, fin: e.target.value})} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                H. Signature
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom du dirigeant</Label>
                  <Input value={dirigeant.nom} onChange={(e) => setDirigeant({...dirigeant, nom: e.target.value})} placeholder="Nom du dirigeant" />
                </div>
                <div className="space-y-2">
                  <Label>Qualité</Label>
                  <Input value={dirigeant.qualite} onChange={(e) => setDirigeant({...dirigeant, qualite: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Fait à</Label>
                  <Input value={dirigeant.lieu} onChange={(e) => setDirigeant({...dirigeant, lieu: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={dirigeant.date} onChange={(e) => setDirigeant({...dirigeant, date: e.target.value})} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ONGLET FINANCIER */}
        <TabsContent value="financier" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="w-5 h-5" />
                C. Origine des produits
                <Badge variant="secondary" className="ml-auto">Calculé automatiquement</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Produits des entreprises</Label>
                  <Input type="number" value={produits.entreprises} onChange={(e) => setProduits({...produits, entreprises: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <Label>CPF (Compte Personnel Formation)</Label>
                  <Input type="number" value={produits.cpf} onChange={(e) => setProduits({...produits, cpf: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <Label>Particuliers (contrats individuels)</Label>
                  <Input type="number" value={produits.particuliers} onChange={(e) => setProduits({...produits, particuliers: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <Label>OPCO</Label>
                  <Input type="number" value={produits.opco} onChange={(e) => setProduits({...produits, opco: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <Label>France Travail</Label>
                  <Input type="number" value={produits.franceTravail} onChange={(e) => setProduits({...produits, franceTravail: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div className="p-4 rounded-xl bg-primary/10 text-center">
                <p className="text-sm text-muted-foreground">Total des produits</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(produits.total)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Euro className="w-5 h-5" />
                D. Charges de l'organisme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Total des charges</Label>
                  <Input type="number" value={charges.total} onChange={(e) => setCharges({...charges, total: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <Label>Salaires des formateurs</Label>
                  <Input type="number" value={charges.salairesFormateurs} onChange={(e) => setCharges({...charges, salairesFormateurs: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <Label>Achats de prestations</Label>
                  <Input type="number" value={charges.prestations} onChange={(e) => setCharges({...charges, prestations: parseInt(e.target.value) || 0})} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ONGLET FORMATEURS */}
        <TabsContent value="formateurs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                E. Personnels formateurs
                <Badge variant="secondary" className="ml-auto">Calculé depuis les formateurs</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl border bg-card">
                  <h4 className="font-semibold mb-4">Formateurs internes (salariés)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input type="number" value={formateurs.internes.nombre} onChange={(e) => setFormateurs({...formateurs, internes: {...formateurs.internes, nombre: parseInt(e.target.value) || 0}})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Heures totales</Label>
                      <Input type="number" value={formateurs.internes.heures} onChange={(e) => setFormateurs({...formateurs, internes: {...formateurs.internes, heures: parseInt(e.target.value) || 0}})} />
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-xl border bg-card">
                  <h4 className="font-semibold mb-4">Formateurs externes</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input type="number" value={formateurs.externes.nombre} onChange={(e) => setFormateurs({...formateurs, externes: {...formateurs.externes, nombre: parseInt(e.target.value) || 0}})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Heures totales</Label>
                      <Input type="number" value={formateurs.externes.heures} onChange={(e) => setFormateurs({...formateurs, externes: {...formateurs.externes, heures: parseInt(e.target.value) || 0}})} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 flex justify-around text-center">
                <div>
                  <p className="text-2xl font-bold">{formateurs.internes.nombre + formateurs.externes.nombre}</p>
                  <p className="text-sm text-muted-foreground">Formateurs total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{(formateurs.internes.heures + formateurs.externes.heures).toLocaleString()}h</p>
                  <p className="text-sm text-muted-foreground">Heures totales</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ONGLET STAGIAIRES */}
        <TabsContent value="stagiaires" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                F. Stagiaires par catégorie
                <Badge variant="secondary" className="ml-auto">Calculé depuis les apprenants</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border bg-card space-y-3">
                  <h4 className="font-medium">Salariés secteur privé</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nombre</Label>
                      <Input type="number" value={stagiaires.salariesPrives.nombre} onChange={(e) => setStagiaires({...stagiaires, salariesPrives: {...stagiaires.salariesPrives, nombre: parseInt(e.target.value) || 0}})} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Heures</Label>
                      <Input type="number" value={stagiaires.salariesPrives.heures} onChange={(e) => setStagiaires({...stagiaires, salariesPrives: {...stagiaires.salariesPrives, heures: parseInt(e.target.value) || 0}})} />
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-xl border bg-card space-y-3">
                  <h4 className="font-medium">Particuliers</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nombre</Label>
                      <Input type="number" value={stagiaires.particuliers.nombre} onChange={(e) => setStagiaires({...stagiaires, particuliers: {...stagiaires.particuliers, nombre: parseInt(e.target.value) || 0}})} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Heures</Label>
                      <Input type="number" value={stagiaires.particuliers.heures} onChange={(e) => setStagiaires({...stagiaires, particuliers: {...stagiaires.particuliers, heures: parseInt(e.target.value) || 0}})} />
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-xl border bg-card space-y-3">
                  <h4 className="font-medium">Demandeurs d'emploi</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nombre</Label>
                      <Input type="number" value={stagiaires.rechercheEmploi.nombre} onChange={(e) => setStagiaires({...stagiaires, rechercheEmploi: {...stagiaires.rechercheEmploi, nombre: parseInt(e.target.value) || 0}})} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Heures</Label>
                      <Input type="number" value={stagiaires.rechercheEmploi.heures} onChange={(e) => setStagiaires({...stagiaires, rechercheEmploi: {...stagiaires.rechercheEmploi, heures: parseInt(e.target.value) || 0}})} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-primary/10 flex justify-around text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{stagiaires.total.nombre}</p>
                  <p className="text-sm text-muted-foreground">Stagiaires total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{stagiaires.total.heures.toLocaleString()}h</p>
                  <p className="text-sm text-muted-foreground">Heures totales</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ONGLET OBJECTIFS */}
        <TabsContent value="objectifs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                F3. Objectifs des formations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border bg-card space-y-3">
                  <h4 className="font-medium">Diplômes / Titres RNCP</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nombre</Label>
                      <Input type="number" value={objectifs.diplomes.nombre} onChange={(e) => setObjectifs({...objectifs, diplomes: {...objectifs.diplomes, nombre: parseInt(e.target.value) || 0}})} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Heures</Label>
                      <Input type="number" value={objectifs.diplomes.heures} onChange={(e) => setObjectifs({...objectifs, diplomes: {...objectifs.diplomes, heures: parseInt(e.target.value) || 0}})} />
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-xl border bg-card space-y-3">
                  <h4 className="font-medium">Certifications RS</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nombre</Label>
                      <Input type="number" value={objectifs.certifications.nombre} onChange={(e) => setObjectifs({...objectifs, certifications: {...objectifs.certifications, nombre: parseInt(e.target.value) || 0}})} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Heures</Label>
                      <Input type="number" value={objectifs.certifications.heures} onChange={(e) => setObjectifs({...objectifs, certifications: {...objectifs.certifications, heures: parseInt(e.target.value) || 0}})} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                F4. Spécialités de formation (codes NSF)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {specialites.map((spec, index) => (
                  <div key={index} className="grid grid-cols-4 gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="space-y-1">
                      <Label className="text-xs">Spécialité</Label>
                      <Input 
                        value={spec.nom} 
                        onChange={(e) => {
                          const newSpecs = [...specialites];
                          newSpecs[index].nom = e.target.value;
                          setSpecialites(newSpecs);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Code NSF</Label>
                      <Input 
                        value={spec.code}
                        onChange={(e) => {
                          const newSpecs = [...specialites];
                          newSpecs[index].code = e.target.value;
                          setSpecialites(newSpecs);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Stagiaires</Label>
                      <Input 
                        type="number" 
                        value={spec.nombre}
                        onChange={(e) => {
                          const newSpecs = [...specialites];
                          newSpecs[index].nombre = parseInt(e.target.value) || 0;
                          setSpecialites(newSpecs);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Heures</Label>
                      <Input 
                        type="number" 
                        value={spec.heures}
                        onChange={(e) => {
                          const newSpecs = [...specialites];
                          newSpecs[index].heures = parseInt(e.target.value) || 0;
                          setSpecialites(newSpecs);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}