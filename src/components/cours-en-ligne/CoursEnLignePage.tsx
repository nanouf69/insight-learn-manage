import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Layers, GraduationCap, Plus, Users, TrendingUp, AlertTriangle, FileText, Monitor, ArrowUp, ArrowDown, Pencil, Trash2, ClipboardList, Trophy, Eye, Search, X, ChevronRight, BarChart3, TableProperties } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import ModuleDetailView from "./ModuleDetailView";
import ExamensBlancsPage from "./ExamensBlancsPage";
import ExamensBlancsEditor from "./ExamensBlancsEditor";
import CoursPublic from "@/pages/CoursPublic";
import ApprenantActivityReport from "./ApprenantActivityReport";
import ResultatsSessionPage from "./ResultatsSessionPage";
import { supabase } from "@/integrations/supabase/client";

// IDs des modules bilan qui ouvrent directement l'onglet examens
const BILAN_MODULE_IDS: Record<number, string> = {
  11: "bilan-taxi",  // 6.BILAN EXAMEN TAXI
  5:  "bilan-vtc",   // 6.BILAN EXAMEN VTC
  28: "bilan-ta",    // 6.BILAN EXAMEN TA
  30: "bilan-va",    // 6.BILAN EXAMEN VA
};

const CoursEnLignePage = () => {
  const [activeTab, setActiveTab] = useState("accueil");
  const [selectedFormation, setSelectedFormation] = useState("vtc");
  const [editingModule, setEditingModule] = useState<{ id: number; nom: string } | null>(null);
  const [bilanActif, setBilanActif] = useState<string | null>(null);
  const [modules, setModules] = useState([
    { id: 1, nom: "1.INTRODUCTION PRÉSENTIEL", eleves: 2, progression: "0%", statut: "Actif" },
    { id: 26, nom: "1.INTRODUCTION E-LEARNING", eleves: 2, progression: "0%", statut: "Actif" },
    { id: 2, nom: "2.COURS ET EXERCICES VTC", eleves: 2, progression: "6%", statut: "Actif" },
    { id: 3, nom: "3.FORMULES", eleves: 2, progression: "0%", statut: "Actif" },
    { id: 4, nom: "4.BILAN EXERCICES VTC", eleves: 2, progression: "4%", statut: "Actif" },
    { id: 5, nom: "6.BILAN EXAMEN VTC", eleves: 2, progression: "8%", statut: "Actif" },
    { id: 6, nom: "8.PRATIQUE TAXI", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 7, nom: "7.CONNAISSANCES DE LA VILLE TAXI", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 8, nom: "7.PRATIQUE VTC", eleves: 2, progression: "0%", statut: "Actif" },
    { id: 9, nom: "4.BILAN EXERCICES TAXI", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 10, nom: "2.COURS ET EXERCICES TAXI", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 11, nom: "6.BILAN EXAMEN TAXI", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 12, nom: "9.CAS PRATIQUE TAXI", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 13, nom: "CONTRÔLE DE CONNAISSANCES TAXI", eleves: 0, progression: "0%", statut: "Actif" },
  ]);

  const moveModule = (index: number, direction: "up" | "down") => {
    const newModules = [...modules];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newModules.length) return;
    [newModules[index], newModules[swapIndex]] = [newModules[swapIndex], newModules[index]];
    setModules(newModules);
  };

  const deleteModule = (id: number) => {
    setModules(modules.filter(m => m.id !== id));
  };

  const [editingBilanId, setEditingBilanId] = useState<string | null>(null);

  const handleEditerModule = (module: { id: number; nom: string }) => {
    if (BILAN_MODULE_IDS[module.id]) {
      // Ouvre directement l'éditeur de questions pour le bilan correspondant
      setEditingBilanId(BILAN_MODULE_IDS[module.id]);
    } else {
      setEditingModule(module);
    }
  };

  if (editingBilanId) {
    return <ExamensBlancsEditor onBack={() => setEditingBilanId(null)} defaultExamenId={editingBilanId} />;
  }

  if (editingModule) {
    return <ModuleDetailView module={editingModule} onBack={() => setEditingModule(null)} />;
  }
