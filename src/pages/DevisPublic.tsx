import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, FileText, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

/* ─── DEVIS TYPE CONFIG ─── */
interface DevisTypeConfig {
  description: string[];
  duree: string;
  dureePlateforme?: string;
  agrement: string;
  formationDejaLabel: string;
}

const DEVIS_TYPE_CONFIGS: Record<string, DevisTypeConfig> = {
  "vtc_complet": {
    description: ["Formation VTC", "Formation théorique et pratique", "Mise à disposition du véhicule pour l'examen sur Lyon", "Frais d'examen de la chambre des métiers et de l'artisanat"],
    duree: "Nombre d'heures : 66h",
    agrement: "n° VTC16-15",
    formationDejaLabel: "Formation VTC déjà réalisée ?",
  },
  "vtc_elearning": {
    description: ["Formation VTC E-learning", "Frais d'examen de la chambre des métiers et de l'artisanat", "Formation pratique VTC 3h solo ou 6h en groupe", "Mise à disposition du véhicule pour l'examen"],
    duree: "",
    dureePlateforme: "3 mois",
    agrement: "n° VTC16-05",
    formationDejaLabel: "Formation VTC E-learning déjà réalisée ?",
  },
  "taxi_elearning": {
    description: ["TAXI", "Formation TAXI E-learning", "Frais d'examen à la Chambre des métiers et de l'artisanat", "Mise à disposition du véhicule pour l'examen"],
    duree: "Nombre d'heures : 96h",
    dureePlateforme: "3 mois",
    agrement: "n°69-18-001",
    formationDejaLabel: "Formation TAXI E-learning déjà réalisée ?",
  },
  "taxi_pratique": {
    description: ["Formation pratique TAXI"],
    duree: "6 heures en groupe ou 3 heures solo",
    agrement: "n°69-18-001",
    formationDejaLabel: "Formation pratique TAXI déjà réalisée ?",
  },
  "ta_elearning": {
    description: ["Formation TA (passerelle VTC→TAXI) E-learning", "Frais d'examen à la Chambre des métiers et de l'artisanat", "Mise à disposition du véhicule pour l'examen"],
    duree: "",
    dureePlateforme: "3 mois",
    agrement: "n°69-18-001",
    formationDejaLabel: "Formation TA déjà réalisée ?",
  },
  "va_elearning": {
    description: ["Formation VA (passerelle TAXI→VTC) E-learning", "Frais d'examen de la chambre des métiers et de l'artisanat", "Mise à disposition du véhicule pour l'examen"],
    duree: "",
    dureePlateforme: "3 mois",
    agrement: "n° VTC16-05",
    formationDejaLabel: "Formation VA déjà réalisée ?",
  },
  "fc_vtc": {
    description: ["Formation continue VTC"],
    duree: "14 heures",
    agrement: "n° VTC16-15",
    formationDejaLabel: "Formation continue VTC déjà réalisée ?",
  },
  "fc_taxi": {
    description: ["Formation continue TAXI"],
    duree: "14 heures",
    agrement: "n°69-18-001",
    formationDejaLabel: "Formation continue TAXI déjà réalisée ?",
  },
  "vtc_sans_frais_examen": {
    description: ["Formation VTC", "Formation théorique et pratique", "Mise à disposition du véhicule pour l'examen sur Lyon"],
    duree: "Nombre d'heures : 66h",
    agrement: "n° VTC16-15",
    formationDejaLabel: "Formation VTC déjà réalisée ?",
  },
  "vtc_soir_avec_examen": {
    description: ["Formation VTC soir", "Formation théorique et pratique", "Mise à disposition du véhicule pour l'examen sur Lyon", "Frais d'examen de la chambre des métiers et de l'artisanat"],
    duree: "Nombre d'heures : 66h",
    agrement: "n° VTC16-15",
    formationDejaLabel: "Formation VTC déjà réalisée ?",
  },
  "vtc_soir_sans_examen": {
    description: ["Formation VTC soir", "Formation théorique et pratique", "Mise à disposition du véhicule pour l'examen sur Lyon"],
    duree: "Nombre d'heures : 66h",
    agrement: "n° VTC16-15",
    formationDejaLabel: "Formation VTC déjà réalisée ?",
  },
};

/** Detect config from formation/modele text */
function detectConfig(formation: string): DevisTypeConfig {
  const f = formation.toLowerCase();
  if (f.includes("pratique taxi") || f.includes("taxi pratique")) return DEVIS_TYPE_CONFIGS["taxi_pratique"];
  if (f.includes("taxi e-learning") || f.includes("taxi elearning")) return DEVIS_TYPE_CONFIGS["taxi_elearning"];
  if (f.includes("ta ") && f.includes("passerelle")) return DEVIS_TYPE_CONFIGS["ta_elearning"];
  if (f.includes("va ") && (f.includes("passerelle") || f.includes("chauffeurs taxi"))) return DEVIS_TYPE_CONFIGS["va_elearning"];
  if (f.includes("continue vtc")) return DEVIS_TYPE_CONFIGS["fc_vtc"];
  if (f.includes("continue taxi")) return DEVIS_TYPE_CONFIGS["fc_taxi"];
  if (f.includes("vtc soir") && f.includes("sans")) return DEVIS_TYPE_CONFIGS["vtc_soir_sans_examen"];
  if (f.includes("vtc soir")) return DEVIS_TYPE_CONFIGS["vtc_soir_avec_examen"];
  if (f.includes("vtc") && f.includes("sans frais")) return DEVIS_TYPE_CONFIGS["vtc_sans_frais_examen"];
  if (f.includes("vtc e-learning") || f.includes("vtc elearning")) return DEVIS_TYPE_CONFIGS["vtc_elearning"];
  if (f.includes("vtc")) return DEVIS_TYPE_CONFIGS["vtc_complet"];
  // Default fallback
  return {
    description: [formation],
    duree: "",
    agrement: "n°69-18-001",
    formationDejaLabel: "Formation déjà réalisée ?",
  };
}

/* ─── CGV TEXT (version complète mot pour mot du document source) ─── */
const CGV_INTRO = "FTRANSPORT est un organisme de formation professionnelle spécialisé dans le secteur du transport son siège social est fixé au 86 route de genas 69003 Lyon.\n\nDans les paragraphes qui suivent, il est convenu de désigner par :\n\n• CLIENT : toute personne physique ou morale qui s'inscrit ou passe commande d'une formation auprès de FTRANSPORT\n• STAGIAIRE : la personne physique ou morale qui participe à une formation\n• CGV : les conditions générales de vente, détaillées ci-dessous.\n• OPCO : les organismes paritaires collecteurs agréés chargés de collecter et gérer l'effort de formation des entreprises.";

