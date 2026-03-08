import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { saveFormDocument } from "@/lib/saveFormDocument";

type NiveauAcquis = "A" | "B" | "C" | "D";

interface CompetenceRow {
  label: string;
  value: NiveauAcquis | null;
  observation: string;
}

interface PartieData {
  titre: string;
  competences: CompetenceRow[];
}

const NIVEAUX: { value: NiveauAcquis; label: string; color: string }[] = [
  { value: "A", label: "Acquis", color: "text-emerald-600" },
  { value: "B", label: "En cours", color: "text-amber-600" },
  { value: "C", label: "Non acquis", color: "text-destructive" },
  { value: "D", label: "Non évalué", color: "text-muted-foreground" },
];

const buildVTCData = (): PartieData[] => [
  {
    titre: "PARTIE A – RÉGLEMENTATION T3P / VTC",
    competences: [
      "Définition et réglementation du VTC (LOTI, loi Thévenoud, loi Grandguillaume)",
      "Conditions d'obtention de la carte professionnelle VTC",
      "Droits et obligations du chauffeur VTC",
      "Obligations concernant le véhicule (normes, assurance, contrôle technique)",
      "Réglementation de la plateforme / contrat de mise en relation",
      "Infractions et sanctions applicables",
    ].map(label => ({ label, value: null, observation: "" })),
  },
  {
    titre: "PARTIE B – GESTION D'ENTREPRISE",
    competences: [
      "Formes juridiques adaptées (EI, EURL, SASU, SAS)",
      "Régimes fiscaux (IS / IR, micro, réel simplifié)",
      "Obligations comptables et déclaratives",
      "Notions de TVA applicables",
      "Calcul du seuil de rentabilité",
      "Gestion de trésorerie et facturation",
    ].map(label => ({ label, value: null, observation: "" })),
  },
  {
    titre: "PARTIE C – SÉCURITÉ ROUTIÈRE",
    competences: [
      "Règles du Code de la route spécifiques T3P",
      "Conduite rationnelle et éco-conduite",
      "Gestion des situations d'urgence et premiers secours",
      "Prévention des risques routiers professionnels",
      "Réglementation sur le temps de conduite et repos",
    ].map(label => ({ label, value: null, observation: "" })),
  },
  {
    titre: "PARTIE D – LANGUE FRANÇAISE & ANGLAIS",
    competences: [
      "Expression écrite et orale en français (communication client)",
      "Rédaction d'un devis ou d'une réclamation",
      "Vocabulaire professionnel en anglais (salutations, itinéraire, tarifs)",
      "Compréhension de demandes simples en anglais",
    ].map(label => ({ label, value: null, observation: "" })),
  },
];

const buildTAXIData = (): PartieData[] => [
  {
    titre: "PARTIE A – RÉGLEMENTATION T3P / TAXI",
    competences: [
      "Définition et réglementation du TAXI (LOTI, loi Thévenoud, loi Grandguillaume)",
      "Conditions d'obtention de la carte professionnelle TAXI et ADS",
      "Droits et obligations du chauffeur TAXI",
      "Obligations concernant le véhicule (normes, assurance, contrôle technique)",
      "Réglementation taximètre et tarification",
      "Infractions et sanctions applicables",
    ].map(label => ({ label, value: null, observation: "" })),
  },
  {
    titre: "PARTIE B – GESTION D'ENTREPRISE",
    competences: [
      "Formes juridiques adaptées (EI, EURL, SASU, SAS)",
      "Régimes fiscaux (IS / IR, micro, réel simplifié)",
      "Obligations comptables et déclaratives",
      "Notions de TVA applicables",
      "Calcul du seuil de rentabilité",
      "Gestion de trésorerie et facturation",
    ].map(label => ({ label, value: null, observation: "" })),
  },
  {
    titre: "PARTIE C – SÉCURITÉ ROUTIÈRE",
    competences: [
      "Règles du Code de la route spécifiques T3P",
      "Conduite rationnelle et éco-conduite",
      "Gestion des situations d'urgence et premiers secours",
      "Prévention des risques routiers professionnels",
      "Réglementation sur le temps de conduite et repos",
    ].map(label => ({ label, value: null, observation: "" })),
  },
  {
    titre: "PARTIE D – LANGUE FRANÇAISE & ANGLAIS",
    competences: [
      "Expression écrite et orale en français (communication client)",
      "Rédaction d'un devis ou d'une réclamation",
      "Vocabulaire professionnel en anglais (salutations, itinéraire, tarifs)",
      "Compréhension de demandes simples en anglais",
    ].map(label => ({ label, value: null, observation: "" })),
  },
];

const buildTAData = (): PartieData[] => [
  {
    titre: "PARTIE A – RÉGLEMENTATION TAXI (Passerelle TA)",
    competences: [
      "Réglementation spécifique TAXI (ADS, taximètre)",
      "Tarification et facturation TAXI",
      "Obligations liées à la carte professionnelle TAXI",
      "Infractions et sanctions spécifiques TAXI",
    ].map(label => ({ label, value: null, observation: "" })),
  },
  {
    titre: "PARTIE B – CONNAISSANCES LOCALES",
    competences: [
      "Connaissance des axes principaux et monuments",
      "Stations de taxis et lieux stratégiques",
      "Gares, hôpitaux et administrations",
    ].map(label => ({ label, value: null, observation: "" })),
  },
];

