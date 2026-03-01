import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, LogOut, Target, RotateCcw, ChevronRight } from "lucide-react";
import ModuleDetailView from "@/components/cours-en-ligne/ModuleDetailView";
import logo from "@/assets/logo-ftransport.png";

const MODULES = [
  {
    id: 1,
    nom: "1.INTRODUCTION",
    description: "A lire absolument, cela vous explique l'organisation de l'examen, le programme, les coefficients, les éléments importants...",
  },
  {
    id: 2,
    nom: "2.COURS ET EXERCICES VTC",
    description: "Il s'agit des cours et d'exercices à effectuer",
  },
  {
    id: 3,
    nom: "3.FORMULES",
    description: "Il s'agit de l'ensemble des calculs qui peuvent tomber à l'examen théorique",
  },
  {
    id: 4,
    nom: "4.BILAN EXERCICES VTC",
    description: "Il s'agit de tous les exercices déjà effectués que vous pouvez refaire",
  },
  {
    id: 5,
    nom: "6.BILAN EXAMEN VTC",
    description: "Très important, il s'agit de questions que vous pouvez retrouver en examen",
  },
  {
    id: 6,
    nom: "8.PRATIQUE TAXI",
    description: "Exercices pratiques pour la formation Taxi",
  },
  {
    id: 7,
    nom: "7.CONNAISSANCES DE LA VILLE TAXI",
    description: "Connaissances géographiques et culturelles de la ville pour les Taxis",
  },
  {
    id: 8,
    nom: "7.PRATIQUE VTC",
    description: "Exercices pratiques pour la formation VTC",
  },
  {
    id: 9,
    nom: "4.BILAN EXERCICES TAXI",
    description: "Il s'agit de tous les exercices déjà effectués que vous pouvez refaire (Taxi)",
  },
  {
    id: 10,
    nom: "2.COURS ET EXERCICES TAXI",
    description: "Il s'agit des cours et d'exercices à effectuer pour la formation Taxi",
  },
  {
    id: 11,
    nom: "6.BILAN EXAMEN TAXI",
    description: "Très important, il s'agit de questions que vous pouvez retrouver en examen Taxi",
  },
  {
    id: 12,
    nom: "9.CAS PRATIQUE TAXI",
    description: "Cas pratiques de facturation et de tarification Taxi",
  },
];

const CoursPublic = () => {
  const [selectedModule, setSelectedModule] = useState<{
    id: number;
    nom: string;
  } | null>(null);

  if (selectedModule) {
    return (
      <div className="min-h-screen bg-background">
        <ModuleDetailView
          module={selectedModule}
          onBack={() => setSelectedModule(null)}
          studentOnly
        />
      </div>
    );
  }

  // Simulated progression (static for now since no auth/tracking)
  const globalProgress = 7;
  const lowModules = MODULES.filter((_, i) => i === 0 || i === 2); // example

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top navbar */}
      <nav className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-sm cursor-pointer hover:text-primary transition-colors">
              Accueil
            </span>
            <span className="text-sm cursor-pointer hover:text-primary transition-colors">
              Examens
            </span>
            <span className="text-sm cursor-pointer hover:text-primary transition-colors">
              Notes
            </span>
          </div>
          <Button variant="destructive" size="sm" className="text-xs">
            <LogOut className="w-3.5 h-3.5 mr-1" />
            Déconnexion
          </Button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Formation VTC
          </h1>
          <p className="text-slate-500 text-lg">Apprenant</p>
        </div>

        {/* Dashboard cards */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Bienvenue sur votre tableau de bord
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Progression card */}
            <div className="border rounded-xl p-6 flex flex-col items-center justify-center">
              <h3 className="font-bold text-slate-700 mb-2">
                Progression générale
              </h3>
              <span className="text-4xl font-bold text-slate-900">
                {globalProgress}%
              </span>
              <Progress value={globalProgress} className="mt-3 w-3/4 h-2" />
            </div>

            {/* À revoir */}
            <div className="border rounded-xl p-6">
              <h3 className="font-bold text-slate-700 mb-3 text-center">
                À revoir
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {lowModules.map((mod) => (
                  <div
                    key={mod.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700">
                        {mod.nom}
                      </span>
                      <span className="text-xs font-semibold text-red-500">
                        0%
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs"
                      onClick={() => setSelectedModule(mod)}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Refaire
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Encouragement banner */}
        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-xl p-4 mb-6">
          <p className="text-sm text-slate-700">
            <Target className="w-4 h-4 inline mr-1 text-primary" />
            Continue comme ça ! Pense à réviser les modules où ta progression
            est inférieure à 50%.
          </p>
        </div>

        {/* Modules table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-6 py-3 bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <div className="col-span-2">Nom</div>
            <div className="col-span-4">Description</div>
            <div className="col-span-1 text-center">Taux de réussite</div>
            <div className="col-span-2 text-center">Progression</div>
            <div className="col-span-1 text-center">Statut</div>
            <div className="col-span-2 text-center">Actions</div>
          </div>

          {/* Table rows */}
          {MODULES.map((mod) => (
            <div
              key={mod.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 px-6 py-4 border-b last:border-b-0 hover:bg-slate-50/50 transition-colors items-center"
            >
              {/* Nom */}
              <div className="md:col-span-2 font-semibold text-slate-800 text-sm">
                {mod.nom}
              </div>

              {/* Description */}
              <div className="md:col-span-4 text-sm text-slate-500 line-clamp-2">
                {mod.description}
              </div>

              {/* Taux de réussite */}
              <div className="md:col-span-1 text-center">
                <span className="text-sm text-slate-600">0%</span>
              </div>

              {/* Progression */}
              <div className="md:col-span-2 text-center">
                <span className="text-sm text-slate-600">0%</span>
              </div>

              {/* Statut */}
              <div className="md:col-span-1 text-center">
                <span className="text-sm font-semibold text-emerald-500">
                  Actif
                </span>
              </div>

              {/* Actions */}
              <div className="md:col-span-2 text-center">
                <Button
                  size="sm"
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs"
                  onClick={() => setSelectedModule(mod)}
                >
                  Consulter
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>

              {/* Mobile-only labels */}
              <div className="flex items-center justify-between md:hidden text-xs text-slate-400 pt-1">
                <span>Réussite: 0% · Progression: 0%</span>
                <span className="text-emerald-500 font-semibold">Actif</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CoursPublic;
