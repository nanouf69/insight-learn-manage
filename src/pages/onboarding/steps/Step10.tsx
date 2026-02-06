import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, Upload, FileText } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import step10Docs from "@/assets/onboarding/step10-docs.png";
import step10Mydocs from "@/assets/onboarding/step10-mydocs.png";

export default function Step10() {
  return (
    <OnboardingLayout currentStep={10} totalSteps={11} title="Insérez vos documents">
      <div className="space-y-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:p-8">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Upload className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-blue-200">
              Téléchargez vos documents sur la plateforme CMA.
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Interface de la plateforme</h3>
            <img 
              src={step10Docs} 
              alt="Interface CMA" 
              className="w-full rounded-xl border border-white/10"
            />
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Section "Mes documents"</h3>
            <img 
              src={step10Mydocs} 
              alt="Mes documents" 
              className="w-full rounded-xl border border-white/10"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Documents à télécharger</h3>
            
            <div className="grid gap-4">
              {[
                {
                  title: "Pièce d'identité",
                  description: "Carte d'identité, passeport ou titre de séjour",
                },
                {
                  title: "Permis de conduire",
                  description: "Recto et verso, en cours de validité",
                },
                {
                  title: "Justificatif de domicile",
                  description: "De moins de 3 mois",
                },
              ].map((doc, index) => (
                <div key={index} className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-xl p-4">
                  <FileText className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-sm text-white/60">{doc.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Link
            to="/bienvenue/etape-9"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </Link>
          <Link
            to="/bienvenue/etape-11"
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
