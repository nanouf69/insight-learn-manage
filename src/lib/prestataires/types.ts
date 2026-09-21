export type PrestataireStatut =
  | "facture_manquante"
  | "demande_a_envoyer"
  | "demande_envoyee"
  | "relance_1_envoyee"
  | "relance_2_envoyee"
  | "mise_en_demeure_envoyee"
  | "facture_recue"
  | "cloture";

export const STATUT_LABELS: Record<PrestataireStatut, string> = {
  facture_manquante: "Facture manquante",
  demande_a_envoyer: "Demande à envoyer",
  demande_envoyee: "Demande envoyée",
  relance_1_envoyee: "Relance 1 envoyée",
  relance_2_envoyee: "Relance 2 envoyée",
  mise_en_demeure_envoyee: "Mise en demeure envoyée",
  facture_recue: "Facture reçue",
  cloture: "Dossier clôturé",
};

export const STATUT_ORDER: PrestataireStatut[] = [
  "facture_manquante",
  "demande_a_envoyer",
  "demande_envoyee",
  "relance_1_envoyee",
  "relance_2_envoyee",
  "mise_en_demeure_envoyee",
  "facture_recue",
  "cloture",
];

export type TypeEnvoi = "demande" | "relance1" | "relance2" | "mise_en_demeure";

export const TYPE_ENVOI_LABELS: Record<TypeEnvoi, string> = {
  demande: "Première demande",
  relance1: "Relance 1",
  relance2: "Relance 2",
  mise_en_demeure: "Mise en demeure",
};

export const STATUT_ENVOI_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  en_cours: "Envoi en cours",
  envoye: "Envoyé avec succès",
  echec: "Échec d'envoi",
};

export const MODES_PAIEMENT = [
  { value: "virement", label: "Virement" },
  { value: "carte", label: "Carte bancaire" },
  { value: "prelevement", label: "Prélèvement" },
  { value: "cheque", label: "Chèque" },
  { value: "especes", label: "Espèces" },
  { value: "autre", label: "Autre" },
];

export const TYPES_PIECE = [
  { value: "devis", label: "Devis" },
  { value: "contrat", label: "Contrat" },
  { value: "bon_commande", label: "Bon de commande" },
  { value: "preuve_paiement", label: "Preuve de paiement" },
  { value: "releve_bancaire", label: "Relevé / justificatif bancaire" },
  { value: "echanges", label: "Échanges avec le prestataire" },
  { value: "bon_livraison", label: "Bon de livraison / preuve de réalisation" },
  { value: "facture_recue", label: "Facture reçue" },
  { value: "autre", label: "Autre justificatif" },
];

export interface PrestataireDossier {
  id: string;
  reference: string | null;
  est_test: boolean;
  prestataire_nom: string | null;
  prestataire_prenom: string | null;
  raison_sociale: string | null;
  siren: string | null;
  siret: string | null;
  adresse: string | null;
  email: string | null;
  telephone: string | null;
  description_prestation: string | null;
  date_prestation: string | null;
  periode_debut: string | null;
  periode_fin: string | null;
  numero_commande: string | null;
  montant_ht: number | null;
  tva: number | null;
  montant_ttc: number | null;
  commentaire_interne: string | null;
  date_paiement: string | null;
  montant_paye: number | null;
  mode_paiement: string | null;
  reference_paiement: string | null;
  facture_recue_le: string | null;
  facture_numero: string | null;
  facture_montant_ht: number | null;
  facture_tva: number | null;
  facture_montant_ttc: number | null;
  statut: PrestataireStatut;
  derniere_action_le: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrestataireEnvoi {
  id: string;
  dossier_id: string;
  type_envoi: TypeEnvoi;
  destinataire_nom: string | null;
  destinataire_email: string;
  objet: string;
  corps_html: string;
  statut: string;
  erreur: string | null;
  provider_message_id: string | null;
  envoye_le: string | null;
  declenche_par_email: string | null;
  created_at: string;
}

export interface PrestatairePiece {
  id: string;
  dossier_id: string;
  type_piece: string;
  titre: string | null;
  chemin: string;
  nom_fichier: string | null;
  content_type: string | null;
  taille: number | null;
  created_at: string;
}

export interface PrestataireHistorique {
  id: string;
  dossier_id: string;
  action: string;
  details: Record<string, unknown>;
  utilisateur_email: string | null;
  created_at: string;
}
