// Référentiel National Qualité (Qualiopi) — 7 critères, 32 indicateurs.
// Les exemples de preuves proviennent du Guide de lecture : ce sont des EXEMPLES,
// non exhaustifs et non obligatoires. Toute autre preuve pertinente est recevable.

export type QualiopiStatut = "documente" | "conforme" | "a_completer" | "preuve_manquante" | "non_applicable";

export const STATUT_LABELS: Record<QualiopiStatut, string> = {
  documente: "Documenté",
  conforme: "Conforme",
  a_completer: "À compléter",
  preuve_manquante: "Sans preuve",
  non_applicable: "Non applicable",
};

// Un indicateur n'est jamais déclaré conforme automatiquement : la présence de preuves
// ne vaut pas décision de conformité, seule une validation humaine le permet.

export interface QualiopiIndicateur {
  numero: number;
  critere: number;
  intitule: string;
  niveauAttendu: string;
  exemplesPreuves: string[];
  obligations?: string;
}

export const CRITERES: { numero: number; intitule: string }[] = [
  { numero: 1, intitule: "Les conditions d'information du public sur les prestations proposées, les délais pour y accéder et les résultats obtenus" },
  { numero: 2, intitule: "L'identification précise des objectifs des prestations proposées et l'adaptation de ces prestations aux publics bénéficiaires" },
  { numero: 3, intitule: "L'adaptation aux publics bénéficiaires des prestations et des modalités d'accueil, d'accompagnement, de suivi et d'évaluation" },
  { numero: 4, intitule: "L'adéquation des moyens pédagogiques, techniques et d'encadrement aux prestations mises en œuvre" },
  { numero: 5, intitule: "La qualification et le développement des connaissances et compétences des personnels chargés de mettre en œuvre les prestations" },
  { numero: 6, intitule: "L'inscription et l'investissement du prestataire dans son environnement professionnel" },
  { numero: 7, intitule: "Le recueil et la prise en compte des appréciations et des réclamations formulées par les parties prenantes" },
];

