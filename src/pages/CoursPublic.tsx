import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowLeft, GraduationCap } from "lucide-react";
import ModuleDetailView from "@/components/cours-en-ligne/ModuleDetailView";
import logo from "@/assets/logo-ftransport.png";

const MODULES = [
  { id: 1, nom: "1.INTRODUCTION" },
  { id: 2, nom: "2.COURS ET EXERCICES VTC" },
  { id: 3, nom: "3.FORMULES" },
  { id: 4, nom: "4.BILAN EXERCICES VTC" },
  { id: 5, nom: "6.BILAN EXAMEN VTC" },
  { id: 6, nom: "8.PRATIQUE TAXI" },
  { id: 7, nom: "7.CONNAISSANCES DE LA VILLE TAXI" },
  { id: 8, nom: "7.PRATIQUE VTC" },
  { id: 9, nom: "4.BILAN EXERCICES TAXI" },
  { id: 10, nom: "2.COURS ET EXERCICES TAXI" },
  { id: 11, nom: "6.BILAN EXAMEN TAXI" },
  { id: 12, nom: "9.CAS PRATIQUE TAXI" },
];

const CoursPublic = () => {
  const [selectedModule, setSelectedModule] = useState<{ id: number; nom: string } | null>(null);

  if (selectedModule) {
    return (
      <div className="min-h-screen bg-background">
        <ModuleDetailView
          module={selectedModule}
          onBack={() => setSelectedModule(null)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <img src={logo} alt="FTransport" className="h-10" />
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-primary" />
              Cours en ligne
            </h1>
            <p className="text-sm text-muted-foreground">Sélectionnez un module pour commencer</p>
          </div>
        </div>

        {/* Modules grid */}
        <div className="grid gap-3">
          {MODULES.map((mod) => (
            <Card
              key={mod.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedModule(mod)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-foreground">{mod.nom}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CoursPublic;
