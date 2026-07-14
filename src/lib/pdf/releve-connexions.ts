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
}

function fmt(d?: string | null) {
  if (!d) return "";
  try { return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: fr }); } catch { return ""; }
}

function duree(start?: string | null, end?: string | null) {
  if (!start || !end) return "";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!isFinite(ms) || ms <= 0) return "";
  const min = Math.round(ms / 60000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
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

export function generateReleveConnexionsPdf(
  apprenant: { nom: string; prenom: string; civilite?: string; type_apprenant?: string },
  rows: ConnexionRow[],
  opts?: { returnBlob?: boolean },
): { blob: Blob; fileName: string } | void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 12;

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

  // Total duration
  let totalMin = 0;
  for (const r of rows) {
    const s = r.started_at;
    const e = r.ended_at || r.last_seen_at;
    if (s && e) {
      const ms = new Date(e).getTime() - new Date(s).getTime();
      if (isFinite(ms) && ms > 0) totalMin += Math.round(ms / 60000);
    }
  }
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  doc.setFont("helvetica", "bold");
  doc.text(`Duree cumulee : ${h}h${String(m).padStart(2, "0")}`, margin, 62);
  doc.setFont("helvetica", "normal");

  const body = rows.map((r) => [
    fmt(r.started_at),
    fmt(r.ended_at || r.last_seen_at),
    duree(r.started_at, r.ended_at || r.last_seen_at),
    r.current_module || "-",
    r.source || "-",
    r.end_reason || "-",
    r.ip_address || "-",
    shortUA(r.user_agent),
  ]);

  autoTable(doc, {
    startY: 68,
    head: [["Debut", "Fin", "Duree", "Module", "Source", "Fin de session", "IP", "Navigateur"]],
    body,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2, valign: "middle", overflow: "linebreak" },
    headStyles: { fillColor: [13, 37, 64], textColor: 255, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 32 },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 45 },
      4: { cellWidth: 22 },
      5: { cellWidth: 30 },
      6: { cellWidth: 28 },
      7: { cellWidth: "auto" },
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
