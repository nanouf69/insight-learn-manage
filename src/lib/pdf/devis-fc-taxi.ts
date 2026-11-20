import jsPDF from "jspdf";

/** Devis Formation continue TAXI (PDF), aligné sur les CGV publiques CGV-FC-TAXI-2026-10-22-v6. */
export type ModeSignatureFcTaxi = "centre" | "distance";

export const TARIF_PUBLIC_FC_TAXI = 299;
export const CGV_VERSION_FC_TAXI = "CGV-FC-TAXI-2026-10-22-v6";
export const PROGRAMME_FC_TAXI_URL = "https://ftransport.fr/programme-continue-taxi";
/** Médiateur de la consommation (L612-1) : aucun enregistré. Non bloquant ; alerte administrateur dans le CRM, aucun nom inventé ni placeholder imprimé. */
export const MEDIATEUR_FC_TAXI: string | null = null;

export const delaiRetractationFcTaxi = (mode: ModeSignatureFcTaxi): 10 | 14 => (mode === "centre" ? 10 : 14);

/** Acompte : 50 € comme sur le site, plafonné à 30 % du prix (L6353-6) ; solde réparti sur les deux jours. */
export function echeancierFcTaxi(prix: number) {
  const p = Math.max(0, Math.round(prix * 100) / 100);
  const plafond = Math.floor(p * 30) / 100;
  const acompte = Math.min(50, plafond);
  const solde = Math.round((p - acompte) * 100) / 100;
  const jour1 = Math.round((solde / 2) * 100) / 100;
  return { prix: p, acompte, plafond30: plafond, solde, jour1, jour2: Math.round((solde - jour1) * 100) / 100 };
}

export function ecartPrixFcTaxi(prix: number): string | null {
  return Math.abs(prix - TARIF_PUBLIC_FC_TAXI) < 0.005 ? null : `Prix du devis ${eur(prix)} ≠ tarif public ${eur(TARIF_PUBLIC_FC_TAXI)}`;
}

export const eur = (n: number) => `${n.toFixed(2).replace(".", ",").replace(",00", "")} €`;

export interface DevisFcTaxiInput {
  client: { nomComplet: string; adresse: string; codePostal: string; ville: string; telephone: string; email: string };
  dates: string;
  dateDevis: string; // jj/mm/aaaa
  dateValidite?: string; // jj/mm/aaaa
  prix: number;
  mode: ModeSignatureFcTaxi;
}

export interface Article { titre: string; texte: string }

