import { Link } from "react-router-dom";
import { ArrowRight, FileText, CreditCard, MapPin } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";

export default function Step1() {
  const documents = [
    {
      icon: CreditCard,
      title: "Pièce d'identité",
      description: "Carte d'identité ou passeport en cours de validité",
    },
    {
      icon: FileText,
      title: "Permis de conduire",
      description: "Hors période probatoire",
    },
    {
      icon: MapPin,
      title: "Justificatif de domicile",
      description: "De moins de 3 mois (facture EDF, eau, téléphone...)",
    },
  ];

  return (
    <OnboardingLayout currentStep={1} totalSteps={11} title="Documents requis pour l'inscription">
      <div className="space-y-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:p-8">
          <p className="text-white/70 mb-6">
            Pour votre inscription à la formation, vous devez nous fournir les 3 documents suivants :
          </p>

          <div className="grid gap-4">
            {documents.map((doc, index) => (
              <div 
                key={index}
                className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-xl p-4 lg:p-6"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <doc.icon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{doc.title}</h3>
                  <p className="text-white/60 text-sm">{doc.description}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    Requis
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
          <p className="text-white/80">
            <strong className="text-white">Important :</strong> Ces documents seront vérifiés lors de votre inscription. 
            Assurez-vous qu'ils sont lisibles et en cours de validité.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-end pt-4">
          <Link
            to="/bienvenue/etape-2"
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
