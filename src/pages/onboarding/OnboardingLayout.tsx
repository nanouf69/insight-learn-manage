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
  { number: 11, title: "Dossier & examen", path: "/bienvenue/etape-11" },
  { number: 12, title: "Confirmation", path: "/bienvenue/etape-12" },
];

export function OnboardingLayout({ children, currentStep, totalSteps, title }: OnboardingLayoutProps) {
  const location = useLocation();
  const progressPercent = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Progress bar at the very top */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1.5 bg-gray-200">
        <div 
          className="bg-blue-500 h-1.5 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Header */}
      <header className="fixed top-[6px] left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <Link to="/bienvenue" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
            <img src={logoFtransport} alt="FTRANSPORT" className="h-8 sm:h-10 w-auto" />
          </Link>
          
          {/* Step counter - simplified on mobile */}
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm text-gray-500">
              {currentStep}/{totalSteps}
            </span>
            <Link 
              to="/bienvenue" 
              className="flex items-center gap-1 sm:gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Accueil</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex pt-[62px] sm:pt-[70px]">
        {/* Sidebar with steps - desktop only */}
        <aside className="hidden lg:block w-80 fixed left-0 top-[70px] bottom-0 bg-gray-50 border-r border-gray-200 overflow-y-auto">
          <nav className="p-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
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
                        ${isCurrent ? 'bg-blue-50 border border-blue-200 text-blue-700' : ''}
                        ${isComplete ? 'text-gray-700 hover:bg-gray-100' : ''}
                        ${isFuture ? 'text-gray-300 cursor-not-allowed' : ''}
                      `}
                      onClick={(e) => isFuture && e.preventDefault()}
                    >
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                        ${isComplete ? 'bg-green-500 text-white' : ''}
                        ${isCurrent ? 'bg-blue-500 text-white' : ''}
                        ${isFuture ? 'bg-gray-200 text-gray-400' : ''}
                      `}>
                        {isComplete ? <Check className="w-4 h-4" /> : step.number}
                      </div>
                      <span className="flex-1 text-sm">{step.title}</span>
                      {isCurrent && <ChevronRight className="w-4 h-4 text-blue-500" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-80">
          {/* Mobile step title */}
          <div className="lg:hidden px-4 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                {currentStep}
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
                <p className="text-gray-500 text-xs">Étape {currentStep} sur {totalSteps}</p>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-4 py-6 lg:py-12">
            {/* Desktop title */}
            <div className="hidden lg:block mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-xl font-bold text-white">
                  {currentStep}
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{title}</h1>
                  <p className="text-gray-500 text-sm">Étape {currentStep} sur {totalSteps}</p>
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
