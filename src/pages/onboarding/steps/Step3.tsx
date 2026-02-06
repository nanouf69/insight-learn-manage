import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, AlertTriangle } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import step3Departement from "@/assets/onboarding/step3-departement.png";

export default function Step3() {
  return (
    <OnboardingLayout currentStep={3} totalSteps={11} title="Choix du département d'exercice">
      <div className="space-y-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:p-8">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-200">
              <strong>ATTENTION :</strong> Choisissez toujours le département <strong className="text-white">69 - Rhône</strong>, même si vous habitez dans un autre département.
            </p>
          </div>

          <div className="mb-6">
            <img 
              src={step3Departement} 
              alt="Choix département" 
              className="w-full rounded-xl border border-white/10"
            />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
            <h3 className="font-semibold mb-3">Important à savoir</h3>
            <p className="text-white/70 text-sm">
              Le choix du département d'exercice correspond au département dans lequel vous serez convoqué(e) pour l'épreuve pratique (admission).
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Link
            to="/bienvenue/etape-2"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </Link>
          <Link
            to="/bienvenue/etape-4"
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            Étape suivante
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </OnboardingLayout>
  );
}