const CGV_SECTIONS = [
  { title: "Objet", text: "Les présentes conditions générales de vente s'appliquent à l'ensemble des prestations de formation engagées par FTRANSPORT pour le compte d'un Client. Le fait de s'inscrire ou de passer commande implique l'adhésion entière et sans réserve du Client aux présentes conditions générales de vente. Les présentes conditions générales de vente prévalent sur tout autre document du Client, et en particulier sur toutes les conditions générales d'achat du Client." },
  { title: "Conditions financières, règlements et modalités de paiement", text: "Tous les prix sont indiqués en euros et toutes taxes. Le règlement du prix de la formation est prélevé après le délai de rétractation et peut être échelonné sur le temps. Toute somme non payée à échéance entraîne de plein droit et sans mise en demeure préalable, l'application de pénalités d'un montant égal à une fois et demie le taux d'intérêt légal. FTRANSPORT aura la faculté d'obtenir le règlement par voie contentieuse aux frais du Client sans préjudice des autres dommages et intérêts qui pourraient être dus à FTRANSPORT.\n\nEn cas de règlement par l'OPCO dont dépend le Client, il appartient au Client d'effectuer sa demande de prise en charge avant le début de la formation. L'accord de financement doit être communiqué au moment de l'inscription et sur l'exemplaire du devis que le Client retourne.\n\nEn cas de prise en charge partielle par l'OPCO, la différence sera directement facturée par FTRANSPORT au Client. Si l'accord de prise en charge du Client ne parvient pas à FTRANSPORT au plus tard un jour ouvrable avant le démarrage de la formation, FTRANSPORT se réserve la possibilité de refuser l'entrée en formation du Stagiaire ou de facturer la totalité des frais de formation au Client.\n\nDans des situations exceptionnelles, il peut être procédé à un paiement échelonné. En tout état de cause, ses modalités devront avoir été formalisées avant le démarrage de la formation." },
  { title: "Dédit et remplacement d'un participant", text: "En cas de dédit signifié par le Client à FTRANSPORT au moins 7 jours avant le démarrage de la formation, FTRANSPORT offre au Client la possibilité :\n\n• de repousser l'inscription du Stagiaire à une formation ultérieure, dûment programmée par FTRANSPORT et après accord éventuel de l'OPCO,\n• d'obtenir le remboursement intégral des sommes versées, si FTRANSPORT est dans l'impossibilité d'assurer la formation à la date convenue." },
  { title: "Annulation, absence ou interruption d'une formation", text: "Tout module commencé est dû dans son intégralité et fera l'objet d'une facturation au Client par FTRANSPORT. En cas d'absence, d'interruption ou d'annulation, la facturation de FTRANSPORT distinguera le prix correspondant aux journées effectivement suivies par le Stagiaire et les sommes dues au titre des absences ou de l'interruption de la formation.\n\nLes journées d'absences seront remboursées à partir du 8ème jour d'absence si toutefois le stagiaire fournit une preuve avec justificatif tel qu'un certificat médical attestant les raisons de son absence.\n\nIl est rappelé que les sommes dues par le Client à ce titre ne peuvent être imputées par le Client sur son obligation de participer à la formation professionnelle continue ni faire l'objet d'une demande de prise en charge par un OPCO.\n\nDans cette hypothèse, le Client s'engage à régler les sommes qui resteraient à sa charge directement à FTRANSPORT.\n\nD'autre part, en cas d'annulation de la formation par le Client, FTRANSPORT se réserve le droit de facturer au Client des frais d'annulation calculés comme suit :\n\n• si l'annulation intervient dans un délai de 14 jours calendaires après avoir signé ces conditions générales de ventes, aucun frais d'annulation ne sera appliqué. Pour cela, le client devra notifier sa rétractation par lettre recommandée avec avis de réception adressée à FTRANSPORT 86 route de Genas 69003 Lyon. Toutefois, conformément à l'article L221-25 du Code de la consommation, si la date de début de la formation pratique intervient avant l'expiration du délai de rétractation de 14 jours, le stagiaire reconnaît expressément renoncer à son droit de rétractation en acceptant le présent devis. Dans ce cas, aucun remboursement ne pourra être exigé au titre du droit de rétractation.\n• si l'annulation intervient après 14 jours calendaires après avoir signé ces conditions générales de ventes : les frais d'annulation sont égaux à 100 % du prix TTC de la formation.\n\nToutefois ces frais ne seront pas applicables si le futur stagiaire nous en stipule les raisons par le biais d'un certificat médical.\n\nAttention FTRANSPORT n'est pas responsable en cas de non-inscription à l'examen VTC ou Taxi, aucun remboursement ne sera accepté si le candidat n'est pas inscrit à l'examen. Cependant, il pourra participer à une autre session de formation au choix." },
  { title: "Horaires et accueil", text: "Sauf indication contraire portée sur la fiche de présentation de la formation et la convocation, la durée quotidienne des formations est fixée à sept heures. Sauf indication contraire portée sur la convocation, les formations se déroulent de 09h00 à 12h00 et de 13h00 à 17h00 avec une pause en milieu de chaque demi-journée. Les locaux de FTRANSPORT accueillent les Stagiaires de 09h00 à 12h00 et de 14h00 à 18h00." },
  { title: "Effectif et ajournement", text: "Pour favoriser les meilleures conditions d'apprentissage, l'effectif de chaque formation est limité. Cet effectif est déterminé, pour chaque formation, en fonction des objectifs et des méthodes pédagogiques. Les inscriptions sont prises en compte dans leur ordre d'arrivée. L'émission d'un devis ne tient pas lieu d'inscription. Seuls les devis dûment renseignés, datés, tamponnés (pour les personnes morales), signés et revêtus de la mention « Bon pour accord », retournés à FTRANSPORT et après que le règlement est encaissé ont valeur contractuelle. Une fois l'effectif atteint, les inscriptions sont closes. FTRANSPORT peut alors proposer au Stagiaire de participer à une nouvelle session ou de figurer sur une liste d'attente. Dans le cas où le nombre de participants serait insuffisant pour assurer le bon déroulement d'une formation, FTRANSPORT se réserve la possibilité de reporter la formation à la session suivante." },
  { title: "Obligations et force majeure", text: "Dans le cadre de ses prestations de formation, FTRANSPORT est tenue à une obligation de moyen et non de résultat vis-à-vis de ses Clients ou de ses Stagiaires. En cas d'échec à l'épreuve d'admissibilité du stagiaire organisée par la chambre de métiers et de l'artisanat, le candidat pourra disposer d'un accès à la plateforme de cours en ligne sur www.gestion.ftransport.fr/cours après l'annonce de son échec et jusqu'à la date de son prochain examen pratique TAXI. Les identifiants de connexion sont transmis par email automatiquement lors de l'inscription. Cet accès est maintenu jusqu'au passage de l'épreuve d'admission (examen pratique TAXI), sauf si le candidat a déjà bénéficié d'une formation e-learning TAXI ou VTC dans les trois mois précédents. En cas d'échec à l'épreuve d'admission, le candidat devra s'acquitter de la somme de 50 euros s'il souhaite utiliser le véhicule de FTRANSPORT pour l'épreuve d'admission et uniquement dans ce cadre, il devra le restituer par la suite au local de FTRANSPORT au 86 route de Genas 69003 Lyon.\n\nFtransport n'est pas responsable de l'inscription du stagiaire à l'examen auprès de la chambre des métiers et de l'artisanat notamment en cas de réinscription à un examen théorique (épreuve d'admissibilité) ou pratique (épreuve d'admission).\n\nLa formation pratique peut être déplacée en dehors des horaires de formation dans ce cas-là, le stagiaire en sera averti, en cas d'absence du stagiaire à un examen théorique (épreuve d'admissibilité) ou pratique (épreuve d'admission), il doit en avertir le centre de formation FTRANSPORT, si ce dernier ne nous en informe pas ou qu'il nous donne plus de signe de contact écrit dans les 6 mois, Ftransport se donne le droit de lui annulé la formation théorique ou pratique et il n'en sera pas dédommagé.\n\nFTRANSPORT ne pourra être tenue responsable à l'égard de ses Clients ou de ses Stagiaires en cas d'inexécution de ses obligations résultant d'un évènement fortuit ou de force majeure. Sont ici considérés comme cas fortuit ou de force majeure, outre ceux habituellement reconnus par la jurisprudence : la maladie ou l'accident d'un intervenant ou d'un responsable pédagogique, les grèves ou conflits sociaux externes à FTRANSPORT, les désastres naturels, les incendies, l'interruption des télécommunications, de l'approvisionnement en énergie, ou des transports de tout type, ou toute autre circonstance échappant au contrôle raisonnable de FTRANSPORT.\n\nCependant en cas d'absence d'un formateur de moins de 2 jours, le stagiaire aura le choix :\n• de rattraper les journées d'absences convenu avec le formateur\n• ou de consulter ses cours et ses exercices en ligne sur le site internet : www.gestion.ftransport.fr/cours en saisissant ses identifiants de connexion.\n\nEn cas d'impossibilité totale de réalisation de la formation ou de rupture de formation définitive, les élèves seront remboursés au prorata du nombre d'heures ou de jours effectués, cela ne concerne que les élèves qui ont financé leur formation personnellement sans passer par un organisme quelconque. Cela correspond au prix de la formation divisé par le nombre de jours de formation (théorie et pratique)." },
  { title: "Propriété intellectuelle", text: "L'ensemble des fiches de présentation, contenus et supports pédagogiques quelle qu'en soit la forme (papier, électronique, numérique, orale…) utilisés par FTRANSPORT pour assurer les formations ou remis aux Stagiaires constituent des œuvres. A ce titre, le Client et le Stagiaire s'interdisent d'utiliser, transmettre, reproduire, exploiter ou transformer tout ou partie de ces documents, sans un accord exprès de FTRANSPORT. Cette interdiction porte, en particulier, sur toute utilisation faite par le Client et le Stagiaire en vue de l'organisation ou l'animation de formations." },
  { title: "Descriptifs, objectifs et programme des formations", text: "Les objectifs de la formation :\nLa formation pratique TAXI a pour but de former les stagiaires au métier de chauffeur TAXI et surtout de se préparer au mieux à l'examen pratique TAXI qui est réalisé par la chambre des métiers et de l'artisanat.\n\nLes prérequis :\nLa formation demande en amont de savoir lire et écrire, avoir le casier judiciaire B2 vierge et avoir réussi l'examen théorique TAXI.\n\nLes moyens pédagogiques :\nLes stagiaires ont accès aux cours en ligne sur www.gestion.ftransport.fr/cours. Les identifiants de connexion sont transmis automatiquement par email lors de l'inscription. Des cours et des exercices sont donnés aux stagiaires durant la formation. Des livres pédagogiques sont parfois attribués.\n\nLes techniques d'encadrement et de mise en œuvre :\nLes stagiaires écoutent le cours puis effectuent des exercices en lien par rapport aux cours.\n\nLes modalités d'évaluation des acquis de la formation :\nDes exercices et des examens blancs et des corrections sont effectués durant la formation.\n\nLes contenus des programmes :\nLes contenus des programmes, tels qu'ils figurent sur les fiches de présentation des formations sont sur le site internet : www.gestion.ftransport.fr/cours (les identifiants de connexion sont transmis automatiquement par email au stagiaire lors de son inscription). Ils sont fournis à titre indicatif pour une durée maximum de trois mois. L'intervenant ou le responsable pédagogique se réservent le droit de les modifier en fonction de l'actualité, du niveau des participants ou de la dynamique du groupe.\n\nOrganisation de l'action de formation :\nL'action de formation est organisée pour un effectif de maximum 21 stagiaires.\n\nLes diplômes, titres ou références de(s) personne(s) chargée(s) de la formation sont :\n• Pour le formateur tronc commun et la gestion spécifique VTC : BTS, transport, Bachelor en Marketing et Master en Métiers de l'Enseignement de l'Éducation et de la Formation.\n• Pour le formateur TAXI : Plus de 5 ans d'expériences en tant que chauffeur de TAXI." },
  { title: "Confidentialité et communication", text: "FTRANSPORT, le Client et le Stagiaire s'engagent à garder confidentiels les documents et les informations auxquels ils pourraient avoir accès au cours de la prestation de formation ou à l'occasion des échanges intervenus antérieurement à l'inscription, notamment l'ensemble des éléments figurant dans la proposition transmise par FTRANSPORT au Client.\n\nFTRANSPORT s'engage à ne pas communiquer à des tiers autres que les partenaires avec lesquels sont organisées les formations et aux OPCO, les informations transmises par le Client y compris les informations concernant les Stagiaires.\n\nCependant, le Client accepte d'être cité par FTRANSPORT comme client de ses formations. A cet effet, le Client autorise FTRANSPORT à mentionner son nom ainsi qu'une description objective de la nature des prestations dans ses listes de références et propositions à l'attention de ses prospects et de sa clientèle, entretiens avec des tiers, rapports d'activité, ainsi qu'en cas de dispositions légales, réglementaires ou comptables l'exigeant." },
  { title: "Protection et accès aux informations à caractère personnel", text: "FTRANSPORT s'engage à informer chaque Stagiaire que :\n• des données à caractère personnel le concernant sont collectées et traitées aux fins de suivi de la validation de la formation et d'amélioration de l'offre de FTRANSPORT\n• conformément à la loi n° 78-17 du 6 janvier 1978, le Stagiaire dispose d'un droit d'accès, de modification, de rectification des données à caractère personnel le concernant.\n\nLes données personnelles collectées seront utilisées pour connaître le nombre de candidats par session de formation et de réaliser des statistiques utiles à l'activité de Services pro. L'exécution du contrat, donne l'autorisation à Services pro de traiter ces données.\n\nLe dirigeant a accès aux informations collectées, cependant les autres membres de l'entreprises peuvent en avoir accès sur demande du dirigeant pour une finalité précise.\n\nLes données personnelles seront conservées au maximum 5 ans après la fin de la relation contractuelle. Vous pouvez toutefois demander à ce que vos données personnelles soit effacées avant ce délai, pour cela il faudra en faire la demande par courriel à l'adresse email suivante : contact@ftransport.fr\n\nEnfin, FTRANSPORT s'engage à effacer à l'issue des exercices toute image qui y aurait été prise par tout moyen vidéo lors de travaux pratiques ou de simulations." },
  { title: "Droit applicable et juridiction compétente", text: "Les conditions générales détaillées dans le présent document sont régies par le droit français. En cas de litige survenant entre le Client et FTRANSPORT à l'occasion de l'interprétation des présentes ou de l'exécution du contrat, il sera recherché une solution à l'amiable. A défaut, les Tribunaux de Lyon seront seuls compétents pour régler le litige." },
];

