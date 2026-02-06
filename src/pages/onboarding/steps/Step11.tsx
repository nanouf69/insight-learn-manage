import { Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Phone, CheckCircle, FileText, Clock } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import step11Dossier from "@/assets/onboarding/step11-dossier.png";

export default function Step11() {
  return (
    <OnboardingLayout currentStep={11} totalSteps={11} title="Communiquez-nous le numéro de dossier">
      <div className="space-y-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:p-8">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-200">
              <strong>Dernière étape !</strong> Communiquez-nous votre numéro de dossier CMA.
            </p>
          </div>

          <div className="mb-6">
            <img 
              src={step11Dossier} 
              alt="Numéro de dossier" 
              className="w-full rounded-xl border border-white/10"
            />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center mb-6">
            <FileText className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Numéro de dossier</h3>
            <p className="text-white/60 text-sm">
              Exemple : <span className="text-white font-mono">00043920</span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-200 text-sm">
                <strong>ATTENTION :</strong> Ne payez pas les frais d'examen si dans votre formule CPF il est écrit "avec frais d'examen".
              </p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-yellow-200 text-sm">
                <p className="mb-2">
                  <strong>Les examens sont organisés par la Chambre des Métiers et de l'Artisanat.</strong> 
                  Il peut y avoir des changements ou des annulations.
                </p>
                <p>
                  Pour toutes questions concernant les examens ou les inscriptions, contactez-les au : 
                  <strong className="text-white"> 04.72.43.43.00</strong>
                </p>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-blue-200 text-sm">
                <strong>En cas de réussite à l'épreuve d'admissibilité :</strong> Merci de nous contacter dans les 48h après la réception des résultats 
                pour garantir un véhicule pour le passage à l'épreuve pratique.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-white/60 flex-shrink-0 mt-0.5" />
              <p className="text-white/70 text-sm">
                Si dans les 2 mois qui suivent ce mail nous n'avons pas reçu les documents demandés, 
                le centre se réserve le droit de ne plus payer les frais d'examens si vous y aviez droit.
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-2xl p-6 lg:p-8 text-center">
          <h3 className="text-2xl font-bold mb-4">Nous reprendrons contact très prochainement</h3>
          <p className="text-white/70 mb-6">Cordialement, l'équipe FTRANSPORT</p>
          
          <div className="flex items-center justify-center gap-3 text-xl">
            <Phone className="w-6 h-6 text-blue-400" />
            <a href="tel:0428296091" className="font-semibold hover:text-blue-400 transition-colors">
              04.28.29.60.91
            </a>
          </div>
          <p className="text-white/60 text-sm mt-2">
            86 Route de Genas, 69003 Lyon • De 9h à 17h sur rendez-vous
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Link
            to="/bienvenue/etape-10"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </Link>
          <Link
            to="/bienvenue"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Terminé
          </Link>
        </div>
      </div>
    </OnboardingLayout>
  );
}