export function articlesFcTaxi(input: Pick<DevisFcTaxiInput, "prix" | "mode" | "dates">, mediateur: string | null = MEDIATEUR_FC_TAXI): Article[] {
  const d = delaiRetractationFcTaxi(input.mode);
  const e = echeancierFcTaxi(input.prix);
  const dates = input.dates;
  const retract = input.mode === "centre"
    ? `Contrat signé dans les locaux de FTRANSPORT (86 route de Genas, 69003 Lyon). Le stagiaire dispose d'un délai de rétractation de 10 jours à compter de la signature du contrat de formation (article L6353-5 du Code du travail).`
    : `Contrat conclu à distance (internet) ou hors établissement. Le Client consommateur dispose d'un délai de rétractation de 14 jours à compter de la conclusion du contrat, sans avoir à motiver sa décision ni à supporter de frais (articles L221-18 et suivants du Code de la consommation). Ce délai couvre également le délai de 10 jours de l'article L6353-5 du Code du travail. Un formulaire type de rétractation figure en annexe.`;
  return [
    { titre: "Article 1 - Objet", texte: `Les présentes conditions générales de vente s'appliquent à la formation continue obligatoire des conducteurs de TAXI dispensée par FTRANSPORT. Elles sont communiquées au Client avant toute commande et ne lui sont opposables qu'après acceptation expresse lors de la conclusion du contrat de formation professionnelle (article 1119 du Code civil et L6353-3 du Code du travail). En cas de contradiction, les stipulations du contrat de formation signé prévalent.` },
    { titre: "Article 2 - Délai de rétractation", texte: `${retract}\nLe délai court en totalité ; aucune renonciation n'est demandée au Client.\nLa rétractation peut être notifiée par toute déclaration dénuée d'ambiguïté, notamment par e-mail à contact@ftransport.fr ou par lettre au 86 route de Genas, 69003 Lyon.` },
    { titre: "Article 3 - Prix et modalités de paiement", texte: `Prix total de la formation : ${eur(e.prix)}. Moyens de paiement acceptés : virement bancaire ou espèces.\n3.1 - Personne physique finançant elle-même sa formation (article L6353-6 du Code du travail) : aucune somme, y compris l'acompte, ne peut être exigée ni encaissée avant l'expiration du délai de rétractation de ${d} jours (article 2). À l'expiration de ce délai, un acompte de ${eur(e.acompte)} devient exigible ; il ne dépasse pas 30 % du prix (${eur(e.plafond30)}). Le solde de ${eur(e.solde)} est échelonné au cours de la formation : ${eur(e.jour1)} le premier jour et ${eur(e.jour2)} le second jour. Si le délai de rétractation n'a pas expiré au premier jour de la formation, aucune somme n'est exigée avant son expiration.\n3.2 - Formation financée par un employeur, un OPCO, France Travail ou un autre organisme : l'article L6353-6 ne s'applique pas ; les modalités de paiement sont celles de la convention ou de l'accord de prise en charge conclu avec le financeur. Aucun acompte n'est demandé au stagiaire pour la part prise en charge.` },
    { titre: "Article 4 - Inscription et effectif", texte: `Session : ${dates}. Effectif maximal : 16 stagiaires. Les inscriptions sont prises en compte dans leur ordre d'arrivée, dans la limite des places disponibles. L'inscription devient définitive après signature du contrat de formation et expiration du délai de rétractation applicable. Si la session est complète, aucune somme n'est due.` },
    { titre: "Article 5 - Informations préalables (article L6353-8 du Code du travail)", texte: `• Nature : formation continue obligatoire des conducteurs de TAXI, en présentiel\n• Durée : 14 heures, ${dates}, 9h–12h / 13h–17h (pause 12h–13h hors temps pédagogique)\n• Lieu : 86 route de Genas, 69003 Lyon\n• Programme et objectifs : ${PROGRAMME_FC_TAXI_URL}\n• Effectif : 16 stagiaires maximum\n• Prérequis : être titulaire d'une carte professionnelle de conducteur de TAXI à renouveler\n• Prix et modalités de paiement : article 3\n• Cessation anticipée : article 7` },
    { titre: "Article 6 - Dédit et remplacement", texte: `En cas de dédit signifié par le Client au moins 7 jours avant le démarrage de la formation, FTRANSPORT offre la possibilité de reporter l'inscription du stagiaire à une session ultérieure ou de le remplacer par un autre participant. Ce dédit ne prive pas le Client de son droit de rétractation (article 2).` },
    { titre: "Article 7 - Force majeure et cessation anticipée", texte: `FTRANSPORT est tenue à une obligation de moyens. Elle ne peut être tenue responsable d'une inexécution résultant d'un cas de force majeure au sens de l'article 1218 du Code civil. Lorsque, par suite de force majeure dûment reconnue, le stagiaire est empêché de suivre la formation, le contrat est résilié et seules les prestations effectivement dispensées sont dues, au prorata temporis de leur valeur prévue au contrat (article L6353-7 du Code du travail).` },
    { titre: "Article 8 - Règlement intérieur", texte: `Le règlement intérieur applicable aux stagiaires (articles L6352-3 et R6352-1 et suivants du Code du travail) est remis à chaque participant avant le début de la formation et disponible sur simple demande.` },
    { titre: "Article 9 - Propriété intellectuelle", texte: `Les contenus et supports pédagogiques utilisés par FTRANSPORT sont protégés par le droit d'auteur. Ils sont destinés à un usage personnel strictement lié à la formation suivie et ne peuvent être reproduits ou diffusés sans accord écrit de FTRANSPORT.` },
    { titre: "Article 10 - Données personnelles", texte: `Les données collectées sont utilisées par FTRANSPORT pour la gestion de l'inscription et de la formation. Le Client dispose d'un droit d'accès, de rectification et d'effacement en écrivant à contact@ftransport.fr.` },
    { titre: mediateur ? "Article 11 - Réclamations et médiation de la consommation" : "Article 11 - Réclamations", texte: `Toute réclamation peut être adressée par e-mail à contact@ftransport.fr ou par courrier au 86 route de Genas, 69003 Lyon.${mediateur ? ` En cas de litige non résolu, le Client consommateur peut recourir gratuitement au médiateur de la consommation (article L612-1 du Code de la consommation) : ${mediateur}.` : ""}` },
  ];
}

