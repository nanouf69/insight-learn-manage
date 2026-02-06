import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import step8Email from "@/assets/onboarding/step8-email.jpg";
import step8Modal from "@/assets/onboarding/step8-modal.png";

export default function Step8() {
  return (
    <OnboardingLayout currentStep={8} totalSteps={11} title="Validation de votre email">
      <div className="space-y-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:p-8">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-200 font-medium">Compte créé avec succès !</p>
              <p className="text-green-200/70 text-sm mt-1">
                Un email de confirmation vient d'être envoyé à votre adresse email.
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Message de confirmation</h3>
            <img 
              src={step8Modal} 
              alt="Modal de confirmation" 
              className="w-full rounded-xl border border-white/10"
            />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-blue-200 text-sm">
              Veuillez cliquer sur le lien contenu dans l'email pour activer votre compte. 
              <strong className="text-white"> N'oubliez pas de vérifier votre dossier spam.</strong>
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Vérifiez vos emails</h3>
            <img 
              src={step8Email} 
              alt="Email CMA France" 
              className="w-full rounded-xl border border-white/10"
            />
            <p className="mt-4 text-white/60 text-sm">
              Retournez sur votre boîte mail et cliquez sur le mail "CMA France - Vérification du compte".
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Link
            to="/bienvenue/etape-7"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </Link>
          <Link
            to="/bienvenue/etape-9"
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
