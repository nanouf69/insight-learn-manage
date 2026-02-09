import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Layers, GraduationCap, Plus, Users, TrendingUp, AlertTriangle, FileText, Monitor } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CoursEnLignePage = () => {
  const [activeTab, setActiveTab] = useState("accueil");
  const [selectedFormation, setSelectedFormation] = useState("vtc");

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="accueil" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Accueil
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Modules
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
            <h2 className="text-lg font-semibold">Modules de cours</h2>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouveau module
            </Button>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Layers className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucun module créé</p>
              <p className="text-sm mt-1">Créez votre premier module pour organiser vos cours en ligne.</p>
              <Button className="mt-4 gap-2">
                <Plus className="w-4 h-4" />
                Créer un module
              </Button>
            </CardContent>
          </Card>
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
