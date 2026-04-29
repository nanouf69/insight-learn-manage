import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { BILAN_FIN_FORMATION_FC_VTC } from "./bilan-fin-formation-fc-vtc-data";
import { ImageLightbox } from "./ImageLightbox";

interface Props {
  onBack: () => void;
}

export default function BilanFinFormationFCVtc({ onBack }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div>
          <h1 className="text-2xl font-bold">📋 Bilan fin de formation — Formation Continue VTC</h1>
          <p className="text-sm text-muted-foreground">
            {BILAN_FIN_FORMATION_FC_VTC.length} questions — les bonnes réponses sont surlignées en rouge.
          </p>
        </div>
      </div>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Corrigé officiel — Bilan fin de formation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {BILAN_FIN_FORMATION_FC_VTC.map((q, idx) => (
            <div key={q.id} className="border-b pb-4 last:border-0 last:pb-0">
              <div className="font-semibold mb-2">
                <span className="text-muted-foreground mr-2">Q{idx + 1}.</span>
                {q.enonce}
                {q.multi && (
                  <span className="ml-2 text-xs text-muted-foreground italic">
                    (plusieurs réponses possibles)
                  </span>
                )}
              </div>

              {q.image && (
                <div className="my-3">
                  <ImageLightbox
                    src={q.image}
                    alt={`Illustration question ${idx + 1}`}
                    loading="lazy"
                    className="max-h-48 rounded-lg border"
                  />
                </div>
              )}

              <ul className="space-y-1.5 mt-2">
                {q.choix.map((c, i) => (
                  <li
                    key={i}
                    className={
                      c.correct
                        ? "flex items-start gap-2 rounded-md px-3 py-2 bg-red-50 border border-red-200 text-red-700 font-semibold"
                        : "flex items-start gap-2 px-3 py-2 text-foreground"
                    }
                  >
                    {c.correct && (
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
                    )}
                    <span>{c.texte}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
