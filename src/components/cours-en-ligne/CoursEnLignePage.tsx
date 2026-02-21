import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Layers, GraduationCap, Plus, Users, TrendingUp, AlertTriangle, FileText, Monitor, ArrowUp, ArrowDown, Pencil, Trash2, ClipboardList, Trophy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import ModuleDetailView from "./ModuleDetailView";
import ExamensBlancsPage from "./ExamensBlancsPage";
import ExamensBlancsEditor from "./ExamensBlancsEditor";

// IDs des modules bilan qui ouvrent directement l'onglet examens
const BILAN_MODULE_IDS: Record<number, string> = {
  11: "bilan-taxi",  // 6.BILAN EXAMEN TAXI
  5:  "bilan-vtc",   // 6.BILAN EXAMEN VTC
};

const CoursEnLignePage = () => {
  const [activeTab, setActiveTab] = useState("accueil");
  const [selectedFormation, setSelectedFormation] = useState("vtc");
  const [editingModule, setEditingModule] = useState<{ id: number; nom: string } | null>(null);
  const [bilanActif, setBilanActif] = useState<string | null>(null);
  const [modules, setModules] = useState([
    { id: 1, nom: "1.INTRODUCTION", eleves: 2, progression: "0%", statut: "Actif" },
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


  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
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
                    <TableRow key={module.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
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
      </Tabs>
    </div>
  );
};

export default CoursEnLignePage;
