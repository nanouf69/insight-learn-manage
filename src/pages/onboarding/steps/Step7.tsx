import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, AlertTriangle, Key } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import step7Password from "@/assets/onboarding/step7-password.png";

export default function Step7() {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <OnboardingLayout currentStep={7} totalSteps={11} title="Créez votre mot de passe">
      <div className="space-y-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 lg:p-8">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-amber-700">
              <strong>Important :</strong> Communiquez-nous le mot de passe que vous avez choisi.
            </p>
          </div>

          <div className="mb-6">
            <img 
              src={step7Password} 
              alt="Création mot de passe" 
              className="w-full rounded-xl border border-gray-200"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
              <Key className="w-5 h-5 text-blue-500" />
              <div>
                <p className="font-medium text-gray-900">Téléphone</p>
                <p className="text-sm text-gray-600">Numéro de téléphone valide</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
              <Key className="w-5 h-5 text-blue-500" />
              <div>
                <p className="font-medium text-gray-900">Mot de passe</p>
                <p className="text-sm text-gray-600">Créez un mot de passe sécurisé</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
              <Key className="w-5 h-5 text-blue-500" />
              <div>
                <p className="font-medium text-gray-900">Confirmer le mot de passe</p>
                <p className="text-sm text-gray-600">Retapez le même mot de passe</p>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-gray-700">
              <strong className="text-gray-900">Ensuite :</strong> Cochez les cases et cliquez sur "S'inscrire". 
              Si vous êtes en situation de handicap, cochez la case correspondante.
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
              <strong className="text-gray-900">Je confirme</strong> avoir créé mon mot de passe et cliqué sur "S'inscrire"
            </span>
          </label>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Link
            to="/bienvenue/etape-6"
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </Link>
          {confirmed ? (
            <Link
              to="/bienvenue/etape-8"
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