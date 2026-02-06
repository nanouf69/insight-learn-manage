import { Link } from "react-router-dom";
import { ArrowRight, FileText, CheckCircle, AlertTriangle, Phone } from "lucide-react";
import logoFtransport from "@/assets/logo-ftransport.png";

export default function OnboardingWelcome() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-black to-black" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-5xl mx-auto px-4 py-16 lg:py-24">
          <div className="text-center mb-12">
            <img 
              src={logoFtransport} 
              alt="FTRANSPORT" 
              className="h-16 mx-auto mb-8"
            />
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              Bienvenue chez{" "}
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                FTRANSPORT
              </span>
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto mb-8">
              Vous êtes inscrit(e) pour la formation <strong className="text-white">TAXI / VTC</strong>.
              Suivez les étapes ci-dessous pour compléter votre inscription.
            </p>
          </div>

          {/* Prérequis */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:p-8 mb-12">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              Rappel : pour accéder à la formation, vous devez
            </h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Savoir lire et écrire le français</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Avoir un permis de conduire de plus de 3 ans (ou 2 ans si conduite accompagnée) en cours de validité</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Avoir le casier judiciaire B2 vierge</span>
              </li>
            </ul>
            <p className="mt-6 text-white/60 text-sm">
              Si une de ces conditions n'est pas respectée, merci de nous contacter.
            </p>
          </div>

          {/* Info carte pro */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 lg:p-8 mb-12">
            <div className="flex items-start gap-4">
              <FileText className="w-8 h-8 text-blue-400 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Obtenir votre carte professionnelle</h3>
                <p className="text-white/70">
                  Pour obtenir la carte professionnelle de chauffeur TAXI ou VTC, vous devez réussir deux épreuves : 
                  un <strong className="text-white">examen d'admissibilité</strong> (théorique) et un <strong className="text-white">examen d'admission</strong> (pratique).
                </p>
              </div>
            </div>
          </div>

          {/* Steps overview */}
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-6 text-center">Les 11 étapes de votre inscription</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                "Documents requis",
                "Inscription CMA",
                "Département",
                "Type d'épreuve",
                "Date d'examen",
                "Formulaire",
                "Mot de passe",
                "Validation email",
                "Activer compte",
                "Documents CMA",
                "Numéro dossier",
              ].map((step, index) => (
                <div 
                  key={index}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 text-center hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold mx-auto mb-2">
                    {index + 1}
                  </div>
                  <span className="text-xs text-white/70">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link
              to="/bienvenue/etape-1"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            >
              Commencer l'inscription
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 text-white/60 mb-4">
            <Phone className="w-4 h-4" />
            <span>04.28.29.60.91</span>
          </div>
          <p className="text-white/40 text-sm">
            FTRANSPORT - Centre de formation<br />
            86 Route de Genas, 69003 Lyon<br />
            De 9h à 17h sur rendez-vous
          </p>
        </div>
      </footer>
    </div>
  );
}