// ---------- Apprenant Search + Preview subcomponent ----------
interface SearchedApprenant {
  id: string;
  nom: string;
  prenom: string;
  type_apprenant: string | null;
  formation_choisie: string | null;
  date_debut_cours_en_ligne: string | null;
  date_fin_cours_en_ligne: string | null;
  modules_autorises: number[] | null;
}

const ApprenantSearchPreview = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchedApprenant[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedApprenant, setSelectedApprenant] = useState<SearchedApprenant | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const q = query.trim();
      const { data } = await supabase
        .from("apprenants")
        .select("id, nom, prenom, type_apprenant, formation_choisie, date_debut_cours_en_ligne, date_fin_cours_en_ligne, modules_autorises")
        .or(`nom.ilike.%${q}%,prenom.ilike.%${q}%`)
        .order("nom")
        .limit(10);
      setResults((data as SearchedApprenant[]) || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  if (selectedApprenant) {
    return (
      <div className="border rounded-xl overflow-hidden bg-background">
        <div className="p-3 bg-muted/50 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              Vue de {selectedApprenant.prenom} {selectedApprenant.nom}
            </span>
            {selectedApprenant.type_apprenant && (
              <Badge variant="secondary" className="text-xs">{selectedApprenant.type_apprenant}</Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedApprenant(null)}>
            <X className="w-4 h-4 mr-1" /> Fermer
          </Button>
        </div>
        <CoursPublic embedded apprenantOverride={selectedApprenant} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-xl overflow-hidden bg-background">
        <div className="p-3 bg-muted/50 border-b flex items-center gap-2">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Aperçu de l'interface apprenant</span>
        </div>
        <div className="p-6">
          <div className="max-w-md mx-auto space-y-4">
            <h2 className="text-xl font-bold text-center">Rechercher un apprenant</h2>
            <p className="text-sm text-muted-foreground text-center">Tapez le nom ou prénom pour accéder à la vue de l'apprenant</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou prénom..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
              {query && (
                <button onClick={() => { setQuery(""); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            {searching && <p className="text-sm text-muted-foreground text-center">Recherche...</p>}
            {results.length > 0 && (
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {results.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedApprenant(a)}
                    className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium">{a.prenom} {a.nom}</span>
                      {a.type_apprenant && (
                        <Badge variant="outline" className="ml-2 text-xs">{a.type_apprenant}</Badge>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
            {query.trim().length >= 2 && !searching && results.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">Aucun apprenant trouvé</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-4xl grid-cols-6">
          <TabsTrigger value="accueil" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Accueil
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Modules
          </TabsTrigger>
          <TabsTrigger value="examens-blancs" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Examens Blancs
          </TabsTrigger>
          <TabsTrigger value="formations" className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Formations
          </TabsTrigger>
          <TabsTrigger value="vue-apprenant" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Vue apprenant
          </TabsTrigger>
          <TabsTrigger value="rapport-activite" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Rapport activité
          </TabsTrigger>
          <TabsTrigger value="resultats-session" className="flex items-center gap-2">
            <TableProperties className="w-4 h-4" />
            Résultats
          </TabsTrigger>
        </TabsList>

        {/* Accueil */}
        <TabsContent value="accueil" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Colonne gauche - Stats globales */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card className="text-center">
                  <CardContent className="pt-6 pb-6">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Élèves inscrits</p>
                    <p className="text-4xl font-bold">12</p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="pt-6 pb-6">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Modules d'entraînement actifs</p>
                    <p className="text-4xl font-bold">11</p>
                  </CardContent>
                </Card>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Card className="text-center">
                  <CardContent className="pt-6 pb-6">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Examens blancs programmés</p>
                    <p className="text-4xl font-bold">5</p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="pt-6 pb-6">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Moyenne de progression</p>
                    <p className="text-4xl font-bold">3%</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Colonne droite - Détail par formation */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-1 block">Formation :</label>
                <Select value={selectedFormation} onValueChange={setSelectedFormation}>
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vtc">Formation VTC</SelectItem>
                    <SelectItem value="taxi">Formation TAXI</SelectItem>
                    <SelectItem value="ta">Formation TAXI (chauffeur VTC)</SelectItem>
                    <SelectItem value="va">Formation VTC (chauffeur TAXI)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mini stats formation */}
              <div className="flex flex-wrap gap-3">
                <Card className="flex-1 min-w-[140px]">
                  <CardContent className="py-3 px-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm">Élèves inscrits : <strong>1</strong></span>
                  </CardContent>
                </Card>
                <Card className="flex-1 min-w-[140px]">
                  <CardContent className="py-3 px-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm">Moyenne de progression : <strong>6%</strong></span>
                  </CardContent>
                </Card>
                <Card className="flex-1 min-w-[140px]">
                  <CardContent className="py-3 px-4 flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm">Modules actifs : <strong>6</strong></span>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="py-3 px-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm">Examens blancs : <strong>0</strong></span>
                </CardContent>
              </Card>

              {/* Derniers élèves connectés */}
              <Card>
                <CardContent className="py-4 px-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Derniers élèves connectés :
                  </h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>John Doe (2026-01-19T14:40:52)</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Modules non effectués */}
              <Card className="border-warning/30 bg-warning/5">
                <CardContent className="py-4 px-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    Modules non effectués :
                  </h3>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>1. INTRODUCTION</li>
                    <li>2. COURS ET EXERCICES VTC</li>
                    <li>3. FORMULES</li>
                    <li>4. BILAN EXERCICES VTC</li>
                    <li>6. BILAN EXAMEN VTC</li>
                    <li>7. PRATIQUE VTC</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Modules */}
        <TabsContent value="modules" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Gestion des modules</h2>
              <p className="text-sm text-muted-foreground mt-1">Modules d'entraînement</p>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouveau module d'entraînement
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Nom</TableHead>
                    <TableHead className="font-semibold">Élèves</TableHead>
                    <TableHead className="font-semibold">Progression</TableHead>
                    <TableHead className="font-semibold">Statut</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modules.map((module, index) => {
                    const isBilanModule = !!BILAN_MODULE_IDS[module.id];
                    return (
                    <TableRow key={module.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEditerModule(module)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2 text-primary hover:underline">
                          {module.nom}
                          {isBilanModule && (
                            <Badge className="text-xs bg-primary text-primary-foreground gap-1">
                              <Trophy className="w-3 h-3" />
                              BILAN
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{module.eleves}</TableCell>
                      <TableCell>{module.progression}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                          {module.statut}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveModule(index, "up")}
                            disabled={index === 0}
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => moveModule(index, "down")}
                            disabled={index === modules.length - 1}
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button
                            variant={isBilanModule ? "default" : "secondary"}
                            size="sm"
                            className="gap-1"
                            onClick={() => handleEditerModule({ id: module.id, nom: module.nom })}
                          >
                            {isBilanModule ? <Trophy className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                            {isBilanModule ? "Ouvrir Bilan" : "Éditer"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-1"
                            onClick={() => deleteModule(module.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                            Supprimer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Examens Blancs */}
        <TabsContent value="examens-blancs" className="mt-6">
          <ExamensBlancsPage defaultBilanId={bilanActif} onBilanConsumed={() => setBilanActif(null)} />
        </TabsContent>

        {/* Formations */}
        <TabsContent value="formations" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Formations en ligne</h2>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouvelle formation
            </Button>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <GraduationCap className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucune formation en ligne</p>
              <p className="text-sm mt-1">Assemblez vos modules pour créer des parcours de formation complets.</p>
              <Button className="mt-4 gap-2">
                <Plus className="w-4 h-4" />
                Créer une formation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Vue Apprenant */}
        <TabsContent value="vue-apprenant" className="mt-6">
          <ApprenantSearchPreview />
        </TabsContent>
        {/* Rapport Activité */}
        <TabsContent value="rapport-activite" className="mt-6">
          <ApprenantActivityReport onBack={() => setActiveTab("accueil")} />
        </TabsContent>
        {/* Résultats par session */}
        <TabsContent value="resultats-session" className="mt-6">
          <ResultatsSessionPage />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CoursEnLignePage;
