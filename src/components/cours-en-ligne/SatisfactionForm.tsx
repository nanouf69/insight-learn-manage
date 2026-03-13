import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Star } from "lucide-react";
import { toast } from "sonner";
import { saveFormDocument } from "@/lib/saveFormDocument";
import { sendAdminNotification } from "@/lib/sendAdminNotification";
import { useAutoSave, useLoadDraft } from "@/hooks/useAutoSave";

interface CritereRow {
  label: string;
  value: number | null;
}

interface PartieData {
  titre: string;
  criteres: CritereRow[];
}

const NOTES = [
  { value: 1, label: "Très insatisfait", emoji: "😞" },
  { value: 2, label: "Insatisfait", emoji: "😕" },
  { value: 3, label: "Neutre", emoji: "😐" },
  { value: 4, label: "Satisfait", emoji: "🙂" },
  { value: 5, label: "Très satisfait", emoji: "😊" },
];

const buildSatisfactionData = (formationLabel: string): PartieData[] => [
  {
    titre: "PARTIE 1 – ORGANISATION ET ACCUEIL",
    criteres: [
      "Les informations reçues avant la formation étaient claires et complètes",
      "Les modalités d'accès à la formation (délais, inscription) ont été satisfaisantes",
      "Le déroulement de la formation a correspondu au programme annoncé",
      "L'accueil et les conditions matérielles étaient adaptés",
    ].map(label => ({ label, value: null })),
  },
  {
    titre: "PARTIE 2 – CONTENU ET PÉDAGOGIE",
    criteres: [
      "Le contenu de la formation correspond à mes attentes",
      "La progression pédagogique était claire et logique",
      "Les méthodes et supports pédagogiques étaient adaptés",
      "Les exercices et entraînements m'ont aidé à progresser",
      "Les évaluations et examens blancs reflètent bien le niveau de l'examen officiel",
    ].map(label => ({ label, value: null })),
  },
  {
    titre: "PARTIE 3 – FORMATEUR / SUIVI",
    criteres: [
      "Le formateur maîtrise les sujets abordés",
      "Le formateur est disponible et répond aux questions",
      "Le suivi pédagogique individualisé a été efficace",
      "Le rythme de la formation était adapté à mon niveau",
    ].map(label => ({ label, value: null })),
  },
  {
    titre: "PARTIE 4 – ATTEINTE DES OBJECTIFS",
    criteres: [
      `Je me sens prêt(e) à passer l'examen ${formationLabel}`,
      "La formation a répondu à mes objectifs professionnels",
      "Je recommanderais cette formation à mon entourage",
    ].map(label => ({ label, value: null })),
  },
];

const getFormationLabel = (formationType: string) => {
  switch (formationType) {
    case "taxi": return "TAXI";
    case "ta": return "Passerelle TA";
    case "va": return "Passerelle VA";
    default: return "VTC";
  }
};

interface SatisfactionFormProps {
  formationType: string;
  apprenantId?: string;
  onComplete: () => void;
}

