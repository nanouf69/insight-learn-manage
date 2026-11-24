export const CONTRAT_MODELE = "contrat_cadre_prestation_intervenant";
export const CONTRAT_VERSION = "services-pro-contrat-cadre-intervenant-2026-11-24-v1";

export type TypeDocumentIntervenant = "competences" | "contrat";

export const IDENTITES_CONTRAT = {
  centre: {
    raison_sociale: "SERVICES PRO",
    forme: "SAS",
    siret: "82346156100016",
    adresse: "86 route de Genas, 69003 Lyon",
    representant: "Naoufal GUENICHI, Président",
  },
  intervenant: {
    denomination: "Albert AKONO (DJIOFACK)",
    forme: "Entrepreneur individuel",
    siret: "83881665000017",
    adresse: "27 rue Joseph Brenier, 38200 Vienne",
    specialite: "Anglais",
    tarif_ttc_horaire: 50,
  },
} as const;

/** Projet soumis à validation humaine. Aucune date de signature ni heure historique n'y est déduite. */
export const CONTRAT_SECTIONS = [
  {
    titre: "1. Objet et cadre des missions",
    lignes: [
      "Le présent contrat-cadre organise les relations entre SERVICES PRO et Albert AKONO (DJIOFACK) pour des missions ponctuelles d'enseignement de l'anglais.",
      "Chaque mission précise par écrit les dates, horaires, public, modalités, durée et exigences applicables. Le prestataire demeure libre de l'accepter ou de la refuser. Aucun volume minimal de missions, aucun chiffre d'affaires garanti et aucune exclusivité ne sont stipulés.",
    ],
  },
  {
    titre: "2. Durée et résiliation",
    lignes: [
      "Le contrat est conclu pour une durée indéterminée et entre en vigueur à la date de la dernière signature des deux parties.",
      "Chaque partie peut y mettre fin moyennant un préavis écrit de trente jours. Les missions déjà acceptées et les obligations de confidentialité, de facturation et de conservation des preuves demeurent traitées conformément aux écrits applicables.",
    ],
  },
  {
    titre: "3. Début de collaboration déclaré",
    lignes: [
      "SERVICES PRO déclare une collaboration depuis courant 2021. Cette mention est soumise à la confirmation expresse d'Albert AKONO avant sa signature ; en cas de désaccord, la signature est suspendue pour vérification.",
      "Cette mention et le présent contrat ne constituent aucune attestation d'heures, de présences ou de missions historiques. Seules les heures réellement réalisées et documentées pourront être facturées.",
    ],
  },
  {
    titre: "4. Rémunération et facturation",
    lignes: [
      "Le tarif convenu est de 50 euros TTC par heure de mission réellement réalisée et acceptée. Toute modification fait l'objet d'un accord écrit pour les missions futures.",
      "Le prestataire transmet une facture distincte par période ou mission, avec les éléments légaux applicables et le détail des heures réellement effectuées. Le régime de TVA est celui qui lui est applicable et justifié ; aucune exemption n'est présumée par ce contrat. Le paiement intervient selon les échéances indiquées sur la facture acceptée, sans création d'une créance pour des heures non prouvées.",
    ],
  },
  {
    titre: "5. Indépendance du prestataire",
    lignes: [
      "Le prestataire organise librement son activité, ses moyens et ses autres collaborations, dans le respect des créneaux et objectifs des missions acceptées. Aucun lien de subordination, contrat de travail, mandat social ou association n'est créé.",
      "Il exerce sous sa propre responsabilité professionnelle et ne peut engager SERVICES PRO sans mandat écrit particulier.",
    ],
  },
  {
    titre: "6. Exigences pédagogiques et qualité",
    lignes: [
      "Le prestataire exécute les missions avec diligence, dans le respect du programme, des objectifs pédagogiques, des règles de sécurité, du règlement intérieur applicable et des exigences du Référentiel National Qualité pertinentes pour sa prestation.",
      "SERVICES PRO peut demander les justificatifs utiles, observer la prestation, recueillir les retours des apprenants et examiner les écarts. Le prestataire coopère aux actions correctives et signale sans délai toute difficulté affectant la qualité ou la réalisation d'une mission. Aucune compétence ni conformité n'est réputée validée par la seule signature.",
    ],
  },
  {
    titre: "7. Confidentialité et protection des informations",
    lignes: [
      "Le prestataire préserve la confidentialité des informations pédagogiques, commerciales, techniques et personnelles auxquelles il accède. Il ne les utilise que pour la mission, ne les communique pas à un tiers non autorisé et applique les règles de protection des données applicables.",
      "Tout accès aux espaces et documents est individuel, limité aux besoins de la mission et ne doit pas être partagé. Les incidents ou demandes concernant des données sont signalés à SERVICES PRO sans délai. Ces obligations survivent à la fin du contrat.",
    ],
  },
  {
    titre: "8. Financement CPF et vérification par mission",
    lignes: [
      "Avant chaque mission, SERVICES PRO indique au prestataire le financement connu et les exigences documentaires correspondantes. Les parties vérifient alors les obligations effectivement applicables au Compte Personnel de Formation, au certificateur, au financeur et à l'action concernée.",
      "Le prestataire fournit les documents et informations légalement requis pour la mission acceptée. Aucune éligibilité, prise en charge, certification ou conformité CPF n'est présumée par le présent contrat-cadre ; une mission ne doit pas être présentée comme financée par le CPF sans confirmation du dossier concerné.",
    ],
  },
  {
    titre: "9. Preuves et traçabilité",
    lignes: [
      "Les feuilles d'émargement, échanges et bilans retracent uniquement les événements réels. Il est interdit d'antidater une signature, de créer une présence ou de certifier des heures non réalisées.",
      "Les signatures électroniques du parcours sont séparées par document, précédées d'un consentement explicite et horodatées par le serveur. Chaque PDF signé est associé à une empreinte SHA-256 et à une piste d'audit.",
    ],
  },
  {
    titre: "10. Signature des parties",
    lignes: [
      "La signature manuscrite d'Albert AKONO recueillie dans ce parcours ne vaut pas signature de SERVICES PRO. La signature du centre doit être recueillie séparément par une personne habilitée ; aucune image ou signature existante n'est apposée automatiquement.",
      "La date retenue est l'horodatage serveur réel de chaque signature. Le présent contrat ne doit être signé qu'après validation de son contenu par les parties.",
    ],
  },
] as const;

