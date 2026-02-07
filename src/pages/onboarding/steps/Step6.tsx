import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, Info } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import step6Form from "@/assets/onboarding/step6-form.png";

export default function Step6() {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <OnboardingLayout currentStep={6} totalSteps={11} title="Remplissez le formulaire">
      <div className="space-y-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 lg:p-8">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-blue-700">
              Cliquez sur <strong className="text-gray-900">"Créer un compte"</strong>. Si vous avez déjà réussi un examen, choisissez une autre adresse email.
            </p>
          </div>

          <div className="mb-6">
            <img 
              src={step6Form} 
              alt="Formulaire d'inscription" 
              className="w-full rounded-xl border border-gray-200"
            />
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations à renseigner</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { label: "Genre", info: "Homme / Femme / Indéterminé" },
              { label: "Prénom(s)", info: "Votre prénom complet" },
              { label: "Nom", info: "Votre nom de famille" },
              { label: "Date de naissance", info: "Format JJ/MM/AAAA" },
              { label: "Lieu de naissance", info: "Ville de naissance" },
              { label: "Pays de naissance", info: "France ou autre" },
            ].map((field, index) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="font-medium text-blue-600 mb-1">{field.label}</p>
                <p className="text-sm text-gray-600">{field.info}</p>
              </div>
            ))}
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
              <strong className="text-gray-900">Je confirme</strong> avoir rempli le formulaire avec mes informations personnelles
            </span>
          </label>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Link
            to="/bienvenue/etape-5"
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </Link>
          {confirmed ? (
            <Link
              to="/bienvenue/etape-7"
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