import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, MousePointer } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import step9Validate from "@/assets/onboarding/step9-validate.png";

export default function Step9() {
  return (
    <OnboardingLayout currentStep={9} totalSteps={11} title="Activez votre compte">
      <div className="space-y-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 lg:p-8">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <MousePointer className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-blue-700">
              Cliquez sur <strong className="text-gray-900">"Valider mon compte"</strong> dans l'email que vous avez reçu.
            </p>
          </div>

          <div className="mb-6">
            <img 
              src={step9Validate} 
              alt="Valider mon compte" 
              className="w-full rounded-xl border border-gray-200"
            />
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
            <p className="text-gray-600 mb-4">Contenu de l'email :</p>
            <div className="bg-white rounded-lg p-4 text-left border border-gray-200">
              <p className="text-sm text-gray-700">
                Merci de cliquer sur le lien ci-dessous pour activer votre compte et continuer l'inscription à votre examen.
              </p>
              <div className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                Valider mon compte
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Link
            to="/bienvenue/etape-8"
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </Link>
          <Link
            to="/bienvenue/etape-10"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            Étape suivante
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </OnboardingLayout>
  );
}