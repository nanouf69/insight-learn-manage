import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import GrilleNotationConduite from "@/components/sessions/GrilleNotationConduite";

interface Props {
  apprenantId: string;
  apprenantNom?: string;
  apprenantPrenom?: string;
  formation: "vtc" | "taxi";
  /** Vue apprenant : la grille est consultable mais non modifiable. */
  readOnly?: boolean;
}

interface GrilleRow {
  id: string;
  session_id: string | null;
  date_passage: string | null;
  passage: string | null;
  avis: "favorable" | "defavorable" | null;
  type_formation: string | null;
}

/**
 * Liste TOUS les passages de l'épreuve pratique d'un apprenant (1er, 2e, ...)
 * avec sa grille de notation consultable. Affiché dans le module PRATIQUE.
 */
const GrillesPratiqueApprenant = ({
  apprenantId,
  apprenantNom = "",
  apprenantPrenom = "",
  formation,
  readOnly = true,
}: Props) => {
  const [loading, setLoading] = useState(true);
  const [grilles, setGrilles] = useState<GrilleRow[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("grilles_notation_conduite" as any)
        .select("id, session_id, date_passage, passage, avis, type_formation")
        .eq("apprenant_id", apprenantId)
        .order("date_passage", { ascending: true });
      if (!active) return;
      if (error) console.error("[GrillesPratiqueApprenant]", error);
      setGrilles(((data as any[]) || []) as GrilleRow[]);
      setLoading(false);
    };
    if (apprenantId) load();
    return () => {
      active = false;
    };
  }, [apprenantId]);

  if (!apprenantId) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="w-4 h-4" />
          Grilles d'évaluation pratique ({grilles.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : grilles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune grille d'évaluation enregistrée pour le moment.
          </p>
        ) : (
          grilles.map((g, i) => (
            <div
              key={g.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
            >
              <div className="text-sm">
                <span className="font-medium">
                  {g.passage || `Passage ${i + 1}`}
                </span>
                <span className="text-muted-foreground">
                  {g.date_passage ? ` · ${g.date_passage.split("-").reverse().join("/")}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {g.avis && (
                  <Badge variant={g.avis === "favorable" ? "default" : "destructive"}>
                    Avis {g.avis}
                  </Badge>
                )}
                <GrilleNotationConduite
                  apprenantId={apprenantId}
                  apprenantNom={apprenantNom}
                  apprenantPrenom={apprenantPrenom}
                  formation={(g.type_formation === "taxi" ? "taxi" : g.type_formation === "vtc" ? "vtc" : formation)}
                  sessionId={g.session_id || undefined}
                  datePassage={g.date_passage || undefined}
                  readOnly={readOnly}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default GrillesPratiqueApprenant;
