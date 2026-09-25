import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MODULE_NAME_BY_ID } from "@/components/cours-en-ligne/modules-config";

/**
 * Signalements administratifs NON bloquants, calculés en lecture seule.
 * Ne modifient aucun statut, note, réponse ni progression. Visibles Admin uniquement.
 */
type Row = {
  apprenant_id: string;
  nom: string | null;
  prenom: string | null;
  module_id: number;
  completed_at: string | null;
  type_signalement: string;
  est_compte_test: boolean;
};

const LIBELLES: Record<string, string> = {
  validation_sans_reponse: "⚠️ Validation historique sans réponse enregistrée",
  reponses_dans_progression_seulement:
    "⚠️ Réponses historiques conservées dans la progression — fiche de réponses absente",
};

export default function SignalementsValidationModules() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charger = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await (supabase as any).rpc("admin_signalements_validation_modules");
    if (error) setError(error.message);
    else setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  const reels = (rows ?? []).filter((r) => !r.est_compte_test);
  const tests = (rows ?? []).filter((r) => r.est_compte_test);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Signalements de validation des modules (contrôle humain)</CardTitle>
        <Button size="sm" variant="outline" onClick={charger} disabled={loading}>
          {loading ? "Chargement…" : rows ? "Actualiser" : "Afficher"}
        </Button>
      </CardHeader>
      {(rows || error) && (
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Information seulement : aucun statut, aucune note et aucune réponse n'est modifié.
          </p>
          {error && <p className="text-destructive">{error}</p>}
          {Object.keys(LIBELLES).map((type) => {
            const list = reels.filter((r) => r.type_signalement === type);
            return (
              <div key={type}>
                <p className="font-medium">
                  {LIBELLES[type]} — {list.length} fiche(s) réelle(s)
                </p>
                <ul className="max-h-60 overflow-auto divide-y">
                  {list.map((r) => (
                    <li key={`${r.apprenant_id}-${r.module_id}`} className="py-1 flex justify-between gap-2">
                      <span>{r.nom} {r.prenom}</span>
                      <span className="text-muted-foreground">
                        {MODULE_NAME_BY_ID?.[r.module_id] ?? `Module ${r.module_id}`}
                        {r.completed_at ? ` · ${new Date(r.completed_at).toLocaleDateString("fr-FR")}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {tests.length > 0 && (
            <p className="text-muted-foreground">
              <Badge variant="secondary">Comptes de test</Badge> {tests.length} fiche(s) exclue(s) des listes ci-dessus.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
