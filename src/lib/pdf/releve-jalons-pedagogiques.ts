import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImage from "@/assets/logo-ftransport.png";
import { MODULE_NAME_BY_ID } from "@/components/cours-en-ligne/modules-config";
import { BUDGET_CPF, INTRO, INTRO_IDS, LABEL_PRESENTIEL, PRATIQUE_PHYSIQUE, arrondirPoidsAffichage, dureeLigne } from "@/lib/jalonsPonderes";
import { objectifsJalons, TITRE_OBJECTIFS_JALONS } from "@/lib/objectifsJalons";

export interface PreuveJalonPdf {
  label: string;
  count?: number;
  dates?: string[];
  detail?: string;
}

export interface ReleveJalonsData {
  apprenant: any;
  formationLabel: string;
  session?: { nom?: string | null; date_debut?: string | null; date_fin?: string | null } | null;
  calcul: any;
  preuves: PreuveJalonPdf[];
  elementsACompleter: string[];
  generatedAt?: Date;
}

const COMPANY = { name: "Ftransport", address: "86 Route de Genas 69003 Lyon", siret: "53516371400044" };
const CPOF_URL = "https://www.moncompteformation.gouv.fr/espace-public/sites/mcf/files/2026-05/CPOF_MCF_V15_VF.pdf";
const CG_URL = "https://www.moncompteformation.gouv.fr/espace-public/sites/mcf/files/2026-05/CG_MCF_V15_VF.pdf";