const SatisfactionForm = ({ formationType, apprenantId, onComplete }: SatisfactionFormProps) => {
  const label = getFormationLabel(formationType);
  const [parties, setParties] = useState<PartieData[]>(buildSatisfactionData(label));
  const [noteGlobale, setNoteGlobale] = useState<number | null>(null);
  const [pointsForts, setPointsForts] = useState("");
  const [pointsAmeliorer, setPointsAmeliorer] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { queueSave, triggerSave: autoTrigger, StatusIndicator } = useAutoSave({
    apprenantId: apprenantId || "",
    typeDocument: "satisfaction",
    titre: `Questionnaire de satisfaction - ${label}`,
    enabled: !!apprenantId && !submitted,
  });

  // Restore saved draft from Supabase on mount
  useLoadDraft(apprenantId || "", "satisfaction", (draft) => {
    if (draft.parties && Array.isArray(draft.parties)) setParties(draft.parties);
    if (draft.noteGlobale !== undefined) setNoteGlobale(draft.noteGlobale);
    if (draft.pointsForts) setPointsForts(draft.pointsForts);
    if (draft.pointsAmeliorer) setPointsAmeliorer(draft.pointsAmeliorer);
    if (draft.suggestions) setSuggestions(draft.suggestions);
  }, !!apprenantId && !submitted);

  const collectData = () => ({
    formationType,
    parties: parties.map(p => ({ titre: p.titre, criteres: p.criteres })),
    noteGlobale, pointsForts, pointsAmeliorer, suggestions,
  });

  useEffect(() => {
    queueSave(collectData());
  }, [parties, noteGlobale, pointsForts, pointsAmeliorer, suggestions]);

  const updateCritere = (partieIdx: number, critereIdx: number, value: number) => {
    setParties(prev => prev.map((p, pi) => pi === partieIdx ? {
      ...p,
      criteres: p.criteres.map((c, ci) => ci === critereIdx ? { ...c, value } : c),
    } : p));
  };

  const allFilled = parties.every(p => p.criteres.every(c => c.value !== null)) && noteGlobale !== null;

  const handleSubmit = async () => {
    if (!allFilled) {
      toast.error("Veuillez répondre à toutes les questions et donner une note globale");
      return;
    }
    if (apprenantId) {
      const saved = await autoTrigger({ ...collectData(), _status: "completed" });
      if (saved) toast.success("Questionnaire de satisfaction enregistré !");
      else toast.error("Erreur lors de la sauvegarde");
    }
    setSubmitted(true);
    toast.success("✅ Questionnaire de satisfaction envoyé avec succès !");
    onComplete();
  };

  if (submitted) {
    return (
      <Card className="border-0 shadow-lg max-w-3xl mx-auto">
        <CardContent className="p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Merci pour votre retour !</h2>
          <p className="text-muted-foreground">Votre avis contribue à l'amélioration continue de nos formations.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-end sticky top-0 z-10"><StatusIndicator /></div>
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-6 border-b">
          <h2 className="text-xl font-bold text-foreground">⭐ Questionnaire de Satisfaction</h2>
          <p className="text-sm text-muted-foreground mt-1">Formation {label} — Votre avis nous est précieux</p>
        </div>
        <CardContent className="p-6 space-y-8">
          {parties.map((partie, partieIdx) => (
            <div key={partieIdx} className="space-y-4">
              <h3 className="font-bold text-foreground border-b pb-2">{partie.titre}</h3>
              <div className="space-y-3">
                {partie.criteres.map((critere, critereIdx) => (
                  <div key={critereIdx} className="rounded-lg border p-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">{critere.label}</p>
                    <RadioGroup
                      value={critere.value?.toString() || ""}
                      onValueChange={(v) => updateCritere(partieIdx, critereIdx, Number(v))}
                      className="flex flex-wrap gap-3"
                    >
                      {NOTES.map(n => (
                        <div key={n.value} className="flex items-center gap-1.5">
                          <RadioGroupItem value={n.value.toString()} id={`sat-${partieIdx}-${critereIdx}-${n.value}`} />
                          <Label htmlFor={`sat-${partieIdx}-${critereIdx}-${n.value}`} className="text-xs cursor-pointer">
                            {n.emoji} {n.value}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Note globale */}
          <div className="space-y-4">
            <h3 className="font-bold text-foreground border-b pb-2">NOTE GLOBALE DE SATISFACTION</h3>
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setNoteGlobale(n)}
                  className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                    noteGlobale === n
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30 scale-110"
                      : "border-muted hover:border-amber-300 hover:bg-amber-50/50"
                  }`}
                >
                  <Star className={`w-5 h-5 ${noteGlobale !== null && n <= noteGlobale ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            {noteGlobale && (
              <p className="text-center text-sm text-muted-foreground">
                {NOTES.find(n => n.value === noteGlobale)?.emoji} {NOTES.find(n => n.value === noteGlobale)?.label}
              </p>
            )}
          </div>

          {/* Commentaires libres */}
          <div className="space-y-4">
            <h3 className="font-bold text-foreground border-b pb-2">COMMENTAIRES LIBRES</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Points forts de la formation</Label>
                <Textarea placeholder="Ce que vous avez particulièrement apprécié..." value={pointsForts} onChange={(e) => setPointsForts(e.target.value)} rows={2} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Points à améliorer</Label>
                <Textarea placeholder="Ce qui pourrait être amélioré..." value={pointsAmeliorer} onChange={(e) => setPointsAmeliorer(e.target.value)} rows={2} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Suggestions</Label>
                <Textarea placeholder="Vos suggestions pour les prochaines sessions..." value={suggestions} onChange={(e) => setSuggestions(e.target.value)} rows={2} className="mt-1" />
              </div>
            </div>
          </div>

          <Button size="lg" className="w-full gap-2" onClick={handleSubmit} disabled={!allFilled}>
            <CheckCircle2 className="w-5 h-5" />
            Envoyer le questionnaire de satisfaction
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SatisfactionForm;
