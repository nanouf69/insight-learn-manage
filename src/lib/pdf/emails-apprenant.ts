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

export interface EmailRow {
  type?: string | null; // "sent" | "received"
  subject?: string | null;
  sender_email?: string | null;
  sender_name?: string | null;
  recipients?: string[] | string | null;
  sent_at?: string | null;
  received_at?: string | null;
  created_at?: string | null;
  is_read?: boolean | null;
  has_attachments?: boolean | null;
  body_preview?: string | null;
  body_html?: string | null;
}

function sanitize(s: string): string {
  return (s || "")
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{1F300}-\u{1F9FF}]/gu, "")
    .normalize("NFKD")
    // Strip non Latin-1 chars that helvetica cannot render
    .replace(/[^\x00-\xFF]/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .trim();
}

function htmlToText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&eacute;/g, "e").replace(/&egrave;/g, "e").replace(/&ecirc;/g, "e")
    .replace(/&agrave;/g, "a").replace(/&acirc;/g, "a")
    .replace(/&ccedil;/g, "c").replace(/&ugrave;/g, "u").replace(/&ocirc;/g, "o")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = parseInt(n, 10);
      return code < 256 ? String.fromCharCode(code) : "";
    })
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function fmtDate(d?: string | null): string {
  if (!d) return "";
  try { return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: fr }); } catch { return ""; }
}

export function generateEmailsApprenantPdf(
  apprenant: { nom: string; prenom: string; civilite?: string; type_apprenant?: string; email?: string | null },
  rows: EmailRow[],
  opts?: { returnBlob?: boolean },
): { blob: Blob; fileName: string } | void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
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
  doc.text("HISTORIQUE DES EMAILS", pw / 2, 36, { align: "center" });

  // Apprenant
  const full = sanitize(`${apprenant.civilite || ""} ${apprenant.prenom || ""} ${apprenant.nom || ""}`.trim());
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Stagiaire : ${full}`, margin, 50);
  doc.text(
    `Formation : ${sanitize((apprenant.type_apprenant || "-").toString().toUpperCase())}`,
    margin, 56,
  );
  if (apprenant.email) doc.text(`Email : ${sanitize(apprenant.email)}`, margin, 62);
  doc.text(`Nombre d'emails : ${rows.length}`, pw - margin, 50, { align: "right" });
  doc.text(`Genere le ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })}`, pw - margin, 56, { align: "right" });

  // Récap tableau
  const summaryBody = rows.map((e) => {
    const dateStr = fmtDate(e.sent_at || e.received_at || e.created_at);
    const type = e.type === "sent" ? "Envoye" : "Recu";
    const from = e.sender_name
      ? `${e.sender_name} <${e.sender_email || ""}>`
      : (e.sender_email || "");
    const to = Array.isArray(e.recipients) ? e.recipients.join(", ") : (e.recipients || "");
    return [
      sanitize(dateStr),
      type,
      sanitize(e.subject || ""),
      sanitize(from),
      sanitize(String(to)),
      e.has_attachments ? "Oui" : "-",
    ];
  });

  if (rows.length === 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(200, 50, 50);
    doc.text("Aucun email enregistre pour cet apprenant.", pw / 2, 90, { align: "center" });
  } else {
    autoTable(doc, {
      startY: 70,
      head: [["Date", "Type", "Sujet", "Expediteur", "Destinataires", "PJ"]],
      body: summaryBody,
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 1.6, valign: "top", overflow: "linebreak" },
      headStyles: { fillColor: [13, 37, 64], textColor: 255, fontStyle: "bold", fontSize: 8, halign: "center" },
      alternateRowStyles: { fillColor: [245, 248, 252] },
      columnStyles: {
        0: { cellWidth: 26, halign: "center" },
        1: { cellWidth: 14, halign: "center" },
        2: { cellWidth: 55 },
        3: { cellWidth: 42 },
        4: { cellWidth: 42 },
        5: { cellWidth: 10, halign: "center" },
      },
      margin: { left: margin, right: margin },
      didDrawPage: () => {
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`${COMPANY.name} - ${COMPANY.address}`, pw / 2, ph - 6, { align: "center" });
      },
    });

    // Détail de chaque email — 1 par bloc, sur nouvelle page si besoin
    for (let idx = 0; idx < rows.length; idx++) {
      const e = rows[idx];
      doc.addPage();
      let y = 20;

      // Bandeau titre email
      doc.setFillColor(13, 37, 64);
      doc.rect(0, 10, pw, 10, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`Email ${idx + 1}/${rows.length}`, margin, 17);
      doc.text(
        e.type === "sent" ? "ENVOYE" : "RECU",
        pw - margin, 17, { align: "right" },
      );

      y = 28;
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      const dateStr = fmtDate(e.sent_at || e.received_at || e.created_at);
      const from = e.sender_name
        ? `${e.sender_name} <${e.sender_email || ""}>`
        : (e.sender_email || "");
      const to = Array.isArray(e.recipients) ? e.recipients.join(", ") : (e.recipients || "");

      const meta: Array<[string, string]> = [
        ["Date", dateStr],
        ["Sujet", e.subject || ""],
        ["Expediteur", from],
        ["Destinataires", String(to)],
        ["Lu", e.is_read ? "Oui" : "Non"],
        ["Pieces jointes", e.has_attachments ? "Oui" : "Non"],
      ];
      for (const [k, v] of meta) {
        doc.setFont("helvetica", "bold");
        doc.text(`${k} :`, margin, y);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(sanitize(v || "-"), pw - margin * 2 - 32);
        doc.text(lines as any, margin + 32, y);
        y += Math.max(5, (Array.isArray(lines) ? lines.length : 1) * 4.2);
      }

      // Séparateur
      y += 2;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pw - margin, y);
      y += 5;

      // Corps
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Contenu du message", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const rawBody = e.body_html ? htmlToText(e.body_html) : (e.body_preview || "");
      const body = sanitize(rawBody) || "(corps vide)";
      const bodyLines = doc.splitTextToSize(body, pw - margin * 2) as string[];

      const lineHeight = 4.4;
      for (const line of bodyLines) {
        if (y > ph - 15) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      }
    }
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
  const fileName = `emails_${slug}.pdf`;
  if (opts?.returnBlob) return { blob: doc.output("blob"), fileName };
  doc.save(fileName);
}
