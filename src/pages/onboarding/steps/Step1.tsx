import { Link } from "react-router-dom";
import { ArrowRight, CreditCard, FileText, MapPin, Info } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";

export default function Step1() {
  const documents = [
    {
      icon: CreditCard,
      title: "Pièce d'identité",
      description: "Carte d'identité ou passeport en cours de validité",
      status: "Requis",
    },
    {
      icon: FileText,
      title: "Permis de conduire",
      description: "Hors période probatoire",
      status: "Requis",
    },
    {
      icon: MapPin,
      title: "Justificatif de domicile",
      description: "De moins de 3 mois (facture EDF, eau, téléphone...)",
      status: "Requis",
    },
  ];

  return (
    <OnboardingLayout currentStep={1} totalSteps={11} title="Documents requis pour l'inscription">
      <div className="space-y-8">
        {/* Info format */}
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <Info className="w-4 h-4" />
          <span>Formats acceptés : PDF, JPG, PNG, HEIC, WebP • Max 2Mo par fichier</span>
        </div>

        {/* Document cards */}
        <div className="space-y-4">
          {documents.map((doc, index) => (
            <div 
              key={index}
              className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-5"
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <doc.icon className="w-7 h-7 text-blue-400" />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg text-white">{doc.title}</h3>
                <p className="text-white/50 text-sm">{doc.description}</p>
              </div>
              
              {/* Status badge */}
              <span className="px-4 py-1.5 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-medium border border-yellow-500/30 flex-shrink-0">
                {doc.status}
              </span>
            </div>
          ))}
        </div>

        {/* Info box */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
          <p className="text-white/80">
            <strong className="text-white">Important :</strong> Ces documents seront vérifiés lors de votre inscription. 
            Assurez-vous qu'ils sont lisibles et en cours de validité. Vous devrez les télécharger sur la plateforme CMA à l'étape 10.
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
