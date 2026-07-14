import jsPDF from "jspdf";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import logoImage from "@/assets/logo-ftransport.png";

const COMPANY = {
  name: "Ftransport",
  address: "86 Route de Genas 69003 Lyon",
  siret: "53516371400044",
  siren: "823 461 561",
  declarationActivite: "84 69 17 911 69",
  agrement: "69-16-15",
};

interface ProgrammeSection {
  title: string;
  bullets?: string[];
  paragraph?: string;
}

interface ProgrammeDef {
  titre: string;
  reference: string;
  duree: string;
  objectif: string;
  sections: ProgrammeSection[];
}

function sanitize(s: string): string {
  return (s || "")
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{1F300}-\u{1F9FF}]/gu, "")
    .normalize("NFKD")
    .replace(/[^\x00-\xFF]/g, "")
    .trim();
}

function normalizeType(t?: string | null): string {
  const s = (t || "").toLowerCase().trim();
  if (s.includes("continue") && s.includes("taxi")) return "continue-taxi";
  if (s.includes("continue") && s.includes("vtc")) return "continue-vtc";
  if (s.startsWith("taxi")) return "taxi";
  if (s.startsWith("vtc")) return "vtc";
  if (s.startsWith("ta")) return "ta";
  if (s.startsWith("va")) return "va";
  return "vtc";
}