const buildVAData = (): PartieData[] => [
  {
    titre: "PARTIE A – RÉGLEMENTATION VTC (Passerelle VA)",
    competences: [
      "Réglementation spécifique VTC",
      "Conditions d'exercice et carte professionnelle VTC",
      "Devis, facturation et relation client VTC",
      "Développement commercial et marketing",
    ].map(label => ({ label, value: null, observation: "" })),
  },
];

const getFormationData = (formationType: string): PartieData[] => {
  switch (formationType) {
    case "taxi": return buildTAXIData();
    case "ta": return buildTAData();
    case "va": return buildVAData();
    default: return buildVTCData();
  }
};

const getFormationLabel = (formationType: string) => {
  switch (formationType) {
    case "taxi": return "TAXI";
    case "ta": return "Passerelle TA";
    case "va": return "Passerelle VA";
    default: return "VTC";
  }
};

interface EvaluationAcquisFormProps {
  formationType: string;
  apprenantId?: string;
  onComplete: () => void;
}

const EvaluationAcquisForm = ({ formationType, apprenantId, onComplete }: EvaluationAcquisFormProps) => {
  const [parties, setParties] = useState<PartieData[]>(getFormationData(formationType));
  const [commentaires, setCommentaires] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [invalidKeys, setInvalidKeys] = useState<Set<string>>(new Set());
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const updateCompetence = (partieIdx: number, compIdx: number, value: NiveauAcquis) => {
    setParties(prev => {
      const next = prev.map((p, pi) => pi === partieIdx ? {
        ...p,
        competences: p.competences.map((c, ci) => ci === compIdx ? { ...c, value } : c),
      } : p);
      return next;
    });
    const key = `${partieIdx}-${compIdx}`;
    setInvalidKeys(prev => { const n = new Set(prev); n.delete(key); return n; });
  };

  const allFilled = parties.every(p => p.competences.every(c => c.value !== null));

  const handleSubmit = async () => {
    // Find unanswered
    const missing: string[] = [];
    parties.forEach((p, pi) => {
      p.competences.forEach((c, ci) => {
        if (c.value === null) missing.push(`${pi}-${ci}`);
      });
    });

    if (missing.length > 0) {
      setInvalidKeys(new Set(missing));
      toast.error(`Veuillez évaluer toutes les compétences (${missing.length} manquante(s))`);
      const firstRef = itemRefs.current[missing[0]];
      if (firstRef) firstRef.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setInvalidKeys(new Set());
    if (apprenantId) {
      const saved = await saveFormDocument({
        apprenantId,
        typeDocument: "evaluation-acquis",
        titre: `Évaluation des acquis - ${getFormationLabel(formationType)}`,
        donnees: {
          formationType,
          parties: parties.map(p => ({ titre: p.titre, competences: p.competences })),
          commentaires,
        },
      });
      if (saved) toast.success("Évaluation des acquis enregistrée !");
    }
    setSubmitted(true);
    toast.success("✅ Évaluation des acquis envoyée avec succès !");
    onComplete();
  };

  if (submitted) {
    return (
      <Card className="border-0 shadow-lg max-w-3xl mx-auto">
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Évaluation envoyée !</h2>
          <p className="text-muted-foreground">Merci d'avoir complété votre fiche d'évaluation des acquis.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b">
          <h2 className="text-xl font-bold text-foreground">📋 Fiche d'Évaluation des Acquis</h2>
          <p className="text-sm text-muted-foreground mt-1">Formation {getFormationLabel(formationType)}</p>
        </div>
        <CardContent className="p-6 space-y-8">
          {parties.map((partie, partieIdx) => (
            <div key={partieIdx} className="space-y-4">
              <h3 className="font-bold text-foreground border-b pb-2">{partie.titre}</h3>
              <div className="space-y-3">
                 {partie.competences.map((comp, compIdx) => {
                  const key = `${partieIdx}-${compIdx}`;
                  const isInvalid = invalidKeys.has(key);
                  return (
                  <div key={compIdx} ref={el => { itemRefs.current[key] = el; }} className={`rounded-lg border p-4 space-y-3 ${isInvalid ? "ring-2 ring-destructive/60 bg-destructive/5 border-destructive" : ""}`}>
                    <p className={`text-sm font-medium ${isInvalid ? "text-destructive" : "text-foreground"}`}>{comp.label}</p>
                    <RadioGroup
                      value={comp.value || ""}
                      onValueChange={(v) => updateCompetence(partieIdx, compIdx, v as NiveauAcquis)}
                      className="flex flex-wrap gap-4"
                    >
                      {NIVEAUX.map(n => (
                        <div key={n.value} className="flex items-center gap-1.5">
                          <RadioGroupItem value={n.value} id={`${partieIdx}-${compIdx}-${n.value}`} />
                          <Label htmlFor={`${partieIdx}-${compIdx}-${n.value}`} className={`text-xs cursor-pointer ${n.color}`}>
                            {n.value} – {n.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="space-y-3">
            <h3 className="font-bold text-foreground border-b pb-2">Commentaires</h3>
            <Textarea
              placeholder="Commentaires ou observations supplémentaires..."
              value={commentaires}
              onChange={(e) => setCommentaires(e.target.value)}
              rows={3}
            />
          </div>

          <Button size="lg" className="w-full gap-2" onClick={handleSubmit} disabled={!allFilled}>
            <CheckCircle2 className="w-5 h-5" />
            Valider l'évaluation des acquis
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EvaluationAcquisForm;
