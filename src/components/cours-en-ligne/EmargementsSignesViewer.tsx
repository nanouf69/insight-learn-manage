import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, FileSignature, Loader2, User } from "lucide-react";

interface EmargementRow {
  id: string;
  date_emargement: string;
  demi_journee: string;
  signature_data_url: string;
  signed_at: string;
}

interface ApprenantInfo {
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  formation_choisie?: string | null;
  type_apprenant?: string | null;
  date_debut_formation?: string | null;
  date_fin_formation?: string | null;
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

const normalizeDemi = (d: string) => (d || "").toLowerCase().replace(/_/g, "-").trim();
const labelDemi = (d: string) => {
  const k = normalizeDemi(d);
  if (k === "matin") return "Matin (09h00 — 12h00)";
  if (k === "apres-midi" || k === "après-midi") return "Après-midi (13h00 — 17h00)";
  return d;
};

const fullName = (a?: ApprenantInfo | null) =>
  [a?.prenom, a?.nom].filter(Boolean).join(" ").trim() || "—";

const downloadJournee = (
  date: string,
  matin: EmargementRow | undefined,
  apresMidi: EmargementRow | undefined,
  apprenant: ApprenantInfo | null
) => {
  const dateLabel = formatDateFR(date);
  const formation = apprenant?.formation_choisie || apprenant?.type_apprenant || "Formation continue";
  const adresse = [apprenant?.adresse, [apprenant?.code_postal, apprenant?.ville].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  const sigBlock = (label: string, r: EmargementRow | undefined) => `
    <div class="sig-cell">
      <div class="sig-label">${label}</div>
      <div class="sig-box">
        ${r?.signature_data_url ? `<img src="${r.signature_data_url}" alt="Signature ${label}"/>` : `<div class="empty">Non signé</div>`}
      </div>
      <div class="sig-foot">${r?.signed_at ? "Signé le " + new Date(r.signed_at).toLocaleString("fr-FR") : "—"}</div>
    </div>`;

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
<title>Émargement - ${dateLabel}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; color: #111; font-size: 12px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #111; padding-bottom:10px; margin-bottom:14px; }
  .brand { font-size:18px; font-weight:bold; }
  .brand small { display:block; font-size:11px; font-weight:normal; color:#555; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  .meta { font-size:11px; color:#444; text-align:right; }
  .infos { border:1px solid #ddd; border-radius:6px; padding:10px 12px; margin-bottom:14px; background:#fafafa; }
  .infos .row { display:flex; gap:24px; margin-bottom:4px; }
  .infos .label { font-weight:bold; min-width:90px; color:#333; }
  .formation { font-weight:bold; font-size:13px; margin-bottom:8px; }
  .grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .sig-cell { border:1px solid #ccc; border-radius:6px; padding:8px; text-align:center; }
  .sig-label { font-weight:bold; font-size:12px; margin-bottom:6px; }
  .sig-box { border:1px dashed #999; border-radius:4px; min-height:140px; display:flex; align-items:center; justify-content:center; background:#fff; }
  .sig-box img { max-height:140px; max-width:100%; }
  .empty { color:#999; font-style:italic; font-size:11px; }
  .sig-foot { font-size:10px; color:#666; margin-top:4px; }
  .footer { margin-top:20px; font-size:10px; color:#666; text-align:center; border-top:1px solid #eee; padding-top:8px; }
  @media print { .noprint { display:none; } }
</style></head><body>
  <div class="header">
    <div class="brand">F TRANSPORT<small>Centre de formation agréé</small></div>
    <div class="meta">
      <strong>Feuille d'émargement</strong><br/>
      ${dateLabel}
    </div>
  </div>

  <div class="infos">
    <div class="formation">${formation}</div>
    <div class="row"><span class="label">Stagiaire :</span><span>${fullName(apprenant)}</span></div>
    ${apprenant?.email ? `<div class="row"><span class="label">Email :</span><span>${apprenant.email}</span></div>` : ""}
    ${apprenant?.telephone ? `<div class="row"><span class="label">Téléphone :</span><span>${apprenant.telephone}</span></div>` : ""}
    ${adresse ? `<div class="row"><span class="label">Adresse :</span><span>${adresse}</span></div>` : ""}
  </div>

  <div class="grid">
    ${sigBlock("Matin (09h00 — 12h00)", matin)}
    ${sigBlock("Après-midi (13h00 — 17h00)", apresMidi)}
  </div>

  <div class="footer">Document généré automatiquement depuis la plateforme F TRANSPORT.</div>
  <div class="noprint" style="margin-top:20px;text-align:center;">
    <button onclick="window.print()" style="padding:10px 20px;font-size:13px;cursor:pointer;">Imprimer / Enregistrer en PDF</button>
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
  const [apprenant, setApprenant] = useState<ApprenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apprenantId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const [emRes, apRes] = await Promise.all([
        supabase
          .from("emargements_fc" as any)
          .select("id, date_emargement, demi_journee, signature_data_url, signed_at")
          .eq("apprenant_id", apprenantId)
          .order("date_emargement", { ascending: true })
          .order("demi_journee", { ascending: true }),
        supabase
          .from("apprenants")
          .select("nom, prenom, email, telephone, adresse, code_postal, ville, formation_choisie, type_apprenant")
          .eq("id", apprenantId)
          .maybeSingle(),
      ]);

      if (!emRes.error && Array.isArray(emRes.data)) {
        setRows(emRes.data as unknown as EmargementRow[]);
      }
      if (!apRes.error && apRes.data) {
        setApprenant(apRes.data as ApprenantInfo);
      }
      setLoading(false);
    })();
  }, [apprenantId]);

  // Group by date
  const groupedByDay = useMemo(() => {
    const map = new Map<string, { matin?: EmargementRow; apresMidi?: EmargementRow }>();
    for (const r of rows) {
      const entry = map.get(r.date_emargement) || {};
      const k = normalizeDemi(r.demi_journee);
      if (k === "matin") entry.matin = r;
      else if (k === "apres-midi" || k === "après-midi") entry.apresMidi = r;
      map.set(r.date_emargement, entry);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <FileSignature className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">Mes feuilles d'émargement signées</h2>
          <p className="text-xs text-muted-foreground">
            Regroupées par journée — matin et après-midi sur la même feuille.
          </p>
        </div>
      </div>

      {/* Carte coordonnées stagiaire */}
      {apprenant && (
        <Card className="p-3 bg-muted/30">
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="text-xs space-y-0.5 flex-1">
              <div className="font-semibold text-sm">{fullName(apprenant)}</div>
              {apprenant.formation_choisie && (
                <div className="text-muted-foreground">
                  Formation : <span className="text-foreground">{apprenant.formation_choisie}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                {apprenant.email && <span>{apprenant.email}</span>}
                {apprenant.telephone && <span>· {apprenant.telephone}</span>}
                {(apprenant.adresse || apprenant.ville) && (
                  <span>
                    · {[apprenant.adresse, [apprenant.code_postal, apprenant.ville].filter(Boolean).join(" ")]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {groupedByDay.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground text-sm">
          Aucune feuille d'émargement signée pour le moment.
        </Card>
      ) : (
        <div className="grid gap-3">
          {groupedByDay.map(([date, { matin, apresMidi }]) => (
            <Card key={date} className="p-3">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3 pb-2 border-b">
                <p className="font-semibold capitalize text-sm">{formatDateFR(date)}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadJournee(date, matin, apresMidi, apprenant)}
                  className="h-7 text-xs"
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Télécharger la journée
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["matin", "apres-midi"] as const).map((key) => {
                  const r = key === "matin" ? matin : apresMidi;
                  const label = labelDemi(key);
                  return (
                    <div key={key} className="border rounded-md p-2 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium">{label}</span>
                        {r ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            {new Date(r.signed_at).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">Non signé</span>
                        )}
                      </div>
                      <div className="border rounded bg-white flex items-center justify-center h-[90px]">
                        {r?.signature_data_url ? (
                          <img
                            src={r.signature_data_url}
                            alt={`Signature ${label}`}
                            style={{ maxHeight: 80, width: "auto" }}
                            className="object-contain"
                          />
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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
