import jsPDF from "jspdf";
import { format } from "date-fns";
import { CRITERES, INDICATEURS, STATUT_LABELS } from "./referentiel";
import type { QualiopiEtat, QualiopiPreuve } from "./data";

export interface ExportRow {
  critere: number;
  indicateur: number;
  intitule: string;
  exigence: string;
  preuves: string[];
  commentaire: string;
  statut: string;
  responsable: string;
  verification: string;
}

export function buildExportRows(
  etats: Record<number, QualiopiEtat>,
  preuvesParIndicateur: Record<number, QualiopiPreuve[]>,
): ExportRow[] {
  return INDICATEURS.map((ind) => {
    const etat = etats[ind.numero];
    const preuves = (preuvesParIndicateur[ind.numero] || []).filter((p) => !p.archivee);
    return {
      critere: ind.critere,
      indicateur: ind.numero,
      intitule: ind.intitule,
      exigence: ind.niveauAttendu,
      preuves: preuves.map((p) => p.titre),
      commentaire: etat?.commentaire_auditeur || "",
      statut: STATUT_LABELS[etat?.statut ?? "preuve_manquante"],
      responsable: etat?.responsable || "",
      verification: etat?.date_verification || "",
    };
  });
}

export function exportQualiopiCsv(rows: ExportRow[]) {
  const head = ["Critère", "Indicateur", "Intitulé", "Exigence", "Preuves disponibles", "Commentaire auditeur", "Statut", "Responsable", "Dernière vérification"];
  const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const lines = [head.map(esc).join(";")];
  for (const r of rows) {
    lines.push([
      String(r.critere), String(r.indicateur), r.intitule, r.exigence,
      r.preuves.join(" | "), r.commentaire, r.statut, r.responsable, r.verification,
    ].map(esc).join(";"));
  }
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `qualiopi-etat-des-preuves-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportQualiopiPdf(rows: ExportRow[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 14;
  let y = 18;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Dossier d'audit Qualiopi — état des preuves", M, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`FTRANSPORT — édité le ${format(new Date(), "dd/MM/yyyy")}`, M, y);
  y += 5;
  doc.setTextColor(120);
  doc.text("Document de préparation : la couverture documentaire ne vaut pas décision de conformité.", M, y);
  doc.setTextColor(0);
  y += 8;

  let currentCritere = 0;
  for (const r of rows) {
    const block: string[] = [];
    block.push(`Exigence : ${r.exigence}`);
    block.push(`Preuves : ${r.preuves.length ? r.preuves.join(" ; ") : "aucune preuve rattachée"}`);
    if (r.commentaire) block.push(`Commentaire : ${r.commentaire}`);
    block.push(`Statut : ${r.statut}${r.responsable ? ` — Responsable : ${r.responsable}` : ""}${r.verification ? ` — Vérifié le ${r.verification}` : ""}`);

    const wrapped = block.flatMap((t) => doc.splitTextToSize(t, W - 2 * M - 4) as string[]);
    const needed = 12 + wrapped.length * 4.2;
    if (y + needed > 282) { doc.addPage(); y = 18; }

    if (r.critere !== currentCritere) {
      currentCritere = r.critere;
      const c = CRITERES.find((x) => x.numero === r.critere);
      doc.setFillColor(238, 242, 248);
      const title = doc.splitTextToSize(`Critère ${r.critere} — ${c?.intitule ?? ""}`, W - 2 * M - 4) as string[];
      doc.rect(M, y - 4, W - 2 * M, 4.6 * title.length + 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(title, M + 2, y);
      y += 4.6 * title.length + 4;
      doc.setFont("helvetica", "normal");
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    const head = doc.splitTextToSize(`Indicateur ${r.indicateur} — ${r.intitule}`, W - 2 * M) as string[];
    doc.text(head, M, y);
    y += head.length * 4.4 + 1;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(wrapped, M + 3, y);
    y += wrapped.length * 4.2 + 5;
  }

  doc.save(`qualiopi-etat-des-preuves-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
