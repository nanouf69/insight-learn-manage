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
  if (k === "matin") return "Matin (08h30 — 12h00)";
  if (k === "apres-midi" || k === "après-midi") return "Après-midi (13h00 — 17h00)";
  if (k === "soir") return "Soir (18h00 — 21h00)";
  return d;
};

const fullName = (a?: ApprenantInfo | null) =>
  [a?.prenom, a?.nom].filter(Boolean).join(" ").trim() || "—";

const formatShortDate = (iso?: string | null) => {
  if (!iso) return "—";
  // Accept DD/MM/YYYY or YYYY-MM-DD
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(iso)) return iso;
  try {
    const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("fr-FR");
  } catch {
    return iso;
  }
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const buildEmargementHTML = (
  groupedByDay: Array<[string, { matin?: EmargementRow; apresMidi?: EmargementRow; soir?: EmargementRow }]>,
  apprenant: ApprenantInfo | null
) => {
  const formation = apprenant?.formation_choisie || apprenant?.type_apprenant || "Formation";
  const adresse = [apprenant?.adresse, [apprenant?.code_postal, apprenant?.ville].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" ");
  const lieu = "86 route de Genas 69003 Lyon";
  const formateur = "Naoufal GUENICHI";
  const datesFormation =
    apprenant?.date_debut_formation || apprenant?.date_fin_formation
      ? `du ${formatShortDate(apprenant?.date_debut_formation)} au ${formatShortDate(apprenant?.date_fin_formation)}`
      : "—";

  // Inclure la colonne soir uniquement si au moins une signature soir existe
  const hasSoir = groupedByDay.some(([, v]) => !!v.soir);

  const rowsHtml = groupedByDay
    .map(([date, { matin, apresMidi, soir }]) => {
      const jourLabel = capitalize(formatDateFR(date));
      const sigImg = (r?: EmargementRow) =>
        r?.signature_data_url
          ? `<img src="${r.signature_data_url}" alt="Signature" style="max-height:55px;max-width:95%;"/>`
          : "";
      return `
        <tr>
          <td class="jour">${jourLabel}</td>
          <td class="horaire">08:30 - 12:00</td>
          <td class="sig">${sigImg(matin)}</td>
          <td class="horaire">13:00 - 17:00</td>
          <td class="sig">${sigImg(apresMidi)}</td>
          ${hasSoir ? `<td class="horaire">18:00 - 21:00</td><td class="sig">${sigImg(soir)}</td>` : ""}
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/>
<title>Feuille d'émargement individuelle</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; color: #1a1a1a; font-size: 11px; margin: 0; }
  .header { background: #6b7fc7; color: #fff; padding: 14px 18px; display:flex; justify-content:space-between; align-items:center; border-radius: 4px 4px 0 0; }
  .brand { font-size: 22px; font-weight: bold; letter-spacing: 0.5px; }
  .brand small { display:block; font-size:10px; font-weight:normal; opacity:0.9; margin-top:2px; }
  .title { font-size: 16px; font-weight: bold; letter-spacing: 0.5px; }
  .infos { border: 1.5px solid #6b7fc7; border-top: none; padding: 12px 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; border-radius: 0 0 4px 4px; margin-bottom: 14px; }
  .infos .item { display:flex; gap:8px; align-items:baseline; }
  .infos .label { color: #6b7fc7; font-weight: bold; min-width: 90px; }
  .infos .value { color: #1a1a1a; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  thead .top th { background: #6b7fc7; color: #fff; font-weight: bold; padding: 8px 6px; text-align: center; border: 1px solid #6b7fc7; font-size: 12px; }
  thead .sub th { background: #8a9bd4; color: #fff; font-weight: normal; padding: 6px; text-align: center; border: 1px solid #6b7fc7; font-size: 10px; }
  tbody td { border: 1px solid #6b7fc7; padding: 10px 8px; text-align: center; height: 70px; vertical-align: middle; }
  tbody td.jour { font-weight: bold; text-align: left; padding-left: 12px; background: #fff; }
  tbody td.horaire { font-size: 10px; color: #444; width: 90px; }
  tbody td.sig { background: #fff; }
  .cachet { margin-top: 18px; }
  .cachet .label { font-weight: bold; font-size: 11px; margin-bottom: 4px; }
  .cachet .box { border: 1px solid #6b7fc7; border-radius: 4px; padding: 14px; min-height: 90px; width: 50%; font-size: 10px; color: #555; }
  @media print { .noprint { display:none; } }
</style></head><body>
  <div class="header">
    <div class="brand">FTRANSPORT<small>Specialiste Formations Transport</small></div>
    <div class="title">FEUILLE D'EMARGEMENT INDIVIDUELLE</div>
  </div>

  <div class="infos">
    <div class="item"><span class="label">Stagiaire :</span><span class="value"><strong>${fullName(apprenant)}</strong></span></div>
    <div class="item"><span class="label">Formation :</span><span class="value">${formation}</span></div>
    <div class="item"><span class="label">Tél :</span><span class="value">${apprenant?.telephone || "—"}</span></div>
    <div class="item"><span class="label">Lieu :</span><span class="value">${lieu}</span></div>
    <div class="item"><span class="label">Dates :</span><span class="value">${datesFormation}</span></div>
    <div class="item"><span class="label">Formateur(s) :</span><span class="value">${formateur}</span></div>
  </div>

  <table>
    <thead>
      <tr class="top">
        <th rowspan="2" style="width:160px;">Jour</th>
        <th colspan="2">Matin</th>
        <th colspan="2">Apres-midi</th>
        ${hasSoir ? `<th colspan="2">Soir</th>` : ""}
      </tr>
      <tr class="sub">
        <th>Horaire</th>
        <th>Signature du stagiaire</th>
        <th>Horaire</th>
        <th>Signature du stagiaire</th>
        ${hasSoir ? `<th>Horaire</th><th>Signature du stagiaire</th>` : ""}
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="${hasSoir ? 7 : 5}" style="padding:20px;color:#999;">Aucune signature enregistrée</td></tr>`}
    </tbody>
  </table>

  <div class="cachet">
    <div class="label">Cachet et signature du centre</div>
    <div class="box">Fait à Lyon, le ______________</div>
  </div>

  <div class="noprint" style="margin-top:18px;text-align:center;">
    <button onclick="window.print()" style="padding:10px 20px;font-size:13px;cursor:pointer;background:#6b7fc7;color:#fff;border:none;border-radius:4px;">Imprimer / Enregistrer en PDF</button>
  </div>
  <script>window.onload=()=>setTimeout(()=>window.print(),300);</script>
</body></html>`;
};

const downloadAllJournees = (
  groupedByDay: Array<[string, { matin?: EmargementRow; apresMidi?: EmargementRow; soir?: EmargementRow }]>,
  apprenant: ApprenantInfo | null
) => {
  const html = buildEmargementHTML(groupedByDay, apprenant);
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
};

const downloadJournee = (
  date: string,
  matin: EmargementRow | undefined,
  apresMidi: EmargementRow | undefined,
  soir: EmargementRow | undefined,
  apprenant: ApprenantInfo | null
) => {
  downloadAllJournees([[date, { matin, apresMidi, soir }]], apprenant);
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
          .select("nom, prenom, email, telephone, adresse, code_postal, ville, formation_choisie, type_apprenant, date_debut_formation, date_fin_formation")
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <FileSignature className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Mes feuilles d'émargement signées</h2>
            <p className="text-xs text-muted-foreground">
              Regroupées par journée — matin et après-midi sur la même feuille.
            </p>
          </div>
        </div>
        {groupedByDay.length > 0 && (
          <Button
            size="sm"
            onClick={() => downloadAllJournees(groupedByDay, apprenant)}
            className="bg-[#6b7fc7] hover:bg-[#5a6fb8] text-white"
          >
            <Download className="h-4 w-4 mr-1" />
            Télécharger la feuille complète
          </Button>
        )}
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
