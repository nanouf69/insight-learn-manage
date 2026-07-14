import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import logoImage from "@/assets/logo-ftransport.png";

const COMPANY = {
  name: "Ftransport",
  address: "86 Route de Genas 69003 Lyon",
  siret: "53516371400044",
};

export interface ConnexionRow {
  started_at?: string | null;
  ended_at?: string | null;
  last_seen_at?: string | null;
  last_action_at?: string | null;
  end_reason?: string | null;
  source?: string | null;
  current_module?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  // Enriched (optional) — computed by caller
  modules_consultes?: string[];
  quiz_realises?: string[];
  cours_exercices?: string[];
}

function fmt(d?: string | null) {
  if (!d) return "";
  try { return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: fr }); } catch { return ""; }
}

function fmtDate(d?: string | null) {
  if (!d) return "";
  try { return format(new Date(d), "dd/MM/yyyy", { locale: fr }); } catch { return ""; }
}

function fmtTime(d?: string | null) {
  if (!d) return "";
  try { return format(new Date(d), "HH:mm", { locale: fr }); } catch { return ""; }
}

function duree(start?: string | null, end?: string | null) {
  if (!start || !end) return "";
  const startMs = new Date(start).getTime();
  const rawEndMs = new Date(end).getTime();
  if (!isFinite(startMs) || !isFinite(rawEndMs)) return "";
  const MAX = 7 * 60 * 60 * 1000;
  const endMs = Math.min(rawEndMs, startMs + MAX);
  const ms = endMs - startMs;
  if (ms <= 0) return "";
  const min = Math.floor(ms / 60000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

function shortUA(ua?: string | null) {
  if (!ua) return "";
  const s = ua;
  let browser = "Autre";
  if (/Edg\//.test(s)) browser = "Edge";
  else if (/Chrome\//.test(s) && !/Chromium/.test(s)) browser = "Chrome";
  else if (/Firefox\//.test(s)) browser = "Firefox";
  else if (/Safari\//.test(s)) browser = "Safari";
  let os = "";
  if (/Windows/.test(s)) os = "Windows";
  else if (/Mac OS X/.test(s)) os = "macOS";
  else if (/Android/.test(s)) os = "Android";
  else if (/iPhone|iPad|iOS/.test(s)) os = "iOS";
  else if (/Linux/.test(s)) os = "Linux";
  return os ? `${browser} (${os})` : browser;
}

function sanitize(s?: string | null): string {
  if (!s) return "";
  let out = String(s).normalize("NFKC");
  out = out
    .replace(/[•·▪◦●○]/g, "-")
    .replace(/[""«»]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...");
  // Remove emojis / non-Latin symbols not supported by Helvetica (WinAnsi)
  out = out.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "");
  out = out.replace(/\s+/g, " ").trim();
  return out;
}

function joinList(items?: string[] | null): string {
  if (!items || items.length === 0) return "—";
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    const t = sanitize(it);
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.length > 0 ? "- " + out.join("\n- ") : "—";
}

export function generateReleveConnexionsPdf(
  apprenant: { nom: string; prenom: string; civilite?: string; type_apprenant?: string },
  rows: ConnexionRow[],
  opts?: { returnBlob?: boolean; tempsEnLearning?: string; tempsPratique?: string; tempsPresentielTheorie?: string; tempsTotal?: string },
): { blob: Blob; fileName: string } | void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 8;

  // Header
  try { doc.addImage(logoImage, "PNG", margin, 8, 40, 14); } catch {}
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(COMPANY.name, pw - margin, 12, { align: "right" });
  doc.text(COMPANY.address, pw - margin, 16, { align: "right" });
  doc.text(`SIRET : ${COMPANY.siret}`, pw - margin, 20, { align: "right" });

  // Title
  doc.setFillColor(13, 37, 64);
  doc.rect(0, 26, pw, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("RELEVE DES CONNEXIONS E-LEARNING", pw / 2, 36, { align: "center" });

  // Apprenant
  const full = `${apprenant.civilite || ""} ${apprenant.prenom || ""} ${apprenant.nom || ""}`.trim();
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Stagiaire : ${full}`, margin, 50);
  doc.text(
    `Formation : ${(apprenant.type_apprenant || "-").toString().toUpperCase()}`,
    margin, 56,
  );
  doc.text(`Nombre de connexions : ${rows.length}`, pw - margin, 50, { align: "right" });
  doc.text(`Genere le ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })}`, pw - margin, 56, { align: "right" });

  // Synthèse durées (plafonné à 7h par session — identique au rapport d'activité)
  const MAX_SESSION_MS = 7 * 60 * 60 * 1000;
  let totalMin = 0;
  for (const r of rows) {
    const s = r.started_at;
    const e = r.ended_at || r.last_seen_at;
    if (s && e) {
      const startMs = new Date(s).getTime();
      const rawEndMs = new Date(e).getTime();
      if (!isFinite(startMs) || !isFinite(rawEndMs)) continue;
      const endMs = Math.min(rawEndMs, startMs + MAX_SESSION_MS);
      const ms = endMs - startMs;
      if (ms > 0) totalMin += Math.floor(ms / 60000);
    }
  }
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const eLearningLabel = opts?.tempsEnLearning || `${h}h${String(m).padStart(2, "0")}`;
  doc.setFont("helvetica", "bold");
  doc.text(`Duree cumulee e-learning : ${eLearningLabel}`, margin, 62);
  if (opts?.tempsPresentielTheorie) {
    doc.text(`Presentiel theorie : ${opts.tempsPresentielTheorie}`, margin + 90, 62);
  }
  if (opts?.tempsPratique) {
    doc.text(`Pratique (presentiel) : ${opts.tempsPratique}`, margin + 165, 62);
  }
  if (opts?.tempsTotal) {
    doc.setTextColor(13, 37, 64);
    doc.text(`TOTAL formation : ${opts.tempsTotal}`, margin, 68);
    doc.setTextColor(40, 40, 40);
  }
  doc.setFont("helvetica", "normal");

  // Rappel méthodologique
  doc.setFontSize(7);
  doc.setTextColor(110, 110, 110);
  doc.text(
    "Note : chaque session est plafonnee a 7h. Une session n'est comptabilisee que si l'apprenant a consulte un module, un exercice ou un quiz.",
    margin, 73,
  );
  doc.setTextColor(40, 40, 40);

  if (!rows || rows.length === 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(200, 50, 50);
    doc.text(
      "Aucune connexion e-learning enregistree pour cet apprenant.",
      pw / 2, 95, { align: "center" },
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(
      "Cet apprenant n'a pas encore initialise de session sur la plateforme e-learning,",
      pw / 2, 105, { align: "center" },
    );
    doc.text(
      "ou suit une formation exclusivement en presentiel.",
      pw / 2, 111, { align: "center" },
    );
  } else {
    const body = rows.map((r) => {
      const startedAt = r.started_at || null;
      const endedAt = r.ended_at || r.last_seen_at || null;
      const modulesTxt = joinList(r.modules_consultes);
      const quizTxt = joinList(r.quiz_realises);
      const exosTxt = joinList(r.cours_exercices);
      // Fallback module label if no enriched data provided
      const moduleFallback =
        (r.modules_consultes && r.modules_consultes.length > 0)
          ? modulesTxt
          : (r.current_module ? `- ${sanitize(r.current_module)}` : "—");
      return [
        fmtDate(startedAt),
        fmtTime(startedAt),
        fmtTime(endedAt),
        duree(startedAt, endedAt),
        moduleFallback,
        quizTxt,
        exosTxt,
        r.ip_address || "-",
      ];
    });

    autoTable(doc, {
      startY: 78,
      head: [[
        "Date",
        "Debut",
        "Fin",
        "Duree",
        "Module consulte",
        "Quiz / Examens realises",
        "Cours & Exercices effectues",
        "IP",
      ]],
      body,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1.6, valign: "top", overflow: "linebreak" },
      headStyles: { fillColor: [13, 37, 64], textColor: 255, fontStyle: "bold", fontSize: 7.5, halign: "center" },
      alternateRowStyles: { fillColor: [245, 248, 252] },
      columnStyles: {
        0: { cellWidth: 22, halign: "center" },
        1: { cellWidth: 15, halign: "center" },
        2: { cellWidth: 15, halign: "center" },
        3: { cellWidth: 16, halign: "center", fontStyle: "bold" },
        4: { cellWidth: 62 },
        5: { cellWidth: 60 },
        6: { cellWidth: 65 },
        7: { cellWidth: "auto", halign: "center" },
      },
      margin: { left: margin, right: margin },
      didDrawPage: () => {
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `${COMPANY.name} - ${COMPANY.address}`,
          pw / 2, ph - 6, { align: "center" },
        );
      },
    });
  }


  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i}/${totalPages}`, pw - margin, ph - 6, { align: "right" });
  }

  const slug = `${apprenant.prenom || ""}-${apprenant.nom || ""}`
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "apprenant";
  const fileName = `releve-connexions_${slug}.pdf`;
  if (opts?.returnBlob) return { blob: doc.output("blob"), fileName };
  doc.save(fileName);
}
