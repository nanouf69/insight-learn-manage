import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { type CompetencesData } from "./competences-checklist-data";

interface Props {
  data: CompetencesData;
  apprenantNom?: string;
  onComplete: () => void;
  completed?: boolean;
}

export default function CompetencesChecklist({ data, apprenantNom, onComplete, completed }: Props) {
  // Track every item answer: key = "sectionIdx-itemIdx", value = "oui" | "non"
  const [answers, setAnswers] = useState<Record<string, "oui" | "non">>({});

  const totalItems = data.sections.reduce((acc, s) => acc + s.items.length, 0);
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === totalItems;
  const progress = totalItems > 0 ? Math.round((answeredCount / totalItems) * 100) : 0;

  const toggle = (key: string, value: "oui" | "non") => {
    setAnswers(prev => {
      const next = { ...prev };
      if (next[key] === value) {
        delete next[key]; // deselect
      } else {
        next[key] = value;
      }
      return next;
    });
  };

  if (completed) {
    return (
      <Card className="border-green-300 bg-green-50">
        <CardContent className="p-5 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
          <p className="font-semibold text-green-800">Test de compétences complété ✓</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="text-center space-y-1">
            <h3 className="font-bold text-lg">TEST DE COMPÉTENCES AVANT FORMATION</h3>
            <p className="text-sm text-muted-foreground">{data.formationLabel} — {data.formationCode}</p>
            {apprenantNom && <p className="text-sm"><strong>Stagiaire :</strong> {apprenantNom}</p>}
            <p className="text-sm"><strong>Date :</strong> {new Date().toLocaleDateString("fr-FR")}</p>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Avant le début de la formation, merci de bien vouloir répondre à ces questions en cochant <strong>Oui</strong> ou <strong>Non</strong> pour chaque compétence.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Badge variant={allAnswered ? "default" : "secondary"}>{answeredCount}/{totalItems} répondu(s)</Badge>
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
        </CardContent>
      </Card>

      {data.sections.map((section, sIdx) => (
        <Card key={sIdx}>
          <CardContent className="p-4 space-y-3">
            <h4 className="font-bold text-sm text-primary border-b pb-2">{section.titre}</h4>
            <div className="space-y-2">
              {section.items.map((item, iIdx) => {
                const key = `${sIdx}-${iIdx}`;
                const val = answers[key];
                return (
                  <div key={key} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-b-0">
                    <p className="flex-1 text-sm leading-relaxed">❖ {item}</p>
                    <div className="flex items-center gap-3 shrink-0 pt-0.5">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                          checked={val === "oui"}
                          onCheckedChange={() => toggle(key, "oui")}
                        />
                        <span className="text-xs font-medium">Oui</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                          checked={val === "non"}
                          onCheckedChange={() => toggle(key, "non")}
                        />
                        <span className="text-xs font-medium">Non</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <Button
            className="w-full"
            disabled={!allAnswered}
            onClick={onComplete}
          >
            {allAnswered ? "✅ Valider le test de compétences" : `Répondez à toutes les questions (${answeredCount}/${totalItems})`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