/* ─── Référentiel théorique ─── */
const REFERENTIEL_THEORIQUE = [
  { title: "Réglementation du transport public particulier de personnes et prévention des discriminations et des violences sexuelles et sexistes", subtitle: "Compétences communes :", items: [
    "Connaître la réglementation s'appliquant aux différents modes de transport publics particuliers : taxis, VTC, véhicules motorisés à deux roues ;",
    "Connaître la réglementation relative à l'utilisation de la voie publique pour la prise en charge de la clientèle pour les différents modes de transport publics particuliers",
    "Connaître les obligations générales relatives aux véhicules ;",
    "Connaître les obligations relatives au conducteur : d'accès et d'exercice de la profession, obligations de formation continue ;",
    "Connaître la composition et le rôle des divers organismes administratifs, consultatifs et professionnels ;",
    "Connaître les autorités administratives et juridiction compétentes dans le cadre de l'activité du transport public particulier de personnes ;",
    "Connaître les obligations du conducteur en matière d'assurance, l'identification des assurances obligatoires et les conséquences à ne pas être assuré ;",
    "Connaître les agents susceptibles de procéder à des contrôles en entreprise ou sur route et leurs prérogative respectives ; savoir présenter les documents relatifs au conducteur et au véhicule ;",
    "Connaître les sanctions administratives et/ou pénales encourues en cas d'infraction à la réglementation ainsi que les voies et délais de recours ;",
    "Connaître les règles relatives à la prise en charge des personnes à mobilité réduite ;",
    "Avoir des notions de réglementation s'appliquant aux transports collectifs assurés sous la forme de services occasionnels ainsi que sur le transport à la demande ;",
    "Avoir des notions sur les règles s'appliquant aux pratiques de covoiturage entre particuliers et aux offres de transport privé ;",
    "Connaître les dispositions relatives aux intermédiaires, en ce qui concerne la relation avec le conducteur",
    "Connaître les comportements constituant des infractions à caractère sexuel et/ ou sexiste (outrage sexiste, agression sexuelle, harcèlement sexuel, viol) ;",
    "Connaître les discriminations listées à l'article 225-1 du code pénal ainsi que les peines encourues ;",
    "Connaître les acteurs au service de la prévention en matière de violences sexuelles et sexistes et les acteurs au service de la prévention et de la lutte contre les discriminations : identification des acteurs mobilisables, en fonction des situations rencontrées, et, le cas échéant, des bons réflexes à mobiliser.",
  ]},
];

