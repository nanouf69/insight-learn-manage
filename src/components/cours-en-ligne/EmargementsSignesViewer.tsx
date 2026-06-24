import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, FileSignature, Loader2, User, PenTool } from "lucide-react";
import { EmargementFCModal, isFormationContinue } from "./EmargementFCModal";
import { getExpectedEmargements, isPresentielType, type CreneauKey } from "@/lib/agendaSlots";
import { SIGNATURE_NAOUFAL_DATA_URL } from "@/lib/signatureNaoufal";
import cachetAsset from "@/assets/cachet-ftransport.png.asset.json";


interface EmargementRow {
  id: string;
  date_emargement: string;
  demi_journee: string;
  signature_data_url: string | null;
  signed_at: string;
  absent?: boolean | null;
}

interface ApprenantInfo {
  auth_user_id?: string | null;
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
  creneau_horaire?: string | null;
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
const normalizeCreneauKey = (d: string): CreneauKey | null => {
  const k = normalizeDemi(d);
  if (k === "matin") return "matin";
  if (k === "apres-midi" || k === "après-midi") return "apres_midi";
  if (k === "soir") return "soir";
  if (k === "soir-1") return "soir_1";
  if (k === "soir-2") return "soir_2";
  return null;
};
const emargementSlotKey = (date: string, creneau: CreneauKey) => `${date}|${creneau}`;
const labelDemi = (d: string) => {
  const k = normalizeDemi(d);
  if (k === "matin") return "Matin (09h00 — 12h00)";
  if (k === "apres-midi" || k === "après-midi") return "Après-midi (13h00 — 16h00)";
  if (k === "soir") return "Soir (17h00 — 21h00)";
  if (k === "soir-1") return "Soir 1 (17h00 — 18h30)";
  if (k === "soir-2") return "Soir 2 (18h30 — 21h00)";
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
const hasValidSignature = (r?: EmargementRow) => Boolean(r?.signature_data_url?.trim()) || r?.absent === true;

type GroupedEmargements = {
  matin?: EmargementRow;
  apresMidi?: EmargementRow;
  soir?: EmargementRow;
  soir1?: EmargementRow;
  soir2?: EmargementRow;
  expectedSet?: Set<CreneauKey>;
};

export const buildEmargementHTML = (
  groupedByDay: Array<[string, GroupedEmargements]>,
  apprenant: ApprenantInfo | null,
  options?: { isFormationContinue?: boolean }
) => {
  const isFC = !!options?.isFormationContinue;
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
  const dateSignatureCentre = formatShortDate(
    apprenant?.date_fin_formation || groupedByDay[groupedByDay.length - 1]?.[0] || new Date().toISOString().slice(0, 10)
  );

  const hasSoirSplit = groupedByDay.some(([, v]) => !!v.soir1 || !!v.soir2 || v.expectedSet?.has("soir_1") || v.expectedSet?.has("soir_2"));
  const hasSoir = hasSoirSplit || groupedByDay.some(([, v]) => !!v.soir || v.expectedSet?.has("soir"));

  // Heures par créneau (FC VTC/TAXI : 9h-12h matin + 13h-17h après-midi = 7h/jour, 14h sur 2 jours)
  const HRS = {
    matin: 3,                      // 09:00 - 12:00
    apresMidi: isFC ? 4 : 3,       // FC: 13:00 - 17:00 (4h) | sinon 13:00 - 16:00 (3h)
    soir: 4,                       // 17:00 - 21:00
    soir1: 1.5,                    // 17:00 - 18:30
    soir2: 2.5,                    // 18:30 - 21:00
  };
  const fmtH = (h: number) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return mm === 0 ? `${hh}h` : `${hh}h${String(mm).padStart(2, "0")}`;
  };

  let totalHeures = 0;
  const missingSignatureCell = (date: string, creneau: CreneauKey) =>
    `<span class="missing-signature">Signature manquante</span><button class="sign-action" data-date="${date}" data-creneau="${creneau}">Signer ici</button>`;

  const rowsHtml = groupedByDay
    .map(([date, { matin, apresMidi, soir, soir1, soir2, expectedSet }]) => {
      const jourLabel = capitalize(formatDateFR(date));
      const sigImg = (r: EmargementRow | undefined, creneau: CreneauKey, expectedSlot = false) =>
        r?.signature_data_url
          ? `<img src="${r.signature_data_url}" alt="Signature" style="max-height:55px;max-width:95%;"/>`
          : expectedSlot ? missingSignatureCell(date, creneau) : "";
      let heuresJour = 0;
      let cells = "";
      if (hasSoirSplit) {
        const expectedSoir1 = !!soir1 || expectedSet?.has("soir_1");
        const expectedSoir2 = !!soir2 || expectedSet?.has("soir_2");
        const h1 = expectedSoir1 ? HRS.soir1 : 0;
        const h2 = expectedSoir2 ? HRS.soir2 : 0;
        heuresJour = h1 + h2;
        cells = `<td class="horaire">17:00 - 18:30<br/><span class="hsmall">${fmtH(HRS.soir1)}</span></td><td class="sig">${sigImg(soir1, "soir_1", expectedSoir1)}</td><td class="horaire">18:30 - 21:00<br/><span class="hsmall">${fmtH(HRS.soir2)}</span></td><td class="sig">${sigImg(soir2, "soir_2", expectedSoir2)}</td>`;
      } else if (hasSoir) {
        const expectedSoir = !!soir || expectedSet?.has("soir");
        heuresJour = expectedSoir ? HRS.soir : 0;
        cells = `<td class="horaire">17:00 - 21:00<br/><span class="hsmall">${fmtH(HRS.soir)}</span></td><td class="sig">${sigImg(soir, "soir", expectedSoir)}</td>`;
      } else {
        const expectedMatin = !!matin || expectedSet?.has("matin");
        const expectedApresMidi = !!apresMidi || expectedSet?.has("apres_midi");
        const hm = expectedMatin ? HRS.matin : 0;
        const ha = expectedApresMidi ? HRS.apresMidi : 0;
        heuresJour = hm + ha;
        cells = `<td class="horaire">09:00 - 12:00<br/><span class="hsmall">${fmtH(HRS.matin)}</span></td><td class="sig">${sigImg(matin, "matin", expectedMatin)}</td><td class="horaire">13:00 - ${isFC ? "17:00" : "16:00"}<br/><span class="hsmall">${fmtH(HRS.apresMidi)}</span></td><td class="sig">${sigImg(apresMidi, "apres_midi", expectedApresMidi)}</td>`;
      }
      totalHeures += heuresJour;
      return `
        <tr>
          <td class="jour">${jourLabel}</td>
          ${cells}
          <td class="total-day"><strong>${fmtH(heuresJour)}</strong></td>
        </tr>`;
    })
    .join("");

  const totalCols = hasSoirSplit ? 6 : (hasSoir ? 4 : 6); // jour + cells + total

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
  tbody td.horaire .hsmall { color: #6b7fc7; font-weight: bold; }
  tbody td.sig { background: #fff; }
  .missing-signature { display:inline-block; color:#b45309; background:#fff7ed; border:1px dashed #f59e0b; border-radius:4px; padding:6px 10px; font-size:10px; font-weight:bold; }
  .sign-action { display:block; margin:6px auto 0; padding:7px 12px; border:0; border-radius:4px; background:#6b7fc7; color:#fff; font-size:11px; font-weight:bold; cursor:pointer; }
  tbody td.total-day { background: #f3f5fb; font-size: 12px; color: #1a1a1a; width: 70px; }
  tfoot td { border: 1px solid #6b7fc7; padding: 10px 8px; background: #6b7fc7; color: #fff; font-weight: bold; }
  tfoot td.total-label { text-align: right; font-size: 12px; }
  tfoot td.total-value { text-align: center; font-size: 14px; }
  .signatures { margin-top: 16px; display: flex; gap: 14px; }
  .sigbox { flex: 1; border: 1px solid #6b7fc7; border-radius: 4px; padding: 10px; min-height: 110px; position: relative; }
  .sigbox .label { font-weight: bold; font-size: 11px; margin-bottom: 4px; color: #6b7fc7; }
  .sigbox .name { font-size: 11px; color: #333; margin-top: 2px; }
  .signature-center { width: 230px; height: 72px; margin: 0 auto; overflow: hidden; position: relative; }
  .signature-center img.formateur-sig { position: absolute; width: 425px; height: 600px; max-width: none; max-height: none; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(0.68) rotate(18deg); transform-origin: center; filter: contrast(4) brightness(0.55) saturate(1.8); }
  .signature-text { font-family: "Brush Script MT", "Segoe Script", cursive; font-size: 30px; line-height: 1; color: #101010; transform: rotate(0deg); text-align: center; margin-top: 2px; }
  .cachet-img { display: block; margin: 0 auto; max-height: 110px; max-width: 90%; }
  @media print { .noprint, .sign-action { display:none; } }
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
    <div class="item"><span class="label">Durée totale :</span><span class="value"><strong>14 heures</strong></span></div>
  </div>

  <table>
    <thead>
      <tr class="top">
        <th rowspan="2" style="width:160px;">Jour</th>
        ${hasSoirSplit ? `<th colspan="2">Soir 1</th><th colspan="2">Soir 2</th>` : hasSoir ? `<th colspan="2">Soir</th>` : `<th colspan="2">Matin</th><th colspan="2">Apres-midi</th>`}
        <th rowspan="2" style="width:70px;">Heures du jour</th>
      </tr>
      <tr class="sub">
        ${hasSoir ? `<th>Horaire</th><th>Signature du stagiaire</th>${hasSoirSplit ? `<th>Horaire</th><th>Signature du stagiaire</th>` : ""}` : `<th>Horaire</th><th>Signature du stagiaire</th><th>Horaire</th><th>Signature du stagiaire</th>`}
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="${totalCols}" style="padding:20px;color:#999;">Aucune signature enregistrée</td></tr>`}
    </tbody>
    <tfoot>
      <tr>
        <td class="total-label" colspan="${totalCols - 1}">TOTAL HEURES DE FORMATION</td>
        <td class="total-value">${fmtH(totalHeures)} / 14h</td>
      </tr>
    </tfoot>
  </table>

  <div class="signatures">
    <div class="sigbox">
      <div class="label">Formateur</div>
      <div class="name">${formateur}</div>
      <div class="signature-center"><img class="formateur-sig" src="${SIGNATURE_NAOUFAL_DATA_URL}" alt="Signature formateur"/></div>
      <div class="signature-text">Naoufal Guenichi</div>
    </div>
    <div class="sigbox">
      <div class="label">Cachet et signature du centre</div>
      <div class="name" style="margin-top:8px;color:#666;">Fait à Lyon, le ${dateSignatureCentre}</div>
      <img class="cachet-img" src="${cachetAsset.url}" alt="Cachet FTRANSPORT"/>
    </div>
  </div>

  <div class="noprint" style="margin-top:18px;text-align:center;">
    <button onclick="window.print()" style="padding:10px 20px;font-size:13px;cursor:pointer;background:#6b7fc7;color:#fff;border:none;border-radius:4px;">Imprimer / Enregistrer en PDF</button>
  </div>
  <script>
    document.addEventListener('click', function(event) {
      var target = event.target;
      if (!target || !target.classList || !target.classList.contains('sign-action')) return;
      if (window.opener) {
        window.opener.postMessage({ type: 'open-emargement-signature', date: target.dataset.date, creneau: target.dataset.creneau }, '*');
      }
      window.close();
    });
    window.onload=()=>setTimeout(()=>window.print(),300);
  </script>
</body></html>`;
};

const downloadAllJournees = (
  groupedByDay: Array<[string, GroupedEmargements]>,
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
  day: GroupedEmargements,
  apprenant: ApprenantInfo | null
) => {
  downloadAllJournees([[date, day]], apprenant);
};

export default function EmargementsSignesViewer({ apprenantId, completed, onComplete }: Props) {
  const [rows, setRows] = useState<EmargementRow[]>([]);
  const [apprenant, setApprenant] = useState<ApprenantInfo | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expected, setExpected] = useState<Array<{ date: string; creneau: CreneauKey }>>([]);
  const [signTarget, setSignTarget] = useState<{ date: string; creneau: CreneauKey; replaceExisting?: boolean } | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    if (!apprenantId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const [emRes, apRes] = await Promise.all([
        supabase
          .from("emargements_fc" as any)
          .select("id, date_emargement, demi_journee, signature_data_url, signed_at, absent")
          .eq("apprenant_id", apprenantId)
          .order("date_emargement", { ascending: true })
          .order("demi_journee", { ascending: true }),
        supabase
          .from("apprenants")
          .select("auth_user_id, nom, prenom, email, telephone, adresse, code_postal, ville, formation_choisie, type_apprenant, date_debut_formation, date_fin_formation, creneau_horaire")
          .eq("id", apprenantId)
          .maybeSingle(),
      ]);

      if (!emRes.error && Array.isArray(emRes.data)) {
        setRows(emRes.data as unknown as EmargementRow[]);
      }
      const ap = (!apRes.error && apRes.data) ? (apRes.data as ApprenantInfo) : null;
      if (ap) setApprenant(ap);
      setUserId(session?.user?.id || ap?.auth_user_id || null);

      // Calcul des créneaux attendus pour TOUS les apprenants ayant des dates de formation
      // (permet à chaque apprenant de signer/re-signer toute journée passée)
      if (ap) {
        const isFC = isFormationContinue(ap.type_apprenant, ap.formation_choisie);
        const isPres = isPresentielType(ap.type_apprenant, ap.formation_choisie);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const parseDate = (s?: string | null): Date | null => {
          if (!s) return null;
          if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s.slice(0, 10) + "T00:00:00");
          if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
            const [d, m, y] = s.slice(0, 10).split("/");
            return new Date(`${y}-${m}-${d}T00:00:00`);
          }
          return null;
        };
        let start = parseDate(ap.date_debut_formation);
        if (!start || isNaN(start.getTime())) {
          start = new Date(today); start.setDate(today.getDate() - 30);
        }
        let end = parseDate(ap.date_fin_formation);
        if (!end || isNaN(end.getTime()) || end.getTime() > today.getTime()) end = today;
        const exp = await getExpectedEmargements({
          mode: isFC ? "fc" : "presentiel",
          formationChoisie: ap.formation_choisie,
          creneauHoraire: ap.creneau_horaire,
          apprenantId,
          startDate: start,
          endDate: end,
        });
        setExpected(exp);
      }
      setLoading(false);
    })();
  }, [apprenantId, refreshTick]);

  const isWithinFormation = (date: string): boolean => {
    const d = new Date(date + "T00:00:00");
    if (isNaN(d.getTime())) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    // Autorise la signature pour toute date passée ou aujourd'hui,
    // sans bloquer sur les dates de formation (rattrapage possible)
    if (d.getTime() > today.getTime()) return false;
    return true;
  };

  // Group by date — fusionne signatures existantes ET créneaux attendus
  const groupedByDay = useMemo(() => {
    const map = new Map<string, GroupedEmargements>();
    const ensure = (date: string) => {
      let e = map.get(date);
      if (!e) { e = { expectedSet: new Set() }; map.set(date, e); }
      return e;
    };
    for (const r of rows) {
      const entry = ensure(r.date_emargement);
      const k = normalizeDemi(r.demi_journee);
      if (k === "matin") entry.matin = r;
      else if (k === "apres-midi" || k === "après-midi") entry.apresMidi = r;
      else if (k === "soir") entry.soir = r;
      else if (k === "soir-1") entry.soir1 = r;
      else if (k === "soir-2") entry.soir2 = r;
    }
    for (const e of expected) {
      const entry = ensure(e.date);
      entry.expectedSet?.add(e.creneau);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rows, expected]);

  const rowBySlot = useMemo(() => {
    const map = new Map<string, EmargementRow>();
    for (const row of rows) {
      const key = normalizeCreneauKey(row.demi_journee);
      if (key) map.set(emargementSlotKey(row.date_emargement, key), row);
    }
    return map;
  }, [rows]);

  const missingSlots = useMemo(
    () => expected.filter((slot) => !hasValidSignature(rowBySlot.get(emargementSlotKey(slot.date, slot.creneau)))),
    [expected, rowBySlot],
  );

  const openSignatureFor = useCallback((slot: { date: string; creneau: CreneauKey }) => {
    const existing = rowBySlot.get(emargementSlotKey(slot.date, slot.creneau));
    setSignTarget({ date: slot.date, creneau: slot.creneau, replaceExisting: Boolean(existing) });
  }, [rowBySlot]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as { type?: string; date?: string; creneau?: CreneauKey } | null;
      if (data?.type !== "open-emargement-signature" || !data.date || !data.creneau) return;
      openSignatureFor({ date: data.date, creneau: data.creneau });
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [openSignatureFor]);


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasEveningEmargements = groupedByDay.some(([, day]) => day.expectedSet?.has("soir_1") || day.expectedSet?.has("soir_2") || day.soir1 || day.soir2 || day.soir);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <FileSignature className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Mes feuilles d'émargement signées</h2>
            <p className="text-xs text-muted-foreground">
              {hasEveningEmargements ? "Regroupées par journée — 17h00-18h30 et 18h30-21h00." : "Regroupées par journée — matin et après-midi sur la même feuille."}
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

      {missingSlots.length > 0 && userId && apprenantId && (
        <Card className="p-3 border-amber-300 bg-amber-50/70">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-amber-900">{missingSlots.length} signature{missingSlots.length > 1 ? "s" : ""} manquante{missingSlots.length > 1 ? "s" : ""}</p>
              <p className="text-xs text-amber-800 mt-0.5">Cliquez sur une signature manquante ci-dessous ou signez directement le prochain créneau.</p>
            </div>
            <Button size="sm" onClick={() => openSignatureFor(missingSlots[0])}>
              <PenTool className="h-4 w-4 mr-1" />
              Signer maintenant
            </Button>
          </div>
        </Card>
      )}

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
          {groupedByDay.map(([date, day]) => {
            const { matin, apresMidi, soir, soir1, soir2, expectedSet } = day;
            const keys: CreneauKey[] = expectedSet?.has("soir_1") || expectedSet?.has("soir_2") || soir1 || soir2
              ? ["soir_1", "soir_2"]
              : ["matin", "apres_midi"];
            if (soir || expectedSet?.has("soir")) keys.push("soir");
            const colsClass = keys.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
            return (
            <Card key={date} className="p-3">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3 pb-2 border-b">
                <p className="font-semibold capitalize text-sm">{formatDateFR(date)}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadJournee(date, day, apprenant)}
                  className="h-7 text-xs"
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Télécharger la journée
                </Button>
              </div>

              <div className={`grid grid-cols-1 ${colsClass} gap-3`}>
                {keys.map((key) => {
                  const r = key === "matin" ? matin : key === "apres_midi" ? apresMidi : key === "soir_1" ? soir1 : key === "soir_2" ? soir2 : soir;
                  const label = labelDemi(key === "apres_midi" ? "apres-midi" : key);
                  return (
                    <div key={key} className="border rounded-md p-2 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium">{label}</span>
                        {hasValidSignature(r) ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            {r?.absent === true ? "Absent" : new Date(r.signed_at).toLocaleTimeString("fr-FR", {
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
                        ) : r?.absent === true ? (
                          <span className="text-[10px] text-amber-700 font-medium">Absence déclarée</span>
                        ) : userId && apprenantId && isWithinFormation(date) ? (
                          <button
                            type="button"
                            onClick={() => openSignatureFor({ date, creneau: key })}
                            className="h-full w-full flex flex-col items-center justify-center gap-1 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
                          >
                            <PenTool className="h-4 w-4" />
                            <span className="text-xs font-medium">Signer ici</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">Signature manquante</span>
                        )}
                      </div>
                      {userId && apprenantId && isWithinFormation(date) && (
                        <Button
                          size="sm"
                          className="w-full mt-2 h-7 text-xs"
                          variant={hasValidSignature(r) ? "outline" : "default"}
                          onClick={() => openSignatureFor({ date, creneau: key })}
                        >
                          <PenTool className="h-3 w-3 mr-1" />
                          {hasValidSignature(r) ? "Re-signer ce créneau" : "Signer ce créneau"}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
            );
          })}
        </div>
      )}

      {signTarget && userId && apprenantId && (
        <EmargementFCModal
          apprenantId={apprenantId}
          userId={userId}
          apprenantNom={apprenant?.nom || ""}
          apprenantPrenom={apprenant?.prenom || ""}
          creneau={signTarget.creneau}
          mode={isFormationContinue(apprenant?.type_apprenant, apprenant?.formation_choisie) ? "fc" : "presentiel"}
          dateEmargement={signTarget.date}
          replaceExisting={signTarget.replaceExisting}
          onSigned={() => { setSignTarget(null); setRefreshTick((t) => t + 1); }}
          onSkipped={() => setSignTarget(null)}
        />
      )}

      {!completed && (
        <div className="flex justify-end">
          <Button onClick={onComplete}>J'ai consulté mes émargements</Button>
        </div>
      )}
    </div>
  );
}
