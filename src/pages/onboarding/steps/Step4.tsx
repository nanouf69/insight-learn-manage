import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, Info } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import step4Taxi from "@/assets/onboarding/step4-taxi.png";

export default function Step4() {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <OnboardingLayout currentStep={4} totalSteps={11} title="Type d'épreuve">
      <div className="space-y-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 lg:p-8">
          <div className="mb-6">
            <img 
              src={step4Taxi} 
              alt="Type d'épreuve" 
              className="w-full rounded-xl border border-gray-200"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Choisissez votre type d'épreuve</h3>
            
            <div className="grid gap-4">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-blue-600">Examen Complet - VTC</h4>
                  <span className="text-green-600 font-semibold">241 €</span>
                </div>
                <p className="text-sm text-gray-600">Épreuves écrites (7 sujets) et pratique</p>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-blue-600">Mobilité Professionnelle</h4>
                  <span className="text-green-600 font-semibold">168 €</span>
                </div>
                <p className="text-sm text-gray-600">Épreuves écrites (2 sujets) et pratique - Pour ceux déjà taxi ou VMDTR</p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="mb-2">
                  <strong className="text-gray-900">Pour VTC :</strong> Cliquez sur "Examen Complet" sauf si vous êtes déjà chauffeur TAXI (cliquez sur "Mobilité Professionnelle").
                </p>
                <p>
                  <strong className="text-gray-900">Pour TAXI :</strong> Cliquez sur "Examen Complet TAXI" sauf si vous êtes déjà chauffeur VTC (cliquez sur "Mobilité Professionnelle").
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                <strong>Note TAXI :</strong> En tant que futur chauffeur TAXI, vous ne pourrez conduire que dans le département du Rhône. 
                Pour travailler dans un autre département, il faudra effectuer une formation de mobilité de 14h.
              </p>
            </div>
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
              <strong className="text-gray-900">Je confirme</strong> avoir sélectionné mon type d'épreuve (Examen Complet ou Mobilité Professionnelle)
            </span>
          </label>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Link
            to="/bienvenue/etape-3"
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </Link>
          {confirmed ? (
            <Link
              to="/bienvenue/etape-5"
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