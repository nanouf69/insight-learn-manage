import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, CheckSquare, XSquare } from "lucide-react";
import { type CompetencesData } from "./competences-checklist-data";
import { saveFormDocument } from "@/lib/saveFormDocument";
import { toast } from "sonner";
import { useAutoSave, loadSavedDraft } from "@/hooks/useAutoSave";

interface Props {
  data: CompetencesData;
  apprenantNom?: string;
  apprenantId?: string;
  onComplete: () => void;
  completed?: boolean;
}

export default function CompetencesChecklist({ data, apprenantNom, apprenantId, onComplete, completed }: Props) {
  const [answers, setAnswers] = useState<Record<string, "oui" | "non">>({});
  const [invalidKeys, setInvalidKeys] = useState<Set<string>>(new Set());
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const totalItems = data.sections.reduce((acc, s) => acc + s.items.length, 0);
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === totalItems;
  const progress = totalItems > 0 ? Math.round((answeredCount / totalItems) * 100) : 0;

  const toggle = (key: string, value: "oui" | "non") => {
    setAnswers(prev => {
      const next = { ...prev };
      if (next[key] === value) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
    setInvalidKeys(prev => { const n = new Set(prev); n.delete(key); return n; });
  };

  const setAll = (value: "oui" | "non") => {
    const allAnswers: Record<string, "oui" | "non"> = {};
    data.sections.forEach((section, sIdx) => {
      section.items.forEach((_, iIdx) => {
        allAnswers[`${sIdx}-${iIdx}`] = value;
      });
    });
    setAnswers(allAnswers);
    setInvalidKeys(new Set());
  };

  const handleSubmit = async () => {
    // Find unanswered
    const missing: string[] = [];
    data.sections.forEach((section, sIdx) => {
      section.items.forEach((_, iIdx) => {
        const key = `${sIdx}-${iIdx}`;
        if (!answers[key]) missing.push(key);
      });
    });

    if (missing.length > 0) {
      setInvalidKeys(new Set(missing));
      toast.error(`Veuillez répondre à toutes les questions (${missing.length} manquante(s))`);
      const firstRef = itemRefs.current[missing[0]];
      if (firstRef) firstRef.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setInvalidKeys(new Set());
    if (apprenantId) {
      const saved = await saveFormDocument({
        apprenantId,
        typeDocument: "test-competences",
        titre: `Test de compétences - ${data.formationLabel || "Formation"}`,
        donnees: { answers, sections: data.sections.map(s => s.titre), sectionItems: data.sections.map(s => s.items), formationLabel: data.formationLabel },
      });
      if (saved) toast.success("Test de compétences enregistré !");
    }
    onComplete();
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
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setAll("oui")} className="gap-1.5">
              <CheckSquare className="w-4 h-4 text-green-600" />
              Tout cocher Oui
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAll("non")} className="gap-1.5">
              <XSquare className="w-4 h-4 text-red-500" />
              Tout cocher Non
            </Button>
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
                const isInvalid = invalidKeys.has(key);
                return (
                  <div
                    key={key}
                    ref={el => { itemRefs.current[key] = el; }}
                    className={`flex items-start gap-3 py-2 border-b border-border/50 last:border-b-0 rounded-lg px-2 ${isInvalid ? "ring-2 ring-destructive/60 bg-destructive/5" : ""}`}
                  >
                    <p className={`flex-1 text-sm leading-relaxed ${isInvalid ? "text-destructive font-semibold" : ""}`}>❖ {item}</p>
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
            onClick={handleSubmit}
          >
            {allAnswered ? "✅ Valider le test de compétences" : `Répondez à toutes les questions (${answeredCount}/${totalItems})`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
