import { CheckCircle2, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import logoFtransport from "@/assets/logo-ftransport.png";

export default function OnboardingFCFinish() {
  const prenom = localStorage.getItem('onboarding_prenom') || '';
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-xl w-full text-center">
          <img src={logoFtransport} alt="FTRANSPORT" className="h-14 mx-auto mb-8" />
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-400" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold mb-4">
            Merci {prenom} !
          </h1>
          <p className="text-white/70 text-lg mb-8">
            Votre inscription à la <strong className="text-white">Formation Continue</strong> est enregistrée.
            Aucune démarche supplémentaire n'est requise de votre part pour le moment.
          </p>
          <p className="text-white/60 text-sm mb-8">
            Vous recevrez par email vos identifiants et la convocation à votre session de formation.
          </p>
          <Link
            to="/bienvenue/etape-1"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium px-5 py-3 rounded-xl transition-colors"
          >
            Revenir à mes informations
          </Link>
        </div>
      </div>
      <footer className="border-t border-white/10 py-6 text-center text-white/50 text-sm">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Phone className="w-4 h-4" /> 04.28.29.60.91
        </div>
        FTRANSPORT — 86 Route de Genas, 69003 Lyon
      </footer>
    </div>
  );
}
