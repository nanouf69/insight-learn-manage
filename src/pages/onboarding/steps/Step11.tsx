import { useState, useEffect } from "react";
import { filterFutureExamValues } from "@/lib/filterPastDates";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, AlertTriangle, CheckCircle, FileText, Calendar, MapPin, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingLayout } from "../OnboardingLayout";
import step11Dossier from "@/assets/onboarding/step11-dossier.png";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Dates centralisées
import { ALL_DATES_EXAMEN_THEORIQUE_VALUES } from '@/lib/examDatesConfig';
const datesExamenTheorique = filterFutureExamValues(ALL_DATES_EXAMEN_THEORIQUE_VALUES);

// Types d'examens disponibles
const typesExamen = [
  { value: "vtc_complet", label: "VTC examen complet" },
  { value: "vtc_mobilite", label: "VTC mobilité" },
  { value: "taxi_complet", label: "Taxi examen complet" },
  { value: "taxi_mobilite", label: "Taxi mobilité" },
];

export default function Step11() {
  const navigate = useNavigate();
  const [numeroDossier, setNumeroDossier] = useState('');
  const [dateExamen, setDateExamen] = useState('');
  const [typeExamen, setTypeExamen] = useState('');
  const [responsableContact, setResponsableContact] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const selectedExam = datesExamenTheorique.find(e => e.value === dateExamen);

  // Load saved values on mount
  useEffect(() => {
    const savedNumeroDossier = localStorage.getItem('onboarding_numero_dossier');
    const savedDateExamen = localStorage.getItem('onboarding_date_examen');
    const savedTypeExamen = localStorage.getItem('onboarding_type_examen');
    const savedResponsable = localStorage.getItem('onboarding_responsable_contact_centre');
    if (savedNumeroDossier) setNumeroDossier(savedNumeroDossier);
    if (savedDateExamen) setDateExamen(savedDateExamen);
    if (savedTypeExamen) setTypeExamen(savedTypeExamen);
    if (savedResponsable === 'true') setResponsableContact(true);
  }, []);

  const handleNext = async () => {
    setAttempted(true);
    
    if (!numeroDossier.trim()) {
      toast.error("Veuillez entrer votre numéro de dossier");
      return;
    }
    
    if (!typeExamen) {
      toast.error("Veuillez choisir votre type d'examen");
      return;
    }
    
    if (!dateExamen) {
      toast.error("Veuillez choisir votre date d'examen");
      return;
    }

    if (!responsableContact) {
      toast.error("Vous devez confirmer que vous êtes responsable de contacter le centre");
      return;
    }

    // Store in localStorage
    localStorage.setItem('onboarding_numero_dossier', numeroDossier);
    localStorage.setItem('onboarding_date_examen', dateExamen);
    localStorage.setItem('onboarding_type_examen', typeExamen);
    localStorage.setItem('onboarding_responsable_contact_centre', 'true');

    // Also save directly to database
    const apprenantId = localStorage.getItem('onboarding_apprenant_id');
    if (apprenantId) {
      const selectedExamData = datesExamenTheorique.find(e => e.value === dateExamen);
      const motDePasseCma = localStorage.getItem('onboarding_mot_de_passe_cma');
      const { error } = await supabase
        .from('apprenants')
        .update({
          numero_dossier_cma: numeroDossier,
          date_examen_theorique: dateExamen,
          type_examen: typeExamen,
          lieu_examen: selectedExamData?.lieu || '',
          responsable_contact_centre: true,
          ...(motDePasseCma ? { mot_de_passe_cma: motDePasseCma } : {}),
        })
        .eq('id', apprenantId);
      
      if (error) {
        console.error('Error saving step 11 data:', error);
      }
    }
    
    navigate('/bienvenue/etape-12');
  };

  const canSubmit = numeroDossier.trim() && dateExamen && typeExamen && responsableContact;

  return (
    <OnboardingLayout currentStep={11} totalSteps={12} title="Numéro de dossier et examen">
      <div className="space-y-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 lg:p-8">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-green-700">
              <strong>Presque terminé !</strong> Communiquez-nous votre numéro de dossier CMA et les informations sur votre examen.
            </p>
          </div>

          <div className="mb-6">
            <img 
              src={step11Dossier} 
              alt="Numéro de dossier" 
              className="max-w-lg mx-auto rounded-xl border border-gray-200"
            />
          </div>

          {/* Champ de saisie du numéro de dossier */}
          <div className={`bg-blue-50 border rounded-xl p-6 mb-6 ${attempted && !numeroDossier.trim() ? 'border-red-500' : 'border-blue-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                Entrez votre numéro de dossier <span className="text-red-500">*</span>
              </h3>
            </div>
            
            <input
              type="text"
              value={numeroDossier}
              onChange={(e) => setNumeroDossier(e.target.value)}
              placeholder="Ex: 00043920"
              className={`w-full px-4 py-3 border rounded-lg text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                attempted && !numeroDossier.trim() ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            
            {attempted && !numeroDossier.trim() && (
              <p className="text-red-500 text-sm mt-2">Ce champ est obligatoire</p>
            )}
            
             <p className="text-gray-500 text-sm mt-3">
               Pour trouver votre numéro de dossier : il ne faut pas payer les frais d'examen sauf si cela n'est pas prévu par le CPF. Déconnectez-vous puis reconnectez-vous sur{" "}
               <a href="https://www.exament3p.fr" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">www.exament3p.fr</a>
               {" "}et vous trouverez votre numéro de dossier.
             </p>
          </div>

          {/* Sélection du type d'examen */}
          <div className={`bg-orange-50 border rounded-xl p-6 mb-6 ${attempted && !typeExamen ? 'border-red-500' : 'border-orange-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <GraduationCap className="w-6 h-6 text-orange-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                Quel examen passez-vous ? <span className="text-red-500">*</span>
              </h3>
            </div>
            
            <Select 
              value={typeExamen} 
              onValueChange={setTypeExamen}
            >
              <SelectTrigger className={`w-full bg-white text-base py-6 ${attempted && !typeExamen ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Sélectionnez le type d'examen..." />
              </SelectTrigger>
              <SelectContent>
                {typesExamen.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="py-3">
                    <span className="font-medium">{type.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {attempted && !typeExamen && (
              <p className="text-red-500 text-sm mt-2">Ce champ est obligatoire</p>
            )}
          </div>

          {/* Sélection de la date d'examen */}
          <div className={`bg-purple-50 border rounded-xl p-6 mb-6 ${attempted && !dateExamen ? 'border-red-500' : 'border-purple-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                Choisissez votre date d'examen théorique <span className="text-red-500">*</span>
              </h3>
            </div>
            
            <Select 
              value={dateExamen} 
              onValueChange={setDateExamen}
            >
              <SelectTrigger className={`w-full bg-white text-base py-6 ${attempted && !dateExamen ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Sélectionnez une date d'examen..." />
              </SelectTrigger>
              <SelectContent>
                {datesExamenTheorique.map((exam) => (
                  <SelectItem key={exam.value} value={exam.value} className="py-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{exam.label}</span>
                      <span className="text-xs text-muted-foreground">{exam.lieu}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {attempted && !dateExamen && (
              <p className="text-red-500 text-sm mt-2">Ce champ est obligatoire</p>
            )}
            
            {selectedExam && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-purple-100">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-600">{selectedExam.lieu}</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-red-100 border-4 border-red-600 rounded-xl p-6 text-center">
              <p className="text-red-700 font-extrabold text-2xl lg:text-3xl leading-tight">
                ⚠️ MERCI DE NOUS CONTACTER AU<br />
                <span className="text-3xl lg:text-4xl">04 28 29 60 91</span><br />
                LE PREMIER JOUR DE LA PUBLICATION DES RÉSULTATS DE VOTRE EXAMEN THÉORIQUE POUR LA SUITE DES DÉMARCHES
              </p>
            </div>

            {/* Engagement responsabilité contact centre - OBLIGATOIRE */}
            <div className={`rounded-xl p-5 border-2 ${attempted && !responsableContact ? 'border-red-500 bg-red-50' : 'border-red-300 bg-red-50'}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={responsableContact}
                  onChange={(e) => setResponsableContact(e.target.checked)}
                  className="mt-1 w-6 h-6 accent-red-600 cursor-pointer flex-shrink-0"
                />
                <span className="text-red-800 font-bold text-base lg:text-lg leading-snug">
                  Je reconnais être responsable de contacter le centre au <span className="underline">04 28 29 60 91</span> le premier jour de la publication des résultats de mon examen théorique pour la suite des démarches. <span className="text-red-600">*</span>
                </span>
              </label>
              {attempted && !responsableContact && (
                <p className="text-red-600 text-sm font-semibold mt-2 ml-9">Vous devez cocher cette case pour continuer.</p>
              )}
            </div>

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
          </div>
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
          <button
            onClick={handleNext}
            className={`inline-flex items-center gap-2 font-medium px-6 py-3 rounded-xl transition-colors ${
              canSubmit 
                ? "bg-blue-600 hover:bg-blue-700 text-white" 
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            Étape suivante
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </OnboardingLayout>
  );
}