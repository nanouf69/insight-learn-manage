import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Layers, GraduationCap, Plus, Users, TrendingUp, AlertTriangle, FileText, Monitor, ArrowUp, ArrowDown, Pencil, Trash2, ClipboardList, Trophy, Eye, Search, X, ChevronRight, BarChart3, TableProperties, CheckCircle2 } from "lucide-react";
import { MODULES_DATA } from "./formations-data";
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
};

const CoursEnLignePage = () => {
  const [activeTab, setActiveTab] = useState("accueil");
  const [selectedFormation, setSelectedFormation] = useState("vtc");
  const [editingModule, setEditingModule] = useState<{ id: number; nom: string } | null>(null);
  const [bilanActif, setBilanActif] = useState<string | null>(null);
  const [modules, setModules] = useState([
    // 1. INTRODUCTIONS
    { id: 1, nom: "1.INTRODUCTION PRÉSENTIEL", eleves: 2, progression: "0%", statut: "Actif" },
    { id: 26, nom: "1.INTRODUCTION E-LEARNING", eleves: 2, progression: "0%", statut: "Actif" },
    { id: 31, nom: "1.INTRODUCTION TA", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 32, nom: "1.INTRODUCTION TA E-LEARNING", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 33, nom: "1.INTRODUCTION VA", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 34, nom: "1.INTRODUCTION VA E-LEARNING", eleves: 0, progression: "0%", statut: "Actif" },
    // 2. COURS ET EXERCICES
    { id: 2, nom: "2.COURS ET EXERCICES VTC", eleves: 2, progression: "6%", statut: "Actif" },
    { id: 10, nom: "2.COURS ET EXERCICES TAXI", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 40, nom: "2.COURS ET EXERCICES TA", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 41, nom: "2.COURS ET EXERCICES VA", eleves: 0, progression: "0%", statut: "Actif" },
    // 3. FORMULES
    { id: 3, nom: "3.FORMULES", eleves: 2, progression: "0%", statut: "Actif" },
    // 4. BILAN EXERCICES
    { id: 4, nom: "4.BILAN EXERCICES VTC", eleves: 2, progression: "4%", statut: "Actif" },
    { id: 9, nom: "4.BILAN EXERCICES TAXI", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 27, nom: "4.BILAN EXERCICES TA", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 29, nom: "4.BILAN EXERCICES VA", eleves: 0, progression: "0%", statut: "Actif" },
    // 5. EXAMENS BLANCS
    { id: 35, nom: "5.EXAMENS BLANCS VTC", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 36, nom: "5.EXAMENS BLANCS TAXI", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 37, nom: "5.EXAMENS BLANCS TA", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 38, nom: "5.EXAMENS BLANCS VA", eleves: 0, progression: "0%", statut: "Actif" },
    // 6. BILAN EXAMEN
    { id: 5, nom: "6.BILAN EXAMEN VTC", eleves: 2, progression: "8%", statut: "Actif" },
    { id: 11, nom: "6.BILAN EXAMEN TAXI", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 28, nom: "6.BILAN EXAMEN TA", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 30, nom: "6.BILAN EXAMEN VA", eleves: 0, progression: "0%", statut: "Actif" },
    // 7. PRATIQUE / CONNAISSANCES / CAS PRATIQUE / CONTRÔLE
    { id: 7, nom: "7.CONNAISSANCES DE LA VILLE TAXI", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 8, nom: "7.PRATIQUE VTC", eleves: 2, progression: "0%", statut: "Actif" },
    { id: 6, nom: "8.PRATIQUE TAXI", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 12, nom: "9.CAS PRATIQUE TAXI", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 13, nom: "CONTRÔLE DE CONNAISSANCES TAXI", eleves: 0, progression: "0%", statut: "Actif" },
    // ÉQUIPEMENTS TAXI
    { id: 64, nom: "🚕 ÉQUIPEMENTS TAXI", eleves: 0, progression: "0%", statut: "Actif" },
    // SOURCES JURIDIQUES
    { id: 60, nom: "📖 SOURCES JURIDIQUES VTC", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 61, nom: "📖 SOURCES JURIDIQUES TAXI", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 62, nom: "📖 SOURCES JURIDIQUES TA", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 63, nom: "📖 SOURCES JURIDIQUES VA", eleves: 0, progression: "0%", statut: "Actif" },
    // FIN DE FORMATION
    { id: 50, nom: "📋 FIN DE FORMATION VTC", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 51, nom: "📋 FIN DE FORMATION TAXI", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 52, nom: "📋 FIN DE FORMATION TA", eleves: 0, progression: "0%", statut: "Actif" },
    { id: 53, nom: "📋 FIN DE FORMATION VA", eleves: 0, progression: "0%", statut: "Actif" },
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

        {/* Formations — Mapping modules par formation */}
        <TabsContent value="formations" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Modules par formation</h2>
              <p className="text-sm text-muted-foreground mt-1">Vue synthétique des modules attribués à chaque type de formation</p>
            </div>
          </div>

          {(() => {
            const FORMATION_MODULES: Record<string, { label: string; color: string; modules: { id: number; label: string }[] }> = {
              "vtc": { label: "VTC", color: "bg-emerald-100 text-emerald-800 border-emerald-300", modules: [
                { id: 1, label: "1.INTRODUCTION PRÉSENTIEL" },
                { id: 2, label: "2.COURS ET EXERCICES VTC" },
                { id: 3, label: "3.FORMULES" },
                { id: 4, label: "4.BILAN EXERCICES VTC" },
                { id: 35, label: "5.EXAMENS BLANCS VTC" },
                { id: 5, label: "6.BILAN EXAMEN VTC" },
                { id: 60, label: "7.SOURCES JURIDIQUES VTC" },
                { id: 8, label: "8.PRATIQUE VTC" },
                { id: 50, label: "9.FIN DE FORMATION VTC" },
              ]},
              "vtc-e": { label: "VTC E-learning", color: "bg-emerald-50 text-emerald-700 border-emerald-200", modules: [
                { id: 26, label: "1.INTRODUCTION E-LEARNING" },
                { id: 2, label: "2.COURS ET EXERCICES VTC" },
                { id: 3, label: "3.FORMULES" },
                { id: 4, label: "4.BILAN EXERCICES VTC" },
                { id: 35, label: "5.EXAMENS BLANCS VTC" },
                { id: 5, label: "6.BILAN EXAMEN VTC" },
                { id: 60, label: "7.SOURCES JURIDIQUES VTC" },
                { id: 8, label: "8.PRATIQUE VTC" },
                { id: 50, label: "9.FIN DE FORMATION VTC" },
              ]},
              "taxi": { label: "TAXI", color: "bg-orange-100 text-orange-800 border-orange-300", modules: [
                { id: 1, label: "1.INTRODUCTION PRÉSENTIEL" },
                { id: 10, label: "2.COURS ET EXERCICES TAXI" },
                { id: 7, label: "3.CONNAISSANCES DE LA VILLE TAXI" },
                { id: 3, label: "4.FORMULES" },
                { id: 9, label: "5.BILAN EXERCICES TAXI" },
                { id: 13, label: "6.CONTRÔLE DE CONNAISSANCES TAXI" },
                { id: 11, label: "7.BILAN EXAMEN TAXI" },
                { id: 36, label: "8.EXAMENS BLANCS TAXI" },
                { id: 64, label: "9.ÉQUIPEMENTS TAXI" },
                { id: 61, label: "10.SOURCES JURIDIQUES TAXI" },
                { id: 6, label: "11.PRATIQUE TAXI" },
                { id: 12, label: "12.CAS PRATIQUE TAXI" },
                { id: 51, label: "13.FIN DE FORMATION TAXI" },
              ]},
              "taxi-e": { label: "TAXI E-learning", color: "bg-orange-50 text-orange-700 border-orange-200", modules: [
                { id: 26, label: "1.INTRODUCTION E-LEARNING" },
                { id: 10, label: "2.COURS ET EXERCICES TAXI" },
                { id: 7, label: "3.CONNAISSANCES DE LA VILLE TAXI" },
                { id: 3, label: "4.FORMULES" },
                { id: 9, label: "5.BILAN EXERCICES TAXI" },
                { id: 13, label: "6.CONTRÔLE DE CONNAISSANCES TAXI" },
                { id: 11, label: "7.BILAN EXAMEN TAXI" },
                { id: 36, label: "8.EXAMENS BLANCS TAXI" },
                { id: 64, label: "9.ÉQUIPEMENTS TAXI" },
                { id: 61, label: "10.SOURCES JURIDIQUES TAXI" },
                { id: 6, label: "11.PRATIQUE TAXI" },
                { id: 12, label: "12.CAS PRATIQUE TAXI" },
                { id: 51, label: "13.FIN DE FORMATION TAXI" },
              ]},
              "ta": { label: "TA (Présentiel)", color: "bg-amber-100 text-amber-800 border-amber-300", modules: [
                { id: 31, label: "1.INTRODUCTION TA" },
                { id: 40, label: "2.COURS ET EXERCICES TA" },
                { id: 7, label: "3.CONNAISSANCES DE LA VILLE TAXI" },
                { id: 3, label: "4.FORMULES" },
                { id: 27, label: "5.BILAN EXERCICES TA" },
                { id: 28, label: "6.BILAN EXAMEN TA" },
                { id: 37, label: "7.EXAMENS BLANCS TA" },
                { id: 64, label: "8.ÉQUIPEMENTS TAXI" },
                { id: 62, label: "9.SOURCES JURIDIQUES TA" },
                { id: 6, label: "10.PRATIQUE TAXI" },
                { id: 52, label: "11.FIN DE FORMATION TA" },
              ]},
              "ta-e": { label: "TA E-learning", color: "bg-amber-50 text-amber-700 border-amber-200", modules: [
                { id: 32, label: "1.INTRODUCTION TA E-LEARNING" },
                { id: 40, label: "2.COURS ET EXERCICES TA" },
                { id: 7, label: "3.CONNAISSANCES DE LA VILLE TAXI" },
                { id: 3, label: "4.FORMULES" },
                { id: 27, label: "5.BILAN EXERCICES TA" },
                { id: 13, label: "6.CONTRÔLE DE CONNAISSANCES TAXI" },
                { id: 28, label: "7.BILAN EXAMEN TA" },
                { id: 37, label: "8.EXAMENS BLANCS TA" },
                { id: 64, label: "9.ÉQUIPEMENTS TAXI" },
                { id: 62, label: "10.SOURCES JURIDIQUES TA" },
                { id: 6, label: "11.PRATIQUE TAXI" },
                { id: 52, label: "12.FIN DE FORMATION TA" },
              ]},
              "va": { label: "VA (Présentiel)", color: "bg-teal-100 text-teal-800 border-teal-300", modules: [
                { id: 33, label: "1.INTRODUCTION VA" },
                { id: 41, label: "2.COURS ET EXERCICES VA" },
                { id: 3, label: "3.FORMULES" },
                { id: 29, label: "4.BILAN EXERCICES VA" },
                { id: 30, label: "5.BILAN EXAMEN VA" },
                { id: 38, label: "6.EXAMENS BLANCS VA" },
                { id: 63, label: "7.SOURCES JURIDIQUES VA" },
                { id: 8, label: "8.PRATIQUE VTC" },
                { id: 53, label: "9.FIN DE FORMATION VA" },
              ]},
              "va-e": { label: "VA E-learning", color: "bg-teal-50 text-teal-700 border-teal-200", modules: [
                { id: 34, label: "1.INTRODUCTION VA E-LEARNING" },
                { id: 41, label: "2.COURS ET EXERCICES VA" },
                { id: 3, label: "3.FORMULES" },
                { id: 29, label: "4.BILAN EXERCICES VA" },
                { id: 30, label: "5.BILAN EXAMEN VA" },
                { id: 38, label: "6.EXAMENS BLANCS VA" },
                { id: 63, label: "7.SOURCES JURIDIQUES VA" },
                { id: 8, label: "8.PRATIQUE VTC" },
                { id: 53, label: "9.FIN DE FORMATION VA" },
              ]},
            };

            const entries = Object.entries(FORMATION_MODULES);

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {entries.map(([key, formation]) => (
                  <Card key={key} className="border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-3">
                        <Badge className={`${formation.color} border font-semibold text-sm`}>{formation.label}</Badge>
                        <span className="text-xs text-muted-foreground">{formation.modules.length} modules</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-2">
                        {formation.modules.map((mod) => (
                          <li key={mod.id} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                            <span className="font-medium text-foreground">{mod.label}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}
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
