import jsPDF from "jspdf";
import { format } from "date-fns";
import { htmlToText } from "./templates";
import {
  MODES_PAIEMENT,
  STATUT_LABELS,
  STATUT_ENVOI_LABELS,
  TYPE_ENVOI_LABELS,
  TYPES_PIECE,
  type PrestataireDossier,
  type PrestataireEnvoi,
  type PrestataireHistorique,
  type PrestatairePiece,
} from "./types";

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  const [y, m, j] = d.split("-");
  return y && m && j ? `${j}/${m}/${y}` : d;
};
const fmtDateTime = (d?: string | null) =>
  d ? format(new Date(d), "dd/MM/yyyy 'à' HH:mm") : "—";
const fmtMontant = (n?: number | null) =>
  n === null || n === undefined
    ? "—"
    : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(n));

export function exportDossierJustificatif(
  dossier: PrestataireDossier,
  envois: PrestataireEnvoi[],
  pieces: PrestatairePiece[],
  historique: PrestataireHistorique[],
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 14;
  let y = M;

  const ensure = (needed = 10) => {
    if (y + needed > 285) {
      doc.addPage();
      y = M;
    }
  };
  const titre = (t: string) => {
    ensure(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text(t, M, y);
    y += 2;
    doc.setDrawColor(200);
    doc.line(M, y, W - M, y);
    y += 6;
  };
  const ligne = (label: string, value: string) => {
    ensure(7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(`${label} :`, M, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value || "—", W - M - 60);
    doc.text(lines, M + 52, y);
    y += Math.max(5.5, lines.length * 4.6);
  };
  const paragraphe = (text: string, size = 9) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, W - 2 * M);
    for (const l of lines) {
      ensure(6);
      doc.text(l, M, y);
      y += 4.4;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Dossier justificatif de dépense", M, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(`Facture prestataire manquante — édité le ${format(new Date(), "dd/MM/yyyy 'à' HH:mm")}`, M, y);
  doc.setTextColor(20);
  y += 10;

  titre("Prestataire");
  ligne("Nom / prénom", [dossier.prestataire_prenom, dossier.prestataire_nom].filter(Boolean).join(" "));
  ligne("Raison sociale", dossier.raison_sociale ?? "");
  ligne("SIREN", dossier.siren ?? "");
  ligne("SIRET", dossier.siret ?? "");
  ligne("Adresse", dossier.adresse ?? "");
  ligne("E-mail", dossier.email ?? "");
  ligne("Téléphone", dossier.telephone ?? "");
  y += 3;

  titre("Prestation");
  ligne("Description", dossier.description_prestation ?? "");
  ligne("Date", fmtDate(dossier.date_prestation));
  if (dossier.periode_debut || dossier.periode_fin) {
    ligne("Période", `${fmtDate(dossier.periode_debut)} → ${fmtDate(dossier.periode_fin)}`);
  }
  ligne("Devis / commande", dossier.numero_commande ?? "");
  ligne("Montant HT", fmtMontant(dossier.montant_ht));
  ligne("TVA", fmtMontant(dossier.tva));
  ligne("Montant TTC", fmtMontant(dossier.montant_ttc));
  ligne("Commentaire interne", dossier.commentaire_interne ?? "");
  y += 3;

  titre("Paiement");
  ligne("Date du paiement", fmtDate(dossier.date_paiement));
  ligne("Montant payé", fmtMontant(dossier.montant_paye));
  ligne("Mode de paiement", MODES_PAIEMENT.find((m) => m.value === dossier.mode_paiement)?.label ?? "");
  ligne("Référence", dossier.reference_paiement ?? "");
  ligne("Statut du dossier", STATUT_LABELS[dossier.statut] ?? dossier.statut);
  y += 3;

  titre("Chronologie des demandes");
  if (envois.length === 0) {
    paragraphe("Aucune demande enregistrée.");
  } else {
    for (const e of envois) {
      ensure(8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(
        `${TYPE_ENVOI_LABELS[e.type_envoi] ?? e.type_envoi} — ${fmtDateTime(e.envoye_le ?? e.created_at)} — ${
          STATUT_ENVOI_LABELS[e.statut] ?? e.statut
        }`,
        M,
        y,
      );
      y += 5;
      paragraphe(`Destinataire : ${e.destinataire_email}${e.declenche_par_email ? ` — envoyé par ${e.declenche_par_email}` : ""}`);
      paragraphe(`Objet : ${e.objet}`);
      if (e.erreur) paragraphe(`Erreur : ${e.erreur}`);
      if (e.provider_message_id) paragraphe(`Identifiant technique : ${e.provider_message_id}`);
      y += 1;
    }
  }
  y += 3;

  titre("Copie exacte des e-mails envoyés");
  if (envois.length === 0) {
    paragraphe("Aucun e-mail envoyé.");
  } else {
    for (const e of envois) {
      ensure(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(`${TYPE_ENVOI_LABELS[e.type_envoi] ?? e.type_envoi} — ${fmtDateTime(e.envoye_le ?? e.created_at)}`, M, y);
      y += 5;
      paragraphe(`Objet : ${e.objet}`, 9);
      y += 1;
      paragraphe(htmlToText(e.corps_html), 8.5);
      y += 4;
    }
  }

  titre("Pièces justificatives enregistrées");
  if (pieces.length === 0) {
    paragraphe("Aucune pièce enregistrée.");
  } else {
    for (const p of pieces) {
      ensure(6);
      const label = TYPES_PIECE.find((t) => t.value === p.type_piece)?.label ?? p.type_piece;
      paragraphe(`• ${label} — ${p.titre ?? p.nom_fichier ?? ""} (ajouté le ${fmtDateTime(p.created_at)})`);
    }
  }
  y += 3;

  titre("Facture reçue");
  if (dossier.facture_numero || dossier.facture_recue_le) {
    ligne("Numéro", dossier.facture_numero ?? "");
    ligne("Date de réception", fmtDate(dossier.facture_recue_le));
    ligne("Montant HT", fmtMontant(dossier.facture_montant_ht));
    ligne("TVA", fmtMontant(dossier.facture_tva));
    ligne("Montant TTC", fmtMontant(dossier.facture_montant_ttc));
  } else {
    paragraphe("Aucune facture reçue à ce jour.");
  }
  y += 3;

  titre("Historique du dossier");
  for (const h of historique.slice().reverse()) {
    ensure(6);
    paragraphe(`• ${fmtDateTime(h.created_at)} — ${h.action}${h.utilisateur_email ? ` (${h.utilisateur_email})` : ""}`);
  }
  y += 5;

  ensure(24);
  doc.setDrawColor(180);
  doc.setFillColor(248, 248, 248);
  const boxY = y;
  doc.rect(M, boxY, W - 2 * M, 22, "FD");
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Avertissement", M + 4, y);
  y += 4.5;
  doc.setFont("helvetica", "normal");
  const avert = doc.splitTextToSize(
    "Les demandes de facture, relances et autres justificatifs réunis dans ce dossier ne remplacent pas nécessairement une facture conforme. Ils ne garantissent pas, à eux seuls, la déductibilité de la dépense ni la récupération de la TVA au regard des règles fiscales applicables.",
    W - 2 * M - 8,
  );
  doc.text(avert, M + 4, y);

  const nom = (dossier.raison_sociale || dossier.prestataire_nom || "prestataire")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .toLowerCase();
  doc.save(`dossier-justificatif-${nom}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
