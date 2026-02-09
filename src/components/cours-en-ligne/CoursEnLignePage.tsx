import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Layers, GraduationCap, Plus, Play, Clock, Users } from "lucide-react";

const CoursEnLignePage = () => {
  const [activeTab, setActiveTab] = useState("accueil");

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
        <TabsContent value="accueil" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cours publiés</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">0</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Apprenants inscrits</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">0</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Taux de complétion</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">—</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Bienvenue sur les Cours en ligne</CardTitle>
              <CardDescription>
                Créez et gérez vos formations e-learning. Ajoutez des modules, des vidéos et des contenus pédagogiques pour vos apprenants.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Créer un cours
              </Button>
              <Button variant="outline" className="gap-2">
                <Layers className="w-4 h-4" />
                Ajouter un module
              </Button>
            </CardContent>
          </Card>
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
