import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileSignature, Loader2 } from "lucide-react";

interface EmargementRow {
  id: string;
  date_emargement: string;
  demi_journee: string;
  signature_data_url: string;
  signed_at: string;
}

interface Props {
  apprenantId?: string;
  completed: boolean;
  onComplete: () => void;
}

const formatDateFR = (iso: string) => {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const labelDemi = (d: string) =>
  d === "matin" ? "Matin (09h00 — 12h00)" : d === "apres-midi" ? "Après-midi (13h00 — 17h00)" : d;

export default function EmargementsSignesViewer({ apprenantId, completed, onComplete }: Props) {
  const [rows, setRows] = useState<EmargementRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apprenantId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("emargements_fc" as any)
        .select("id, date_emargement, demi_journee, signature_data_url, signed_at")
        .eq("apprenant_id", apprenantId)
        .order("date_emargement", { ascending: true })
        .order("demi_journee", { ascending: true });

      if (!error && Array.isArray(data)) {
        setRows(data as unknown as EmargementRow[]);
      }
      setLoading(false);
    })();
  }, [apprenantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileSignature className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Mes feuilles d'émargement signées</h2>
          <p className="text-sm text-muted-foreground">
            Retrouvez ici toutes les signatures effectuées durant votre formation continue.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Aucune feuille d'émargement signée pour le moment.
        </Card>
      ) : (
        <div className="grid gap-4">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-semibold capitalize">{formatDateFR(r.date_emargement)}</p>
                  <p className="text-sm text-muted-foreground">{labelDemi(r.demi_journee)}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded">
                  <CheckCircle2 className="h-3 w-3" />
                  Signé le {new Date(r.signed_at).toLocaleString("fr-FR")}
                </span>
              </div>
              {r.signature_data_url && (
                <div className="border rounded bg-white p-2 flex items-center justify-center">
                  <img
                    src={r.signature_data_url}
                    alt="Signature"
                    className="max-h-32 object-contain"
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {!completed && (
        <div className="flex justify-end">
          <Button onClick={onComplete}>J'ai consulté mes émargements</Button>
        </div>
      )}
    </div>
  );
}
