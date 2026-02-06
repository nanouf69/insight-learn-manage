import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, AlertTriangle, Key } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import step7Password from "@/assets/onboarding/step7-password.png";

export default function Step7() {
  return (
    <OnboardingLayout currentStep={7} totalSteps={11} title="Créez votre mot de passe">
      <div className="space-y-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:p-8">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-200">
              <strong>Important :</strong> Communiquez-nous le mot de passe que vous avez choisi.
            </p>
          </div>

          <div className="mb-6">
            <img 
              src={step7Password} 
              alt="Création mot de passe" 
              className="w-full rounded-xl border border-white/10"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
              <Key className="w-5 h-5 text-blue-400" />
              <div>
                <p className="font-medium">Téléphone</p>
                <p className="text-sm text-white/60">Numéro de téléphone valide</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
              <Key className="w-5 h-5 text-blue-400" />
              <div>
                <p className="font-medium">Mot de passe</p>
                <p className="text-sm text-white/60">Créez un mot de passe sécurisé</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
              <Key className="w-5 h-5 text-blue-400" />
              <div>
                <p className="font-medium">Confirmer le mot de passe</p>
                <p className="text-sm text-white/60">Retapez le même mot de passe</p>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <p className="text-sm text-white/80">
              <strong className="text-white">Ensuite :</strong> Cochez les cases et cliquez sur "S'inscrire". 
              Si vous êtes en situation de handicap, cochez la case correspondante.
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Link
            to="/bienvenue/etape-6"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </Link>
          <Link
            to="/bienvenue/etape-8"
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
