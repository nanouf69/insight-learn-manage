import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, Info } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import step6Form from "@/assets/onboarding/step6-form.png";

export default function Step6() {
  return (
    <OnboardingLayout currentStep={6} totalSteps={11} title="Remplissez le formulaire">
      <div className="space-y-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:p-8">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-blue-200">
              Cliquez sur <strong className="text-white">"Créer un compte"</strong>. Si vous avez déjà réussi un examen, choisissez une autre adresse email.
            </p>
          </div>

          <div className="mb-6">
            <img 
              src={step6Form} 
              alt="Formulaire d'inscription" 
              className="w-full rounded-xl border border-white/10"
            />
          </div>

          <h3 className="text-lg font-semibold mb-4">Informations à renseigner</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { label: "Genre", info: "Homme / Femme / Indéterminé" },
              { label: "Prénom(s)", info: "Votre prénom complet" },
              { label: "Nom", info: "Votre nom de famille" },
              { label: "Date de naissance", info: "Format JJ/MM/AAAA" },
              { label: "Lieu de naissance", info: "Ville de naissance" },
              { label: "Pays de naissance", info: "France ou autre" },
            ].map((field, index) => (
              <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="font-medium text-blue-400 mb-1">{field.label}</p>
                <p className="text-sm text-white/60">{field.info}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Link
            to="/bienvenue/etape-5"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </Link>
          <Link
            to="/bienvenue/etape-7"
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
