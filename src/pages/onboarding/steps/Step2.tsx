import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, ExternalLink, AlertCircle, CheckSquare } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import step2Cma from "@/assets/onboarding/step2-cma.png";
import step2Cards from "@/assets/onboarding/step2-cma-cards.png";

export default function Step2() {
  const [confirmed, setConfirmed] = useState(() => localStorage.getItem('onboarding_step2_confirmed') === 'true');

  const handleConfirm = (val: boolean) => {
    setConfirmed(val);
    localStorage.setItem('onboarding_step2_confirmed', String(val));
  };

  return (
    <OnboardingLayout currentStep={2} totalSteps={11} title="Inscription sur la plateforme CMA">
      <div className="space-y-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 lg:p-8">
          <p className="text-gray-700 mb-6">
            Vous devez vous inscrire sur la plateforme <strong className="text-gray-900">www.exament3p.fr</strong> et mettre les documents demandés.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-amber-700 text-sm">
              <strong>Important :</strong> Ne payez pas les frais d'examen sauf si vous avez choisi la formule sans frais d'examen.
            </p>
          </div>

          <a 
            href="https://www.exament3p.fr" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-xl transition-colors mb-8"
          >
            Accéder à exament3p.fr
            <ExternalLink className="w-4 h-4" />
          </a>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Chambres des Métiers et d'Artisanat</h3>
              <img 
                src={step2Cma} 
                alt="Site CMA" 
                className="max-w-lg mx-auto rounded-xl border border-gray-200"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Choisissez votre type d'examen</h3>
              <img 
                src={step2Cards} 
                alt="Types d'examens" 
                className="max-w-lg mx-auto rounded-xl border border-gray-200"
              />
              <div className="mt-4 grid md:grid-cols-3 gap-4">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <h4 className="font-medium text-blue-600 mb-2">Examen Taxi</h4>
                  <p className="text-sm text-gray-600">Attestation pour exercer comme chauffeur de taxi dans votre département</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <h4 className="font-medium text-blue-600 mb-2">Examen VTC</h4>
                  <p className="text-sm text-gray-600">Attestation pour exercer comme chauffeur de Véhicule de Transport avec Chauffeur</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <h4 className="font-medium text-blue-600 mb-2">Examen VMDTR</h4>
                  <p className="text-sm text-gray-600">Attestation pour exercer comme chauffeur de Véhicule Motorisé à Deux/Trois Roues</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation checkbox */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => handleConfirm(e.target.checked)}
              className="w-5 h-5 mt-0.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-gray-700">
              <strong className="text-gray-900">Je confirme</strong> avoir accédé à la plateforme exament3p.fr et choisi mon type d'examen
            </span>
          </label>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Link
            to="/bienvenue/etape-1"
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </Link>
          {confirmed ? (
            <Link
              to="/bienvenue/etape-3"
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