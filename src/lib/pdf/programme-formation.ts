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
      titre: "PROGRAMME DE FORMATION VTC",
      reference:
        "Arrete du 6 avril 2017 relatif a la formation et a l'examen des conducteurs de VTC (modifie).",
      duree: "250 heures (e-learning et presentiel).",
      objectif:
        "Preparer le candidat a l'examen d'acces a la profession de conducteur VTC et lui permettre d'exercer en respectant la reglementation en vigueur.",
      sections: [
        {
          title: "Reglementation du transport public particulier de personnes et prevention des discriminations et des violences sexuelles et sexistes - Competences communes",
          bullets: [
            "Connaitre la reglementation s'appliquant aux differents modes de transport publics particuliers : taxis, VTC, vehicules motorises a deux roues.",
            "Connaitre la reglementation relative a l'utilisation de la voie publique pour la prise en charge de la clientele pour les differents modes de transport publics particuliers.",
            "Connaitre les obligations generales relatives aux vehicules.",
            "Connaitre les obligations relatives au conducteur : acces et exercice de la profession, obligations de formation continue.",
            "Connaitre la composition et le role des divers organismes administratifs, consultatifs et professionnels.",
            "Connaitre les autorites administratives et juridictions competentes dans le cadre de l'activite du transport public particulier de personnes.",
            "Connaitre les obligations du conducteur en matiere d'assurance, l'identification des assurances obligatoires et les consequences de ne pas etre assure.",
            "Connaitre les agents susceptibles de proceder a des controles en entreprise ou sur route et leurs prerogatives respectives ; savoir presenter les documents relatifs au conducteur et au vehicule.",
            "Connaitre les sanctions administratives et/ou penales encourues en cas d'infraction a la reglementation ainsi que les voies et delais de recours.",
            "Connaitre les regles relatives a la prise en charge des personnes a mobilite reduite.",
            "Avoir des notions de reglementation s'appliquant aux transports collectifs assures sous la forme de services occasionnels ainsi que sur le transport a la demande.",
            "Avoir des notions sur les regles s'appliquant aux pratiques de covoiturage entre particuliers et aux offres de transport prive.",
            "Connaitre les dispositions relatives aux intermediaires, en ce qui concerne la relation avec le conducteur.",
            "Connaitre les comportements constituant des infractions a caractere sexuel et/ou sexiste (outrage sexiste, agression sexuelle, harcelement sexuel, viol).",
            "Connaitre les discriminations listees a l'article 225-1 du code penal ainsi que les peines encourues.",
            "Connaitre les acteurs au service de la prevention en matiere de violences sexuelles et sexistes et les acteurs au service de la prevention et de la lutte contre les discriminations : identification des acteurs mobilisables et bons reflexes a mobiliser.",
          ],
        },
        {
          title: "Competences specifiques VTC",
          bullets: [
            "Connaitre les dispositions relatives aux exploitants : modalites d'inscription au registre des VTC, regles relatives a la capacite financiere...",
            "Connaitre les obligations specifiques relatives aux vehicules d'exploitation (dimensions, puissance, age...) et connaitre leur signalisation.",
            "Savoir etablir les documents relatifs a l'execution de la prestation de transport qui doivent etre presentes en cas de controle.",
          ],
        },
        {
          title: "Securite routiere",
          bullets: [
            "Savoir appliquer les regles du code de la route (signalisation, regles de circulation, comportement du conducteur, usage de securite, utilisation des voies dediees...).",
            "Connaitre et eviter les risques lies a l'alcoolemie, l'usage de stupefiants, la prise de medicaments, le stress, la fatigue.",
            "Connaitre les principes de conduite rationnelle pour economiser le carburant, reduire le bruit et preserver le materiel et l'environnement.",
            "Savoir appliquer les regles de securite concernant l'utilisation des telephones et ordiphones dans les vehicules.",
            "Savoir respecter les obligations en matiere d'entretien et de visite technique des vehicules.",
            "Savoir appliquer les regles de conduite a tenir en cas d'accident (protection des victimes, alerte des secours, premiers secours a porter...).",
            "Savoir rediger un constat amiable d'accident materiel.",
            "Connaitre la reglementation du permis de conduire (permis a points, permis probatoire, annulation, invalidation et suspension de permis).",
            "Savoir prendre en charge des passagers et leurs bagages en assurant la securite des personnes et des biens.",
          ],
        },
        {
          title: "Gestion - Competences communes",
          bullets: [
            "Connaitre et savoir appliquer les principes de base de gestion et de comptabilite.",
            "Connaitre les obligations et documents comptables.",
            "Connaitre les charges entrant dans le calcul du cout de revient et les classer en charges fixes et charges variables.",
            "Connaitre les principes de base pour determiner le produit d'exploitation, le benefice, le resultat, les charges, le seuil de rentabilite.",
            "Connaitre les principes de l'amortissement.",
            "Connaitre les differentes formes juridiques d'exploitation (EI, EIRL, EURL, SARL, SASU, SCOP...) et les modes d'exploitation (exploitation directe, location-gerance).",
            "Connaitre les differents regimes d'imposition et declarations fiscales.",
            "Connaitre les differentes formalites declaratives.",
            "Connaitre la composition et le role des chambres des metiers et de l'artisanat.",
            "Savoir definir les differents regimes sociaux (regime general, regime social des independants) ; comprendre les principes de cotisations et prestations par branche (maladie, vieillesse, chomage...).",
          ],
        },
        {
          title: "Gestion - Competences specifiques VTC",
          bullets: [
            "Savoir etablir un devis pour la realisation d'une prestation et etablir la facturation.",
            "Savoir calculer le cout de revient en formule simple (formule monome et binome).",
            "Savoir definir la notion de marge et l'utiliser pour calculer un prix de vente.",
          ],
        },
        {
          title: "Francais",
          bullets: [
            "Comprendre un texte simple ou des documents en lien, notamment, avec l'activite des transports.",
            "Comprendre et s'exprimer en francais pour : accueillir la clientele ; comprendre les demandes des clients ; interroger les clients sur leur confort ; tenir une conversation neutre et courtoise avec les clients durant le transport ; prendre conge des clients.",
          ],
        },
        {
          title: "Anglais",
          paragraph:
            "Comprendre et s'exprimer en anglais, au niveau A2 du Cadre Europeen Commun de Reference pour les Langues, pour : accueillir la clientele ; comprendre les demandes simples des clients ; demander des renseignements simples concernant le confort de la clientele ; tenir une conversation tres simple durant le transport ; prendre conge des clients.",
        },
        {
          title: "Developpement commercial (specifique aux conducteurs de VTC)",
          bullets: [
            "Connaitre et comprendre les principes generaux du marketing (analyse de marche, ciblage de l'offre, competitivite, determination du prix...).",
            "Savoir valoriser les qualites de la prestation commerciale VTC.",
            "Savoir fideliser ses clients et prospecter pour en obtenir d'autres.",
            "Savoir mener des actions de communication pour faire connaitre son entreprise, notamment par internet et les moyens numeriques.",
            "Savoir developper un reseau de partenaires favorisant l'acces a la clientele (hotels, entreprise...).",
          ],
        },
        {
          title: "Epreuve pratique - A. Conduite et securite",
          bullets: [
            "A-1 Conduite en securite et respect du code de la route : integrer son vehicule dans la circulation sur les differents types de reseaux, respecter l'ensemble des regles du code de la route, rechercher visuellement les informations, analyser les situations de conduite, adapter l'allure aux circonstances, respecter les distances et marges de securite, respecter les autres usagers (piétons, deux-roues), appliquer les principes d'eco-conduite.",
            "A-2 Souplesse de la conduite assurant le confort des passagers : utiliser de maniere souple et rationnelle les commandes du vehicule (allure, direction, vitesse) ; anticiper les situations de conduite pour eviter les decelerations ou changements de direction brutaux.",
            "A-3 Prise en charge et depose des clients et leurs bagages : respecter la reglementation de l'arret et du stationnement ; assurer la securite de l'arret ; manier correctement et precautionneusement les bagages.",
          ],
        },
        {
          title: "Epreuve pratique - B. Relation client",
          bullets: [
            "B-1 Presentation generale et attitudes : tenue vestimentaire correcte, attitudes et comportements adaptes, discretion et courtoisie.",
            "B-2 Accueil, comportement durant le parcours et prise de conge : accueillir le client, converser de facon neutre et discrete, veiller au confort (temperature, radio), prendre conge.",
            "B-3 Verification de l'etat du vehicule avant et apres la prestation : veiller au bon etat et a la proprete du vehicule.",
          ],
        },
        {
          title: "Epreuve pratique - C. Construction du parcours et competences specifiques VTC",
          bullets: [
            "C-1 Elaborer un parcours d'un lieu de prise en charge a un lieu de depose ; utiliser un GPS et une carte routiere ; adapter le parcours a d'eventuelles difficultes (embouteillages, travaux...).",
            "Competences specifiques VTC : preparer un parcours en fonction de la commande des clients.",
          ],
        },
        {
          title: "Epreuve pratique - D. Facturation et paiement",
          bullets: [
            "D-1 Etablir le prix de la prestation, facturer et proceder a l'encaissement : calculer le prix d'une course, etablir la facture, encaisser le paiement notamment avec un terminal de paiement electronique.",
          ],
        },
      ],
    };
  }



  if (t === "taxi") {
    return {
      titre: "PROGRAMME DE FORMATION TAXI",
      reference:
        "Arrete du 6 avril 2017 relatif a la formation et a l'examen des conducteurs de taxi (modifie).",
      duree: "250 heures (e-learning et presentiel).",
      objectif:
        "Preparer le candidat au Certificat de Capacite Professionnelle (CCPCT) et a l'exercice de la profession de conducteur de taxi.",
      sections: [
        {
          title: "Reglementation du transport public particulier de personnes et prevention des discriminations et des violences sexuelles et sexistes - Competences communes",
          bullets: [
            "Connaitre la reglementation s'appliquant aux differents modes de transport publics particuliers : taxis, VTC, vehicules motorises a deux roues.",
            "Connaitre la reglementation relative a l'utilisation de la voie publique pour la prise en charge de la clientele pour les differents modes de transport publics particuliers.",
            "Connaitre les obligations generales relatives aux vehicules.",
            "Connaitre les obligations relatives au conducteur : acces et exercice de la profession, obligations de formation continue.",
            "Connaitre la composition et le role des divers organismes administratifs, consultatifs et professionnels.",
            "Connaitre les autorites administratives et juridictions competentes dans le cadre de l'activite du transport public particulier de personnes.",
            "Connaitre les obligations du conducteur en matiere d'assurance, l'identification des assurances obligatoires et les consequences de ne pas etre assure.",
            "Connaitre les agents susceptibles de proceder a des controles en entreprise ou sur route et leurs prerogatives respectives ; savoir presenter les documents relatifs au conducteur et au vehicule.",
            "Connaitre les sanctions administratives et/ou penales encourues en cas d'infraction a la reglementation ainsi que les voies et delais de recours.",
            "Connaitre les regles relatives a la prise en charge des personnes a mobilite reduite.",
            "Avoir des notions de reglementation s'appliquant aux transports collectifs assures sous la forme de services occasionnels ainsi que sur le transport a la demande.",
            "Avoir des notions sur les regles s'appliquant aux pratiques de covoiturage entre particuliers et aux offres de transport prive.",
            "Connaitre les dispositions relatives aux intermediaires, en ce qui concerne la relation avec le conducteur.",
            "Connaitre les comportements constituant des infractions a caractere sexuel et/ou sexiste (outrage sexiste, agression sexuelle, harcelement sexuel, viol).",
            "Connaitre les discriminations listees a l'article 225-1 du code penal ainsi que les peines encourues.",
            "Connaitre les acteurs au service de la prevention en matiere de violences sexuelles et sexistes et les acteurs au service de la prevention et de la lutte contre les discriminations.",
          ],
        },
        {
          title: "Competences specifiques TAXIS",
          bullets: [
            "Connaitre le fonctionnement des equipements speciaux obligatoires et du terminal de paiement electronique.",
            "Connaitre l'articulation entre les reglementations nationales et locales.",
            "Connaitre les regimes d'autorisation de stationnement.",
            "Connaitre les regles de tarification d'une course de Taxi.",
            "Connaitre les activites complementaires ouvertes aux taxis : services reguliers de transport, transport assis professionnalise.",
            "Savoir etablir les documents relatifs a l'execution.",
          ],
        },
        {
          title: "Securite routiere",
          bullets: [
            "Savoir appliquer les regles du code de la route (signalisation, regles de circulation, comportement du conducteur, usage de securite, utilisation des voies dediees...).",
            "Connaitre et eviter les risques lies a l'alcoolemie, l'usage de stupefiants, la prise de medicaments, le stress, la fatigue.",
            "Connaitre les principes de conduite rationnelle pour economiser le carburant, reduire le bruit et preserver le materiel et l'environnement.",
            "Savoir appliquer les regles de securite concernant l'utilisation des telephones et ordiphones dans les vehicules.",
            "Savoir respecter les obligations en matiere d'entretien et de visite technique des vehicules.",
            "Savoir appliquer les regles de conduite a tenir en cas d'accident.",
            "Savoir rediger un constat amiable d'accident materiel.",
            "Connaitre la reglementation du permis de conduire.",
            "Savoir prendre en charge des passagers et leurs bagages en assurant la securite des personnes et des biens.",
          ],
        },
        {
          title: "Gestion - Competences communes",
          bullets: [
            "Connaitre et savoir appliquer les principes de base de gestion et de comptabilite.",
            "Connaitre les obligations et documents comptables.",
            "Connaitre les charges entrant dans le calcul du cout de revient et les classer en charges fixes et variables.",
            "Connaitre les principes de base pour determiner le produit d'exploitation, le benefice, le resultat, les charges, le seuil de rentabilite.",
            "Connaitre les principes de l'amortissement.",
            "Connaitre les differentes formes juridiques d'exploitation (EI, EIRL, EURL, SARL, SASU, SCOP...) et les modes d'exploitation (directe, location-gerance).",
            "Connaitre les differents regimes d'imposition et declarations fiscales.",
            "Connaitre les differentes formalites declaratives.",
            "Connaitre la composition et le role des chambres des metiers et de l'artisanat.",
            "Savoir definir les differents regimes sociaux ; comprendre les principes de cotisations et prestations par branche.",
          ],
        },
        {
          title: "Gestion - Competences specifiques Taxi",
          bullets: [
            "Connaitre les regles de detaxation partielle de la taxe interieure sur la consommation des produits energetiques (TICPE).",
            "Connaitre la reglementation relative a la taxe de stationnement.",
          ],
        },
        {
          title: "Francais",
          bullets: [
            "Comprendre un texte simple ou des documents en lien, notamment, avec l'activite des transports.",
            "Comprendre et s'exprimer en francais pour : accueillir la clientele ; comprendre les demandes ; interroger les clients sur leur confort ; tenir une conversation neutre et courtoise ; prendre conge des clients.",
          ],
        },
        {
          title: "Anglais",
          paragraph:
            "Comprendre et s'exprimer en anglais, au niveau A2 du Cadre Europeen Commun de Reference pour les Langues, pour : accueillir la clientele ; comprendre les demandes simples ; demander des renseignements simples concernant le confort ; tenir une conversation tres simple durant le transport ; prendre conge des clients.",
        },
        {
          title: "Connaissance du territoire et de la reglementation locale (specifique aux conducteurs de Taxi)",
          bullets: [
            "Connaitre le territoire d'exercice de l'activite : les principaux lieux, sites, batiments publics et les principaux axes routiers.",
            "Connaitre le reglement local en vigueur.",
          ],
        },
        {
          title: "Epreuve pratique - A. Conduite et securite",
          bullets: [
            "A-1 Conduite en securite et respect du code de la route : integration dans la circulation, respect des regles du code, recherche visuelle des informations, analyse des situations, adaptation de l'allure, distances de securite, respect des usagers vulnerables, eco-conduite.",
            "A-2 Souplesse de la conduite assurant le confort des passagers : usage souple des commandes ; anticipation des situations pour eviter les manoeuvres brutales.",
            "A-3 Prise en charge et depose des clients et leurs bagages : respect de l'arret et du stationnement, securite de l'arret, maniement precautionneux des bagages.",
          ],
        },
        {
          title: "Epreuve pratique - B. Relation client",
          bullets: [
            "B-1 Presentation generale et attitudes : tenue correcte, attitudes adaptees, discretion et courtoisie.",
            "B-2 Accueil, comportement durant le parcours et prise de conge.",
            "B-3 Verification de l'etat du vehicule avant et apres la prestation.",
          ],
        },
        {
          title: "Epreuve pratique - C. Construction du parcours",
          bullets: [
            "C-1 Elaborer un parcours ; utiliser un GPS et une carte routiere ; adapter le parcours a d'eventuelles difficultes (embouteillages, travaux...).",
          ],
        },
        {
          title: "Epreuve pratique - D. Facturation et paiement (competences specifiques Taxis)",
          bullets: [
            "Utiliser les equipements speciaux (compteur horokilometrique, dispositif lumineux, plaque horodateur, imprimante) et le terminal de paiement electronique (TPE) et controler leur bon fonctionnement.",
            "Connaitre la tarification locale applicable.",
            "Calculer le cout estimatif d'une course en fonction de la duree, de la distance et des aleas de la circulation.",
            "Etablir une facturation.",
          ],
        },
      ],
    };
  }

  if (t === "ta") {
    return {
      titre: "PROGRAMME FORMATION CHAUFFEUR TAXI POUR CHAUFFEURS VTC (Passerelle TA)",
      reference:
        "Arrete du 11 aout 2017 modifie relatif a la formation d'equivalence entre les activites VTC et taxi.",
      duree: "35 heures.",
      objectif:
        "Permettre a un conducteur VTC titulaire de la carte professionnelle depuis plus d'un an d'obtenir la carte de conducteur de taxi via la formation passerelle.",
      sections: [
        {
          title: "Reglementation nationale",
          bullets: [
            "Connaitre le fonctionnement des equipements speciaux obligatoires et du terminal de paiement electronique.",
            "Connaitre l'articulation entre les reglementations nationales et locales.",
            "Connaitre les regimes d'autorisation de stationnement.",
            "Connaitre les regles de tarification d'une course de Taxi.",
            "Connaitre les activites complementaires ouvertes aux taxis : services reguliers de transport, transport assis professionnalise.",
            "Connaitre les regles de detaxation partielle de la taxe interieure sur la consommation des produits energetiques (TICPE).",
            "Connaitre la reglementation relative a la taxe de stationnement.",
            "Connaitre le territoire d'exercice de l'activite : les principaux lieux, sites, batiments publics et les principaux axes routiers.",
            "Connaitre le reglement local en vigueur.",
          ],
        },
        {
          title: "Reglementation locale (specifique aux conducteurs de Taxi)",
          bullets: [
            "Connaitre le territoire d'exercice de l'activite : les principaux lieux, sites, batiments publics et les principaux axes routiers.",
            "Connaitre le reglement local en vigueur.",
          ],
        },
      ],
    };
  }

  if (t === "va") {
    return {
      titre: "PROGRAMME FORMATION CHAUFFEUR VTC POUR CHAUFFEURS TAXI (Passerelle VA)",
      reference:
        "Arrete du 11 aout 2017 modifie relatif a la formation d'equivalence entre les activites taxi et VTC.",
      duree: "7 heures.",
      objectif:
        "Permettre a un conducteur de taxi titulaire de la carte professionnelle depuis plus d'un an d'exercer l'activite de VTC.",
      sections: [
        {
          title: "Developpement commercial",
          bullets: [
            "Connaitre et comprendre les principes generaux du marketing (analyse de marche, ciblage de l'offre, competitivite, determination du prix...).",
            "Savoir valoriser les qualites de la prestation commerciale VTC.",
            "Savoir fideliser ses clients et prospecter pour en obtenir d'autres.",
            "Savoir mener des actions de communication pour faire connaitre son entreprise, notamment par internet et les moyens numeriques.",
            "Savoir developper un reseau de partenaires favorisant l'acces a la clientele (hotels, entreprise...).",
          ],
        },
        {
          title: "Reglementation specifique VTC",
          bullets: [
            "Connaitre les dispositions relatives aux exploitants : les modalites d'inscription au registre des VTC, les regles relatives a la capacite financiere...",
            "Connaitre les obligations specifiques relatives aux vehicules d'exploitation (dimensions, puissance, age...) et connaitre leur signalisation.",
            "Savoir etablir les documents relatifs a l'execution de la prestation de transport qui doivent etre presentes en cas de controle.",
          ],
        },
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
  doc.rect(0, 26, pw, 18, "F");
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 44, pw, 1.2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(sanitize(prog.titre), pw / 2, 37, { align: "center" });

  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  let y = 54;

  // Stagiaire
  const full = sanitize(
    `${apprenant.civilite || ""} ${apprenant.prenom || ""} ${apprenant.nom || ""}`.trim(),
  );
  doc.setFont("helvetica", "bold");
  doc.text("Stagiaire :", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(full, margin + doc.getTextWidth("Stagiaire :  "), y);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Genere le ${format(new Date(), "dd/MM/yyyy", { locale: fr })}`,
    pw - margin, y, { align: "right" },
  );
  doc.setTextColor(40, 40, 40);
  y += 8;

  // Meta info block (framed)
  const metaStartY = y;
  const meta: Array<[string, string]> = [
    ["Reference reglementaire", prog.reference],
    ["Objectif general", prog.objectif],
  ];
  y += 2;
  for (const [k, v] of meta) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(13, 37, 64);
    doc.text(`${k}`, margin + 3, y);
    y += 4.4;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(sanitize(v), pw - margin * 2 - 6) as string[];
    doc.text(lines, margin + 3, y);
    y += lines.length * 4.4 + 2;
  }
  // Frame around meta
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, metaStartY, pw - margin * 2, y - metaStartY, 1.5, 1.5);
  y += 4;

  const lineH = 4.6;
  const bulletIndent = 5;

  const ensureSpace = (needed: number) => {
    if (y + needed > ph - 20) {
      doc.addPage();
      y = 22;
    }
  };

  prog.sections.forEach((s, idx) => {
    const titleLines = doc.splitTextToSize(sanitize(s.title), pw - margin * 2 - 10) as string[];
    const titleH = titleLines.length * 5 + 3;
    ensureSpace(titleH + 8);

    // Section title band
    doc.setFillColor(13, 37, 64);
    doc.rect(margin, y - 4, 3, titleH, "F");
    doc.setFillColor(238, 243, 250);
    doc.rect(margin + 3, y - 4, pw - margin * 2 - 3, titleH, "F");
    doc.setTextColor(13, 37, 64);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    let ty = y;
    titleLines.forEach((tl, i) => {
      doc.text(`${i === 0 ? String(idx + 1).padStart(2, "0") + ".  " : "     "}${tl}`, margin + 5, ty);
      ty += 5;
    });
    y += titleH + 2;

    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    if (s.paragraph) {
      const lines = doc.splitTextToSize(sanitize(s.paragraph), pw - margin * 2 - 4) as string[];
      for (const line of lines) {
        ensureSpace(lineH);
        doc.text(line, margin + 2, y);
        y += lineH;
      }
    }

    if (s.bullets) {
      for (const b of s.bullets) {
        const lines = doc.splitTextToSize(sanitize(b), pw - margin * 2 - bulletIndent - 2) as string[];
        for (let i = 0; i < lines.length; i++) {
          ensureSpace(lineH);
          if (i === 0) {
            doc.setFillColor(212, 175, 55);
            doc.circle(margin + 2.8, y - 1.4, 0.9, "F");
            doc.setTextColor(40, 40, 40);
          }

          doc.text(lines[i], margin + bulletIndent + 2, y);
          y += lineH;
        }
      }
    }
    y += 4;
  });


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
