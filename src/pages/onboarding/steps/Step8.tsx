import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import step8Email from "@/assets/onboarding/step8-email.jpg";
import step8Modal from "@/assets/onboarding/step8-modal.png";

export default function Step8() {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <OnboardingLayout currentStep={8} totalSteps={11} title="Validation de votre email">
      <div className="space-y-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 lg:p-8">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-700 font-medium">Compte créé avec succès !</p>
              <p className="text-green-600 text-sm mt-1">
                Un email de confirmation vient d'être envoyé à votre adresse email.
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Message de confirmation</h3>
            <img 
              src={step8Modal} 
              alt="Modal de confirmation" 
              className="max-w-md mx-auto rounded-xl border border-gray-200"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-blue-700 text-sm">
              Veuillez cliquer sur le lien contenu dans l'email pour activer votre compte. 
              <strong className="text-gray-900"> N'oubliez pas de vérifier votre dossier spam.</strong>
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vérifiez vos emails</h3>
            <img 
              src={step8Email} 
              alt="Email CMA France" 
              className="max-w-md mx-auto rounded-xl border border-gray-200 blur-sm hover:blur-none transition-all duration-300"
            />
            <p className="text-xs text-gray-400 text-center mt-2 italic">Image floutée pour protéger les données personnelles</p>
            <p className="mt-4 text-gray-600 text-sm">
              Retournez sur votre boîte mail et cliquez sur le mail "CMA France - Vérification du compte".
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
              <strong className="text-gray-900">Je confirme</strong> avoir reçu l'email de confirmation de la CMA
            </span>
          </label>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Link
            to="/bienvenue/etape-7"
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </Link>
          {confirmed ? (
            <Link
              to="/bienvenue/etape-9"
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