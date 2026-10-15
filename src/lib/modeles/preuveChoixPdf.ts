import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { TexteFige } from "./entrainementPratiqueVtc";

export interface PreuveChoix {
  texte: TexteFige;
  version: string | null;
  empreinte: string | null;
  /** Identité FIGÉE à la préparation (jamais la fiche courante). */
  nom: string;
  prenom: string;
  email?: string | null;
  choix: string | null;
  signature: string | null;
  signeLeParis: string | null;
  signedAt: string | null;
  envoyeLe: string | null;
}

const nettoyer = (s: string) => s.replace(/[^\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2019\u20AC«»]/g, "");

/** PDF de preuve généré depuis le texte figé (aucun fichier source). */
export async function genererPreuveChoixPdf(p: PreuveChoix): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]);
  const M = 50, W = 595 - 2 * M;
  let y = 842 - M;

  const ligne = (t: string, f = font, size = 10.5, color = rgb(0.1, 0.1, 0.1)) => {
    const mots = nettoyer(t).split(/\s+/);
    let cur = "";
    const flush = () => {
      if (y < M + 20) { page = pdf.addPage([595, 842]); y = 842 - M; }
      page.drawText(cur, { x: M, y, size, font: f, color });
      y -= size * 1.45;
      cur = "";
    };
    for (const m of mots) {
      const test = cur ? `${cur} ${m}` : m;
      if (f.widthOfTextAtSize(test, size) > W && cur) { flush(); cur = m; } else cur = test;
    }
    if (cur) flush();
  };
  const espace = (h = 6) => { y -= h; };

  ligne(`FTRANSPORT SERVICES PRO – ${p.texte.titre ?? "Choix entraînement pratique"}`, bold, 13);
  ligne(`Modèle ${p.version ?? "?"} – empreinte du texte : ${p.empreinte ?? "?"}`, font, 8, rgb(0.4, 0.4, 0.4));
  espace(8);
  p.texte.intro.forEach((t) => { ligne(t); espace(4); });
  ligne(p.texte.consigne, bold);
  p.texte.choix.forEach((c) => {
    const coche = c.code === p.choix ? "[X]" : "[  ]";
    ligne(`${coche} ${c.label}`, c.code === p.choix ? bold : font);
  });
  espace(6);
  p.texte.suite.forEach((t) => { ligne(t); espace(4); });
  espace(8);
  ligne(`Nom, prénom : ${p.nom} ${p.prenom}`, bold);
  if (p.email) ligne(`Destinataire : ${p.email}`, font, 9);
  ligne(`Date : ${p.signeLeParis ?? "non signé"}`, bold);
  if (p.signedAt) ligne(`Horodatage serveur (UTC) : ${p.signedAt}`, font, 8, rgb(0.4, 0.4, 0.4));
  if (p.envoyeLe) ligne(`Date d'envoi enregistrée du mail (UTC, pas une preuve de réception) : ${p.envoyeLe}`, font, 8, rgb(0.4, 0.4, 0.4));
  ligne("Signature :", bold);
  if (p.signature?.startsWith("data:image/png;base64,")) {
    const bytes = Uint8Array.from(atob(p.signature.split(",")[1]), (c) => c.charCodeAt(0));
    const img = await pdf.embedPng(bytes);
    const h = 70, w = Math.min(220, (img.width / img.height) * h);
    if (y - h < M) { page = pdf.addPage([595, 842]); y = 842 - M; }
    page.drawImage(img, { x: M, y: y - h, width: w, height: h });
    y -= h + 10;
  } else {
    ligne("(aucune signature)");
  }
  espace(10);
  p.texte.signataire.forEach((t) => ligne(t, font, 9));
  return pdf.save();
}
