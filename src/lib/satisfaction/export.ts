import jsPDF from "jspdf";
import { format } from "date-fns";
import type { RapportAnnuel } from "./data";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const n1 = (v: number | null) => (typeof v === "number" ? v.toFixed(1) : "—");
const n0 = (v: number | null) => (typeof v === "number" ? `${Math.round(v)} %` : "—");

export function exportRapportAnnuelCsv(rapport: RapportAnnuel) {
  const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const lines: string[] = [];
  lines.push(esc(`Rapport annuel de satisfaction ${rapport.annee} — FTRANSPORT`));
  lines.push("");
  lines.push(["Indicateur", "Valeur"].map(esc).join(";"));
  lines.push(["Nombre de réponses", String(rapport.nbReponses)].map(esc).join(";"));
  lines.push(["Note globale moyenne /5", n1(rapport.noteGlobaleMoyenne)].map(esc).join(";"));
  lines.push(["Moyenne des critères /5", n1(rapport.moyenneCriteres)].map(esc).join(";"));
  lines.push(["Taux de satisfaction (notes ≥ 4)", n0(rapport.tauxSatisfaction)].map(esc).join(";"));
  lines.push(["Recommanderaient la formation /5", n1(rapport.recommandation)].map(esc).join(";"));
  lines.push("");
  lines.push(["Formation", "Réponses", "Moyenne /5"].map(esc).join(";"));
  rapport.parFormation.forEach((f) => lines.push([f.formation, String(f.nb), n1(f.moyenne)].map(esc).join(";")));
  lines.push("");
  lines.push(["Mois", "Réponses", "Moyenne /5"].map(esc).join(";"));
  rapport.parMois.forEach((m) => lines.push([MOIS[m.mois - 1], String(m.nb), n1(m.moyenne)].map(esc).join(";")));
  lines.push("");
  lines.push(["Partie", "Critère", "Moyenne /5", "Réponses", "% satisfaits"].map(esc).join(";"));
  rapport.criteres.forEach((c) =>
    lines.push([c.partie, c.label, c.moyenne.toFixed(2), String(c.reponses), n0(c.satisfaits)].map(esc).join(";")),
  );
  lines.push("");
  lines.push(["Apprenant", "Formation", "Date", "Note globale /5", "Moyenne critères /5", "Statut"].map(esc).join(";"));
  rapport.enquetes.forEach((e) =>
    lines.push(
      [
        `${e.nom} ${e.prenom}`.trim(),
        e.formation,
        e.date ? format(new Date(e.date), "dd/MM/yyyy") : "",
        n1(e.noteGlobale),
        n1(e.moyenneCriteres),
        e.complete ? "Complété" : "En cours",
      ].map(esc).join(";"),
    ),
  );

  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `rapport-annuel-satisfaction-${rapport.annee}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportRapportAnnuelPdf(rapport: RapportAnnuel) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 14;
  const W = 210;
  let y = 20;

  const page = (needed = 10) => {
    if (y + needed > 282) {
      doc.addPage();
      y = 20;
    }
  };

  doc.setFontSize(17);
  doc.setFont("helvetica", "bold");
  doc.text(`Rapport annuel de satisfaction ${rapport.annee}`, M, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`FTRANSPORT — édité le ${format(new Date(), "dd/MM/yyyy")}`, M, y);
  y += 4;
  doc.setTextColor(120);
  doc.text("Synthèse des questionnaires de satisfaction remplis par les apprenants (indicateurs Qualiopi 1, 30 et 31).", M, y);
  doc.setTextColor(0);
  y += 10;

  const kpis: [string, string][] = [
    ["Réponses reçues", String(rapport.nbReponses)],
    ["Note globale moyenne", `${n1(rapport.noteGlobaleMoyenne)} / 5`],
    ["Moyenne des critères", `${n1(rapport.moyenneCriteres)} / 5`],
    ["Taux de satisfaction", n0(rapport.tauxSatisfaction)],
    ["Recommandation", `${n1(rapport.recommandation)} / 5`],
  ];
  doc.setFontSize(10);
  kpis.forEach(([k, v]) => {
    page();
    doc.setFont("helvetica", "normal");
    doc.text(k, M, y);
    doc.setFont("helvetica", "bold");
    doc.text(v, W - M, y, { align: "right" });
    y += 6;
  });
  y += 4;

  const section = (titre: string) => {
    page(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(titre, M, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
  };

  const row = (left: string, right: string, indent = 0) => {
    page();
    const lines = doc.splitTextToSize(left, 140 - indent) as string[];
    doc.text(lines, M + indent, y);
    doc.text(right, W - M, y, { align: "right" });
    y += lines.length * 4.5 + 1.5;
  };

  section("Répartition par formation");
  rapport.parFormation.forEach((f) => row(`${f.formation} — ${f.nb} réponse(s)`, `${n1(f.moyenne)} / 5`));
  y += 4;

  section("Évolution mensuelle");
  rapport.parMois.filter((m) => m.nb > 0).forEach((m) => row(`${MOIS[m.mois - 1]} — ${m.nb} réponse(s)`, `${n1(m.moyenne)} / 5`));
  y += 4;

  section("Détail par critère");
  let partie = "";
  rapport.criteres.forEach((c) => {
    if (c.partie !== partie) {
      partie = c.partie;
      page(10);
      doc.setFont("helvetica", "bold");
      doc.text(partie, M, y);
      doc.setFont("helvetica", "normal");
      y += 5;
    }
    row(c.label, `${c.moyenne.toFixed(2)} / 5  (${Math.round(c.satisfaits)} %)`, 4);
  });
  y += 4;

  section("Réponses individuelles");
  rapport.enquetes.forEach((e) =>
    row(
      `${`${e.nom} ${e.prenom}`.trim() || "Apprenant"} — ${e.formation}${e.date ? ` — ${format(new Date(e.date), "dd/MM/yyyy")}` : ""}`,
      `${n1(e.noteGlobale)} / 5`,
    ),
  );

  doc.save(`rapport-annuel-satisfaction-${rapport.annee}.pdf`);
}
