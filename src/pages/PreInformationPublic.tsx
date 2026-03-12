import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText, ClipboardList, Target, Loader2, Eraser } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { getCompetencesForFormation } from "@/components/cours-en-ligne/competences-checklist-data";

interface ApprenantInfo {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  type_apprenant: string | null;
  date_naissance: string | null;
  formation_choisie: string | null;
}

type FormStep = "analyse" | "projet" | "competences";

interface QCMQuestion {
  id: string;
  question: string;
  options: string[];
  multiple?: boolean;
  required?: boolean;
  hasOther?: boolean;
}

function getFormationLabel(type: string | null): string {
  if (!type) return "Formation";
  const t = type.toUpperCase();
  if (t === "TA" || t.includes("TA")) return "Passerelle TA (VTC → TAXI)";
  if (t === "VA" || t.includes("VA")) return "Passerelle VA (TAXI → VTC)";
  if (t.includes("TAXI")) return "TAXI";
  if (t.includes("VTC")) return "VTC";
  return "Formation";
}

// ========== ANALYSE DU BESOIN — QCM ==========
const ANALYSE_QUESTIONS: QCMQuestion[] = [
  {
    id: "situation_actuelle",
    question: "Quelle est votre situation actuelle ?",
    options: ["Salarié(e)", "Demandeur d'emploi", "Indépendant(e) / Auto-entrepreneur", "Étudiant(e)", "En reconversion professionnelle", "Intérimaire", "Sans activité"],
    required: true,
    hasOther: true,
  },
  {
    id: "niveau_etude",
    question: "Quel est votre niveau d'études ?",
    options: ["Sans diplôme", "CAP / BEP", "Baccalauréat", "Bac+2 (BTS, DUT)", "Bac+3 et plus", "Diplôme étranger"],
    required: true,
  },
  {
    id: "experience_transport",
    question: "Avez-vous une expérience dans le transport de personnes ?",
    options: ["Aucune expérience", "Moins d'1 an", "1 à 3 ans", "3 à 5 ans", "Plus de 5 ans"],
    required: true,
  },
  {
    id: "type_experience",
    question: "Si oui, dans quel secteur ?",
    options: ["Taxi", "VTC", "Ambulance / VSL", "Transport scolaire", "Livraison / Coursier", "Aucun"],
    multiple: true,
  },
  {
    id: "permis_conduire",
    question: "Depuis combien de temps avez-vous le permis B ?",
    options: ["Moins de 3 ans", "3 à 5 ans", "5 à 10 ans", "Plus de 10 ans"],
    required: true,
  },
  {
    id: "motivation",
    question: "Quelle est votre principale motivation pour cette formation ?",
    options: [
      "Obtenir la carte professionnelle",
      "Reconversion professionnelle",
      "Compléter une activité existante",
      "Créer mon entreprise de transport",
      "Travailler comme salarié dans le transport",
      "Être indépendant / liberté professionnelle",
    ],
    required: true,
    multiple: true,
  },
  {
    id: "disponibilite",
    question: "Quelles sont vos disponibilités pour suivre la formation ?",
    options: ["Temps plein (du lundi au vendredi)", "En soirée uniquement", "Le week-end uniquement", "Formation en e-learning à mon rythme", "Mixte présentiel + e-learning"],
    required: true,
  },
  {
    id: "financement",
    question: "Quel mode de financement envisagez-vous ?",
    options: ["CPF (Compte Personnel de Formation)", "France Travail (ex Pôle Emploi)", "OPCO / Employeur", "Financement personnel", "Région / Collectivité", "Je ne sais pas encore"],
    required: true,
    hasOther: true,
  },
  {
    id: "besoins_specifiques",
    question: "Avez-vous des besoins spécifiques ?",
    options: ["Aucun besoin spécifique", "Situation de handicap (aménagement nécessaire)", "Difficultés avec le français", "Besoin d'accompagnement renforcé", "Contraintes médicales"],
    multiple: true,
  },
  {
    id: "comment_connu",
    question: "Comment avez-vous connu FTRANSPORT ?",
    options: ["Recherche internet / Google", "Réseaux sociaux (Facebook, Instagram...)", "Bouche-à-oreille / Ancien élève", "France Travail / Pôle Emploi", "Salon / Forum", "Publicité"],
    required: true,
    hasOther: true,
  },
  {
    id: "attentes",
    question: "Quelles sont vos principales attentes vis-à-vis de la formation ?",
    options: [
      "Réussir l'examen du premier coup",
      "Acquérir les compétences métier",
      "Être accompagné(e) dans mes démarches",
      "Avoir un suivi personnalisé",
      "Accéder à des outils e-learning performants",
      "Être opérationnel(le) rapidement",
    ],
    multiple: true,
    required: true,
  },
  {
    id: "delai_formation",
    question: "Quand souhaitez-vous commencer la formation ?",
    options: ["Dès que possible", "Dans le mois", "Dans les 3 prochains mois", "Dans les 6 prochains mois", "Je n'ai pas encore décidé"],
    required: true,
  },
];