function getProgramme(typeApprenant?: string | null): ProgrammeDef {
  const t = normalizeType(typeApprenant);

  const commonEval: ProgrammeSection = {
    title: "Evaluation et sanction",
    bullets: [
      "Emargements signes par le stagiaire et le formateur pour chaque demi-journee.",
      "Evaluations formatives tout au long de la formation (quiz, mises en situation).",
      "Evaluation finale des acquis (examen blanc ou controle continu).",
      "Remise d'une attestation de fin de formation (art. L.6353-1 du code du travail).",
    ],
  };

  const commonMoyens: ProgrammeSection = {
    title: "Moyens pedagogiques et techniques",
    bullets: [
      "Salle equipee (video-projecteur, wifi) au 86 Route de Genas, 69003 Lyon.",
      "Plateforme e-learning avec suivi individualise (heures de connexion, quiz, examens blancs).",
      "Supports pedagogiques remis au stagiaire (papier et numerique).",
      "Formateurs habilites justifiant d'une experience professionnelle du secteur.",
    ],
  };

  const commonModalites: ProgrammeSection = {
    title: "Modalites d'acces et delais",
    bullets: [
      "Entretien prealable et verification des prerequis (permis B > 3 ans, casier judiciaire compatible, aptitude medicale).",
      "Delai d'acces : 15 jours ouvres apres validation du dossier.",
      "Accessibilite handicap : contact du referent handicap avant inscription pour amenagements.",
    ],
  };

  if (t === "vtc") {
    return {
      titre: "PROGRAMME DE FORMATION INITIALE VTC",
      reference:
        "Arrete du 6 avril 2017 relatif a la formation et a l'examen des conducteurs de VTC (modifie).",
      duree: "250 heures (dont e-learning et presentiel obligatoire).",
      objectif:
        "Preparer le candidat a l'examen d'acces a la profession de conducteur VTC et lui permettre d'exercer en respectant la reglementation en vigueur.",
      sections: [
        {
          title: "Public et prerequis",
          bullets: [
            "Toute personne souhaitant exercer la profession de conducteur VTC.",
            "Permis B en cours de validite depuis plus de 3 ans (2 ans si conduite accompagnee).",
            "Aptitude medicale (visite chez medecin agree) et casier judiciaire (B2) compatible.",
            "Maitrise du francais (comprehension ecrite et orale).",
          ],
        },
        {
          title: "Contenu pedagogique - Epreuves theoriques (tronc commun T3P)",
          bullets: [
            "A - Reglementation du Transport Public Particulier de Personnes (T3P).",
            "B - Gestion : notions de gestion, comptabilite, fiscalite.",
            "C - Securite routiere : reglementation, comportements, ecoconduite.",
            "D - Capacite d'expression et de comprehension en francais.",
            "E - Capacite d'expression et de comprehension en anglais.",
          ],
        },
        {
          title: "Contenu pedagogique - Epreuves specifiques VTC",
          bullets: [
            "F - Developpement commercial et gestion propre a l'activite VTC.",
            "G - Reglementation nationale specifique de l'activite VTC.",
          ],
        },
        {
          title: "Epreuve pratique",
          bullets: [
            "Conduite en circulation reelle (1 heure).",
            "Evaluation de la maitrise du vehicule, de la securite, du confort du passager et de la relation client.",
          ],
        },
        commonModalites,
        commonMoyens,
        commonEval,
      ],
    };
  }

  if (t === "taxi") {
    return {
      titre: "PROGRAMME DE FORMATION INITIALE TAXI",
      reference:
        "Arrete du 6 avril 2017 relatif a la formation et a l'examen des conducteurs de taxi (modifie).",
      duree: "250 heures (e-learning + presentiel).",
      objectif:
        "Preparer le candidat au Certificat de Capacite Professionnelle (CCPCT) et a l'exercice de la profession de conducteur de taxi.",
      sections: [
        {
          title: "Public et prerequis",
          bullets: [
            "Toute personne souhaitant devenir chauffeur de taxi.",
            "Permis B en cours de validite depuis plus de 3 ans (2 ans si conduite accompagnee).",
            "Certificat medical d'aptitude delivre par un medecin agree.",
            "Casier judiciaire (B2) compatible.",
          ],
        },
        {
          title: "Contenu pedagogique - Epreuves theoriques (tronc commun T3P)",
          bullets: [
            "A - Reglementation du Transport Public Particulier de Personnes (T3P).",
            "B - Gestion : notions de gestion et de comptabilite.",
            "C - Securite routiere.",
            "D - Capacite d'expression et de comprehension en francais.",
            "E - Capacite d'expression et de comprehension en anglais.",
          ],
        },
        {
          title: "Contenu pedagogique - Epreuves specifiques TAXI",
          bullets: [
            "F - Reglementation nationale et locale specifique a l'activite de taxi.",
            "G - Connaissance du territoire et de la reglementation locale du departement d'exercice.",
          ],
        },
        {
          title: "Epreuve pratique",
          bullets: [
            "Conduite en circulation reelle (1 heure).",
            "Evaluation de la conduite, du taximetre, de la relation client et du respect de la reglementation.",
          ],
        },
        commonModalites,
        commonMoyens,
        commonEval,
      ],
    };
  }

  if (t === "ta") {
    return {
      titre: "PROGRAMME DE FORMATION PASSERELLE TAXI POUR TITULAIRE VTC (TA)",
      reference:
        "Arrete du 11 aout 2017 modifie relatif a la formation d'equivalence entre les activites VTC et taxi.",
      duree: "35 heures.",
      objectif:
        "Permettre a un conducteur VTC titulaire de la carte professionnelle depuis plus d'un an d'obtenir la carte de conducteur de taxi via la formation passerelle.",
      sections: [
        {
          title: "Public et prerequis",
          bullets: [
            "Titulaire de la carte professionnelle VTC en cours de validite depuis au moins un an.",
            "Casier judiciaire (B2) compatible et aptitude medicale.",
          ],
        },
        {
          title: "Contenu pedagogique",
          bullets: [
            "Reglementation specifique a l'activite de taxi (national et local).",
            "Utilisation du taximetre, de l'imprimante, du lumineux et du terminal de paiement.",
            "Connaissance du territoire d'exercice (topographie, points d'interet).",
            "Securite routiere adaptee au transport de personnes.",
            "Relation client, deontologie et gestion des incidents.",
          ],
        },
        {
          title: "Epreuve pratique",
          bullets: [
            "Mise en situation reelle de course taxi (prise en charge, itineraire, encaissement).",
          ],
        },
        commonModalites,
        commonMoyens,
        commonEval,
      ],
    };
  }

  if (t === "va") {
    return {
      titre: "PROGRAMME DE FORMATION PASSERELLE VTC POUR TITULAIRE TAXI (VA)",
      reference:
        "Arrete du 11 aout 2017 modifie relatif a la formation d'equivalence entre les activites taxi et VTC.",
      duree: "7 heures.",
      objectif:
        "Permettre a un conducteur de taxi titulaire de la carte professionnelle depuis plus d'un an d'exercer l'activite de VTC.",
      sections: [
        {
          title: "Public et prerequis",
          bullets: [
            "Titulaire de la carte professionnelle taxi en cours de validite depuis au moins un an.",
            "Casier judiciaire (B2) compatible et aptitude medicale.",
          ],
        },
        {
          title: "Contenu pedagogique",
          bullets: [
            "Reglementation specifique de l'activite VTC (differences avec l'activite taxi).",
            "Regime de la reservation prealable et interdictions specifiques.",
            "Developpement commercial et positionnement sur les plateformes.",
            "Relation client haut de gamme et deontologie.",
          ],
        },
        commonModalites,
        commonMoyens,
        commonEval,
      ],
    };
  }

  // Formation continue VTC ou TAXI (14h)
  const formation = t === "continue-taxi" ? "TAXI" : "VTC";
  return {
    titre: `PROGRAMME DE FORMATION CONTINUE ${formation}`,
    reference:
      "Arrete du 11 aout 2017 (modifie par Arrete du 15 juin 2024) - article R.3120-8-2 du code des transports.",
    duree: "14 heures (2 journees de 7h, fractionnable en 4 x 3h30 sur 2 mois).",
    objectif: `Mettre a jour les connaissances essentielles a la pratique de l'activite de conducteur ${formation}, tous les 5 ans.`,
    sections: [
      {
        title: "Public et prerequis",
        bullets: [
          `Conducteurs ${formation} titulaires d'une carte professionnelle en cours de validite.`,
          "Maitrise de la langue francaise (comprehension ecrite et orale).",
        ],
      },
      {
        title: "Modules d'approfondissement obligatoires (3 x 3h30)",
        bullets: [
          "A - Droit du Transport Public Particulier de Personnes (T3P).",
          `B - Reglementation specifique a l'activite ${formation}.`,
          "C - Securite routiere.",
        ],
      },
      {
        title: "Module au choix (3h30)",
        bullets: [
          "D - Anglais.",
          "E - Gestion et developpement commercial (TIC incluses).",
          "F - Prevention et secours civiques (PSC1).",
        ],
      },
      {
        title: "Referentiel",
        paragraph:
          "Annexe I de l'arrete du 6 avril 2017 pour les modules A, B, C, D, E. Annexes 1, 2 et 3 de l'arrete du 24 juillet 2007 pour le module F (PSC).",
      },
      commonModalites,
      commonMoyens,
      commonEval,
    ],
  };
}

