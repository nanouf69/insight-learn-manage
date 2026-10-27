import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import logoImage from "@/assets/logo-ftransport.png";
import {
  calendrierSession, heuresPlages, HEURES_PRATIQUE, modulesElearning, sessionsExamen, sessionsPratique,
  type FormationProgramme, type SessionPublique,
} from "@/lib/programmeCalendrierDevis";

export interface ProgrammeDevisInput {
  formation: { id: string; label: string; designation: string; agrement: string };
  programme: FormationProgramme;
  session: SessionPublique | null;
  sessions: SessionPublique[];
  /** Erreur de lecture des sessions : jamais traitée comme « aucune session ». */
  erreurLecture?: boolean;
}

const t = (s: string) => (s || "").replace(/[’‘]/g, "'").replace(/[–—]/g, "-").replace(/…/g, "...").replace(/\u00a0|\u202f/g, " ");
const dateLongue = (iso: string) => format(new Date(`${iso}T12:00:00`), "EEEE d MMMM yyyy", { locale: fr });
const hm = (min: number) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
const h = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2).replace(".", ",")} h`;

export interface ResultatProgramme { doc: jsPDF; manquants: string[] }

export function buildProgrammeCalendrierPDF(input: ProgrammeDevisInput): ResultatProgramme {
  const { formation, programme: p, session } = input;
  const doc = new jsPDF();
  const manquants: string[] = [];
  const W = doc.internal.pageSize.getWidth();
  let y = 12;
  try { doc.addImage(logoImage, "PNG", 14, 8, 40, 14); } catch { /* logo facultatif */ }
  doc.setFontSize(9).setTextColor(90);
  doc.text(t("Ftransport - 86 route de Genas 69003 Lyon"), W - 14, 12, { align: "right" });
  doc.text(t(`Agrément ${formation.agrement}`), W - 14, 17, { align: "right" });
  y = 32;
  doc.setTextColor(20).setFontSize(15).setFont("helvetica", "bold");
  doc.text(t("Programme détaillé et calendrier"), 14, y); y += 7;
  doc.setFontSize(11).setFont("helvetica", "normal");
  doc.splitTextToSize(t(formation.designation), W - 28).forEach((l: string) => { doc.text(l, 14, y); y += 5; });
  doc.setFontSize(8).setTextColor(110);
  doc.text(t(`Document indicatif édité le ${format(new Date(), "dd/MM/yyyy")} - joint au devis, sans valeur d'inscription.`), 14, y + 1);
  y += 7; doc.setTextColor(20);

  const titre = (s: string) => {
    if (y > 260) { doc.addPage(); y = 18; }
    y += 3; doc.setFont("helvetica", "bold").setFontSize(11.5).text(t(s), 14, y); y += 6; doc.setFont("helvetica", "normal");
  };
  const para = (s: string) => {
    doc.setFontSize(9.5);
    doc.splitTextToSize(t(s), W - 28).forEach((l: string) => { if (y > 280) { doc.addPage(); y = 18; } doc.text(l, 14, y); y += 4.6; });
    y += 1.5;
  };
  const table = (head: string[], body: string[][], foot?: string[]) => {
    autoTable(doc, {
      startY: y + 2, head: [head.map(t)], body: body.map((r) => r.map(t)), foot: foot ? [foot.map(t)] : undefined,
      styles: { fontSize: 8.8, cellPadding: 1.6 }, headStyles: { fillColor: [30, 58, 138] }, footStyles: { fillColor: [226, 232, 240], textColor: 20 },
      margin: { left: 14, right: 14 }, theme: "grid",
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  };

  // 1. Modules et durées
  titre("1. Modules et durées");
  if (p.mode === "elearning") {
    const m = modulesElearning(p.filiere);
    table(["Module", "Durée prévisionnelle"], m.lignes.map((l) => [l.intitule, hm(l.minutes)]), ["Durée totale", hm(m.totalMinutes)]);
    if (!m.coherent) manquants.push("Total des modules différent du total de la formation");
    para("Durées prévisionnelles du tableau des jalons de la plateforme : elles indiquent le temps de travail attendu, pas des heures réellement effectuées.");
    if (p.filiere === "va") manquants.push("Durée totale VA (36 h au tableau des jalons) à confirmer pour le devis");
  } else if (p.mode === "pratique") {
    table(["Module", "Durée"], [["Formation pratique en véhicule à double commande", "6 h en groupe ou 3 h en solo"]]);
  } else {
    const heuresSession = session ? calendrierSession(session, p.filiere).heuresAttendues : null;
    const theorie = heuresSession ?? (p.filiere === "ta" ? 30 : p.filiere === "taxi" ? 90 : p.soir ? 40 : 60);
    table(["Partie", "Durée"], [["Formation théorique en salle", h(theorie)], ["Formation pratique", h(HEURES_PRATIQUE)]], ["Durée totale", h(theorie + HEURES_PRATIQUE)]);
    manquants.push("Répartition des heures par matière en présentiel : non enregistrée");
  }

  // 2. Modalités d'enseignement
  titre("2. Modalités d'enseignement");
  if (p.mode === "elearning") para("Plateforme de cours en ligne accessible 24h/24 et 7j/7 pendant 3 mois à compter de l'inscription, avec cours, exercices, bilans et examens blancs. Une formation pratique de 6 h complète le parcours.");
  else if (p.mode === "pratique") para("Formation pratique : 3 h en solo ou 6 h en groupe, mise à disposition du véhicule à double commande le jour de l'examen pratique.");
  else para(p.soir ? "Cours en salle le soir de 17h à 21h (4 h par soirée), puis formation pratique de 6 h." : "Cours en salle en journée de 9h à 12h et de 13h à 16h (6 h par jour), puis formation pratique de 6 h.");
  if (session?.lieu) para(`Lieu : ${session.lieu}`);

  // 3. Calendrier
  titre("3. Calendrier");
  if (input.erreurLecture) { para("Les sessions n'ont pas pu être lues : calendrier indisponible, à demander au centre."); manquants.push("Lecture des sessions impossible"); }
  else if (p.mode !== "presentiel") para(p.mode === "elearning" ? "Formation à distance : pas de calendrier en salle. Date de la journée pratique : à confirmer." : "Date de la journée pratique : à confirmer avec le centre.");
  else if (!session) { para("Aucune session réelle sélectionnée : calendrier à confirmer."); manquants.push("Session non sélectionnée"); }
  else {
    para(`Session : ${session.nom}, du ${dateLongue(session.date_debut)} au ${dateLongue(session.date_fin)}.`);
    const c = calendrierSession(session, p.filiere);
    if (c.valide) {
      table(["Date", "Horaires", "Heures"], c.jours.map((j) => [dateLongue(j.jour), j.plages.map((x) => `${x.debut}-${x.fin}`).join(" / "), h(j.heures)]), ["Total", "", h(c.heuresSaisies)]);
    } else {
      para(`Calendrier journalier à confirmer : ${c.anomalies.join(" ; ")}.`);
      manquants.push(...c.anomalies.map((a) => `Calendrier : ${a}`));
    }
  }
  {
    const pratiques = sessionsPratique(input.sessions, p.filiere).filter((s) => !session || s.date_debut >= session.date_fin);
    if (pratiques.length) {
      const s = pratiques[0];
      const jour = s.jours.find((j) => j.nature !== "examen");
      const plages = jour && heuresPlages(jour.plages) ? jour.plages.map((x) => `${x.debut}-${x.fin}`).join(" / ") : s.heure_debut && s.heure_fin ? `${s.heure_debut}-${s.heure_fin}` : "horaires à confirmer";
      para(`Stage pratique prévu : ${dateLongue(s.date_debut)}, ${plages}${s.lieu ? `, ${s.lieu}` : ""}.`);
    } else { para("Stage pratique : date à confirmer."); manquants.push("Date du stage pratique"); }
  }

  // 4. Examen
  titre("4. Modalités d'examen");
  para("Examen organisé par la Chambre de Métiers et de l'Artisanat (CMA) : épreuves théoriques puis épreuve pratique.");
  para(/examen/.test(formation.id) ? "Frais d'inscription à l'examen CMA compris dans le prix du devis." : "Frais d'examen non compris : inscription et règlement directement auprès de la CMA.");
  const examens = sessionsExamen(input.sessions).filter((s) => !session || s.date_debut >= session.date_fin).slice(0, 3);
  if (examens.length) table(["Prochaine date d'examen théorique", "Horaires", "Lieu"], examens.map((s) => [dateLongue(s.date_debut), s.heure_debut && s.heure_fin ? `${s.heure_debut}-${s.heure_fin}` : "à confirmer", s.lieu || "à confirmer"]));
  else { para("Date d'examen : à confirmer."); manquants.push("Date d'examen"); }
  para("Détail des épreuves (durées, coefficients, notes éliminatoires) : à confirmer selon la réglementation CMA en vigueur.");
  manquants.push("Détail officiel des épreuves d'examen");

  if (manquants.length) {
    titre("Éléments à confirmer");
    [...new Set(manquants)].forEach((m) => para(`- ${m}`));
  }
  return { doc, manquants: [...new Set(manquants)] };
}
