import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, ExternalLink, AlertCircle } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import step2Cma from "@/assets/onboarding/step2-cma.png";
import step2Cards from "@/assets/onboarding/step2-cma-cards.png";

export default function Step2() {
  return (
    <OnboardingLayout currentStep={2} totalSteps={11} title="Inscription sur la plateforme CMA">
      <div className="space-y-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:p-8">
          <p className="text-white/70 mb-6">
            Vous devez vous inscrire sur la plateforme <strong className="text-white">www.exament3p.fr</strong> et mettre les documents demandés.
          </p>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-yellow-200 text-sm">
              <strong>Important :</strong> Ne payez pas les frais d'examen sauf si vous avez choisi la formule sans frais d'examen.
            </p>
          </div>

          <a 
            href="https://www.exament3p.fr" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-3 rounded-xl transition-colors mb-8"
          >
            Accéder à exament3p.fr
            <ExternalLink className="w-4 h-4" />
          </a>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Chambres des Métiers et d'Artisanat</h3>
              <img 
                src={step2Cma} 
                alt="Site CMA" 
                className="w-full rounded-xl border border-white/10"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Choisissez votre type d'examen</h3>
              <img 
                src={step2Cards} 
                alt="Types d'examens" 
                className="w-full rounded-xl border border-white/10"
              />
              <div className="mt-4 grid md:grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <h4 className="font-medium text-blue-400 mb-2">Examen Taxi</h4>
                  <p className="text-sm text-white/60">Attestation pour exercer comme chauffeur de taxi dans votre département</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <h4 className="font-medium text-blue-400 mb-2">Examen VTC</h4>
                  <p className="text-sm text-white/60">Attestation pour exercer comme chauffeur de Véhicule de Transport avec Chauffeur</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <h4 className="font-medium text-blue-400 mb-2">Examen VMDTR</h4>
                  <p className="text-sm text-white/60">Attestation pour exercer comme chauffeur de Véhicule Motorisé à Deux/Trois Roues</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Link
            to="/bienvenue/etape-1"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </Link>
          <Link
            to="/bienvenue/etape-3"
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
