import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, Info } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import step4Taxi from "@/assets/onboarding/step4-taxi.png";

export default function Step4() {
  return (
    <OnboardingLayout currentStep={4} totalSteps={11} title="Type d'épreuve">
      <div className="space-y-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:p-8">
          <div className="mb-6">
            <img 
              src={step4Taxi} 
              alt="Type d'épreuve" 
              className="w-full rounded-xl border border-white/10"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Choisissez votre type d'épreuve</h3>
            
            <div className="grid gap-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-blue-400">Examen Complet - VTC</h4>
                  <span className="text-green-400 font-semibold">241 €</span>
                </div>
                <p className="text-sm text-white/60">Épreuves écrites (7 sujets) et pratique</p>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-blue-400">Mobilité Professionnelle</h4>
                  <span className="text-green-400 font-semibold">168 €</span>
                </div>
                <p className="text-sm text-white/60">Épreuves écrites (2 sujets) et pratique - Pour ceux déjà taxi ou VMDTR</p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-white/80">
                <p className="mb-2">
                  <strong className="text-white">Pour VTC :</strong> Cliquez sur "Examen Complet" sauf si vous êtes déjà chauffeur TAXI (cliquez sur "Mobilité Professionnelle").
                </p>
                <p>
                  <strong className="text-white">Pour TAXI :</strong> Cliquez sur "Examen Complet TAXI" sauf si vous êtes déjà chauffeur VTC (cliquez sur "Mobilité Professionnelle").
                </p>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-200">
                <strong>Note TAXI :</strong> En tant que futur chauffeur TAXI, vous ne pourrez conduire que dans le département du Rhône. 
                Pour travailler dans un autre département, il faudra effectuer une formation de mobilité de 14h.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Link
            to="/bienvenue/etape-3"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </Link>
          <Link
            to="/bienvenue/etape-5"
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
