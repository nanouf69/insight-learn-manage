import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, MousePointer } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import step9Validate from "@/assets/onboarding/step9-validate.png";

export default function Step9() {
  return (
    <OnboardingLayout currentStep={9} totalSteps={11} title="Activez votre compte">
      <div className="space-y-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:p-8">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
            <MousePointer className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-blue-200">
              Cliquez sur <strong className="text-white">"Valider mon compte"</strong> dans l'email que vous avez reçu.
            </p>
          </div>

          <div className="mb-6">
            <img 
              src={step9Validate} 
              alt="Valider mon compte" 
              className="w-full rounded-xl border border-white/10"
            />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
            <p className="text-white/70 mb-4">Contenu de l'email :</p>
            <div className="bg-white/5 rounded-lg p-4 text-left">
              <p className="text-sm text-white/80">
                Merci de cliquer sur le lien ci-dessous pour activer votre compte et continuer l'inscription à votre examen.
              </p>
              <div className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
                Valider mon compte
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Link
            to="/bienvenue/etape-8"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </Link>
          <Link
            to="/bienvenue/etape-10"
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
