import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, Upload, FileText } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import step10Docs from "@/assets/onboarding/step10-docs.png";
import step10Mydocs from "@/assets/onboarding/step10-mydocs.png";

export default function Step10() {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <OnboardingLayout currentStep={10} totalSteps={11} title="Insérez vos documents">
      <div className="space-y-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 lg:p-8">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Upload className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-blue-700">
              Téléchargez vos documents sur la plateforme CMA.
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Interface de la plateforme</h3>
            <img 
              src={step10Docs} 
              alt="Interface CMA" 
              className="max-w-lg mx-auto rounded-xl border border-gray-200"
            />
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Section "Mes documents"</h3>
            <img 
              src={step10Mydocs} 
              alt="Mes documents" 
              className="max-w-lg mx-auto rounded-xl border border-gray-200"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Documents à télécharger</h3>
            
            <div className="grid gap-4">
              {[
                {
                  title: "Pièce d'identité",
                  description: "Carte d'identité, passeport ou titre de séjour",
                },
                {
                  title: "Justificatif de domicile",
                  description: "De moins de 3 mois",
                },
              ].map((doc, index) => (
                <div key={index} className="flex items-start gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">{doc.title}</p>
                    <p className="text-sm text-gray-600">{doc.description}</p>
                  </div>
                </div>
              ))}
            </div>
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
              <strong className="text-gray-900">Je confirme</strong> avoir téléchargé mes documents sur la plateforme CMA
            </span>
          </label>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Link
            to="/bienvenue/etape-9"
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </Link>
          {confirmed ? (
            <Link
              to="/bienvenue/etape-11"
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