// ========== PROJET PROFESSIONNEL — QCM ==========
const PROJET_QUESTIONS: QCMQuestion[] = [
  {
    id: "objectif_court_terme",
    question: "Quel est votre objectif à court terme (6 mois) ?",
    options: [
      "Obtenir la carte professionnelle TAXI",
      "Obtenir la carte professionnelle VTC",
      "Démarrer une activité de transport",
      "Trouver un emploi salarié dans le transport",
      "Compléter une carte existante (passerelle)",
    ],
    required: true,
  },
  {
    id: "objectif_moyen_terme",
    question: "Quel est votre objectif à moyen terme (1 à 3 ans) ?",
    options: [
      "Développer ma clientèle",
      "Créer ma propre société de transport",
      "Acquérir un ou plusieurs véhicules",
      "Devenir locataire ou propriétaire d'une licence TAXI",
      "Travailler pour une plateforme (Uber, Bolt, Marcel...)",
      "Évoluer vers un poste de responsable / gestionnaire",
    ],
    required: true,
    multiple: true,
  },
  {
    id: "type_activite",
    question: "Quel type d'activité envisagez-vous ?",
    options: [
      "Salarié(e) d'une société de transport",
      "Indépendant(e) / Auto-entrepreneur",
      "Locataire d'une licence TAXI",
      "Gérant(e) d'une société (SASU, SARL...)",
      "Capacitaire (exploitant)",
      "Je ne sais pas encore",
    ],
    required: true,
  },
  {
    id: "zone_geographique",
    question: "Dans quelle zone géographique souhaitez-vous exercer ?",
    options: [
      "Lyon et agglomération",
      "Département du Rhône",
      "Région Auvergne-Rhône-Alpes",
      "Île-de-France / Paris",
      "Autre grande ville de France",
      "Je ne sais pas encore",
    ],
    required: true,
    hasOther: true,
  },
  {
    id: "statut_juridique",
    question: "Quel statut juridique envisagez-vous ?",
    options: [
      "Auto-entrepreneur / Micro-entreprise",
      "SASU (Société par Actions Simplifiée Unipersonnelle)",
      "SARL / EURL",
      "Salarié (pas de société à créer)",
      "Je ne sais pas encore",
    ],
    required: true,
  },
  {
    id: "vehicule_prevu",
    question: "Avez-vous déjà prévu un véhicule pour votre activité ?",
    options: [
      "Oui, j'ai déjà un véhicule adapté",
      "Oui, je prévois d'acheter un véhicule",
      "Je prévois de louer un véhicule (LOA / LLD)",
      "Mon employeur fournira le véhicule",
      "Non, pas encore",
    ],
    required: true,
  },
  {
    id: "budget_investissement",
    question: "Quel est votre budget d'investissement estimé pour démarrer ?",
    options: [
      "Moins de 5 000 €",
      "5 000 € à 15 000 €",
      "15 000 € à 30 000 €",
      "30 000 € à 50 000 €",
      "Plus de 50 000 €",
      "Je ne sais pas encore",
    ],
  },
  {
    id: "date_debut_activite",
    question: "Quand souhaitez-vous démarrer votre activité professionnelle ?",
    options: [
      "Immédiatement après l'obtention de la carte",
      "Dans les 3 mois après la formation",
      "Dans les 6 mois",
      "Dans l'année",
      "Je n'ai pas de date précise",
    ],
    required: true,
  },
  {
    id: "connaissance_reglementation",
    question: "Connaissez-vous la réglementation du secteur ?",
    options: [
      "Oui, très bien",
      "Oui, les grandes lignes",
      "Un peu, mais j'ai besoin de formation",
      "Non, pas du tout",
    ],
    required: true,
  },
  {
    id: "plateforme_envisagee",
    question: "Envisagez-vous de travailler avec une plateforme de mise en relation ?",
    options: [
      "Oui, Uber",
      "Oui, Bolt",
      "Oui, Marcel / Free Now",
      "Oui, plusieurs plateformes",
      "Non, clientèle directe uniquement",
      "Je ne sais pas encore",
    ],
    multiple: true,
  },
  {
    id: "accompagnement_souhaite",
    question: "Souhaitez-vous un accompagnement après la formation ?",
    options: [
      "Oui, pour les démarches administratives (carte pro, inscription...)",
      "Oui, pour la création d'entreprise",
      "Oui, pour trouver un emploi salarié",
      "Non, je me débrouillerai seul(e)",
    ],
    multiple: true,
    required: true,
  },
];