/* ─── Référentiel pratique ─── */
const REFERENTIEL_PRATIQUE = [
  { title: "A - CONDUITE ET SÉCURITÉ", sections: [
    { subtitle: "A - 1 Conduite en sécurité et respect du code de la route", items: [
      "Intégrer son véhicule dans la circulation sur les différents types de réseaux et d'environnement routiers (agglomération denses, route hors agglomération, voie rapides, autoroutes) ;",
      "Respecter l'ensemble des règles du code de la route en circulation ; signalisation, limitation de vitesse, priorité, usage des voies, croisement, dépassement... ;",
      "Rechercher visuellement les informations : regarder, percevoir et trier les informations sur les situations de conduite, contrôler dans les rétroviseurs, contrôler les angles morts en vision direct... ;",
      "Analyser les situations de conduites et prévoir leurs évolution (détecter les indices utiles, comprendre les intentions des autres usagers...) ;",
      "Adapter l'allure aux circonstance (type et état de la route, densité de circulation, conditions météorologiques) ;",
      "Respecter les distances et marges de sécurité ;",
      "Respecter les autres usagers et apporter toute la vigilance nécessaire aux usagers vulnérables (piétons, deux-roues) ;",
      "Appliquer les principes d'éco-conduite.",
    ]},
    { subtitle: "A - 2 Souplesse de la conduite assurant le confort des passagers", items: [
      "Utiliser de manière souple et rationnelle les commandes du véhicule :",
      "Lors des changements d'allure (utilisant des freins et de l'accélérateur) ;",
      "Lors des changements de direction (maniement du volant, trajectoire) ;",
      "Lors des changements de vitesse (sauf si boite de vitesse automatique).",
      "Anticiper les situations de conduite et leurs évolutions afin d'éviter les décélération ou changement de direction brutaux (ajustement de l'allure à l'approche d'un feu tricolore, anticipation des décélérations...) ;",
    ]},
    { subtitle: "A - 3 Prise en charge et dépose des clients et leurs bagages", items: [
      "Respecter la réglementation de l'arrêt et du stationnement ;",
      "Assurer la sécurité de l'arrêt par le choix de l'emplacement et le cas échéant par la gestion du risque (attirer l'attention des clients sur les véhicules circulants à proximité, utiliser les feux de détresse) ;",
      "Manier correctement et précautionneusement les bagages (savoir porter des charges, charger et décharger sans abimer les sacs et valises, savoir installer d'éventuels objets fragiles...) ;",
    ]},
    { subtitle: "Compétences spécifique Taxis", items: [
      "Se faire héler en circulation par des clients dans le cadre de la maraude et s'arrêter en toute sécurité pour les prendre en charge.",
      "Le cas échéant (dans la mesure où la réglementation le permet), utilisation des voies réservées à la circulation des véhicules des services réguliers de transport en commun.",
    ]},
  ]},
  { title: "B - RELATION CLIENT", sections: [
    { subtitle: "B - 1 Présentation générale et attitudes du candidat", items: [
      "Avoir une tenue vestimentaire correcte et adaptée à l'activité ainsi qu'une bonne présentation générale ;",
      "Avoir des attitudes et comportements adaptés (démarche, geste, expression, accueil des personnes à mobilité réduite) ;",
      "Être discret, courtois et respectueux du client.",
    ]},
    { subtitle: "B - 2 Accueil, comportement durant le parcours et prise de congé", items: [
      "Accueillir le client lors de sa montée dans le véhicule, de façon adaptée à l'activité ;",
      "Converser durant le parcours si le client le désire en restant neutre et discret ; veiller aux éléments de confort (température de l'habitacle, radio...) ;",
      "Prendre congé du client lors de l'arrivée au point de destination, de façon adaptée à l'activité.",
    ]},
    { subtitle: "B - 3 Vérification de l'état du véhicule avant et après la prestation", items: [
      "Veiller au bon état et à la propreté du véhicule.",
    ]},
  ]},
  { title: "C - CONSTRUCTION DU PARCOURS", sections: [
    { subtitle: "C - 1 Construction du parcours et accompagnement touristique", items: [
      "Élaborer un parcours d'un lieu de prise en charge à un lieu de dépose des clients ;",
      "Utiliser un GPS (programmation, suivi de l'itinéraire) et utiliser un plan ou une carte routière ;",
      "Adapter le parcours à d'éventuelles difficultés inattendues (embouteillages, travaux...).",
    ]},
    { subtitle: "Compétences spécifique Taxis", items: [
      "Construire immédiatement en réponse à la demande du clients pris en charge, l'itinéraire le plus adapté en s'appuyant sur la connaissance du territoire.",
      "Connaître et savoir appliquer la réglementation locale de l'exploitation des taxis.",
    ]},
  ]},
];

