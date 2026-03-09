import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, AlertTriangle } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import step3Departement from "@/assets/onboarding/step3-departement.png";

export default function Step3() {
  const [confirmed, setConfirmed] = useState(() => localStorage.getItem('onboarding_step3_confirmed') === 'true');

  const handleConfirm = (val: boolean) => {
    setConfirmed(val);
    localStorage.setItem('onboarding_step3_confirmed', String(val));
  };

  return (
    <OnboardingLayout currentStep={3} totalSteps={11} title="Choix du département d'exercice">
      <div className="space-y-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 lg:p-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">
              <strong>ATTENTION :</strong> Choisissez toujours le département <strong className="text-gray-900">69 - Rhône</strong>, même si vous habitez dans un autre département.
            </p>
          </div>

          <div className="mb-6">
            <img 
              src={step3Departement} 
              alt="Choix département" 
              className="max-w-lg mx-auto rounded-xl border border-gray-200"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-3">Important à savoir</h3>
            <p className="text-gray-700 text-sm">
              Le choix du département d'exercice correspond au département dans lequel vous serez convoqué(e) pour l'épreuve pratique (admission).
            </p>
          </div>
        </div>

        {/* Confirmation checkbox */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-5 h-5 mt-0.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-gray-700">
              <strong className="text-gray-900">Je confirme</strong> avoir sélectionné le département 69 - Rhône
            </span>
          </label>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Link
            to="/bienvenue/etape-2"
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </Link>
          {confirmed ? (
            <Link
              to="/bienvenue/etape-4"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-xl transition-colors"
            >
              Étape suivante
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              disabled
              className="inline-flex items-center gap-2 bg-gray-300 text-gray-500 font-medium px-6 py-3 rounded-xl cursor-not-allowed"
            >
              Étape suivante
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </OnboardingLayout>
  );
}