export const CONSENTEMENTS_INTERVENANT: Record<TypeDocumentIntervenant, string> = {
  competences: "J'ai relu ma déclaration de compétences et la liste de mes justificatifs. Je demande à la signer manuscritement. Je comprends que cette signature atteste de ma déclaration, sans valoir validation de mes compétences par SERVICES PRO.",
  contrat: "J'ai relu le contrat-cadre. Je confirme que la collaboration avec SERVICES PRO a débuté courant 2021 et j'accepte les stipulations du contrat. Je signe à la date réelle enregistrée par le serveur, sans antidatation ni attestation d'heures historiques.",
};

export const MESSAGE_TROISIEME_DOCUMENT = "Troisième document non généré : son intitulé exact doit être confirmé par SERVICES PRO. Aucun contenu n'a été inventé.";

export function texteContratFige(etat: "projet_a_valider" | "valide_pour_signature" = "projet_a_valider") {
  return {
    version: CONTRAT_VERSION,
    titre: "CONTRAT-CADRE DE PRESTATION DE FORMATION — ANGLAIS",
    etat,
    identites: IDENTITES_CONTRAT,
    sections: CONTRAT_SECTIONS,
    debut_collaboration: { declare_par_centre: "courant 2021", confirmation_intervenant_requise: true },
    heures_historiques_attestees: false,
  };
}

export function empreinteVueValide(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

export function operationIdValide(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function statutDocumentIntervenant(input: { statut?: string | null; signed_at?: string | null; signature?: unknown }) {
  if (input.signature) return "signe" as const;
  if (input.statut === "signe" && input.signed_at) return "declaration_remise" as const;
  if (input.statut === "brouillon") return "a_completer" as const;
  return "apercu" as const;
}

export function libelleStatutDocument(statut: ReturnType<typeof statutDocumentIntervenant>) {
  return { signe: "Signé", declaration_remise: "Déclaration remise — signature manuscrite à recueillir", a_completer: "À compléter", apercu: "Aperçu non signé" }[statut];
}
