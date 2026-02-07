import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CreditCard, MapPin, Info, Camera, AlertTriangle, Phone, User } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import { DocumentUploadCard } from "@/components/onboarding/DocumentUploadCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Step1() {
  // Nom et prénom de l'apprenant
  const [nom, setNom] = useState(() => localStorage.getItem('onboarding_nom') || '');
  const [prenom, setPrenom] = useState(() => localStorage.getItem('onboarding_prenom') || '');

  // Generate a unique session ID for this onboarding session
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem('onboarding_session_id');
    if (stored) return stored;
    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('onboarding_session_id', newId);
    return newId;
  });

  const [documentStatuses, setDocumentStatuses] = useState<Record<string, 'pending' | 'valid' | 'rejected'>>({});
  
  // Questions obligatoires state
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({
    question1: null,
    question2: null,
    question3: null,
  });

  // Sauvegarder nom et prénom dans localStorage
  useEffect(() => {
    localStorage.setItem('onboarding_nom', nom);
  }, [nom]);

  useEffect(() => {
    localStorage.setItem('onboarding_prenom', prenom);
  }, [prenom]);

  const handleStatusChange = (docId: string, status: 'pending' | 'valid' | 'rejected', _reason?: string) => {
    setDocumentStatuses(prev => ({ ...prev, [docId]: status }));
  };

  const handleAnswerChange = (questionId: string, value: boolean) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const documents = [
    {
      id: 'piece_identite',
      icon: CreditCard,
      title: "Pièce d'identité",
      description: "Carte d'identité ou passeport en cours de validité",
    },
    {
      id: 'justificatif_domicile',
      icon: MapPin,
      title: "Justificatif de domicile",
      description: "De moins de 3 mois (facture EDF, eau, téléphone...)",
    },
    {
      id: 'photo_identite',
      icon: Camera,
      title: "Photo d'identité",
      description: "Fond clair obligatoire (blanc, beige ou bleu)",
    },
  ];

  const questions = [
    {
      id: 'question1',
      text: "Avez-vous perdu 6 points d'un coup (une seule infraction) sur votre permis de conduire ?",
    },
    {
      id: 'question2',
      text: "Avez-vous déjà été condamné(e) ferme ou avec sursis à 6 mois minimum de prison ?",
    },
    {
      id: 'question3',
      text: "Avez-vous déjà été condamné(e) pour conduite sans permis ?",
    },
  ];

  // Check if all required documents are valid
  const allDocumentsValid = documents.every(doc => documentStatuses[doc.id] === 'valid');
  const hasRejected = Object.values(documentStatuses).some(s => s === 'rejected');
  
  // Check if any question has "Oui" answer
  const hasYesAnswer = Object.values(answers).some(answer => answer === true);
  
  // Check if all questions are answered
  const allQuestionsAnswered = Object.values(answers).every(answer => answer !== null);
  
  // Check if nom and prenom are filled
  const hasNameInfo = nom.trim() !== '' && prenom.trim() !== '';
  
  // Can proceed only if all requirements are met
  const canProceed = hasNameInfo && allDocumentsValid && allQuestionsAnswered && !hasYesAnswer;

  return (
    <OnboardingLayout currentStep={1} totalSteps={11} title="Documents requis pour l'inscription">
      <div className="space-y-6">
        {/* Nom et Prénom */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900">Vos informations</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nom" className="text-gray-700">Nom <span className="text-red-500">*</span></Label>
              <Input
                id="nom"
                type="text"
                placeholder="Votre nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prenom" className="text-gray-700">Prénom <span className="text-red-500">*</span></Label>
              <Input
                id="prenom"
                type="text"
                placeholder="Votre prénom"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="bg-white"
              />
            </div>
          </div>
        </div>

        {/* Info format */}
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Info className="w-4 h-4" />
          <span>Formats acceptés : PDF, JPG, PNG, HEIC, WebP • Max 2Mo par fichier</span>
        </div>

        {/* Validation criteria info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-gray-700 text-sm">
            <strong className="text-gray-900">🤖 Vérification automatique :</strong> Nos documents sont analysés par IA pour vérifier leur validité :
          </p>
          <ul className="mt-2 text-gray-600 text-sm space-y-1 ml-4 list-disc">
            <li><strong>Pièce d'identité</strong> : doit être en cours de validité (non périmée) et correspondre au nom/prénom saisis</li>
            <li><strong>Justificatif de domicile</strong> : doit dater de moins de 3 mois</li>
          </ul>
        </div>

        {/* Document upload cards */}
        <div className="space-y-4">
          {documents.map((doc) => (
            <DocumentUploadCard
              key={doc.id}
              docId={doc.id}
              title={doc.title}
              description={doc.description}
              icon={doc.icon}
              sessionId={sessionId}
              expectedNom={doc.id === 'piece_identite' ? nom : undefined}
              expectedPrenom={doc.id === 'piece_identite' ? prenom : undefined}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>

        {/* Warning if documents are rejected */}
        {hasRejected && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-600 font-medium">
              ⚠️ Certains documents ont été refusés. Veuillez les remplacer par des documents conformes.
            </p>
          </div>
        )}

        {/* Questions obligatoires */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-gray-900">Questions obligatoires</h3>
          </div>
          
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={question.id} className="space-y-2">
                <p className="text-gray-700 text-sm sm:text-base">
                  {index + 1}) {question.text}
                </p>
                <div className="flex items-center gap-6 ml-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={question.id}
                      checked={answers[question.id] === false}
                      onChange={() => handleAnswerChange(question.id, false)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Non</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={question.id}
                      checked={answers[question.id] === true}
                      onChange={() => handleAnswerChange(question.id, true)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Oui</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alert if any answer is "Oui" */}
        {hasYesAnswer && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700 font-semibold">
                  Votre situation nécessite un accompagnement personnalisé
                </p>
                <p className="text-red-600 text-sm mt-1">
                  Merci de nous contacter au <a href="tel:0428296091" className="font-bold underline">04 28 29 60 91</a> avant de poursuivre votre inscription.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Validation message */}
        {!canProceed && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-700 text-sm font-medium">
              ⚠️ Pour passer à l'étape suivante, vous devez :
            </p>
            <ul className="mt-2 text-amber-600 text-sm space-y-1 ml-4 list-disc">
              {!hasNameInfo && <li>Renseigner votre nom et prénom</li>}
              {!allDocumentsValid && <li>Télécharger et faire valider tous les documents requis</li>}
              {!allQuestionsAnswered && <li>Répondre à toutes les questions obligatoires</li>}
              {hasYesAnswer && <li>Contacter le centre au 04 28 29 60 91 (réponse "Oui" détectée)</li>}
            </ul>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-end pt-4">
          {canProceed ? (
            <Link
              to="/bienvenue/etape-2"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-xl transition-colors shadow-sm"
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