/** Données légalement indispensables manquantes : le CRM refuse le téléchargement au lieu de produire un faux document. */
export function manquesDevisFcTaxi(input: DevisFcTaxiInput): string[] {
  const m: string[] = [];
  if (!input.client.nomComplet?.trim()) m.push("nom du stagiaire");
  if (!input.client.adresse?.trim() || !input.client.ville?.trim()) m.push("adresse du stagiaire");
  if (!input.dates?.trim()) m.push("dates de formation");
  if (!input.dateDevis?.trim()) m.push("date du devis");
  if (!(input.prix > 0)) m.push("prix de la formation");
  return m;
}

/** Mail d'envoi FC TAXI : aucune mention TVA/TTC non prouvée, aucun paiement avant la fin du délai. */
export function mailDevisFcTaxi(prenom: string, nom: string, prix: number, mode: ModeSignatureFcTaxi) {
  return {
    subject: `Votre devis Formation continue TAXI - ${prenom} ${nom}`.trim(),
    body: `Bonjour ${prenom} ${nom},\n\nVeuillez trouver en pièce jointe votre devis pour la Formation continue obligatoire TAXI (14 heures en présentiel, 86 route de Genas, 69003 Lyon), avec les conditions générales de vente en annexe.\n\nPrix de la formation : ${eur(prix)}.\nDélai de rétractation : ${delaiRetractationFcTaxi(mode)} jours. Aucun paiement n'est demandé avant la fin de ce délai.\n\nCe devis ne vaut pas contrat de formation : un contrat individuel vous sera remis avant l'inscription définitive.\n\nVous pouvez consulter et signer le devis en ligne grâce au lien ci-dessous.\n\ncontact@ftransport.fr | 04.28.29.60.91\n\nCordialement,\nL'équipe Ftransport`,
  };
}

export const MENTION_NON_CONTRAT = "Ce devis ne vaut pas contrat de formation ; un contrat individuel (article L6353-3 du Code du travail) est conclu avant l'inscription définitive et tout paiement.";

export const QUESTIONS_NON_REPONDABLES = [
  "Avez-vous déjà perdu 6 points d'un coup sur votre permis ?",
  "Avez-vous déjà été condamné pour conduite sans permis ?",
  "Avez-vous été condamné pour refus de restitution du permis ?",
  "Avez-vous été condamné à plus de 6 mois d'emprisonnement pour vol, escroquerie, etc. ?",
  "Avez-vous le casier judiciaire B3 vierge ?",
];

/** Tout le texte imprimé, pour contrôle (tests). */
export function texteDevisFcTaxi(input: DevisFcTaxiInput): string {
  return [MENTION_NON_CONTRAT, ...articlesFcTaxi(input).flatMap(a => [a.titre, a.texte]), ...QUESTIONS_NON_REPONDABLES, formulaireRetractation()].join("\n");
}

export function formulaireRetractation(): string {
  return `À l'attention de FTRANSPORT, 86 route de Genas, 69003 Lyon — contact@ftransport.fr :\nJe/Nous (*) vous notifie/notifions (*) par la présente ma/notre (*) rétractation du contrat portant sur la prestation de services ci-dessous :\nFormation continue obligatoire TAXI\nCommandée le (*) / reçue le (*) : ................................\nNom du (des) consommateur(s) : ................................\nAdresse du (des) consommateur(s) : ................................\nSignature du (des) consommateur(s) (uniquement en cas de notification sur papier) :\n\nDate : ................................\n(*) Rayez la mention inutile.`;
}

