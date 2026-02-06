import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Check, ChevronRight, Home } from "lucide-react";
import logoFtransport from "@/assets/logo-ftransport.png";

interface OnboardingLayoutProps {
  children: ReactNode;
  currentStep: number;
  totalSteps: number;
  title: string;
}

const steps = [
  { number: 1, title: "Documents requis", path: "/bienvenue/etape-1" },
  { number: 2, title: "Inscription CMA", path: "/bienvenue/etape-2" },
  { number: 3, title: "Choix département", path: "/bienvenue/etape-3" },
  { number: 4, title: "Type d'épreuve", path: "/bienvenue/etape-4" },
  { number: 5, title: "Date d'examen", path: "/bienvenue/etape-5" },
  { number: 6, title: "Formulaire", path: "/bienvenue/etape-6" },
  { number: 7, title: "Mot de passe", path: "/bienvenue/etape-7" },
  { number: 8, title: "Validation email", path: "/bienvenue/etape-8" },
  { number: 9, title: "Activer compte", path: "/bienvenue/etape-9" },
  { number: 10, title: "Documents CMA", path: "/bienvenue/etape-10" },
  { number: 11, title: "Numéro dossier", path: "/bienvenue/etape-11" },
];

export function OnboardingLayout({ children, currentStep, totalSteps, title }: OnboardingLayoutProps) {
  const location = useLocation();
  const progressPercent = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/bienvenue" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src={logoFtransport} alt="FTRANSPORT" className="h-10 w-auto" />
          </Link>
          
          {/* Progress bar */}
          <div className="hidden md:flex items-center gap-4 flex-1 max-w-2xl mx-8">
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-sm text-white/60 whitespace-nowrap">
              Étape {currentStep}/{totalSteps}
            </span>
          </div>

          <Link 
            to="/bienvenue" 
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Accueil</span>
          </Link>
        </div>
      </header>

      <div className="flex pt-20">
        {/* Sidebar with steps */}
        <aside className="hidden lg:block w-80 fixed left-0 top-20 bottom-0 bg-black border-r border-white/10 overflow-y-auto">
          <nav className="p-6">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">
              Progression
            </h2>
            <ul className="space-y-1">
              {steps.map((step) => {
                const isComplete = step.number < currentStep;
                const isCurrent = step.number === currentStep;
                const isFuture = step.number > currentStep;
                
                return (
                  <li key={step.number}>
                    <Link
                      to={step.path}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                        ${isCurrent ? 'bg-blue-500/20 border border-blue-500/50 text-white' : ''}
                        ${isComplete ? 'text-white/80 hover:bg-white/5' : ''}
                        ${isFuture ? 'text-white/30 cursor-not-allowed' : ''}
                      `}
                      onClick={(e) => isFuture && e.preventDefault()}
                    >
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                        ${isComplete ? 'bg-green-500 text-white' : ''}
                        ${isCurrent ? 'bg-blue-500 text-white' : ''}
                        ${isFuture ? 'bg-white/10 text-white/30' : ''}
                      `}>
                        {isComplete ? <Check className="w-4 h-4" /> : step.number}
                      </div>
                      <span className="flex-1 text-sm">{step.title}</span>
                      {isCurrent && <ChevronRight className="w-4 h-4 text-blue-400" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-80">
          {/* Mobile progress indicator */}
          <div className="lg:hidden px-4 py-3 bg-white/5 border-b border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/60">Étape {currentStep} sur {totalSteps}</span>
              <span className="text-sm font-medium text-blue-400">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-4 py-8 lg:py-12">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-xl font-bold">
                  {currentStep}
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold">{title}</h1>
                  <p className="text-white/60 text-sm">Étape {currentStep} sur {totalSteps}</p>
                </div>
              </div>
            </div>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