const sansEmoji = (t: string) => t.replace(/[^\u0000-\u024F\u2013\u2014\u2019]/g, "").replace(/^[\s.]+/, "").trim();
const safeDate = (value?: string | null) => value ? String(value).slice(0, 10).split("-").reverse().join("/") : "Non renseigné";
const fmtPct = (value: number) => `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
const formatParis = (value: Date) => new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
}).format(value);

export function generateReleveJalonsPedagogiquesPdf(data: ReleveJalonsData, opts?: { returnBlob?: boolean }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 10;
  const now = data.generatedAt ?? new Date();
  const addTextSection = (title: string, paragraphs: string[]) => {
    let y = ((doc as any).lastAutoTable?.finalY ?? 30) + 9;
    for (const paragraph of paragraphs) {
      const wrapped = doc.splitTextToSize(paragraph, pw - margin * 2);
      if (y + wrapped.length * 4.2 + 10 > ph - 15) { doc.addPage(); y = 25; }
      if (title) { doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(13, 37, 64); doc.text(title, margin, y); y += 5; }
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(45, 45, 45); doc.text(wrapped, margin, y);
      y += wrapped.length * 4.2 + (title ? 4 : 1.5);
      title = "";
    }
    (doc as any).lastAutoTable = { finalY: y - 4 };
  };

  try { doc.addImage(logoImage, "PNG", margin, 7, 38, 13); } catch {}
  doc.setFontSize(7); doc.setTextColor(110, 110, 110);
  doc.text(`${COMPANY.name} — ${COMPANY.address} — SIRET ${COMPANY.siret}`, pw - margin, 11, { align: "right" });
  doc.setFillColor(13, 37, 64); doc.rect(0, 24, pw, 16, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text("RELEVÉ DES JALONS PÉDAGOGIQUES — JUSTIFICATIF DE SUIVI", pw / 2, 34, { align: "center" });
  doc.setTextColor(35, 35, 35); doc.setFontSize(8); doc.setFont("helvetica", "normal");
  const identite = [
    `Stagiaire : ${[data.apprenant?.civilite, data.apprenant?.prenom, data.apprenant?.nom].filter(Boolean).join(" ") || "Non renseigné"}`,
    `Formation / modalité : ${data.formationLabel} — parcours mixte e-learning + entraînement pratique ou formation présentielle de 6 h`,
    `Dossier : ${data.apprenant?.id || "Non renseigné"}`,
    `Session : ${data.session?.nom || "Non renseigné"}`,
    `Période : ${safeDate(data.apprenant?.date_debut_cours_en_ligne || data.session?.date_debut || data.apprenant?.date_debut_formation)} au ${safeDate(data.apprenant?.date_fin_cours_en_ligne || data.session?.date_fin || data.apprenant?.date_fin_formation)}`,
    `Édité à Paris le ${formatParis(now)}. Capture figée des données disponibles à cet instant ; aucune donnée ni historique n’est modifié.`,
  ];
  let y = 47;
  for (const text of identite) { doc.text(text, margin, y); y += 4.5; }

  const weighted = data.calcul.resultat.lignes.filter((line: any) => line.poids > 0);
  const displayedWeights = arrondirPoidsAffichage(weighted.map((line: any) => line.poids));
  const displayWeight = new Map(weighted.map((line: any, index: number) => [line.moduleId, displayedWeights[index]]));
  const completionById = new Map(data.calcul.completions.map((row: any) => [Number(row.module_id), row]));
  const rows = data.calcul.resultat.lignes.map((line: any) => {
    const isPractice = line.moduleId === PRATIQUE_PHYSIQUE;
    const volumeId = INTRO_IDS.has(line.moduleId) && line.poids > 0 ? INTRO : line.moduleId;
    const volume = data.calcul.volumes[volumeId];
    const completion: any = completionById.get(line.moduleId);
    const completedAt = isPractice ? data.calcul.pratique.dernierePreuve : completion?.completed_at;
    const source = isPractice ? "Planning pratique + émargements signés" : "Volumes actuels + progression serveur";
    return [
      isPractice ? LABEL_PRESENTIEL : sansEmoji(MODULE_NAME_BY_ID[line.moduleId] || `Module ${line.moduleId}`),
      isPractice ? "—" : String(volume?.pages ?? 0),
      isPractice ? "—" : String(volume?.questions ?? 0),
      String(dureeLigne(data.calcul.durees, line.moduleId, line.poids)),
      line.poids > 0 ? fmtPct(Number(displayWeight.get(line.moduleId) ?? 0)) : "0 % obligatoire",
      fmtPct(line.progression),
      `${line.contribution.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} pt`,
      line.valide ? "Réalisé" : line.progression > 0 ? "En cours" : "Non commencé",
      completedAt ? safeDate(completedAt) : "Non renseigné",
      source,
    ];
  });
  const totalPoints = BUDGET_CPF[data.calcul.filiere as keyof typeof BUDGET_CPF].total;
  autoTable(doc, {
    startY: y + 2,
    head: [["Module / activité attendue", "Pages (audit)", "Questions actives", "Durée prév. CPF (min)", "Poids", "Progression", "Contribution", "Statut", "Validation prouvée", "Source"]],
    body: rows,
    foot: [["TOTAL FORMATION", "", "", `${totalPoints} (${totalPoints / 60} h)`, "100 %", "", `${data.calcul.resultat.lignes.reduce((sum: number, line: any) => sum + line.contribution, 0).toFixed(1)} pts`, "", "", ""]],
    theme: "grid",
    styles: { fontSize: 6.3, cellPadding: 1.3, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [13, 37, 64], textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [232, 238, 245], textColor: [13, 37, 64], fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 41 }, 1: { cellWidth: 18 }, 2: { cellWidth: 16 }, 3: { cellWidth: 13 }, 4: { cellWidth: 16 }, 5: { cellWidth: 17 }, 6: { cellWidth: 18 }, 7: { cellWidth: 18 }, 8: { cellWidth: 20 }, 9: { cellWidth: pw - margin * 2 - 177 } },
    margin: { left: margin, right: margin, top: 24, bottom: 14 },
  });

  const objectifs = objectifsJalons(`${data.calcul.filiere}-e`, data.calcul.resultat.lignes.map((line: any) => line.moduleId));
  if (objectifs.length) {
    doc.addPage();
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(13, 37, 64);
    doc.text(TITRE_OBJECTIFS_JALONS, margin, 15);
    autoTable(doc, {
      startY: 22,
      head: [["Jalon", "Objectif pédagogique"]],
      body: objectifs.map(({ intitule, objectif }) => [intitule, objectif]),
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3, overflow: "linebreak", valign: "top" },
      headStyles: { fillColor: [13, 37, 64], textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 72, fontStyle: "bold" }, 1: { cellWidth: pw - margin * 2 - 72 } },
      rowPageBreak: "avoid",
      margin: { left: margin, right: margin, top: 22, bottom: 16 },
    });
  }

  const brut = data.calcul.resultat.lignes.reduce((sum: number, line: any) => sum + line.contribution, 0);
  addTextSection("MÉTHODE ET TAUX", [
    `Répartition prévisionnelle des durées CPF : durée totale ${totalPoints} min (${totalPoints / 60} h). Examens blancs (6 épreuves) et entraînement pratique ou formation présentielle (360 min) ont des durées fixes ; le budget restant est réparti entre les autres modules selon le tableau approuvé, ajusté au volume actuel (2 × pages d’audit + questions actives) et arrondi à la minute. Poids = durée prévisionnelle / durée totale × 100. Contribution = poids × progression / 100. Ces durées sont prévisionnelles : elles ne sont ni des heures réalisées, ni des temps validés par la CDC, ni une note ou un score. Les heures réalisées en présentiel ne proviennent que du Planning pratique et des émargements signés.`,
    `Taux pédagogique brut calculé : ${fmtPct(brut)}. Indicateur interne affiché : ${fmtPct(data.calcul.resultat.taux)}${data.calcul.resultat.taux < brut ? " (plafond interne appliqué car un jalon obligatoire reste non validé)" : ""}. Aucun taux EDOF n’est déclaré automatiquement ; tout taux destiné à un tiers doit être vérifié humainement. Réussite à un quiz et réalisation pédagogique restent distinctes.`,
  ]);

  const preuves = data.preuves.length ? data.preuves.map((p) => {
    const dates = p.dates?.length ? ` — dates : ${p.dates.slice(0, 8).map(safeDate).join(", ")}${p.dates.length > 8 ? "…" : ""}` : "";
    return `• ${p.label} : ${p.count ?? "non renseigné"}${p.detail ? ` — ${p.detail}` : ""}${dates}`;
  }) : ["• Aucune preuve nominative exploitable n’a été remontée lors de cette édition."];
  addTextSection("PREUVES NOMINATIVES DISPONIBLES", [
    ...preuves,
    "Une connexion ou un clic sur un support constitue une trace d’accès partielle, pas la preuve que le cours a été lu intégralement. Les répétitions techniques et nouvelles tentatives ne créent pas un nouveau jalon. Le module en ligne Pratique ne prouve jamais la réalisation de la pratique présentielle.",
  ]);
  addTextSection("ÉLÉMENTS À COMPLÉTER OU À CONTRÔLER", [data.elementsACompleter.length ? data.elementsACompleter.map((x) => `• ${x}`).join("\n") : "• Aucun élément supplémentaire signalé par les lectures disponibles."]);
  addTextSection("LIMITES ET PORTÉE", [
    `Les nombres de pages/slides/fiches proviennent de l’audit des supports et ne sont pas recomptés automatiquement. ${data.calcul.limites.length ? data.calcul.limites.join(" ") : "Aucune divergence de support n’a été signalée."} Les questions actives sont comptées au moment de l’édition. Un ancien statut « Terminé » n’est pas versionné par rapport aux questions ajoutées ultérieurement ; aucun historique rétroactif n’est reconstitué.`,
    "La pondération est un choix pédagogique interne de l’organisme, pas une grille officiellement validée par la CDC. Une activité semblable dans plusieurs modules n’est comptée comme distincte que lorsqu’elle correspond à un travail réellement distinct. La pratique contractuelle reste présentielle et n’est justifiée que par le planning et les émargements signés.",
  ]);
  addTextSection("RÉFÉRENCES DOCUMENTAIRES", [
    `CPOF Mon Compte Formation V15, mai 2026 : 5.1.1 p.20 (jalons réalisés et probants), 5.1.2 p.20-21 (programme, jalons, logs/travaux/accompagnement). ${CPOF_URL}`,
    `Conditions générales Mon Compte Formation V15 : CG 7.1 (informations programme/parcours), CG 7.3 p.19-20 (durée moyenne, assistance, évaluations). ${CG_URL}`,
    "Ce relevé présente factuellement les données disponibles. Il ne constitue ni une attestation officielle, ni une garantie de conformité, ni un avis juridique.",
  ]);

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setFontSize(6.5); doc.setTextColor(125, 125, 125);
    doc.text(`${COMPANY.name} — Relevé des jalons pédagogiques`, margin, ph - 6);
    doc.text(`Page ${page}/${pages}`, pw - margin, ph - 6, { align: "right" });
  }
  const slug = `${data.apprenant?.prenom || ""}-${data.apprenant?.nom || ""}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "apprenant";
  const fileName = `releve-jalons-pedagogiques_${slug}.pdf`;
  if (opts?.returnBlob) return { blob: doc.output("blob"), fileName };
  doc.save(fileName);
}