import jsPDF from "jspdf";
import { ORGANISME } from "./modele";

export interface ModulePdf { id: number; statut: string | null; preuve_complete: boolean | null; completed_at?: string | null }
export interface EntreePdf {
  /** brouillon = aperçu non valable ; officiel = texte figé enregistré. */
  mode: "brouillon" | "officiel";
  titre?: string;
  lignes: string[];
  modules: ModulePdf[];
  motifs?: string[];
  infos?: string[];
  reference?: string | null;
  empreinte?: string | null;
  signatureCentre?: { representant: string; le: string | null; image: string | null } | null;
  signatureApprenant?: { nom: string; image: string | null; le: string | null } | null;
}
const etatModule = (m: ModulePdf) => (m.statut === "completed" && m.preuve_complete === true ? "Validé" : m.statut == null ? "Aucune preuve" : "Non validé");

/** PDF de l'attestation ; un brouillon porte un filigrane et n'atteste jamais un achèvement. */
export function genererPdfAttestation(e: EntreePdf): Blob {
  const doc = new jsPDF();
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  let y = 18;
  const ligne = (t: string, opts: { gras?: boolean; taille?: number; centre?: boolean } = {}) => {
    doc.setFont("helvetica", opts.gras ? "bold" : "normal"); doc.setFontSize(opts.taille ?? 10.5);
    const parts = doc.splitTextToSize(t, W - 30) as string[];
    for (const p of parts) { if (y > H - 20) { doc.addPage(); y = 18; } doc.text(p, opts.centre ? W / 2 : 15, y, opts.centre ? { align: "center" } : undefined); y += (opts.taille ?? 10.5) * 0.5; }
    y += 2;
  };
  if (e.mode === "brouillon") {
    doc.setTextColor(200, 60, 60); doc.setFont("helvetica", "bold"); doc.setFontSize(46);
    doc.text("BROUILLON", W / 2, H / 2, { align: "center", angle: 30 });
    doc.setTextColor(0, 0, 0);
  }
  ligne(`${ORGANISME.raisonSociale} — ${ORGANISME.adresse} — NDA ${ORGANISME.nda}`, { taille: 9 });
  if (e.mode === "brouillon") ligne("BROUILLON — DOCUMENT NON VALABLE, NON SIGNÉ", { gras: true, centre: true, taille: 11 });
  for (const [i, l] of e.lignes.entries()) ligne(l, i === 0 ? { gras: true, centre: true, taille: 15 } : {});
  if (e.motifs?.length) { ligne("Parcours non validé — attestation non délivrable :", { gras: true }); for (const m of e.motifs) ligne(`• ${m}`); }
  for (const i of e.infos ?? []) ligne(i, { taille: 9 });
  if (e.modules.length) {
    ligne("État des modules attribués", { gras: true });
    for (const m of e.modules) ligne(`Module ${m.id} : ${etatModule(m)}${m.completed_at ? ` (validé le ${new Date(m.completed_at).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })})` : ""}`, { taille: 9.5 });
  }
  if (y > H - 70) { doc.addPage(); y = 18; }
  y += 4;
  const bx = 15, bw = (W - 40) / 2, bh = 42;
  doc.setDrawColor(120); doc.rect(bx, y, bw, bh); doc.rect(bx + bw + 10, y, bw, bh);
  doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.text("Pour le centre", bx + 3, y + 5); doc.text("L'apprenant(e)", bx + bw + 13, y + 5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
  const sc = e.signatureCentre, sa = e.signatureApprenant;
  if (sc) {
    doc.text(sc.representant, bx + 3, y + 10);
    if (sc.le) doc.text(`Autorisée le ${new Date(sc.le).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`, bx + 3, y + 14);
    if (sc.image) doc.addImage(sc.image, "PNG", bx + 3, y + 16, bw - 6, bh - 19);
  } else doc.text("Non signée", bx + 3, y + 10);
  if (sa) {
    doc.text(sa.nom, bx + bw + 13, y + 10);
    if (sa.le) doc.text(`Signée le ${sa.le}`, bx + bw + 13, y + 14, { maxWidth: bw - 6 });
    if (sa.image) doc.addImage(sa.image, "PNG", bx + bw + 13, y + 18, bw - 6, bh - 21);
  } else doc.text("Non signée", bx + bw + 13, y + 10);
  y += bh + 8;
  if (e.reference || e.empreinte) { doc.setFontSize(7.5); doc.text(`Référence ${e.reference ?? "—"} — empreinte SHA-256 ${e.empreinte ?? "—"}`, 15, Math.min(y, H - 10), { maxWidth: W - 30 }); }
  return doc.output("blob");
}

export function telechargerBlob(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = nom; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export function ouvrirBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
