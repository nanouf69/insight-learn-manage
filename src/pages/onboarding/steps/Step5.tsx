import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, AlertTriangle, Calendar } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import step5Date from "@/assets/onboarding/step5-date.png";

export default function Step5() {
  return (
    <OnboardingLayout currentStep={5} totalSteps={11} title="Choisissez la date d'examen">
      <div className="space-y-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 lg:p-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700">
              <strong>ATTENTION :</strong> Vous ne pouvez choisir que la date d'examen la plus proche pour que votre inscription soit prise en compte par le Compte Personnel de Formation (CPF).
            </p>
          </div>

          <div className="mb-6">
            <img 
              src={step5Date} 
              alt="Choix date examen" 
              className="w-full rounded-xl border border-gray-200"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Session affectée</h4>
                <p className="text-gray-700 text-sm">
                  Nous vous avons affecté à la prochaine session écrite disponible afin de respecter les délais en vigueur. 
                  Vous pouvez la conserver ou choisir une autre date.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-500 text-sm mb-1">Épreuves</p>
                <p className="font-medium text-gray-900">Théorique + Pratique</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-sm mb-1">Tarif</p>
                <p className="font-semibold text-green-600">241 €</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Link
            to="/bienvenue/etape-4"
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </Link>
          <Link
            to="/bienvenue/etape-6"
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
