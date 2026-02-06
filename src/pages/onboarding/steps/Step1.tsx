import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CreditCard, FileText, MapPin, Info, Camera, PenTool } from "lucide-react";
import { OnboardingLayout } from "../OnboardingLayout";
import { DocumentUploadCard } from "@/components/onboarding/DocumentUploadCard";

export default function Step1() {
  // Generate a unique session ID for this onboarding session
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem('onboarding_session_id');
    if (stored) return stored;
    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('onboarding_session_id', newId);
    return newId;
  });

  const [documentStatuses, setDocumentStatuses] = useState<Record<string, 'pending' | 'valid' | 'rejected'>>({});

  const handleStatusChange = (docId: string, status: 'pending' | 'valid' | 'rejected', _reason?: string) => {
    setDocumentStatuses(prev => ({ ...prev, [docId]: status }));
  };

  const documents = [
    {
      id: 'piece_identite',
      icon: CreditCard,
      title: "Pièce d'identité",
      description: "Carte d'identité ou passeport en cours de validité",
    },
    {
      id: 'permis_conduire',
      icon: FileText,
      title: "Permis de conduire",
      description: "Hors période probatoire (plus de 3 ans)",
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
    {
      id: 'signature',
      icon: PenTool,
      title: "Signature",
      description: "Signature manuscrite sur papier blanc",
    },
  ];

  // Check if all required documents are valid
  const allValid = documents.every(doc => documentStatuses[doc.id] === 'valid');
  const hasRejected = Object.values(documentStatuses).some(s => s === 'rejected');

  return (
    <OnboardingLayout currentStep={1} totalSteps={11} title="Documents requis pour l'inscription">
      <div className="space-y-6">
        {/* Info format */}
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <Info className="w-4 h-4" />
          <span>Formats acceptés : PDF, JPG, PNG, HEIC, WebP • Max 2Mo par fichier</span>
        </div>

        {/* Validation criteria info */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <p className="text-white/80 text-sm">
            <strong className="text-white">🤖 Vérification automatique :</strong> Nos documents sont analysés par IA pour vérifier leur validité :
          </p>
          <ul className="mt-2 text-white/70 text-sm space-y-1 ml-4 list-disc">
            <li><strong>Pièce d'identité</strong> : doit être en cours de validité (non périmée)</li>
            <li><strong>Permis de conduire</strong> : doit avoir plus de 3 ans (hors période probatoire) et être valide</li>
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
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>

        {/* Warning if documents are rejected */}
        {hasRejected && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 font-medium">
              ⚠️ Certains documents ont été refusés. Veuillez les remplacer par des documents conformes.
            </p>
          </div>
        )}

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