export function generateProgrammeFormationPdf(
  apprenant: { nom: string; prenom: string; civilite?: string; type_apprenant?: string | null },
  opts?: { returnBlob?: boolean },
): { blob: Blob; fileName: string } | void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 14;
  const prog = getProgramme(apprenant.type_apprenant);

  // Header
  try { doc.addImage(logoImage, "PNG", margin, 8, 40, 14); } catch {}
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(COMPANY.name, pw - margin, 12, { align: "right" });
  doc.text(COMPANY.address, pw - margin, 16, { align: "right" });
  doc.text(`SIRET : ${COMPANY.siret}`, pw - margin, 20, { align: "right" });

  // Title band
  doc.setFillColor(13, 37, 64);
  doc.rect(0, 26, pw, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(sanitize(prog.titre), pw / 2, 36, { align: "center" });

  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  let y = 50;

  // Stagiaire
  const full = sanitize(
    `${apprenant.civilite || ""} ${apprenant.prenom || ""} ${apprenant.nom || ""}`.trim(),
  );
  doc.text(`Stagiaire : ${full}`, margin, y);
  doc.text(
    `Genere le ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: fr })}`,
    pw - margin, y, { align: "right" },
  );
  y += 8;

  // Meta info block
  const meta: Array<[string, string]> = [
    ["Reference reglementaire", prog.reference],
    ["Duree totale", prog.duree],
    ["Objectif general", prog.objectif],
  ];
  for (const [k, v] of meta) {
    doc.setFont("helvetica", "bold");
    doc.text(`${k} :`, margin, y);
    const labelW = doc.getTextWidth(`${k} : `);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(sanitize(v), pw - margin * 2 - labelW) as string[];
    doc.text(lines, margin + labelW, y);
    y += Math.max(6, lines.length * 4.6);
  }

  y += 3;

  const lineH = 4.6;
  const bulletIndent = 5;

  const ensureSpace = (needed: number) => {
    if (y + needed > ph - 20) {
      doc.addPage();
      y = 22;
    }
  };

  for (const s of prog.sections) {
    ensureSpace(14);
    // Section title
    doc.setDrawColor(13, 37, 64);
    doc.setLineWidth(0.4);
    doc.setFillColor(232, 238, 248);
    doc.rect(margin, y - 4, pw - margin * 2, 6, "F");
    doc.setTextColor(13, 37, 64);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(sanitize(s.title), margin + 2, y);
    y += 6;

    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    if (s.paragraph) {
      const lines = doc.splitTextToSize(sanitize(s.paragraph), pw - margin * 2) as string[];
      for (const line of lines) {
        ensureSpace(lineH);
        doc.text(line, margin, y);
        y += lineH;
      }
    }

    if (s.bullets) {
      for (const b of s.bullets) {
        const lines = doc.splitTextToSize(sanitize(b), pw - margin * 2 - bulletIndent) as string[];
        for (let i = 0; i < lines.length; i++) {
          ensureSpace(lineH);
          if (i === 0) doc.text("-", margin, y);
          doc.text(lines[i], margin + bulletIndent, y);
          y += lineH;
        }
      }
    }
    y += 2;
  }

  // Footer legal
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(
      sanitize(
        `${COMPANY.name} - SIREN ${COMPANY.siren} - Declaration d'activite ${COMPANY.declarationActivite} - Agrement ${COMPANY.agrement} (ne vaut pas agrement de l'Etat)`,
      ),
      pw / 2, ph - 10, { align: "center" },
    );
    doc.text(`Page ${i}/${totalPages}`, pw - margin, ph - 6, { align: "right" });
  }

  const slug = `${apprenant.prenom || ""}-${apprenant.nom || ""}`
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "apprenant";
  const fileName = `programme-formation_${slug}.pdf`;
  if (opts?.returnBlob) return { blob: doc.output("blob"), fileName };
  doc.save(fileName);
}
