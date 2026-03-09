import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CreditCard, MapPin, Info, Camera, AlertTriangle, Phone, User, Check, Pencil, Mail, CalendarDays } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import { DocumentUploadCard } from "@/components/onboarding/DocumentUploadCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Step1() {
  // Nom et prénom de l'apprenant
  const [nom, setNom] = useState(() => localStorage.getItem('onboarding_nom') || '');
  const [prenom, setPrenom] = useState(() => localStorage.getItem('onboarding_prenom') || '');
  const [email, setEmail] = useState(() => localStorage.getItem('onboarding_email') || '');
  const [telephone, setTelephone] = useState(() => localStorage.getItem('onboarding_telephone') || '');
  const [adresse, setAdresse] = useState(() => localStorage.getItem('onboarding_adresse') || '');
  const [codePostal, setCodePostal] = useState(() => localStorage.getItem('onboarding_code_postal') || '');
  const [ville, setVille] = useState(() => localStorage.getItem('onboarding_ville') || '');
  
  // État de confirmation d'identité
  const [identityConfirmed, setIdentityConfirmed] = useState(() => localStorage.getItem('onboarding_step1_identity') === 'true');
  const [isEditing, setIsEditing] = useState(false);
  const [apprenantId, setApprenantId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  // Generate a unique session ID for this onboarding session
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem('onboarding_session_id');
    if (stored) return stored;
    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('onboarding_session_id', newId);
    return newId;
  });

  const [documentStatuses, setDocumentStatuses] = useState<Record<string, 'pending' | 'valid' | 'rejected'>>({});
  
  // Justificatif de domicile month selection
  const [moisJustificatif, setMoisJustificatif] = useState(() => localStorage.getItem('onboarding_step1_mois_justificatif') || '');

  // Questions obligatoires state
  const [answers, setAnswers] = useState<Record<string, boolean | null>>(() => {
    const saved = localStorage.getItem('onboarding_step1_answers');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return { question1: null, question2: null, question3: null };
  });

  // Charger l'ID de l'apprenant depuis localStorage (déjà chargé depuis la page de bienvenue)
  useEffect(() => {
    const storedApprenantId = localStorage.getItem('onboarding_apprenant_id');
    if (storedApprenantId) {
      setApprenantId(storedApprenantId);
    }
  }, []);

  // Sauvegarder dans localStorage à chaque modification
  useEffect(() => {
    localStorage.setItem('onboarding_nom', nom);
  }, [nom]);

  useEffect(() => {
    localStorage.setItem('onboarding_prenom', prenom);
  }, [prenom]);

  useEffect(() => {
    localStorage.setItem('onboarding_email', email);
  }, [email]);

  useEffect(() => {
    localStorage.setItem('onboarding_telephone', telephone);
  }, [telephone]);

  useEffect(() => {
    localStorage.setItem('onboarding_adresse', adresse);
  }, [adresse]);

  useEffect(() => {
    localStorage.setItem('onboarding_code_postal', codePostal);
  }, [codePostal]);

  useEffect(() => {
    localStorage.setItem('onboarding_ville', ville);
  }, [ville]);

  const handleStatusChange = (docId: string, status: 'pending' | 'valid' | 'rejected', _reason?: string) => {
    setDocumentStatuses(prev => ({ ...prev, [docId]: status }));
  };

  const handleAnswerChange = (questionId: string, value: boolean) => {
    setAnswers(prev => {
      const updated = { ...prev, [questionId]: value };
      localStorage.setItem('onboarding_step1_answers', JSON.stringify(updated));
      return updated;
    });
  };

  // Sauvegarder les modifications dans le CRM
  const handleSaveChanges = async () => {
    if (!nom.trim() || !prenom.trim()) {
      toast.error("Le nom et le prénom sont obligatoires");
      return;
    }

    setIsSaving(true);
    
    try {
      const updateData = {
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim() || null,
        telephone: telephone.trim() || null,
        adresse: adresse.trim() || null,
        code_postal: codePostal.trim() || null,
        ville: ville.trim() || null,
      };

      if (apprenantId) {
        // Mettre à jour l'apprenant existant
        const { error } = await supabase
          .from('apprenants')
          .update(updateData)
          .eq('id', apprenantId);
          
        if (error) throw error;
        toast.success("Vos informations ont été mises à jour");
      } else {
        // Créer un nouvel apprenant
        const { data, error } = await supabase
          .from('apprenants')
          .insert(updateData)
          .select()
          .single();
          
        if (error) throw error;
        setApprenantId(data.id);
        localStorage.setItem('onboarding_apprenant_id', data.id);
        toast.success("Vos informations ont été enregistrées");
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error("Erreur lors de la sauvegarde des informations");
    } finally {
      setIsSaving(false);
    }
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

  // Justificatif month validation
  const isJustificatifTooOld = (() => {
    if (!moisJustificatif) return false;
    const [year, month] = moisJustificatif.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, 1);
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    return selectedDate < threeMonthsAgo;
  })();

  // Generate month options (current + 3 previous months)
  const monthOptions = (() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
  })();

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
  
  // Justificatif extra validation
  const justificatifMonthValid = moisJustificatif && !isJustificatifTooOld;
  
  // Can proceed only if all requirements are met
  const canProceed = hasNameInfo && identityConfirmed && allDocumentsValid && allQuestionsAnswered && !hasYesAnswer && !!justificatifMonthValid;

  return (
    <OnboardingLayout currentStep={1} totalSteps={11} title="Confirmation d'identité et documents requis">
      <div className="space-y-6">
        {/* Confirmation d'identité */}
        <div className={`bg-white rounded-xl p-4 sm:p-5 border-2 ${
          attempted && hasNameInfo && !identityConfirmed 
            ? 'border-red-500' 
            : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900">Confirmation de votre identité</h3>
            </div>
            {!isEditing && hasNameInfo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-blue-600 hover:text-blue-700"
              >
                <Pencil className="w-4 h-4 mr-1" />
                Modifier
              </Button>
            )}
          </div>
          
          {isEditing || !hasNameInfo ? (
            // Mode édition
            <div className="space-y-4">
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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre.email@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telephone" className="text-gray-700">Téléphone</Label>
                  <Input
                    id="telephone"
                    type="tel"
                    placeholder="06 12 34 56 78"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="adresse" className="text-gray-700">Adresse</Label>
                <Input
                  id="adresse"
                  type="text"
                  placeholder="123 rue de la Formation"
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  className="bg-white"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codePostal" className="text-gray-700">Code postal</Label>
                  <Input
                    id="codePostal"
                    type="text"
                    placeholder="69000"
                    value={codePostal}
                    onChange={(e) => setCodePostal(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ville" className="text-gray-700">Ville</Label>
                  <Input
                    id="ville"
                    type="text"
                    placeholder="Lyon"
                    value={ville}
                    onChange={(e) => setVille(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                {hasNameInfo && (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Annuler
                  </Button>
                )}
                <Button
                  onClick={handleSaveChanges}
                  disabled={isSaving || !nom.trim() || !prenom.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
                </Button>
              </div>
            </div>
          ) : (
            // Mode affichage avec confirmation
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-900 font-medium">{nom} {prenom}</span>
                </div>
                {email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">{email}</span>
                  </div>
                )}
                {telephone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">{telephone}</span>
                  </div>
                )}
                {(adresse || codePostal || ville) && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">
                      {[adresse, codePostal, ville].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>
              
              <div className={`border-t pt-4 ${attempted && !identityConfirmed ? 'bg-red-50 -mx-4 px-4 pb-4 rounded-b-lg' : ''}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={identityConfirmed}
                    onChange={(e) => setIdentityConfirmed(e.target.checked)}
                    className={`w-5 h-5 border-2 rounded focus:ring-green-500 mt-0.5 ${
                      attempted && !identityConfirmed 
                        ? 'border-red-500 text-red-600' 
                        : 'border-gray-300 text-green-600'
                    }`}
                  />
                  <span className="text-gray-700">
                    <strong className="text-gray-900">Je confirme que ces informations sont correctes</strong>
                    <br />
                    <span className="text-sm text-gray-500">
                      Si une information est incorrecte, cliquez sur "Modifier" pour la corriger.
                    </span>
                  </span>
                </label>
              </div>
              
              {identityConfirmed && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Identité confirmée</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info format */}
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Info className="w-4 h-4" />
          <span>Formats acceptés : PDF, JPG, PNG, HEIC, WebP • Max 2Mo par fichier</span>
        </div>


        {/* Document upload cards */}
        <div className="space-y-4">
          {documents.map((doc) => {
            const isNotValid = documentStatuses[doc.id] !== 'valid';
            return (
              <div key={doc.id}>
                <div 
                  className={`rounded-xl ${attempted && isNotValid ? 'ring-2 ring-red-500' : ''}`}
                >
                  <DocumentUploadCard
                    docId={doc.id}
                    title={doc.title}
                    description={doc.description}
                    icon={doc.icon}
                    sessionId={sessionId}
                    apprenantId={apprenantId}
                    expectedNom={doc.id === 'piece_identite' ? nom : undefined}
                    expectedPrenom={doc.id === 'piece_identite' ? prenom : undefined}
                    onStatusChange={handleStatusChange}
                  />
                </div>

                {/* Justificatif de domicile: month selector */}
                {doc.id === 'justificatif_domicile' && (
                  <div className={`mt-2 border rounded-xl p-4 ${attempted && !justificatifMonthValid ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                      <CalendarDays className="w-4 h-4" />
                      Mois du justificatif <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={moisJustificatif}
                      onChange={(e) => setMoisJustificatif(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        attempted && !moisJustificatif ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Sélectionnez le mois du justificatif...</option>
                      {monthOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {attempted && !moisJustificatif && (
                      <p className="text-red-500 text-xs mt-1">Veuillez sélectionner le mois du justificatif</p>
                    )}
                    {isJustificatifTooOld && (
                      <div className="flex items-start gap-2 mt-2 p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-red-700 text-sm font-medium">
                          Ce justificatif date de plus de 3 mois. Veuillez fournir un document plus récent.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
        <div className={`rounded-xl p-4 sm:p-5 border-2 ${
          attempted && !allQuestionsAnswered 
            ? 'bg-red-50 border-red-500' 
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-gray-900">Questions obligatoires</h3>
          </div>
          
          <div className="space-y-4">
            {questions.map((question, index) => {
              const isUnanswered = answers[question.id] === null;
              return (
                <div 
                  key={question.id} 
                  className={`space-y-2 p-3 rounded-lg ${
                    attempted && isUnanswered ? 'bg-red-100 border-2 border-red-500' : ''
                  }`}
                >
                  <p className={`text-sm sm:text-base ${attempted && isUnanswered ? 'text-red-700 font-medium' : 'text-gray-700'}`}>
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
                  {attempted && isUnanswered && (
                    <p className="text-red-600 text-xs ml-4">Veuillez répondre à cette question</p>
                  )}
                </div>
              );
            })}
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
              {hasNameInfo && !identityConfirmed && <li>Confirmer que vos informations sont correctes</li>}
              {!allDocumentsValid && <li>Télécharger et faire valider tous les documents requis</li>}
              {!justificatifMonthValid && <li>Sélectionner le mois de votre justificatif de domicile</li>}
              {isJustificatifTooOld && <li>Votre justificatif date de plus de 3 mois</li>}
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
              onClick={() => setAttempted(true)}
              className="inline-flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-600 font-medium px-6 py-3 rounded-xl transition-colors cursor-pointer"
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
