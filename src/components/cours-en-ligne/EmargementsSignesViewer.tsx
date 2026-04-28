import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, FileSignature, Loader2 } from "lucide-react";

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

const labelDemi = (d: string) => {
  const k = (d || "").toLowerCase().replace(/_/g, "-").trim();
  if (k === "matin") return "Matin (09h00 — 12h00)";
  if (k === "apres-midi" || k === "après-midi") return "Après-midi (13h00 — 17h00)";
  return d;
};

const downloadEmargement = (r: EmargementRow) => {
  const dateLabel = formatDateFR(r.date_emargement);
  const demiLabel = labelDemi(r.demi_journee);
  const signedAt = r.signed_at ? new Date(r.signed_at).toLocaleString("fr-FR") : "";
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
<title>Feuille d'émargement - ${dateLabel}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: Arial, sans-serif; color: #111; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .sub { color: #555; margin-bottom: 24px; }
  .box { border: 1px solid #ccc; border-radius: 8px; padding: 16px; margin-top: 16px; }
  .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .label { font-weight: bold; }
  .sig { margin-top: 16px; border: 1px dashed #999; border-radius: 6px; padding: 12px; text-align: center; background: #fafafa; }
  .sig img { max-height: 220px; }
  .footer { margin-top: 28px; font-size: 12px; color: #666; }
  @media print { .noprint { display: none; } }
</style></head><body>
  <h1>Feuille d'émargement signée</h1>
  <div class="sub">Formation continue — F TRANSPORT</div>
  <div class="box">
    <div class="row"><span class="label">Date :</span><span>${dateLabel}</span></div>
    <div class="row"><span class="label">Créneau :</span><span>${demiLabel}</span></div>
    <div class="row"><span class="label">Signé le :</span><span>${signedAt}</span></div>
    <div class="sig">
      ${r.signature_data_url ? `<img src="${r.signature_data_url}" alt="Signature"/>` : "<em>Aucune signature</em>"}
      <div style="margin-top:8px;font-size:12px;color:#555;">Signature de l'apprenant</div>
    </div>
  </div>
  <div class="footer">Document généré automatiquement depuis la plateforme F TRANSPORT.</div>
  <div class="noprint" style="margin-top:24px;text-align:center;">
    <button onclick="window.print()" style="padding:10px 20px;font-size:14px;cursor:pointer;">Imprimer / Enregistrer en PDF</button>
  </div>
  <script>window.onload=()=>setTimeout(()=>window.print(),300);</script>
</body></html>`;
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
};

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
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded">
                    <CheckCircle2 className="h-3 w-3" />
                    Signé le {new Date(r.signed_at).toLocaleString("fr-FR")}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => downloadEmargement(r)}>
                    <Download className="h-4 w-4 mr-1" />
                    Télécharger
                  </Button>
                </div>
              </div>
              {r.signature_data_url ? (
                <div className="border rounded bg-slate-50 p-2 flex items-center justify-center min-h-[140px]">
                  <img
                    src={r.signature_data_url}
                    alt="Signature"
                    style={{ maxHeight: 140, width: "auto", display: "block" }}
                    className="object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
                    }}
                  />
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic">Aucune image de signature</div>
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