// ========== COMPOSANT QCM ==========
function QCMField({
  q,
  answers,
  otherValues,
  onAnswer,
  onOtherChange,
  missing,
}: {
  q: QCMQuestion;
  answers: Record<string, string[]>;
  otherValues: Record<string, string>;
  onAnswer: (id: string, value: string, multiple?: boolean) => void;
  onOtherChange: (id: string, value: string) => void;
  missing: boolean;
}) {
  const selected = answers[q.id] || [];

  return (
    <div className={`p-3 rounded-lg border space-y-2 ${missing ? "border-red-400 bg-red-50/50" : "border-border"}`}>
      <p className="text-sm font-medium">
        {q.question} {q.required && <span className="text-red-500">*</span>}
        {q.multiple && <span className="text-xs text-muted-foreground ml-1">(plusieurs réponses possibles)</span>}
      </p>
      <div className="grid gap-1.5">
        {q.options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onAnswer(q.id, opt, q.multiple)}
              className={`text-left text-sm px-3 py-2 rounded border transition-colors ${
                isSelected
                  ? "bg-primary/10 border-primary text-primary font-medium"
                  : "bg-background border-border text-foreground hover:bg-muted/50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-${q.multiple ? "sm" : "full"} border-2 flex items-center justify-center shrink-0 ${
                  isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                }`}>
                  {isSelected && <span className="text-white text-[10px]">✓</span>}
                </span>
                {opt}
              </span>
            </button>
          );
        })}
        {q.hasOther && (
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => onAnswer(q.id, "__other__", q.multiple)}
              className={`text-left text-sm px-3 py-2 rounded border transition-colors flex-1 ${
                selected.includes("__other__")
                  ? "bg-primary/10 border-primary text-primary font-medium"
                  : "bg-background border-border text-foreground hover:bg-muted/50"
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selected.includes("__other__") ? "border-primary bg-primary" : "border-muted-foreground"
                }`}>
                  {selected.includes("__other__") && <span className="text-white text-[10px]">✓</span>}
                </span>
                Autre :
              </span>
            </button>
            {selected.includes("__other__") && (
              <Input
                className="flex-1"
                placeholder="Précisez..."
                value={otherValues[q.id] || ""}
                onChange={(e) => onOtherChange(q.id, e.target.value)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PreInformationPublic() {
  const [searchParams] = useSearchParams();
  const apprenantId = searchParams.get("id");
  const formationType = searchParams.get("type");

  const [apprenant, setApprenant] = useState<ApprenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<FormStep>("analyse");
  const [completedSteps, setCompletedSteps] = useState<Set<FormStep>>(new Set());
  const [saving, setSaving] = useState(false);
  const [missingFields, setMissingFields] = useState<Set<string>>(new Set());

  // QCM answers: { questionId: ["selected option 1", ...] }
  const [analyseAnswers, setAnalyseAnswers] = useState<Record<string, string[]>>({});
  const [analyseOther, setAnalyseOther] = useState<Record<string, string>>({});
  const [projetAnswers, setProjetAnswers] = useState<Record<string, string[]>>({});
  const [projetOther, setProjetOther] = useState<Record<string, string>>({});

  // Compétences
  const [competencesAnswers, setCompetencesAnswers] = useState<Record<string, "oui" | "non">>({});

  const [signature, setSignature] = useState("");
  const [signatureDate] = useState(new Date().toLocaleDateString("fr-FR"));

  // Canvas signature for first two documents
  const [analyseSignatureData, setAnalyseSignatureData] = useState<string | null>(null);
  const [projetSignatureData, setProjetSignatureData] = useState<string | null>(null);

  useEffect(() => {
    if (!apprenantId) {
      setError("Lien invalide — identifiant manquant");
      setLoading(false);
      return;
    }
    loadApprenant();
  }, [apprenantId]);

  const loadApprenant = async () => {
    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${baseUrl}/functions/v1/save-public-form?id=${apprenantId}`, {
        method: "GET",
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) {
        setError("Apprenant non trouvé. Vérifiez votre lien.");
        setLoading(false);
        return;
      }
      setApprenant(await res.json());
    } catch {
      setError("Erreur de chargement. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (
    setter: React.Dispatch<React.SetStateAction<Record<string, string[]>>>,
    id: string,
    value: string,
    multiple?: boolean
  ) => {
    setMissingFields((prev) => { const n = new Set(prev); n.delete(id); return n; });
    setter((prev) => {
      const current = prev[id] || [];
      if (multiple) {
        return { ...prev, [id]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] };
      }
      return { ...prev, [id]: current.includes(value) ? [] : [value] };
    });
  };

  const saveForm = async (typeDocument: string, titre: string, donnees: Record<string, any>) => {
    setSaving(true);
    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${baseUrl}/functions/v1/save-public-form`, {
        method: "POST",
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          apprenantId,
          typeDocument,
          titre,
          donnees: { ...donnees, _status: "completed", _signed_by: signature, _signed_at: new Date().toISOString() },
        }),
      });
      if (!res.ok) throw new Error("Erreur");
      return true;
    } catch {
      toast.error("Erreur lors de la sauvegarde");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const validateRequired = (questions: QCMQuestion[], answers: Record<string, string[]>) => {
    const missing = new Set<string>();
    questions.forEach((q) => {
      if (q.required && (!answers[q.id] || answers[q.id].length === 0)) missing.add(q.id);
    });
    setMissingFields(missing);
    if (missing.size > 0) {
      toast.error(`Veuillez répondre aux ${missing.size} question(s) obligatoire(s)`);
      const el = document.getElementById(`q-${[...missing][0]}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  };

  const formatAnswers = (answers: Record<string, string[]>, otherValues: Record<string, string>) => {
    const result: Record<string, string | string[]> = {};
    for (const [k, v] of Object.entries(answers)) {
      const mapped = v.map((val) => (val === "__other__" ? `Autre : ${otherValues[k] || ""}` : val));
      result[k] = mapped.length === 1 ? mapped[0] : mapped;
    }
    return result;
  };

  const effectiveType = formationType || apprenant?.type_apprenant || "vtc";
  const formationLabel = getFormationLabel(effectiveType);
  const competencesData = getCompetencesForFormation(effectiveType);
  const totalCompetences = competencesData.sections.reduce((acc, s) => acc + s.items.length, 0);
  const answeredCompetences = Object.keys(competencesAnswers).length;

  const handleSubmitAnalyse = async () => {
    if (!validateRequired(ANALYSE_QUESTIONS, analyseAnswers)) return;
    if (!signature.trim()) { toast.error("Veuillez signer le document"); return; }
    const saved = await saveForm("analyse-besoin", `Analyse du besoin – ${formationLabel}`, {
      reponses: formatAnswers(analyseAnswers, analyseOther),
      apprenant_nom: apprenant?.nom,
      apprenant_prenom: apprenant?.prenom,
      formation: formationLabel,
    });
    if (saved) {
      toast.success("Analyse du besoin enregistrée !");
      setCompletedSteps((prev) => new Set([...prev, "analyse"]));
      setCurrentStep("projet");
      setSignature("");
      setMissingFields(new Set());
    }
  };

  const handleSubmitProjet = async () => {
    if (!validateRequired(PROJET_QUESTIONS, projetAnswers)) return;
    if (!signature.trim()) { toast.error("Veuillez signer le document"); return; }
    const saved = await saveForm("projet-professionnel", `Projet professionnel – ${formationLabel}`, {
      reponses: formatAnswers(projetAnswers, projetOther),
      apprenant_nom: apprenant?.nom,
      apprenant_prenom: apprenant?.prenom,
      formation: formationLabel,
    });
    if (saved) {
      toast.success("Projet professionnel enregistré !");
      setCompletedSteps((prev) => new Set([...prev, "projet"]));
      setCurrentStep("competences");
      setSignature("");
      setMissingFields(new Set());
    }
  };

  const handleSubmitCompetences = async () => {
    if (answeredCompetences < totalCompetences) {
      toast.error(`Veuillez répondre à toutes les compétences (${answeredCompetences}/${totalCompetences})`);
      return;
    }
    if (!signature.trim()) { toast.error("Veuillez signer le document"); return; }
    const saved = await saveForm("test-competences", `Test de compétences – ${formationLabel}`, {
      answers: competencesAnswers,
      sections: competencesData.sections.map((s) => s.titre),
      formationLabel: competencesData.formationLabel,
    });
    if (saved) {
      toast.success("Test de compétences enregistré !");
      setCompletedSteps((prev) => new Set([...prev, "competences"]));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Sonner />
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !apprenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Sonner />
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-destructive font-medium">{error || "Erreur de chargement"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allDone = completedSteps.size === 3;

  if (allDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Sonner />
        <Card className="max-w-lg">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto" />
            <h2 className="text-2xl font-bold text-green-800">Documents complétés !</h2>
            <p className="text-muted-foreground">
              Merci {apprenant.prenom}, vos 3 documents de pré-information ont été enregistrés avec succès.
              Notre équipe les examinera dans les plus brefs délais.
            </p>
            <div className="pt-4 text-sm text-muted-foreground">
              <p>FTRANSPORT — Centre de formation</p>
              <p>86 Route de Genas, 69003 Lyon</p>
              <p>📞 04 28 29 60 91</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const steps: { key: FormStep; label: string; icon: React.ReactNode }[] = [
    { key: "analyse", label: "Analyse du besoin", icon: <ClipboardList className="w-4 h-4" /> },
    { key: "projet", label: "Projet professionnel", icon: <Target className="w-4 h-4" /> },
    { key: "competences", label: "Test de compétences", icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <Sonner />
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="p-5 text-center space-y-2">
            <h1 className="text-xl font-bold">PRÉ-INFORMATION — {formationLabel.toUpperCase()}</h1>
            <p className="text-sm text-muted-foreground">
              FTRANSPORT — NDA : 84 69 1511469 | SIRET : 82346156100018 | Qualiopi ✓
            </p>
            <p className="text-sm">
              Bonjour <strong>{apprenant.prenom} {apprenant.nom}</strong>, merci de compléter les 3 documents ci-dessous.
            </p>
          </CardContent>
        </Card>

        {/* Stepper */}
        <div className="flex gap-2">
          {steps.map((step, i) => (
            <button
              key={step.key}
              onClick={() => !completedSteps.has(step.key) ? setCurrentStep(step.key) : null}
              className={`flex-1 flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                completedSteps.has(step.key)
                  ? "bg-green-50 border-green-300 text-green-700"
                  : currentStep === step.key
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-background border-border text-muted-foreground"
              }`}
            >
              {completedSteps.has(step.key) ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : step.icon}
              <span className="hidden sm:inline">{step.label}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
          ))}
        </div>

        {/* Step 1: Analyse du besoin — QCM */}
        {currentStep === "analyse" && (
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                ANALYSE DU BESOIN — {formationLabel}
              </h2>
              <p className="text-sm text-muted-foreground">Répondez aux questions suivantes en cochant la ou les réponses correspondantes.</p>

              <div className="space-y-3">
                {ANALYSE_QUESTIONS.map((q) => (
                  <div key={q.id} id={`q-${q.id}`}>
                    <QCMField
                      q={q}
                      answers={analyseAnswers}
                      otherValues={analyseOther}
                      onAnswer={(id, val, mult) => handleAnswer(setAnalyseAnswers, id, val, mult)}
                      onOtherChange={(id, val) => setAnalyseOther((p) => ({ ...p, [id]: val }))}
                      missing={missingFields.has(q.id)}
                    />
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <label className="text-sm font-medium">Signature (Nom et Prénom) *</label>
                <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Votre nom et prénom pour valider" />
                <p className="text-xs text-muted-foreground">Fait le {signatureDate}</p>
              </div>

              <Button className="w-full" onClick={handleSubmitAnalyse} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...</> : "✅ Valider l'analyse du besoin"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Projet professionnel — QCM */}
        {currentStep === "projet" && (
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Target className="w-5 h-5" />
                PROJET PROFESSIONNEL — {formationLabel}
              </h2>
              <p className="text-sm text-muted-foreground">Répondez aux questions suivantes concernant votre projet professionnel.</p>

              <div className="space-y-3">
                {PROJET_QUESTIONS.map((q) => (
                  <div key={q.id} id={`q-${q.id}`}>
                    <QCMField
                      q={q}
                      answers={projetAnswers}
                      otherValues={projetOther}
                      onAnswer={(id, val, mult) => handleAnswer(setProjetAnswers, id, val, mult)}
                      onOtherChange={(id, val) => setProjetOther((p) => ({ ...p, [id]: val }))}
                      missing={missingFields.has(q.id)}
                    />
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <label className="text-sm font-medium">Signature (Nom et Prénom) *</label>
                <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Votre nom et prénom pour valider" />
                <p className="text-xs text-muted-foreground">Fait le {signatureDate}</p>
              </div>

              <Button className="w-full" onClick={handleSubmitProjet} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...</> : "✅ Valider le projet professionnel"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Test de compétences */}
        {currentStep === "competences" && (
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                TEST DE COMPÉTENCES — {formationLabel}
              </h2>
              <p className="text-sm text-muted-foreground">
                Pour chaque compétence ci-dessous, indiquez si vous la maîtrisez déjà (Oui) ou non (Non).
              </p>
              <Badge variant="outline">{answeredCompetences}/{totalCompetences} répondues</Badge>

              <div className="space-y-6">
                {competencesData.sections.map((section, sIdx) => (
                  <div key={sIdx} className="space-y-2">
                    <h3 className="font-semibold text-sm border-b pb-1">{section.titre}</h3>
                    {section.items.map((item, iIdx) => {
                      const key = `${sIdx}-${iIdx}`;
                      return (
                        <div key={key} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50">
                          <p className="text-xs flex-1">{item}</p>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => setCompetencesAnswers((p) => ({ ...p, [key]: "oui" }))}
                              className={`px-2 py-1 text-xs rounded border transition-colors ${
                                competencesAnswers[key] === "oui"
                                  ? "bg-green-100 border-green-400 text-green-700"
                                  : "bg-background border-border text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              Oui
                            </button>
                            <button
                              onClick={() => setCompetencesAnswers((p) => ({ ...p, [key]: "non" }))}
                              className={`px-2 py-1 text-xs rounded border transition-colors ${
                                competencesAnswers[key] === "non"
                                  ? "bg-red-100 border-red-400 text-red-700"
                                  : "bg-background border-border text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              Non
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <label className="text-sm font-medium">Signature (Nom et Prénom) *</label>
                <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Votre nom et prénom pour valider" />
                <p className="text-xs text-muted-foreground">Fait le {signatureDate}</p>
              </div>

              <Button className="w-full" onClick={handleSubmitCompetences} disabled={saving || answeredCompetences < totalCompetences}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...</> : "✅ Valider le test de compétences"}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-xs text-muted-foreground pb-8">
          <p>FTRANSPORT — 86 Route de Genas, 69003 Lyon — 📞 04 28 29 60 91</p>
        </div>
      </div>
    </div>
  );
}
