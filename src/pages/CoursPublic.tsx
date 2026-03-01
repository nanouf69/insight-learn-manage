import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LogOut, Target, RotateCcw, ChevronRight, GraduationCap } from "lucide-react";
import ModuleDetailView from "@/components/cours-en-ligne/ModuleDetailView";
import { FORMATIONS, MODULES_DATA, type FormationId } from "@/components/cours-en-ligne/formations-data";

const CoursPublic = () => {
  const [selectedFormation, setSelectedFormation] = useState<FormationId | null>(null);
  const [selectedModule, setSelectedModule] = useState<{ id: number; nom: string } | null>(null);

  // Module detail view
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

  // Formation selection screen
  if (!selectedFormation) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
              Bienvenue sur votre espace de formation
            </h1>
            <p className="text-slate-500">Sélectionnez votre formation pour accéder à vos cours</p>
          </div>

          <div className="grid gap-3">
            {FORMATIONS.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFormation(f.id)}
                className="w-full text-left bg-white rounded-xl border border-slate-200 p-5 hover:border-primary/50 hover:shadow-md transition-all flex items-center justify-between group"
              >
                <div>
                  <h2 className="font-semibold text-slate-800 group-hover:text-primary transition-colors">
                    {f.label}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {MODULES_DATA.filter((m) => m.formations.includes(f.id)).length} modules
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard for selected formation
  const formation = FORMATIONS.find((f) => f.id === selectedFormation)!;
  const modules = MODULES_DATA.filter((m) => m.formations.includes(selectedFormation));
  const globalProgress = 7;
  const lowModules = modules.filter((_, i) => i === 0 || i === 2).slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top navbar */}
      <nav className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <span
              className="font-semibold text-sm cursor-pointer hover:text-primary transition-colors"
              onClick={() => setSelectedFormation(null)}
            >
              Accueil
            </span>
            <span className="text-sm cursor-pointer hover:text-primary transition-colors">
              Examens
            </span>
            <span className="text-sm cursor-pointer hover:text-primary transition-colors">
              Notes
            </span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="text-xs"
            onClick={() => setSelectedFormation(null)}
          >
            <LogOut className="w-3.5 h-3.5 mr-1" />
            Changer de formation
          </Button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{formation.label}</h1>
          <p className="text-slate-500 text-lg">Apprenant</p>
        </div>

        {/* Dashboard cards */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Bienvenue sur votre tableau de bord</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border rounded-xl p-6 flex flex-col items-center justify-center">
              <h3 className="font-bold text-slate-700 mb-2">Progression générale</h3>
              <span className="text-4xl font-bold text-slate-900">{globalProgress}%</span>
              <Progress value={globalProgress} className="mt-3 w-3/4 h-2" />
            </div>
            <div className="border rounded-xl p-6">
              <h3 className="font-bold text-slate-700 mb-3 text-center">À revoir</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {lowModules.map((mod) => (
                  <div key={mod.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700">{mod.nom}</span>
                      <span className="text-xs font-semibold text-red-500">0%</span>
                    </div>
                    <Button variant="secondary" size="sm" className="text-xs" onClick={() => setSelectedModule(mod)}>
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Refaire
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Encouragement */}
        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-xl p-4 mb-6">
          <p className="text-sm text-slate-700">
            <Target className="w-4 h-4 inline mr-1 text-primary" />
            Continue comme ça ! Pense à réviser les modules où ta progression est inférieure à 50%.
          </p>
        </div>

        {/* Modules table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-2 px-6 py-3 bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <div className="col-span-2">Nom</div>
            <div className="col-span-4">Description</div>
            <div className="col-span-1 text-center">Taux de réussite</div>
            <div className="col-span-2 text-center">Progression</div>
            <div className="col-span-1 text-center">Statut</div>
            <div className="col-span-2 text-center">Actions</div>
          </div>

          {modules.map((mod) => (
            <div
              key={mod.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 px-6 py-4 border-b last:border-b-0 hover:bg-slate-50/50 transition-colors items-center"
            >
              <div className="md:col-span-2 font-semibold text-slate-800 text-sm">{mod.nom}</div>
              <div className="md:col-span-4 text-sm text-slate-500 line-clamp-2">{mod.description}</div>
              <div className="md:col-span-1 text-center">
                <span className="text-sm text-slate-600">0%</span>
              </div>
              <div className="md:col-span-2 text-center">
                <span className="text-sm text-slate-600">0%</span>
              </div>
              <div className="md:col-span-1 text-center">
                <span className="text-sm font-semibold text-emerald-500">Actif</span>
              </div>
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