/** Modèle enregistré dans devis_envois pour un devis FC TAXI PDF v6 (mode de signature inclus). */
export const modeleFcTaxiPdf = (mode: ModeSignatureFcTaxi) => `fc_taxi_pdf_v6_${mode}`;
export function modeFcTaxiDepuisModele(modele: unknown): ModeSignatureFcTaxi | null {
  const m = /^fc_taxi_pdf_v6_(centre|distance)$/.exec(String(modele ?? ""));
  return m ? (m[1] as ModeSignatureFcTaxi) : null;
}
export function prixDepuisMontant(montant: unknown): number {
  const n = Number(String(montant ?? "").replace(/[^0-9,.-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
export interface SignatureClientFcTaxi { imagePng: string; horodatage: string; mention: string }

export interface FontesUnicode { regular: string; bold: string } // base64

export function buildDevisFcTaxiPdf(input: DevisFcTaxiInput, fontes?: FontesUnicode, mediateur: string | null = MEDIATEUR_FC_TAXI, signature?: SignatureClientFcTaxi): jsPDF {
  const manques = manquesDevisFcTaxi(input);
  if (manques.length) throw new Error(`Devis non généré — information manquante : ${manques.join(", ")}`);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let F = "helvetica";
  if (fontes) {
    doc.addFileToVFS("DejaVuSans.ttf", fontes.regular); doc.addFont("DejaVuSans.ttf", "DejaVu", "normal");
    doc.addFileToVFS("DejaVuSans-Bold.ttf", fontes.bold); doc.addFont("DejaVuSans-Bold.ttf", "DejaVu", "bold");
    F = "DejaVu";
  }
  const W = 210, M = 15, CW = W - 2 * M, BOTTOM = 280;
  let y = 15;
  const font = (s: "normal" | "bold", size: number) => { doc.setFont(F, s); doc.setFontSize(size); };
  const need = (h: number) => { if (y + h > BOTTOM) { doc.addPage(); y = 18; } };
  const para = (t: string, size = 9, style: "normal" | "bold" = "normal", gap = 1.5) => {
    font(style, size);
    for (const line of t.split("\n")) {
      const lines = doc.splitTextToSize(line, CW) as string[];
      for (const l of lines) { need(size * 0.45); doc.text(l, M, y); y += size * 0.45; }
    }
    y += gap;
  };
  const titre = (t: string) => { need(14); y += 2; doc.setFillColor(30, 64, 120); doc.rect(M, y - 4.5, CW, 7, "F"); doc.setTextColor(255, 255, 255); font("bold", 10.5); doc.text(t, M + 2, y); doc.setTextColor(0, 0, 0); y += 7; };
  const e = echeancierFcTaxi(input.prix);
  const d = delaiRetractationFcTaxi(input.mode);

  // En-tête
  font("bold", 16); doc.setTextColor(30, 64, 120); doc.text("FTRANSPORT", M, y); doc.setTextColor(0, 0, 0);
  font("normal", 8); doc.text(["86 route de Genas, 69003 Lyon", "04 28 29 60 91 · contact@ftransport.fr"], W - M, y - 3, { align: "right" });
  y += 8;
  font("bold", 14); doc.text("DEVIS – Formation continue TAXI", W / 2, y, { align: "center" }); y += 5;
  font("normal", 8.5); doc.text(`Devis du ${input.dateDevis}${input.dateValidite ? ` · valable jusqu'au ${input.dateValidite}` : ""} · Conditions ${CGV_VERSION_FC_TAXI}`, W / 2, y, { align: "center" }); y += 6;

  titre("Stagiaire");
  const c = input.client;
  para([`Nom et prénom : ${c.nomComplet || "—"}`, `Adresse : ${[c.adresse, [c.codePostal, c.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—"}`, `Téléphone : ${c.telephone || "—"}    E-mail : ${c.email || "—"}`].join("\n"), 9.5);

  titre("Formation");
  const rows: [string, string][] = [
    ["Intitulé", "Formation continue obligatoire des conducteurs de TAXI (présentiel)"],
    ["Dates", input.dates],
    ["Horaires / durée", "9h–12h / 13h–17h · 14 heures"],
    ["Lieu", "86 route de Genas, 69003 Lyon"],
    ["Effectif", "16 stagiaires maximum"],
    ["Programme", PROGRAMME_FC_TAXI_URL],
    ["Prix total", eur(e.prix)],
    ["Échéancier (financement personnel)", `Acompte ${eur(e.acompte)} après le délai de rétractation, puis ${eur(e.jour1)} + ${eur(e.jour2)} pendant la formation`],
    ["Signature du contrat", input.mode === "centre" ? "Au centre — rétractation 10 jours (L6353-5 C. trav.)" : "À distance / hors établissement — rétractation 14 jours (L221-18 C. conso)"],
  ];
  for (const [k, v] of rows) {
    font("normal", 9); const lines = doc.splitTextToSize(v, CW - 64) as string[];
    font("bold", 9); const kl = doc.splitTextToSize(k, 58) as string[];
    const h = Math.max(lines.length, kl.length) * 4.2 + 2.4; need(h);
    doc.setDrawColor(200); doc.rect(M, y - 3.6, CW, h);
    doc.text(kl, M + 2, y); font("normal", 9); doc.text(lines, M + 62, y); y += h;
  }
  y += 3;
  doc.setFillColor(255, 243, 205); font("bold", 9); const nc = doc.splitTextToSize(MENTION_NON_CONTRAT, CW - 4) as string[];
  need(nc.length * 4.5 + 4); doc.rect(M, y - 4, CW, nc.length * 4.5 + 3, "F"); font("bold", 9); doc.text(nc, M + 2, y); y += nc.length * 4.5 + 3;
  para("Aucun paiement n'est demandé avant la fin du délai de rétractation.", 8.5);

  titre("Informations vous concernant");
  para("Les cinq questions suivantes sont affichées pour information mais ne peuvent pas recevoir de réponse : aucune donnée relative aux infractions ou condamnations n'est recueillie. Ne joignez aucun extrait de casier judiciaire.", 8.5);
  QUESTIONS_NON_REPONDABLES.forEach((q, i) => para(`${i + 1}. ${q} — Réponse non recueillie`, 8.5, "normal", 0.5));
  para("6. Formation TAXI continue déjà réalisée il y a plus de 5 ans ?   Oui ☐   Non ☐", 8.5);

  // Signatures du devis, puis CGV en annexe paginée dans le même PDF
  need(48); titre("Signatures");
  const half = (CW - 6) / 2;
  font("bold", 9); doc.text("Le stagiaire", M, y); doc.text("Pour FTRANSPORT", M + half + 6, y); y += 4;
  font("normal", 8); doc.text(doc.splitTextToSize("Date, signature précédée de « Lu et approuvé, bon pour accord du devis »", half) as string[], M, y);
  doc.text("Cachet et signature de l'organisme", M + half + 6, y); y += 6;
  doc.setDrawColor(150); doc.rect(M, y, half, 28); doc.rect(M + half + 6, y, half, 28);
  if (signature) {
    font("normal", 7.5);
    doc.text(doc.splitTextToSize(`${signature.mention} — signé électroniquement le ${signature.horodatage}`, half - 4) as string[], M + 2, y + 4);
    doc.addImage(signature.imagePng, "PNG", M + 2, y + 9, half - 4, 18);
  }
  y += 34;

  doc.addPage(); y = 18;
  titre("Annexe – Conditions générales de vente");
  para(`FTRANSPORT, organisme de formation professionnelle — 86 route de Genas, 69003 Lyon — SIRET 823 461 561 000 18 — Déclaration d'activité n° 84 69 15114 69 (cet enregistrement ne vaut pas agrément de l'État) — Centre agréé par la préfecture n° 69-18-001.`, 8);
  for (const a of articlesFcTaxi(input, mediateur)) { need(12); para(a.titre, 9, "bold", 0.5); para(a.texte, 8.3); }

  if (input.mode === "distance") {
    doc.addPage(); y = 18;
    titre("Annexe — Formulaire type de rétractation");
    para("Modèle figurant en annexe à l'article R221-1 du Code de la consommation (article L221-5).", 8.5, "bold");
    para(`Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat, dans un délai de ${d} jours. Vous pouvez aussi utiliser toute autre déclaration dénuée d'ambiguïté.`, 8.5);
    para(formulaireRetractation(), 9.5);
  }

  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); font("normal", 7); doc.setTextColor(110);
    doc.text(`FTRANSPORT · SIRET 823 461 561 000 18 · NDA 84 69 15114 69 (ne vaut pas agrément de l'État) · Agrément préfecture n° 69-18-001`, W / 2, 289, { align: "center" });
    doc.text(`Page ${i}/${n}`, W - M, 293, { align: "right" }); doc.setTextColor(0);
  }
  return doc;
}

async function b64(url: string): Promise<string> {
  const r = await fetch(url); if (!r.ok) throw new Error(`Police introuvable (${url})`);
  const bytes = new Uint8Array(await r.arrayBuffer()); let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export async function chargerFontesUnicode(): Promise<FontesUnicode> {
  const [regular, bold] = await Promise.all([b64("/fonts/DejaVuSans.ttf"), b64("/fonts/DejaVuSans-Bold.ttf")]);
  return { regular, bold };
}
