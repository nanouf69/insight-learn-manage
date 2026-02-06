import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Phone, CheckCircle, FileText, Clock, Send } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import step11Dossier from "@/assets/onboarding/step11-dossier.png";
import { toast } from "sonner";

export default function Step11() {
  const [numeroDossier, setNumeroDossier] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!numeroDossier.trim()) {
      toast.error("Veuillez entrer votre numéro de dossier");
      return;
    }

    setIsSubmitting(true);
    
    // Simulate submission - in real app, save to database
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Store in localStorage for now
    localStorage.setItem('onboarding_numero_dossier', numeroDossier);
    
    setIsSubmitting(false);
    setIsSubmitted(true);
    toast.success("Numéro de dossier enregistré avec succès !");
  };

  return (
    <OnboardingLayout currentStep={11} totalSteps={11} title="Communiquez-nous le numéro de dossier">
      <div className="space-y-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 lg:p-8">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-green-700">
              <strong>Dernière étape !</strong> Communiquez-nous votre numéro de dossier CMA.
            </p>
          </div>

          <div className="mb-6">
            <img 
              src={step11Dossier} 
              alt="Numéro de dossier" 
              className="w-full rounded-xl border border-gray-200"
            />
          </div>

          {/* Champ de saisie du numéro de dossier */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">Entrez votre numéro de dossier</h3>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={numeroDossier}
                onChange={(e) => setNumeroDossier(e.target.value)}
                placeholder="Ex: 00043920"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitted}
              />
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || isSubmitted}
                className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                  isSubmitted 
                    ? "bg-green-500 text-white cursor-default" 
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                } disabled:opacity-50`}
              >
                {isSubmitted ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Envoyé
                  </>
                ) : isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Envoyer
                  </>
                )}
              </button>
            </div>
            
            <p className="text-gray-500 text-sm mt-3">
              Vous trouverez ce numéro dans le mail de confirmation de la CMA.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">
                <strong>ATTENTION :</strong> Ne payez pas les frais d'examen si dans votre formule CPF il est écrit "avec frais d'examen".
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-amber-700 text-sm">
                <p className="mb-2">
                  <strong>Les examens sont organisés par la Chambre des Métiers et de l'Artisanat.</strong> 
                  Il peut y avoir des changements ou des annulations.
                </p>
                <p>
                  Pour toutes questions concernant les examens ou les inscriptions, contactez-les au : 
                  <strong className="text-gray-900"> 04.72.43.43.00</strong>
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-blue-700 text-sm">
                <strong>En cas de réussite à l'épreuve d'admissibilité :</strong> Merci de nous contacter dans les 48h après la réception des résultats 
                pour garantir un véhicule pour le passage à l'épreuve pratique.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
              <p className="text-gray-600 text-sm">
                Si dans les 2 mois qui suivent ce mail nous n'avons pas reçu les documents demandés, 
                le centre se réserve le droit de ne plus payer les frais d'examens si vous y aviez droit.
              </p>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6 lg:p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Nous reprendrons contact très prochainement</h3>
          <p className="text-gray-600 mb-6">Cordialement, l'équipe FTRANSPORT</p>
          
          <div className="flex items-center justify-center gap-3 text-xl">
            <Phone className="w-6 h-6 text-blue-500" />
            <a href="tel:0428296091" className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
              04.28.29.60.91
            </a>
          </div>
          <p className="text-gray-500 text-sm mt-2">
            86 Route de Genas, 69003 Lyon • De 9h à 17h sur rendez-vous
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Link
            to="/bienvenue/etape-10"
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </Link>
          <Link
            to="/bienvenue"
            className={`inline-flex items-center gap-2 font-medium px-6 py-3 rounded-xl transition-colors ${
              isSubmitted 
                ? "bg-green-600 hover:bg-green-700 text-white" 
                : "bg-gray-300 text-gray-500 cursor-not-allowed pointer-events-none"
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Terminé
          </Link>
        </div>
      </div>
    </OnboardingLayout>
  );
}