export const INDICATEURS: QualiopiIndicateur[] = [
  {
    numero: 1, critere: 1,
    intitule: "Le prestataire diffuse une information accessible au public, détaillée et vérifiable sur les prestations proposées",
    niveauAttendu: "L'information diffusée est accessible, exhaustive et actualisée : prérequis, objectifs, durée, modalités et délais d'accès, tarifs, contacts, méthodes mobilisées, modalités d'évaluation, accessibilité aux personnes handicapées.",
    exemplesPreuves: ["Site internet, catalogue, plaquettes", "Programmes de formation détaillés", "Devis, conventions, contrats de formation", "Fiches produits actualisées"],
  },
  {
    numero: 2, critere: 1,
    intitule: "Le prestataire diffuse des indicateurs de résultats adaptés à la nature des prestations mises en œuvre et aux publics accueillis",
    niveauAttendu: "Des indicateurs de résultats sont définis, mesurés et diffusés publiquement (taux de satisfaction, d'abandon, de réussite, d'insertion selon la nature de la prestation).",
    exemplesPreuves: ["Taux de réussite aux examens", "Taux de satisfaction des apprenants", "Statistiques publiées sur le site", "Tableaux de suivi internes"],
  },
  {
    numero: 3, critere: 1,
    intitule: "Lorsque le prestataire met en œuvre des prestations conduisant à une certification professionnelle, il informe sur les taux d'obtention, les possibilités de valider un bloc, les passerelles, les suites de parcours et les débouchés",
    niveauAttendu: "Information publique et actualisée sur les taux d'obtention de la certification, les équivalences, passerelles, suites de parcours et débouchés.",
    exemplesPreuves: ["Taux d'obtention publiés", "Fiche RNCP / RS communiquée", "Information sur les passerelles et débouchés"],
    obligations: "Spécifique aux prestations conduisant à une certification professionnelle.",
  },
  {
    numero: 4, critere: 2,
    intitule: "Le prestataire analyse le besoin du bénéficiaire en lien avec l'entreprise et/ou le financeur concerné",
    niveauAttendu: "Le besoin est analysé et formalisé avec le bénéficiaire, l'entreprise et/ou le financeur avant l'entrée en formation.",
    exemplesPreuves: ["Entretien / questionnaire d'analyse du besoin", "Comptes rendus d'échanges", "Demandes de financement", "Fiches de besoin, devis personnalisés"],
  },
  {
    numero: 5, critere: 2,
    intitule: "Le prestataire définit les objectifs opérationnels et évaluables de la prestation",
    niveauAttendu: "Les objectifs sont opérationnels, évaluables et adaptés aux publics ; ils sont formalisés dans les supports contractuels et pédagogiques.",
    exemplesPreuves: ["Programmes avec objectifs opérationnels", "Conventions et contrats", "Référentiels de compétences"],
  },
  {
    numero: 6, critere: 2,
    intitule: "Le prestataire établit les contenus et les modalités de mise en œuvre de la prestation, adaptés aux objectifs définis et aux publics bénéficiaires",
    niveauAttendu: "Les contenus, durées, méthodes, modalités (présentiel, e-learning, mixte) sont cohérents avec les objectifs et les publics.",
    exemplesPreuves: ["Programmes détaillés et déroulés pédagogiques", "Scénarios e-learning, modules en ligne", "Supports de cours, exercices"],
  },
  {
    numero: 7, critere: 2,
    intitule: "Lorsque le prestataire met en œuvre des prestations conduisant à une certification professionnelle, il s'assure de l'adéquation du ou des contenus de la prestation aux exigences de la certification visée",
    niveauAttendu: "Le contenu est mis en correspondance avec le référentiel de la certification visée.",
    exemplesPreuves: ["Tableau de correspondance programme / référentiel", "Référentiel de certification (T3P)", "Sujets et annales d'examen"],
    obligations: "Spécifique aux prestations certifiantes.",
  },
  {
    numero: 8, critere: 3,
    intitule: "Le prestataire détermine les procédures de positionnement et d'évaluation des acquis à l'entrée de la prestation",
    niveauAttendu: "Un positionnement à l'entrée permet d'adapter le parcours : diagnostic préalable, entretien, quiz/QCM, tests, auto-positionnement.",
    exemplesPreuves: ["Diagnostic préalable, entretien", "Quiz / QCM de positionnement", "Exercices, mises en situation, tests", "Auto-positionnement de l'apprenant"],
  },
  {
    numero: 9, critere: 3,
    intitule: "Le prestataire informe les publics bénéficiaires des conditions de déroulement de la prestation",
    niveauAttendu: "Les bénéficiaires reçoivent, avant l'entrée en formation, toutes les informations pratiques : lieux, horaires, règlement intérieur, accès, moyens.",
    exemplesPreuves: ["Livret d'accueil", "Règlement intérieur remis et signé", "Convocations", "Conditions générales, accès à la plateforme"],
  },
  {
    numero: 10, critere: 3,
    intitule: "Le prestataire met en œuvre et adapte la prestation, l'accompagnement et le suivi aux publics bénéficiaires",
    niveauAttendu: "La prestation est adaptée en cours de route selon les besoins et les difficultés constatées.",
    exemplesPreuves: ["Suivi individualisé, points d'étape", "Progression e-learning, temps de connexion", "Échanges et relances avec les apprenants", "Aménagements de parcours"],
  },
  {
    numero: 11, critere: 3,
    intitule: "Le prestataire évalue l'atteinte par les publics bénéficiaires des objectifs de la prestation",
    niveauAttendu: "Les acquis sont évalués en cours et en fin de prestation ; les résultats sont tracés.",
    exemplesPreuves: ["Évaluations en cours et en fin de prestation", "Examens blancs, bilans, taux de réussite", "Livrets de compétences", "Attestations de fin de formation, preuves de délivrance de certification"],
  },
  {
    numero: 12, critere: 3,
    intitule: "Le prestataire décrit et met en œuvre les mesures pour favoriser l'engagement des bénéficiaires et prévenir les ruptures de parcours",
    niveauAttendu: "Des mesures concrètes d'engagement et de prévention des abandons sont décrites et appliquées.",
    exemplesPreuves: ["Relances et suivi d'assiduité", "Feuilles d'émargement", "Alertes sur décrochage e-learning", "Entretiens de remotivation"],
  },
  {
    numero: 13, critere: 3,
    intitule: "Pour les formations en alternance, le prestataire met en œuvre un accompagnement socioprofessionnel, éducatif et à la recherche d'entreprise",
    niveauAttendu: "Accompagnement formalisé des alternants et des entreprises.",
    exemplesPreuves: ["Conventions d'alternance", "Suivi en entreprise", "Accompagnement à la recherche d'employeur"],
    obligations: "Spécifique aux formations par apprentissage / alternance.",
  },
  {
    numero: 14, critere: 3,
    intitule: "Pour les formations en alternance, le prestataire prévoit les modalités d'exercice de la fonction tutorale et de maître d'apprentissage",
    niveauAttendu: "Modalités tutorales définies, tuteurs identifiés et outillés.",
    exemplesPreuves: ["Livret de suivi tuteur", "Désignation des maîtres d'apprentissage", "Outils de liaison CFA / entreprise"],
    obligations: "Spécifique aux formations par apprentissage / alternance.",
  },
  {
    numero: 15, critere: 3,
    intitule: "Le prestataire coordonne les différents intervenants internes et/ou externes",
    niveauAttendu: "La coordination entre intervenants est organisée et tracée.",
    exemplesPreuves: ["Réunions pédagogiques, comptes rendus", "Planning et affectations formateurs", "Contrats de sous-traitance"],
  },
  {
    numero: 16, critere: 3,
    intitule: "Lorsque le prestataire met en œuvre des prestations conduisant à une certification professionnelle, il respecte les exigences formelles définies par l'autorité de certification",
    niveauAttendu: "Les exigences de l'autorité de certification (habilitation, modalités d'examen, jurys) sont respectées et tracées.",
    exemplesPreuves: ["Habilitation / agrément", "Convocations et PV d'examen", "Échanges avec l'autorité de certification (CMA, préfecture)"],
    obligations: "Spécifique aux prestations certifiantes.",
  },
  {
    numero: 17, critere: 4,
    intitule: "Le prestataire met à disposition ou s'assure de la mise à disposition des moyens humains et techniques adaptés et d'un environnement approprié",
    niveauAttendu: "Les moyens humains, techniques, locaux et environnements numériques sont adaptés à la prestation.",
    exemplesPreuves: ["Bail, registre d'accessibilité, DUERP", "Inventaire des équipements et véhicules", "Plateforme LMS / cours en ligne", "CV des intervenants, contrats de sous-traitance"],
  },
  {
    numero: 18, critere: 4,
    intitule: "Le prestataire mobilise et coordonne les différentes compétences requises (pédagogiques, techniques et d'encadrement)",
    niveauAttendu: "Les compétences nécessaires sont identifiées et mobilisées.",
    exemplesPreuves: ["Organigramme, fiches de poste", "CV et qualifications des formateurs", "Plan de charge des intervenants"],
  },
  {
    numero: 19, critere: 4,
    intitule: "Le prestataire met à disposition des ressources pédagogiques et permet aux bénéficiaires de se les approprier",
    niveauAttendu: "Des ressources pédagogiques sont fournies et leur appropriation est facilitée.",
    exemplesPreuves: ["Supports de cours, PDF, PowerPoint", "Accès à la plateforme e-learning", "Bibliothèque de ressources, annales"],
  },
  {
    numero: 20, critere: 4,
    intitule: "Le prestataire dispose d'un personnel dédié à l'appui à la mobilité nationale et internationale, pour les CFA",
    niveauAttendu: "Un référent mobilité est identifié pour les apprentis.",
    exemplesPreuves: ["Désignation du référent mobilité", "Procédure de mobilité"],
    obligations: "Spécifique aux CFA.",
  },
  {
    numero: 21, critere: 5,
    intitule: "Le prestataire détermine, mobilise et évalue les compétences des différents intervenants internes et/ou externes",
    niveauAttendu: "Les compétences attendues sont définies et évaluées régulièrement.",
    exemplesPreuves: ["CV, diplômes, attestations", "Entretiens professionnels", "Évaluation des formateurs par les apprenants"],
  },
  {
    numero: 22, critere: 5,
    intitule: "Le prestataire entretient et développe les compétences de ses salariés, adaptées aux prestations qu'il délivre",
    niveauAttendu: "Un plan de développement des compétences existe et est mis en œuvre.",
    exemplesPreuves: ["Plan de développement des compétences", "Attestations de formation des salariés", "Veille et montée en compétences"],
  },
  {
    numero: 23, critere: 6,
    intitule: "Le prestataire réalise une veille légale et réglementaire sur le champ de la formation professionnelle et en exploite les enseignements",
    niveauAttendu: "Une veille réglementaire est organisée, tracée et exploitée.",
    exemplesPreuves: ["Sources et abonnements de veille", "Tableau de veille daté", "Mises à jour documentaires consécutives"],
  },
  {
    numero: 24, critere: 6,
    intitule: "Le prestataire réalise une veille sur les évolutions des compétences, des métiers et des emplois dans ses secteurs d'intervention et en exploite les enseignements",
    niveauAttendu: "Veille métiers/emplois formalisée et exploitée.",
    exemplesPreuves: ["Études sectorielles VTC / TAXI", "Échanges avec les fédérations professionnelles", "Adaptations de programmes"],
  },
  {
    numero: 25, critere: 6,
    intitule: "Le prestataire réalise une veille sur les innovations pédagogiques et technologiques permettant une évolution de ses prestations et en exploite les enseignements",
    niveauAttendu: "Veille pédagogique et technologique formalisée et exploitée.",
    exemplesPreuves: ["Veille outils / LMS", "Évolutions de la plateforme e-learning", "Nouvelles modalités pédagogiques"],
  },
  {
    numero: 26, critere: 6,
    intitule: "Le prestataire mobilise les expertises, outils et réseaux nécessaires pour accueillir, accompagner/former ou orienter les publics en situation de handicap",
    niveauAttendu: "Un référent handicap est identifié ; des partenariats et adaptations sont mobilisables.",
    exemplesPreuves: ["Désignation du référent handicap", "Partenariats Agefiph / Cap emploi", "Procédure d'adaptation des parcours", "Documents handicap remis aux apprenants"],
  },
  {
    numero: 27, critere: 6,
    intitule: "Lorsque le prestataire met en œuvre des prestations conduisant à une certification professionnelle, il entretient des liens avec les acteurs socio-économiques du secteur",
    niveauAttendu: "Liens réguliers avec les acteurs socio-économiques du secteur.",
    exemplesPreuves: ["Partenariats professionnels", "Participation à des instances ou salons", "Échanges avec les entreprises du secteur"],
    obligations: "Spécifique aux prestations certifiantes.",
  },
  {
    numero: 28, critere: 6,
    intitule: "Lorsque le prestataire fait appel à la sous-traitance ou au portage salarial, il s'assure du respect de la conformité au présent référentiel",
    niveauAttendu: "Les sous-traitants sont informés des exigences du référentiel et leur conformité est vérifiée.",
    exemplesPreuves: ["Contrats de sous-traitance avec clause qualité", "Chartes et engagements qualité", "Suivi et évaluation des sous-traitants"],
    obligations: "Spécifique en cas de sous-traitance ou portage salarial.",
  },
  {
    numero: 29, critere: 6,
    intitule: "Le prestataire, dans le cas de formations en alternance, prend en compte les besoins des entreprises et les attentes des apprentis",
    niveauAttendu: "Les besoins des entreprises et attentes des apprentis sont recueillis et pris en compte.",
    exemplesPreuves: ["Enquêtes entreprises", "Comptes rendus de visites en entreprise"],
    obligations: "Spécifique aux formations en alternance.",
  },
  {
    numero: 30, critere: 7,
    intitule: "Le prestataire recueille les appréciations des parties prenantes : bénéficiaires, financeurs, équipes pédagogiques et entreprises",
    niveauAttendu: "Les appréciations de toutes les parties prenantes sont recueillies régulièrement.",
    exemplesPreuves: ["Questionnaires de satisfaction apprenants", "Enquêtes financeurs et entreprises", "Retours des formateurs"],
  },
  {
    numero: 31, critere: 7,
    intitule: "Le prestataire met en œuvre des modalités de traitement des difficultés rencontrées par les parties prenantes, des réclamations exprimées, des aléas survenus en cours de prestation",
    niveauAttendu: "Un processus de traitement des réclamations et aléas existe et est tracé.",
    exemplesPreuves: ["Procédure de réclamation", "Registre des réclamations et aléas", "Échanges et réponses apportées"],
  },
  {
    numero: 32, critere: 7,
    intitule: "Le prestataire met en œuvre des mesures d'amélioration à partir de l'analyse des appréciations et des réclamations",
    niveauAttendu: "Les appréciations et réclamations sont analysées et débouchent sur un plan d'amélioration suivi.",
    exemplesPreuves: ["Plan d'amélioration continue", "Comptes rendus de revue qualité", "Actions correctives tracées et suivies"],
  },
];

export function indicateurByNumero(n: number): QualiopiIndicateur | undefined {
  return INDICATEURS.find((i) => i.numero === n);
}