const RAPPEL_FINAL = "Nous vous rappelons que ce devis ne fait pas l'objet d'une inscription donc votre place n'est pas réservée. Ce devis est valable pour une durée d'une semaine sous réserve de places disponibles. Il n'est définitivement valide qu'après accord écrit entre le stagiaire et FTRANSPORT sur la date de la formation pratique. Toute inscription sans date de formation pratique confirmée par FTRANSPORT est considérée comme non finalisée.\n\nInscription validée : devis + fiche inscription + conditions générales de ventes remplis et signés + documents justificatifs + règlement.\n\nPour plus d'informations consultez notre site http://ftransport.fr/ ou par téléphone au 04.28.29.60.91.";

const RIB_INFO = {
  titulaire: "SERVICES PRO FTRANSPORT",
  adresse: "86 ROUTE DE GENAS, 69003 LYON 3EME",
  swift: "REVOFRP2",
  iban: "FR76 2823 3000 0185 7527 9099 426",
  banque: "Revolut Bank UAB",
};

export default function DevisPublic() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [devis, setDevis] = useState<any>(null);
  const [apprenant, setApprenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState("");

  // Interactive form state
  const [datePermis, setDatePermis] = useState("");
  const [points6, setPoints6] = useState<boolean | null>(null);
  const [sansPermis, setSansPermis] = useState<boolean | null>(null);
  const [refusRestitution, setRefusRestitution] = useState<boolean | null>(null);
  const [condamnation, setCondamnation] = useState<boolean | null>(null);
  const [casierVierge, setCasierVierge] = useState<boolean | null>(null);
  const [formationDeja, setFormationDeja] = useState<boolean | null>(null);
  const [centreFormation, setCentreFormation] = useState("");
  const [mentionAccord, setMentionAccord] = useState("");
  const [acceptEarlyStart, setAcceptEarlyStart] = useState(false);
  const [acceptCGV, setAcceptCGV] = useState(false);

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Lien invalide — aucun token trouvé.");
      setLoading(false);
      return;
    }
    loadDevis();
  }, [token]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1e3a8a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, [loading]);

  const loadDevis = async () => {
    const { data, error: err } = await supabase
      .from("devis_envois")
      .select("*, apprenants(nom, prenom, email, formation_choisie, adresse, code_postal, ville, telephone, date_naissance, civilite)")
      .eq("token", token!)
      .single();

    if (err || !data) {
      setError("Ce lien de devis est invalide ou a expiré.");
      setLoading(false);
      return;
    }

    setDevis(data);
    setApprenant((data as any).apprenants);
    if (data.devis_signe_url) setUploaded(true);
    setLoading(false);
  };

  // Canvas drawing handlers
  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  };
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => { e.preventDefault(); const c = canvasRef.current; if (!c) return; setIsDrawing(true); lastPos.current = getPos(e, c); };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); if (!isDrawing) return;
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx || !lastPos.current) return;
    const pos = getPos(e, c);
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
    lastPos.current = pos; setHasSigned(true);
  };
  const stopDraw = (e: React.MouseEvent | React.TouchEvent) => { e.preventDefault(); setIsDrawing(false); lastPos.current = null; };
  const clearSig = () => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#1e3a8a"; ctx.lineWidth = 2; ctx.lineCap = "round";
    setHasSigned(false);
  };

  const handleSendDevis = async () => {
    // Validation
    if (!acceptCGV) { toast.error("Veuillez accepter les CGV"); return; }
    if (!acceptEarlyStart) { toast.error("Veuillez cocher la clause de renonciation au délai de rétractation"); return; }
    if (!hasSigned) { toast.error("Veuillez signer le devis"); return; }
    if (!mentionAccord.toLowerCase().includes("lu et approuvé")) { toast.error("Veuillez écrire « Lu et approuvé, Bon pour accord »"); return; }

    setUploading(true);
    try {
      // Capture signature as image
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Signature introuvable");
      const signatureBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Erreur signature")), "image/png");
      });

      // Use edge function (service_role) to upload & update — avoids RLS issues
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apikey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const formData = new FormData();
      formData.append("token", token!);
      formData.append("file", signatureBlob, `${devis.id}_signature_${Date.now()}.png`);

      const response = await fetch(`${baseUrl}/functions/v1/upload-devis-signe`, {
        method: "POST",
        headers: { apikey },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erreur lors de l'envoi");

      setUploaded(true);
      toast.success("Devis signé envoyé avec succès !");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setUploading(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">Contactez-nous : contact@ftransport.fr — 04.28.29.60.91</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = new Date().toLocaleDateString("fr-FR");
  const nom = `${apprenant?.civilite || ""} ${apprenant?.prenom || ""} ${apprenant?.nom || ""}`.trim();
  const formationLabel = devis?.formation || devis?.modele || "";
  const typeConfig = detectConfig(formationLabel);

  /* ═══ YES/NO checkbox helper ═══ */
  const YesNo = ({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean) => void }) => (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-gray-800">{label}</p>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={value === true} onChange={() => onChange(true)} className="w-5 h-5 accent-blue-600" />
          <span className="text-sm">Oui</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={value === false} onChange={() => onChange(false)} className="w-5 h-5 accent-blue-600" />
          <span className="text-sm">Non</span>
        </label>
      </div>
    </div>
  );

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-page { page-break-after: always; }
          .devis-container { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          .devis-container * { font-size: 11px !important; }
          .devis-container h1 { font-size: 18px !important; }
          .devis-container h2 { font-size: 14px !important; }
          .devis-container h3 { font-size: 12px !important; }
          input[type="text"], input[type="date"], textarea { border: none !important; border-bottom: 1px solid #000 !important; background: transparent !important; padding: 2px 4px !important; }
          input[type="checkbox"] { -webkit-appearance: checkbox !important; appearance: checkbox !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
        {/* Top action bar */}
        <div className="no-print sticky top-0 z-50 bg-white/90 backdrop-blur border-b shadow-sm">
          <div className="max-w-[850px] mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="font-bold text-sm text-gray-800">FTRANSPORT — Devis & Inscription</span>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handlePrint} size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Printer className="h-4 w-4" /> Imprimer / Enregistrer PDF
              </Button>
            </div>
          </div>
        </div>

        <div className="devis-container max-w-[850px] mx-auto p-4 md:p-8 space-y-0">

          {/* ═══ PAGE 1 : DEVIS ET INSCRIPTION ═══ */}
          <div className="print-page bg-white rounded-lg shadow-sm border p-6 md:p-10 space-y-6 mb-6">
            {/* Header */}
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold text-blue-900 tracking-tight">FTRANSPORT</h1>
              <p className="text-xs text-gray-500 mt-1">Spécialiste Formations Transport</p>
            </div>

            <h2 className="text-xl font-bold text-center text-gray-900">DEVIS ET INSCRIPTION</h2>

            {/* Tableau formation */}
            <table className="w-full border-collapse border text-sm">
              <thead>
                <tr className="bg-blue-800 text-white">
                  <th className="border p-2 text-left w-2/4">Description</th>
                  <th className="border p-2 text-center w-1/8">Quantité</th>
                  <th className="border p-2 text-right w-1/8">Montant en Euros en HT</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-2">
                    <span className="font-medium">Formation et prestations</span><br />
                    {typeConfig.description.map((line, i) => (
                      <span key={i}>{line}{i < typeConfig.description.length - 1 && <br />}</span>
                    ))}
                  </td>
                  <td className="border p-2 text-center">1</td>
                  <td className="border p-2 text-right font-bold">{devis.montant}</td>
                </tr>
                {typeConfig.duree && (
                  <tr>
                    <td className="border p-2"><strong>Durée</strong></td>
                    <td className="border p-2 text-center" colSpan={2}>{typeConfig.duree}</td>
                  </tr>
                )}
                {typeConfig.dureePlateforme && (
                  <tr>
                    <td className="border p-2"><strong>Durée de mise à disposition de la plateforme</strong> www.gestion.ftransport.fr/cours</td>
                    <td className="border p-2 text-center" colSpan={2}>{typeConfig.dureePlateforme}</td>
                  </tr>
                )}
                <tr>
                  <td className="border p-2"><strong>Lieu</strong></td>
                  <td className="border p-2 text-center" colSpan={2}>LYON (69)</td>
                </tr>
                <tr>
                  <td className="border p-2"><strong>Dates</strong></td>
                  <td className="border p-2" colSpan={2}><input type="text" className="border-b border-gray-400 px-1 w-full text-sm" placeholder="À compléter" /></td>
                </tr>
                <tr>
                  <td className="border p-2"><strong>Nom et Prénom du stagiaire</strong></td>
                  <td className="border p-2" colSpan={2}>{nom || <input type="text" className="border-b border-gray-400 px-1 w-full text-sm" placeholder="À compléter" />}</td>
                </tr>
              </tbody>
            </table>

            <p className="text-xs text-gray-500">
              Centre de formation agréé par la préfecture : {typeConfig.agrement} — NDA : 84 69 15114 69 — SIRET : 823 461 561 000 18.
              Certifié Qualiopi. Ftransport n'est pas assujetti à la TVA. Les prix sont nets de taxe.
            </p>

            {/* Documents justificatifs */}
            <div className="border-l-4 border-blue-600 pl-4 space-y-2 text-sm">
              <h3 className="font-bold text-gray-900">Pour réserver votre place, vous devez :</h3>
              <p>Réserver votre place en remplissant le devis (fiche actuelle), la fiche d'inscription et les conditions générales de vente en nous les renvoyant avec votre règlement ainsi que les justificatifs demandés :</p>
              <ul className="list-disc ml-5 space-y-1 text-gray-700">
                <li>par mail (sauf règlement sur place) : contact@ftransport.fr</li>
                <li>ou par courrier (règlement par chèque possible) : Ftransport, 86 Route de Genas, 69003 LYON</li>
              </ul>
              <p>Vous rendre dans les locaux de Ftransport : 86 route de Genas, 69003 LYON avec votre règlement ainsi que les justificatifs demandés.</p>
              <h3 className="font-bold text-gray-900 mt-3">Documents justificatifs à nous envoyer (photocopies) :</h3>
              <ul className="list-disc ml-5 space-y-1 text-gray-700">
                <li>Justificatif de domicile</li>
                <li>Pièce d'identité (passeport, carte d'identité, titre de séjour ou permis de conduire)</li>
                <li>Pour les personnes hébergées uniquement : justificatif de domicile de l'hébergeur (de moins de 3 mois), copie de la pièce d'identité de l'hébergeur (recto/verso), attestation d'hébergement signée par l'hébergeur.</li>
              </ul>
            </div>

            <div className="text-sm">
              <p><strong>Fait à LYON, le</strong> {today}</p>
              <p className="mt-2 italic text-gray-600">Signature précédée de la mention manuscrite « Lu et approuvé, bon pour acceptation du devis » (document à renvoyer)</p>
            </div>

            <div className="text-center text-xs text-gray-400 border-t pt-3 mt-4">
              Services Pro — FTransport — SASU au capital social de 5 000 € — 86 route de Genas, 69003 LYON — Tél : 04.28.29.60.91 — contact@ftransport.fr
            </div>
          </div>

          {/* ═══ PAGE 2 : FICHE D'INSCRIPTION ═══ */}
          <div className="print-page bg-white rounded-lg shadow-sm border p-6 md:p-10 space-y-6 mb-6">
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold text-blue-900">FTRANSPORT</h1>
              <p className="text-xs text-gray-500">Spécialiste Formations Transport</p>
            </div>

            <h2 className="text-xl font-bold text-center text-gray-900">FICHE D'INSCRIPTION</h2>

            <div className="space-y-1 text-sm">
              <p><strong>Intitulé formation :</strong> {formationLabel}</p>
              <p><strong>Dates de formation :</strong> <input type="text" className="border-b border-gray-400 px-1 w-48 text-sm" placeholder="À compléter" /></p>
            </div>

            <h3 className="font-bold text-gray-900 text-sm mt-4">Coordonnées du stagiaire :</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><strong>Prénom et Nom :</strong> {nom || "—"}</div>
              <div><strong>Adresse personnelle :</strong> {apprenant?.adresse || <input type="text" className="border-b border-gray-400 px-1 w-48" placeholder="À compléter" />}</div>
              <div><strong>Code postal :</strong> {apprenant?.code_postal || <input type="text" className="border-b border-gray-400 px-1 w-24" placeholder="..." />}</div>
              <div><strong>Ville :</strong> {apprenant?.ville || <input type="text" className="border-b border-gray-400 px-1 w-32" placeholder="..." />}</div>
              <div><strong>N° téléphone :</strong> {apprenant?.telephone || <input type="text" className="border-b border-gray-400 px-1 w-40" placeholder="..." />}</div>
              <div><strong>E-mail :</strong> {apprenant?.email || <input type="text" className="border-b border-gray-400 px-1 w-52" placeholder="..." />}</div>
            </div>

            <h3 className="font-bold text-gray-900 text-sm mt-4">Informations vous concernant :</h3>

            <div className="space-y-1 text-sm">
              <label className="block">
                <strong>Date de votre permis de conduire (jj/mm/aaaa) :</strong>
                <span className="text-xs text-gray-500 ml-1">(Attention il doit avoir plus de 3 ans ou 2 ans si conduite accompagnée)</span>
              </label>
              <input type="text" value={datePermis} onChange={(e) => setDatePermis(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 w-48 text-sm" placeholder="jj/mm/aaaa" />
            </div>

            <div className="space-y-5 mt-4">
              <YesNo label="Avez-vous déjà perdu 6 points d'un coup sur votre permis de conduire ?" value={points6} onChange={setPoints6} />
              <YesNo label="Avez-vous déjà été condamné pour conduite d'un véhicule sans permis ?" value={sansPermis} onChange={setSansPermis} />
              <YesNo label="Avez-vous été condamné pour refus de restitution du permis de conduire malgré l'annulation ou l'invalidation de votre permis de conduire ou l'interdiction de l'obtenir ?" value={refusRestitution} onChange={setRefusRestitution} />
              <YesNo label="Avez-vous déjà été condamné d'au moins 6 mois d'emprisonnement pour vol, escroquerie, abus de confiance, atteinte volontaire à l'intégrité de la personne, agression sexuelle ou infraction à la législation sur les stupéfiants ?" value={condamnation} onChange={setCondamnation} />
              <YesNo label="Avez-vous le casier judiciaire B2 vierge ?" value={casierVierge} onChange={setCasierVierge} />
              <YesNo label={typeConfig.formationDejaLabel} value={formationDeja} onChange={setFormationDeja} />
            </div>

            <div className="text-sm">
              <label className="block font-medium">Si oui, chez quel centre de formation ?</label>
              <input type="text" value={centreFormation} onChange={(e) => setCentreFormation(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 w-full text-sm mt-1" placeholder="À compléter" />
            </div>

            <p className="text-sm mt-4"><strong>Fait à Lyon, le</strong> {today}</p>

            <div className="text-center text-xs text-gray-400 border-t pt-3 mt-4">
              Services Pro — FTransport — SASU au capital social de 5 000 € — 86 route de Genas, 69003 LYON — Tél : 04.28.29.60.91 — contact@ftransport.fr
            </div>
          </div>

          {/* ═══ PAGE 3 : CGV ═══ */}
          <div className="print-page bg-white rounded-lg shadow-sm border p-6 md:p-10 space-y-5 mb-6">
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold text-blue-900">FTRANSPORT</h1>
              <p className="text-xs text-gray-500">Spécialiste Formations Transport</p>
            </div>

            <h2 className="text-lg font-bold text-center text-gray-900">Conditions générales de vente</h2>

            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{CGV_INTRO}</p>

            <div className="space-y-4">
              {CGV_SECTIONS.map((s, i) => (
                <div key={i}>
                  <h3 className="font-bold text-xs text-blue-900">{s.title}</h3>
                  <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">{s.text}</p>
                </div>
              ))}
            </div>

            <div className="text-center text-xs text-gray-400 border-t pt-3 mt-4">
              Services Pro — FTransport — SASU au capital social de 5 000 € — 86 route de Genas, 69003 LYON — Tél : 04.28.29.60.91 — contact@ftransport.fr
            </div>
          </div>

          {/* ═══ PAGE RÉFÉRENTIEL THÉORIQUE ═══ */}
          <div className="print-page bg-white rounded-lg shadow-sm border p-6 md:p-10 space-y-5 mb-6">
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold text-blue-900">FTRANSPORT</h1>
              <p className="text-xs text-gray-500">Spécialiste Formations Transport</p>
            </div>

            <h2 className="text-lg font-bold text-center text-gray-900">Référentiel de connaissances pour les épreuves théorique</h2>

            {REFERENTIEL_THEORIQUE.map((section, i) => (
              <div key={i} className="space-y-2">
                <h3 className="font-bold text-xs text-blue-900">{section.title}</h3>
                {section.subtitle && <p className="font-semibold text-xs text-gray-800">{section.subtitle}</p>}
                <ul className="list-disc ml-5 space-y-1">
                  {section.items.map((item, j) => (
                    <li key={j} className="text-xs text-gray-700 leading-relaxed">{item}</li>
                  ))}
                </ul>
              </div>
            ))}

            <div className="text-center text-xs text-gray-400 border-t pt-3 mt-4">
              Ftransport — SASU au capital social de 5 000 € — Email : contact@ftransport.fr — Siège social 86 route de Genas, 69003 LYON — Site web : http://ftransport.fr/
            </div>
          </div>

          {/* ═══ PAGE RÉFÉRENTIEL PRATIQUE ═══ */}
          <div className="print-page bg-white rounded-lg shadow-sm border p-6 md:p-10 space-y-5 mb-6">
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold text-blue-900">FTRANSPORT</h1>
              <p className="text-xs text-gray-500">Spécialiste Formations Transport</p>
            </div>

            <h2 className="text-lg font-bold text-center text-gray-900">Référentiel de compétences de l'épreuve pratique</h2>

            {REFERENTIEL_PRATIQUE.map((block, i) => (
              <div key={i} className="space-y-3">
                <h3 className="font-bold text-sm text-blue-900">{block.title}</h3>
                {block.sections.map((sec, j) => (
                  <div key={j} className="space-y-1">
                    <h4 className="font-semibold text-xs text-gray-800">{sec.subtitle}</h4>
                    <ul className="list-disc ml-5 space-y-0.5">
                      {sec.items.map((item, k) => (
                        <li key={k} className="text-xs text-gray-700 leading-relaxed">{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ))}

            {/* Rappel final */}
            <div className="border-t pt-4 mt-4">
              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line font-medium">{RAPPEL_FINAL}</p>
            </div>

            <div className="text-center text-xs text-gray-400 border-t pt-3 mt-4">
              Ftransport — SASU au capital social de 5 000 € — Email : contact@ftransport.fr — Siège social 86 route de Genas, 69003 LYON — Site web : http://ftransport.fr/
            </div>
          </div>

          {/* ═══ PAGE 4 : SIGNATURE + RIB ═══ */}
          <div className="print-page bg-white rounded-lg shadow-sm border p-6 md:p-10 space-y-6 mb-6">
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold text-blue-900">FTRANSPORT</h1>
              <p className="text-xs text-gray-500">Spécialiste Formations Transport</p>
            </div>

            <p className="text-sm"><strong>Fait à Lyon, le</strong> {today}</p>

            {/* Renonciation rétractation */}
            <label className="flex items-start gap-3 border border-yellow-200 rounded p-3 bg-yellow-50 cursor-pointer">
              <input type="checkbox" checked={acceptEarlyStart} onChange={(e) => setAcceptEarlyStart(e.target.checked)} className="w-5 h-5 mt-0.5 accent-blue-600" />
              <span className="text-sm text-gray-800 leading-relaxed font-medium">
                Je reconnais que la date de début de la formation pratique intervient avant l'expiration du délai légal de rétractation de 14 jours. En acceptant ce devis, je demande expressément le démarrage immédiat de la prestation et renonce en conséquence à mon droit de rétractation, conformément à l'article L221-25 du Code de la consommation.
              </span>
            </label>

            {/* Accept CGV */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={acceptCGV} onChange={(e) => setAcceptCGV(e.target.checked)} className="w-5 h-5 mt-0.5 accent-blue-600" />
              <span className="text-sm text-gray-800">
                J'accepte les Conditions Générales de Vente de FTRANSPORT et je reconnais avoir pris connaissance de l'ensemble du document.
              </span>
            </label>

            {/* Mention manuscrite */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-900">
                Écrivez la mention : « Lu et approuvé, Bon pour accord »
              </label>
              <input
                type="text"
                value={mentionAccord}
                onChange={(e) => setMentionAccord(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 w-full text-sm"
                placeholder="Lu et approuvé, Bon pour accord"
              />
            </div>

            {/* Signature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-900">Votre signature :</label>
                <button onClick={clearSig} className="text-xs text-blue-600 hover:underline no-print">Effacer</button>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white relative">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={200}
                  className="w-full h-32 cursor-crosshair touch-none"
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
                />
                {!hasSigned && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-gray-400 text-sm">Signez ici avec votre souris ou votre doigt</span>
                  </div>
                )}
              </div>
            </div>

            {/* RIB */}
            <div className="border rounded-lg p-4 bg-gray-50 space-y-2 mt-6">
              <h3 className="font-bold text-sm text-gray-900">Coordonnées bancaires (RIB)</h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                <div><strong>Titulaire :</strong> {RIB_INFO.titulaire}</div>
                <div><strong>Adresse :</strong> {RIB_INFO.adresse}</div>
                <div><strong>IBAN :</strong> {RIB_INFO.iban}</div>
                <div><strong>BIC/SWIFT :</strong> {RIB_INFO.swift}</div>
              </div>
            </div>

            <div className="text-center text-xs text-gray-400 border-t pt-3 mt-4">
              Services Pro — FTransport — SASU au capital social de 5 000 € — 86 route de Genas, 69003 LYON — Tél : 04.28.29.60.91 — contact@ftransport.fr
            </div>
          </div>

          {/* ═══ ACTIONS (no-print) ═══ */}
            <div className="no-print bg-white rounded-lg shadow-sm border p-6 md:p-10 space-y-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Printer className="h-5 w-5 text-blue-600" />
              Finaliser votre inscription
            </h2>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium text-blue-900">📋 Comment procéder :</p>
              <ol className="list-decimal ml-5 space-y-1 text-blue-800">
                <li>Remplissez toutes les informations ci-dessus (cases à cocher, date du permis, etc.)</li>
                <li>Cochez les deux cases (renonciation et CGV)</li>
                <li>Écrivez « Lu et approuvé, Bon pour accord » et signez</li>
                <li>Cliquez sur <strong>« Envoyer le devis signé »</strong></li>
              </ol>
            </div>

            {uploaded ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="font-medium text-green-800">Devis signé envoyé !</p>
                  <p className="text-sm text-green-600 mt-1">Merci, nous avons bien reçu votre devis signé. Nous reviendrons vers vous rapidement.</p>
                </div>

                <div className="bg-blue-50 border-2 border-blue-700 rounded-xl p-6 space-y-4">
                  <h3 className="text-lg font-bold text-blue-800 text-center">🏦 Coordonnées bancaires (RIB)</h3>
                  <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Titulaire :</span><span className="font-semibold">{RIB_INFO.titulaire}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">IBAN :</span><span className="font-bold text-blue-800 tracking-wide">{RIB_INFO.iban}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">BIC / SWIFT :</span><span className="font-semibold">{RIB_INFO.swift}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Banque :</span><span className="font-semibold">{RIB_INFO.banque}</span></div>
                  </div>
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-center space-y-2">
                    <p className="text-amber-800 font-bold text-base">
                      ⚠️ Votre devis ne sera pris en compte qu'après avoir effectué le premier virement.
                    </p>
                    <p className="text-amber-700 text-sm">
                      Merci de nous recontacter au <strong className="text-lg">04.28.29.60.91</strong> après l'avoir effectué.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  onClick={handleSendDevis}
                  disabled={uploading || !acceptCGV || !acceptEarlyStart || !hasSigned}
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-base"
                >
                  {uploading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi en cours...</>
                  ) : (
                    <><CheckCircle className="h-5 w-5" /> Envoyer le devis signé</>
                  )}
                </Button>
                <Button onClick={handlePrint} variant="outline" className="gap-2">
                  <Printer className="h-4 w-4" /> Imprimer / PDF
                </Button>
              </div>
            )}

            <div className="text-center text-xs text-muted-foreground border-t pt-4">
              📧 contact@ftransport.fr — 📞 04.28.29.60.91
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
