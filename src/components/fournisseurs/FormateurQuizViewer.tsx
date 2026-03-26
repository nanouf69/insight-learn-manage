import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

interface QuizQuestion {
  id: number;
  enonce: string;
  image?: string;
  choix: { lettre: string; texte: string; correct?: boolean }[];
}

interface QuizSection {
  id: number;
  titre: string;
  sousTitre?: string;
  questions?: QuizQuestion[];
}

interface Props {
  sections: QuizSection[];
  title: string;
  icon?: string;
}

export function FormateurQuizViewer({ sections, title, icon = "📝" }: Props) {
  const [openSections, setOpenSections] = useState<Set<number>>(new Set());

  const toggle = (id: number) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalQ = sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span>{icon}</span> {title}
          <span className="ml-auto text-xs font-normal text-muted-foreground">{totalQ} questions</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sections.map(section => {
          const isOpen = openSections.has(section.id);
          const qCount = section.questions?.length || 0;
          return (
            <div key={section.id} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggle(section.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{section.titre}</p>
                  {section.sousTitre && <p className="text-xs text-muted-foreground mt-0.5">{section.sousTitre}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs text-muted-foreground">{qCount} Q</span>
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>
              {isOpen && section.questions && (
                <div className="border-t px-4 py-3 space-y-4 bg-muted/10">
                  {section.questions.map((q, qi) => (
                    <div key={q.id} className="space-y-1.5">
                      <p className="text-sm font-medium">
                        <span className="text-muted-foreground mr-1">{qi + 1}.</span>
                        {q.enonce}
                      </p>
                      {q.image && (
                        <div className="pl-4 py-1">
                          <img
                            src={q.image}
                            alt="Illustration"
                            className="max-h-24 rounded border object-contain"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="grid gap-1 pl-4">
                        {q.choix.map(c => (
                          <div
                            key={c.lettre}
                            className={`flex items-start gap-2 text-sm px-2 py-1 rounded ${
                              c.correct
                                ? "bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 font-medium"
                                : "text-muted-foreground"
                            }`}
                          >
                            {c.correct && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />}
                            <span>
                              <strong>{c.lettre}.</strong> {c.texte}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
