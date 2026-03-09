import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowLeft, AlertTriangle, Calendar, ChevronDown, MapPin } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";

// Liste des dates d'examen 2026
const EXAM_DATES = [
  {
    id: '2026-01-27-pm',
    date: new Date(2026, 0, 27, 14, 0),
    label: '27 janvier 2026 (après-midi)',
    location: 'Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne',
  },
  {
    id: '2026-02-24-pm',
    date: new Date(2026, 1, 24, 14, 0),
    label: '24 février 2026 (après-midi)',
    location: 'Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne',
  },
  {
    id: '2026-03-31-pm',
    date: new Date(2026, 2, 31, 14, 0),
    label: '31 mars 2026 (après-midi)',
    location: 'Clermont-Ferrand',
  },
  {
    id: '2026-04-28-pm',
    date: new Date(2026, 3, 28, 14, 0),
    label: '28 avril 2026 (après-midi)',
    location: 'Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne',
  },
  {
    id: '2026-05-26-pm',
    date: new Date(2026, 4, 26, 14, 0),
    label: '26 mai 2026 (après-midi)',
    location: 'Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne',
  },
  {
    id: '2026-06-23-pm',
    date: new Date(2026, 5, 23, 14, 0),
    label: '23 juin 2026 (après-midi)',
    location: 'Rhône – Double Mixte, 10 Avenue Gaston Berger, 69100 Villeurbanne',
  },
];

export default function Step5() {
  const [selectedExamId, setSelectedExamId] = useState<string>(() => localStorage.getItem('onboarding_step5_examId') || '');
  const [isOpen, setIsOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(() => localStorage.getItem('onboarding_step5_confirmed') === 'true');

  const handleSelectExam = (id: string) => {
    setSelectedExamId(id);
    localStorage.setItem('onboarding_step5_examId', id);
  };

  const handleConfirm = (val: boolean) => {
    setConfirmed(val);
    localStorage.setItem('onboarding_step5_confirmed', String(val));
  };

  // Filtrer les 2 premières dates non dépassées
  const availableExams = useMemo(() => {
    const now = new Date();
    return EXAM_DATES
      .filter(exam => exam.date > now)
      .slice(0, 2);
  }, []);

  const selectedExam = EXAM_DATES.find(e => e.id === selectedExamId);

  // Auto-select first available if none selected
  useState(() => {
    if (!selectedExamId && availableExams.length > 0) {
      handleSelectExam(availableExams[0].id);
    }
  });

  const canProceed = selectedExamId && confirmed;

  return (
    <OnboardingLayout currentStep={5} totalSteps={11} title="Choisissez la date d'examen">
      <div className="space-y-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 lg:p-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-red-700">
              <p className="mb-2">
                <strong>ATTENTION :</strong> Vous ne pouvez choisir que la date d'examen la plus proche pour que votre inscription soit prise en compte par le Compte Personnel de Formation (CPF).
              </p>
              <p className="text-red-600 italic">
                Sauf si votre examen aura lieu le même mois.
              </p>
            </div>
          </div>

          {/* Sélecteur de date d'examen */}
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">
              Date d'examen théorique
            </label>
            
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-start justify-between gap-3 p-4 bg-white border border-gray-300 rounded-xl hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-left"
              >
                <div className="flex-1">
                  {selectedExam ? (
                    <>
                      <p className="font-semibold text-gray-900">{selectedExam.label}</p>
                      <p className="text-gray-500 text-sm mt-1 flex items-start gap-1">
                        <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        {selectedExam.location}
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-500">Sélectionnez une date d'examen</p>
                  )}
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {availableExams.map((exam) => (
                    <button
                      key={exam.id}
                      type="button"
                      onClick={() => {
                        handleSelectExam(exam.id);
                        setIsOpen(false);
                      }}
                      className={`w-full p-4 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                        selectedExamId === exam.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <p className="font-semibold text-gray-900">{exam.label}</p>
                      <p className="text-gray-500 text-sm mt-1 flex items-start gap-1">
                        <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        {exam.location}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Session affectée</h4>
                <p className="text-gray-700 text-sm">
                  Nous vous avons affecté à la prochaine session écrite disponible afin de respecter les délais en vigueur. 
                  Vous pouvez la conserver ou choisir l'autre date proposée si votre inscription a eu lieu le même mois que l'examen.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-500 text-sm mb-1">Épreuves</p>
                <p className="font-medium text-gray-900">Théorique + Pratique</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-sm mb-1">Tarif</p>
                <p className="font-semibold text-green-600">241 €</p>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation checkbox */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-5 h-5 mt-0.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-gray-700">
              <strong className="text-gray-900">Je confirme</strong> avoir sélectionné ma date d'examen sur la plateforme CMA
            </span>
          </label>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Link
            to="/bienvenue/etape-4"
            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-6 py-3 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Précédent
          </Link>
          {canProceed ? (
            <Link
              to="/bienvenue/etape-6"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-xl transition-colors"
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