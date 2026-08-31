export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agenda_blocs: {
        Row: {
          created_at: string
          discipline_color: string
          discipline_id: string
          discipline_nom: string
          formateur_id: string | null
          formation: string
          heure_debut: string
          heure_fin: string
          id: string
          jour: number
          publics_cibles: string[]
          semaine_debut: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          discipline_color: string
          discipline_id: string
          discipline_nom: string
          formateur_id?: string | null
          formation: string
          heure_debut: string
          heure_fin: string
          id?: string
          jour: number
          publics_cibles?: string[]
          semaine_debut: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          discipline_color?: string
          discipline_id?: string
          discipline_nom?: string
          formateur_id?: string | null
          formation?: string
          heure_debut?: string
          heure_fin?: string
          id?: string
          jour?: number
          publics_cibles?: string[]
          semaine_debut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_blocs_formateur_id_fkey"
            columns: ["formateur_id"]
            isOneToOne: false
            referencedRelation: "formateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      alertes_systeme: {
        Row: {
          created_at: string
          details: string | null
          id: string
          lu: boolean
          message: string
          titre: string
          type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          lu?: boolean
          message: string
          titre: string
          type?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          lu?: boolean
          message?: string
          titre?: string
          type?: string
        }
        Relationships: []
      }
      app_version: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      apprenant_appels: {
        Row: {
          apprenant_id: string
          created_at: string
          created_by: string | null
          date_appel: string
          direction: string
          id: string
          notes: string | null
          sujet: string
          updated_at: string
        }
        Insert: {
          apprenant_id: string
          created_at?: string
          created_by?: string | null
          date_appel?: string
          direction?: string
          id?: string
          notes?: string | null
          sujet: string
          updated_at?: string
        }
        Update: {
          apprenant_id?: string
          created_at?: string
          created_by?: string | null
          date_appel?: string
          direction?: string
          id?: string
          notes?: string | null
          sujet?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apprenant_appels_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: false
            referencedRelation: "apprenants"
            referencedColumns: ["id"]
          },
        ]
      }
      apprenant_connexions: {
        Row: {
          apprenant_id: string
          client_session_id: string | null
          created_at: string
          current_module: string | null
          end_reason: string | null
          ended_at: string | null
          id: string
          ip_address: string | null
          last_action_at: string | null
          last_seen_at: string
          source: string
          started_at: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          apprenant_id: string
          client_session_id?: string | null
          created_at?: string
          current_module?: string | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          last_action_at?: string | null
          last_seen_at?: string
          source?: string
          started_at?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          apprenant_id?: string
          client_session_id?: string | null
          created_at?: string
          current_module?: string | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          last_action_at?: string | null
          last_seen_at?: string
          source?: string
          started_at?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apprenant_connexions_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: false
            referencedRelation: "apprenants"
            referencedColumns: ["id"]
          },
        ]
      }
      apprenant_documents_completes: {
        Row: {
          apprenant_id: string
          completed_at: string
          created_at: string
          donnees: Json
          id: string
          module_id: number | null
          titre: string
          type_document: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          apprenant_id: string
          completed_at?: string
          created_at?: string
          donnees?: Json
          id?: string
          module_id?: number | null
          titre: string
          type_document: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          apprenant_id?: string
          completed_at?: string
          created_at?: string
          donnees?: Json
          id?: string
          module_id?: number | null
          titre?: string
          type_document?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apprenant_documents_completes_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: false
            referencedRelation: "apprenants"
            referencedColumns: ["id"]
          },
        ]
      }
      apprenant_module_activites: {
        Row: {
          action_type: string
          apprenant_id: string
          connexion_id: string | null
          created_at: string
          id: string
          metadata: Json
          module_id: number
          module_nom: string
          occurred_at: string
          user_id: string
        }
        Insert: {
          action_type?: string
          apprenant_id: string
          connexion_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          module_id: number
          module_nom: string
          occurred_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          apprenant_id?: string
          connexion_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          module_id?: number
          module_nom?: string
          occurred_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apprenant_module_activites_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: false
            referencedRelation: "apprenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apprenant_module_activites_connexion_id_fkey"
            columns: ["connexion_id"]
            isOneToOne: false
            referencedRelation: "apprenant_connexions"
            referencedColumns: ["id"]
          },
        ]
      }
      apprenant_module_completion: {
        Row: {
          apprenant_id: string
          completed_at: string
          created_at: string
          details: Json | null
          id: string
          module_id: number
          progress: number
          score_max: number | null
          score_obtenu: number | null
          status: string
          updated_at: string
        }
        Insert: {
          apprenant_id: string
          completed_at?: string
          created_at?: string
          details?: Json | null
          id?: string
          module_id: number
          progress?: number
          score_max?: number | null
          score_obtenu?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          apprenant_id?: string
          completed_at?: string
          created_at?: string
          details?: Json | null
          id?: string
          module_id?: number
          progress?: number
          score_max?: number | null
          score_obtenu?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apprenant_module_completion_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: false
            referencedRelation: "apprenants"
            referencedColumns: ["id"]
          },
        ]
      }
      apprenant_paiements: {
        Row: {
          apprenant_id: string
          created_at: string
          date_paiement: string | null
          id: string
          montant: number
          moyen_paiement: string | null
          notes: string | null
        }
        Insert: {
          apprenant_id: string
          created_at?: string
          date_paiement?: string | null
          id?: string
          montant?: number
          moyen_paiement?: string | null
          notes?: string | null
        }
        Update: {
          apprenant_id?: string
          created_at?: string
          date_paiement?: string | null
          id?: string
          montant?: number
          moyen_paiement?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apprenant_paiements_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: false
            referencedRelation: "apprenants"
            referencedColumns: ["id"]
          },
        ]
      }
      apprenant_questions: {
        Row: {
          answered_at: string | null
          apprenant_id: string
          apprenant_nom: string | null
          created_at: string
          id: string
          question: string
          read_by_apprenant: boolean
          reponse: string | null
          status: string
        }
        Insert: {
          answered_at?: string | null
          apprenant_id: string
          apprenant_nom?: string | null
          created_at?: string
          id?: string
          question: string
          read_by_apprenant?: boolean
          reponse?: string | null
          status?: string
        }
        Update: {
          answered_at?: string | null
          apprenant_id?: string
          apprenant_nom?: string | null
          created_at?: string
          id?: string
          question?: string
          read_by_apprenant?: boolean
          reponse?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "apprenant_questions_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: false
            referencedRelation: "apprenants"
            referencedColumns: ["id"]
          },
        ]
      }
      apprenant_quiz_results: {
        Row: {
          apprenant_id: string
          completed_at: string
          created_at: string
          details: Json | null
          duree_secondes: number | null
          id: string
          matiere_id: string | null
          matiere_nom: string | null
          note_sur_20: number | null
          quiz_id: string
          quiz_titre: string
          quiz_type: string
          reussi: boolean | null
          score_max: number
          score_obtenu: number
          tentative: number
          user_id: string
        }
        Insert: {
          apprenant_id: string
          completed_at?: string
          created_at?: string
          details?: Json | null
          duree_secondes?: number | null
          id?: string
          matiere_id?: string | null
          matiere_nom?: string | null
          note_sur_20?: number | null
          quiz_id: string
          quiz_titre: string
          quiz_type?: string
          reussi?: boolean | null
          score_max?: number
          score_obtenu?: number
          tentative?: number
          user_id: string
        }
        Update: {
          apprenant_id?: string
          completed_at?: string
          created_at?: string
          details?: Json | null
          duree_secondes?: number | null
          id?: string
          matiere_id?: string | null
          matiere_nom?: string | null
          note_sur_20?: number | null
          quiz_id?: string
          quiz_titre?: string
          quiz_type?: string
          reussi?: boolean | null
          score_max?: number
          score_obtenu?: number
          tentative?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apprenant_quiz_results_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: false
            referencedRelation: "apprenants"
            referencedColumns: ["id"]
          },
        ]
      }
      apprenants: {
        Row: {
          adresse: string | null
          auth_user_id: string | null
          b2_vierge: boolean | null
          civilite: string | null
          code_postal: string | null
          created_at: string
          creneau_horaire: string | null
          date_debut_cours_en_ligne: string | null
          date_debut_formation: string | null
          date_examen_pratique: string | null
          date_examen_theorique: string | null
          date_fin_cours_en_ligne: string | null
          date_fin_formation: string | null
          date_formation_catalogue: string | null
          date_naissance: string | null
          date_paiement: string | null
          deleted_at: string | null
          documents_complets: boolean | null
          email: string | null
          facture_contact_email: string | null
          facture_contact_nom: string | null
          facture_contact_telephone: string | null
          formation_choisie: string | null
          heure_examen_pratique: string | null
          heures_elearning: number | null
          heures_pratique: number | null
          heures_presentiel: number | null
          heures_totales: number | null
          id: string
          inscrit_france_travail: boolean | null
          lieu_examen: string | null
          mode_financement: string | null
          modules_autorises: number[] | null
          montant_paye: number | null
          montant_ttc: number | null
          mot_de_passe_cma: string | null
          mot_de_passe_plateforme: string | null
          moyen_paiement: string | null
          nom: string
          notes: string | null
          numero_dossier_cma: string | null
          organisme_financeur: string | null
          prenom: string
          relance_dossier_bienvenue_exclu: boolean
          responsable_contact_centre: boolean
          resultat_examen: string | null
          resultat_examen_pratique: string | null
          societe_adresse: string | null
          societe_code_postal: string | null
          societe_nom: string | null
          societe_siret: string | null
          societe_tva_intra: string | null
          societe_ville: string | null
          source_inscription: string
          statut: string | null
          telephone: string | null
          type_apprenant: string | null
          type_examen: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          auth_user_id?: string | null
          b2_vierge?: boolean | null
          civilite?: string | null
          code_postal?: string | null
          created_at?: string
          creneau_horaire?: string | null
          date_debut_cours_en_ligne?: string | null
          date_debut_formation?: string | null
          date_examen_pratique?: string | null
          date_examen_theorique?: string | null
          date_fin_cours_en_ligne?: string | null
          date_fin_formation?: string | null
          date_formation_catalogue?: string | null
          date_naissance?: string | null
          date_paiement?: string | null
          deleted_at?: string | null
          documents_complets?: boolean | null
          email?: string | null
          facture_contact_email?: string | null
          facture_contact_nom?: string | null
          facture_contact_telephone?: string | null
          formation_choisie?: string | null
          heure_examen_pratique?: string | null
          heures_elearning?: number | null
          heures_pratique?: number | null
          heures_presentiel?: number | null
          heures_totales?: number | null
          id?: string
          inscrit_france_travail?: boolean | null
          lieu_examen?: string | null
          mode_financement?: string | null
          modules_autorises?: number[] | null
          montant_paye?: number | null
          montant_ttc?: number | null
          mot_de_passe_cma?: string | null
          mot_de_passe_plateforme?: string | null
          moyen_paiement?: string | null
          nom: string
          notes?: string | null
          numero_dossier_cma?: string | null
          organisme_financeur?: string | null
          prenom: string
          relance_dossier_bienvenue_exclu?: boolean
          responsable_contact_centre?: boolean
          resultat_examen?: string | null
          resultat_examen_pratique?: string | null
          societe_adresse?: string | null
          societe_code_postal?: string | null
          societe_nom?: string | null
          societe_siret?: string | null
          societe_tva_intra?: string | null
          societe_ville?: string | null
          source_inscription?: string
          statut?: string | null
          telephone?: string | null
          type_apprenant?: string | null
          type_examen?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          auth_user_id?: string | null
          b2_vierge?: boolean | null
          civilite?: string | null
          code_postal?: string | null
          created_at?: string
          creneau_horaire?: string | null
          date_debut_cours_en_ligne?: string | null
          date_debut_formation?: string | null
          date_examen_pratique?: string | null
          date_examen_theorique?: string | null
          date_fin_cours_en_ligne?: string | null
          date_fin_formation?: string | null
          date_formation_catalogue?: string | null
          date_naissance?: string | null
          date_paiement?: string | null
          deleted_at?: string | null
          documents_complets?: boolean | null
          email?: string | null
          facture_contact_email?: string | null
          facture_contact_nom?: string | null
          facture_contact_telephone?: string | null
          formation_choisie?: string | null
          heure_examen_pratique?: string | null
          heures_elearning?: number | null
          heures_pratique?: number | null
          heures_presentiel?: number | null
          heures_totales?: number | null
          id?: string
          inscrit_france_travail?: boolean | null
          lieu_examen?: string | null
          mode_financement?: string | null
          modules_autorises?: number[] | null
          montant_paye?: number | null
          montant_ttc?: number | null
          mot_de_passe_cma?: string | null
          mot_de_passe_plateforme?: string | null
          moyen_paiement?: string | null
          nom?: string
          notes?: string | null
          numero_dossier_cma?: string | null
          organisme_financeur?: string | null
          prenom?: string
          relance_dossier_bienvenue_exclu?: boolean
          responsable_contact_centre?: boolean
          resultat_examen?: string | null
          resultat_examen_pratique?: string | null
          societe_adresse?: string | null
          societe_code_postal?: string | null
          societe_nom?: string | null
          societe_siret?: string | null
          societe_tva_intra?: string | null
          societe_ville?: string | null
          source_inscription?: string
          statut?: string | null
          telephone?: string | null
          type_apprenant?: string | null
          type_examen?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_email: string | null
          admin_user_id: string
          apprenant_id: string | null
          apprenant_nom: string | null
          created_at: string
          details: Json | null
          id: string
        }
        Insert: {
          action: string
          admin_email?: string | null
          admin_user_id: string
          apprenant_id?: string | null
          apprenant_nom?: string | null
          created_at?: string
          details?: Json | null
          id?: string
        }
        Update: {
          action?: string
          admin_email?: string | null
          admin_user_id?: string
          apprenant_id?: string | null
          apprenant_nom?: string | null
          created_at?: string
          details?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: false
            referencedRelation: "apprenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bpf: {
        Row: {
          annee: number
          charges_prestations: number | null
          charges_salaires_formateurs: number | null
          charges_total: number | null
          created_at: string
          date_debut: string
          date_fin: string
          dirigeant_nom: string | null
          dirigeant_qualite: string | null
          formateurs_externes_heures: number | null
          formateurs_externes_nombre: number | null
          formateurs_internes_heures: number | null
          formateurs_internes_nombre: number | null
          id: string
          objectifs: Json | null
          organisme_adresse: string | null
          organisme_code_naf: string | null
          organisme_denomination: string | null
          organisme_email: string | null
          organisme_forme_juridique: string | null
          organisme_numero_declaration: string | null
          organisme_siret: string | null
          organisme_telephone: string | null
          produits_cpf: number | null
          produits_entreprises: number | null
          produits_france_travail: number | null
          produits_opco: number | null
          produits_particuliers: number | null
          produits_total: number | null
          signature_date: string | null
          signature_lieu: string | null
          specialites: Json | null
          stagiaires_demandeurs_emploi_heures: number | null
          stagiaires_demandeurs_emploi_nombre: number | null
          stagiaires_particuliers_heures: number | null
          stagiaires_particuliers_nombre: number | null
          stagiaires_salaries_heures: number | null
          stagiaires_salaries_nombre: number | null
          stagiaires_total_heures: number | null
          stagiaires_total_nombre: number | null
          statut: string | null
          updated_at: string
        }
        Insert: {
          annee: number
          charges_prestations?: number | null
          charges_salaires_formateurs?: number | null
          charges_total?: number | null
          created_at?: string
          date_debut: string
          date_fin: string
          dirigeant_nom?: string | null
          dirigeant_qualite?: string | null
          formateurs_externes_heures?: number | null
          formateurs_externes_nombre?: number | null
          formateurs_internes_heures?: number | null
          formateurs_internes_nombre?: number | null
          id?: string
          objectifs?: Json | null
          organisme_adresse?: string | null
          organisme_code_naf?: string | null
          organisme_denomination?: string | null
          organisme_email?: string | null
          organisme_forme_juridique?: string | null
          organisme_numero_declaration?: string | null
          organisme_siret?: string | null
          organisme_telephone?: string | null
          produits_cpf?: number | null
          produits_entreprises?: number | null
          produits_france_travail?: number | null
          produits_opco?: number | null
          produits_particuliers?: number | null
          produits_total?: number | null
          signature_date?: string | null
          signature_lieu?: string | null
          specialites?: Json | null
          stagiaires_demandeurs_emploi_heures?: number | null
          stagiaires_demandeurs_emploi_nombre?: number | null
          stagiaires_particuliers_heures?: number | null
          stagiaires_particuliers_nombre?: number | null
          stagiaires_salaries_heures?: number | null
          stagiaires_salaries_nombre?: number | null
          stagiaires_total_heures?: number | null
          stagiaires_total_nombre?: number | null
          statut?: string | null
          updated_at?: string
        }
        Update: {
          annee?: number
          charges_prestations?: number | null
          charges_salaires_formateurs?: number | null
          charges_total?: number | null
          created_at?: string
          date_debut?: string
          date_fin?: string
          dirigeant_nom?: string | null
          dirigeant_qualite?: string | null
          formateurs_externes_heures?: number | null
          formateurs_externes_nombre?: number | null
          formateurs_internes_heures?: number | null
          formateurs_internes_nombre?: number | null
          id?: string
          objectifs?: Json | null
          organisme_adresse?: string | null
          organisme_code_naf?: string | null
          organisme_denomination?: string | null
          organisme_email?: string | null
          organisme_forme_juridique?: string | null
          organisme_numero_declaration?: string | null
          organisme_siret?: string | null
          organisme_telephone?: string | null
          produits_cpf?: number | null
          produits_entreprises?: number | null
          produits_france_travail?: number | null
          produits_opco?: number | null
          produits_particuliers?: number | null
          produits_total?: number | null
          signature_date?: string | null
          signature_lieu?: string | null
          specialites?: Json | null
          stagiaires_demandeurs_emploi_heures?: number | null
          stagiaires_demandeurs_emploi_nombre?: number | null
          stagiaires_particuliers_heures?: number | null
          stagiaires_particuliers_nombre?: number | null
          stagiaires_salaries_heures?: number | null
          stagiaires_salaries_nombre?: number | null
          stagiaires_total_heures?: number | null
          stagiaires_total_nombre?: number | null
          statut?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          created_at: string
          email: string | null
          entreprise: string | null
          fonction: string | null
          id: string
          nom: string
          notes: string | null
          prenom: string
          statut: string | null
          telephone: string | null
          updated_at: string
          valeur_estimee: number | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          entreprise?: string | null
          fonction?: string | null
          id?: string
          nom: string
          notes?: string | null
          prenom: string
          statut?: string | null
          telephone?: string | null
          updated_at?: string
          valeur_estimee?: number | null
        }
        Update: {
          created_at?: string
          email?: string | null
          entreprise?: string | null
          fonction?: string | null
          id?: string
          nom?: string
          notes?: string | null
          prenom?: string
          statut?: string | null
          telephone?: string | null
          updated_at?: string
          valeur_estimee?: number | null
        }
        Relationships: []
      }
      contrats_fournisseurs: {
        Row: {
          created_at: string
          destinataire_email: string | null
          destinataire_nom: string | null
          fournisseur_id: string
          id: string
          lieu_signature: string | null
          metadata: Json | null
          representant_nom: string | null
          sent_at: string | null
          sent_pdf_url: string | null
          signature_data_url: string | null
          signed_at: string | null
          signed_pdf_path: string | null
          signed_pdf_url: string | null
          status: string
          titre: string
          token: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          destinataire_email?: string | null
          destinataire_nom?: string | null
          fournisseur_id: string
          id?: string
          lieu_signature?: string | null
          metadata?: Json | null
          representant_nom?: string | null
          sent_at?: string | null
          sent_pdf_url?: string | null
          signature_data_url?: string | null
          signed_at?: string | null
          signed_pdf_path?: string | null
          signed_pdf_url?: string | null
          status?: string
          titre: string
          token?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          destinataire_email?: string | null
          destinataire_nom?: string | null
          fournisseur_id?: string
          id?: string
          lieu_signature?: string | null
          metadata?: Json | null
          representant_nom?: string | null
          sent_at?: string | null
          sent_pdf_url?: string | null
          signature_data_url?: string | null
          signed_at?: string | null
          signed_pdf_path?: string | null
          signed_pdf_url?: string | null
          status?: string
          titre?: string
          token?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrats_fournisseurs_fournisseur_id_fkey"
            columns: ["fournisseur_id"]
            isOneToOne: false
            referencedRelation: "fournisseurs"
            referencedColumns: ["id"]
          },
        ]
      }
      creneaux_rdv: {
        Row: {
          apprenant_id: string | null
          created_at: string
          id: string
          nom: string
          slot: string
          telephone: string
        }
        Insert: {
          apprenant_id?: string | null
          created_at?: string
          id?: string
          nom: string
          slot: string
          telephone: string
        }
        Update: {
          apprenant_id?: string | null
          created_at?: string
          id?: string
          nom?: string
          slot?: string
          telephone?: string
        }
        Relationships: [
          {
            foreignKeyName: "creneaux_rdv_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: true
            referencedRelation: "apprenants"
            referencedColumns: ["id"]
          },
        ]
      }
      devis_envois: {
        Row: {
          apprenant_id: string
          created_at: string
          date_devis: string | null
          date_validite: string | null
          dates_formation: string | null
          devis_signe_url: string | null
          fichier_url: string
          formation: string | null
          id: string
          modele: string
          montant: string | null
          signed_at: string | null
          statut: string
          token: string
        }
        Insert: {
          apprenant_id: string
          created_at?: string
          date_devis?: string | null
          date_validite?: string | null
          dates_formation?: string | null
          devis_signe_url?: string | null
          fichier_url: string
          formation?: string | null
          id?: string
          modele: string
          montant?: string | null
          signed_at?: string | null
          statut?: string
          token?: string
        }
        Update: {
          apprenant_id?: string
          created_at?: string
          date_devis?: string | null
          date_validite?: string | null
          dates_formation?: string | null
          devis_signe_url?: string | null
          fichier_url?: string
          formation?: string | null
          id?: string
          modele?: string
          montant?: string | null
          signed_at?: string | null
          statut?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "devis_envois_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: false
            referencedRelation: "apprenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          apprenant_id: string | null
          created_at: string
          formation_id: string | null
          id: string
          nom: string
          session_id: string | null
          taille: number | null
          type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          apprenant_id?: string | null
          created_at?: string
          formation_id?: string | null
          id?: string
          nom: string
          session_id?: string | null
          taille?: number | null
          type: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          apprenant_id?: string | null
          created_at?: string
          formation_id?: string | null
          id?: string
          nom?: string
          session_id?: string | null
          taille?: number | null
          type?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: false
            referencedRelation: "apprenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      documents_a_signer: {
        Row: {
          champs: Json
          created_at: string
          created_by: string | null
          destinataire_email: string | null
          destinataire_nom: string | null
          file_path: string
          id: string
          nom: string
          reponses: Json
          sent_at: string | null
          signed_at: string | null
          statut: string
          token: string
          updated_at: string
        }
        Insert: {
          champs?: Json
          created_at?: string
          created_by?: string | null
          destinataire_email?: string | null
          destinataire_nom?: string | null
          file_path: string
          id?: string
          nom: string
          reponses?: Json
          sent_at?: string | null
          signed_at?: string | null
          statut?: string
          token?: string
          updated_at?: string
        }
        Update: {
          champs?: Json
          created_at?: string
          created_by?: string | null
          destinataire_email?: string | null
          destinataire_nom?: string | null
          file_path?: string
          id?: string
          nom?: string
          reponses?: Json
          sent_at?: string | null
          signed_at?: string | null
          statut?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents_inscription: {
        Row: {
          analyse_ia_date: string | null
          analyse_ia_details: Json | null
          apprenant_id: string
          created_at: string
          description: string | null
          id: string
          motif_refus: string | null
          nom_fichier: string
          statut: string
          titre: string
          type_document: string
          updated_at: string
          url: string
        }
        Insert: {
          analyse_ia_date?: string | null
          analyse_ia_details?: Json | null
          apprenant_id: string
          created_at?: string
          description?: string | null
          id?: string
          motif_refus?: string | null
          nom_fichier: string
          statut?: string
          titre: string
          type_document: string
          updated_at?: string
          url: string
        }
        Update: {
          analyse_ia_date?: string | null
          analyse_ia_details?: Json | null
          apprenant_id?: string
          created_at?: string
          description?: string | null
          id?: string
          motif_refus?: string | null
          nom_fichier?: string
          statut?: string
          titre?: string
          type_document?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_inscription_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: false
            referencedRelation: "apprenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_template: string
          created_at: string
          icon: string
          id: string
          label: string
          subject_template: string
          updated_at: string
        }
        Insert: {
          body_template: string
          created_at?: string
          icon?: string
          id: string
          label: string
          subject_template: string
          updated_at?: string
        }
        Update: {
          body_template?: string
          created_at?: string
          icon?: string
          id?: string
          label?: string
          subject_template?: string
          updated_at?: string
        }
        Relationships: []
      }
      emails: {
        Row: {
          apprenant_id: string | null
          body_html: string | null
          body_preview: string | null
          created_at: string
          has_attachments: boolean | null
          id: string
          is_read: boolean | null
          outlook_message_id: string | null
          received_at: string | null
          recipients: string[] | null
          sender_email: string | null
          sender_name: string | null
          sent_at: string | null
          subject: string
          type: string
          updated_at: string
        }
        Insert: {
          apprenant_id?: string | null
          body_html?: string | null
          body_preview?: string | null
          created_at?: string
          has_attachments?: boolean | null
          id?: string
          is_read?: boolean | null
          outlook_message_id?: string | null
          received_at?: string | null
          recipients?: string[] | null
          sender_email?: string | null
          sender_name?: string | null
          sent_at?: string | null
          subject: string
          type: string
          updated_at?: string
        }
        Update: {
          apprenant_id?: string | null
          body_html?: string | null
          body_preview?: string | null
          created_at?: string
          has_attachments?: boolean | null
          id?: string
          is_read?: boolean | null
          outlook_message_id?: string | null
          received_at?: string | null
          recipients?: string[] | null
          sender_email?: string | null
          sender_name?: string | null
          sent_at?: string | null
          subject?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emails_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: false
            referencedRelation: "apprenants"
            referencedColumns: ["id"]
          },
        ]
      }
      emargements_fc: {
        Row: {
          absent: boolean
          apprenant_id: string
          confirme_identite: boolean
          confirme_presence_lieu: boolean
          created_at: string
          date_emargement: string
          demi_journee: string
          id: string
          justificatif_url: string | null
          motif_absence: string | null
          signature_data_url: string | null
          signed_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          absent?: boolean
          apprenant_id: string
          confirme_identite?: boolean
          confirme_presence_lieu?: boolean
          created_at?: string
          date_emargement?: string
          demi_journee: string
          id?: string
          justificatif_url?: string | null
          motif_absence?: string | null
          signature_data_url?: string | null
          signed_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          absent?: boolean
          apprenant_id?: string
          confirme_identite?: boolean
          confirme_presence_lieu?: boolean
          created_at?: string
          date_emargement?: string
          demi_journee?: string
          id?: string
          justificatif_url?: string | null
          motif_absence?: string | null
          signature_data_url?: string | null
          signed_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          component_stack: string | null
          context: Json | null
          count: number
          created_at: string
          fingerprint: string | null
          id: string
          last_seen_at: string
          level: string
          message: string
          resolved: boolean
          resolved_at: string | null
          route: string | null
          source: string
          stack: string | null
          url: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          component_stack?: string | null
          context?: Json | null
          count?: number
          created_at?: string
          fingerprint?: string | null
          id?: string
          last_seen_at?: string
          level?: string
          message: string
          resolved?: boolean
          resolved_at?: string | null
          route?: string | null
          source?: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          component_stack?: string | null
          context?: Json | null
          count?: number
          created_at?: string
          fingerprint?: string | null
          id?: string
          last_seen_at?: string
          level?: string
          message?: string
          resolved?: boolean
          resolved_at?: string | null
          route?: string | null
          source?: string
          stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      facture_paiements: {
        Row: {
          created_at: string
          date_paiement: string
          facture_id: string
          id: string
          montant: number
          moyen_paiement: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_paiement: string
          facture_id: string
          id?: string
          montant?: number
          moyen_paiement: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_paiement?: string
          facture_id?: string
          id?: string
          montant?: number
          moyen_paiement?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facture_paiements_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
        ]
      }
      factures: {
        Row: {
          apprenant_id: string | null
          client_adresse: string | null
          client_nom: string
          client_opco: string | null
          client_siret: string | null
          created_at: string
          date_echeance: string | null
          date_emission: string
          date_paiement: string | null
          id: string
          montant_ht: number
          montant_ttc: number
          montant_tva: number
          numero: string
          numero_convention: string | null
          numero_engagement: string | null
          session_id: string | null
          statut: string | null
          tva_taux: number
          type_financement: string
          updated_at: string
        }
        Insert: {
          apprenant_id?: string | null
          client_adresse?: string | null
          client_nom: string
          client_opco?: string | null
          client_siret?: string | null
          created_at?: string
          date_echeance?: string | null
          date_emission?: string
          date_paiement?: string | null
          id?: string
          montant_ht?: number
          montant_ttc?: number
          montant_tva?: number
          numero: string
          numero_convention?: string | null
          numero_engagement?: string | null
          session_id?: string | null
          statut?: string | null
          tva_taux?: number
          type_financement?: string
          updated_at?: string
        }
        Update: {
          apprenant_id?: string | null
          client_adresse?: string | null
          client_nom?: string
          client_opco?: string | null
          client_siret?: string | null
          created_at?: string
          date_echeance?: string | null
          date_emission?: string
          date_paiement?: string | null
          id?: string
          montant_ht?: number
          montant_ttc?: number
          montant_tva?: number
          numero?: string
          numero_convention?: string | null
          numero_engagement?: string | null
          session_id?: string | null
          statut?: string | null
          tva_taux?: number
          type_financement?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factures_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: false
            referencedRelation: "apprenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      factures_supprimees: {
        Row: {
          client_nom: string | null
          date_emission: string | null
          deleted_at: string
          deleted_by: string | null
          deleted_by_email: string | null
          facture_id: string | null
          id: string
          montant_ttc: number | null
          motif: string | null
          numero: string
          snapshot: Json
          statut: string | null
          type_financement: string | null
        }
        Insert: {
          client_nom?: string | null
          date_emission?: string | null
          deleted_at?: string
          deleted_by?: string | null
          deleted_by_email?: string | null
          facture_id?: string | null
          id?: string
          montant_ttc?: number | null
          motif?: string | null
          numero: string
          snapshot?: Json
          statut?: string | null
          type_financement?: string | null
        }
        Update: {
          client_nom?: string | null
          date_emission?: string | null
          deleted_at?: string
          deleted_by?: string | null
          deleted_by_email?: string | null
          facture_id?: string | null
          id?: string
          montant_ttc?: number | null
          motif?: string | null
          numero?: string
          snapshot?: Json
          statut?: string | null
          type_financement?: string | null
        }
        Relationships: []
      }
      financeurs_fc: {
        Row: {
          adresse: string | null
          apprenant_id: string
          code_postal: string | null
          contact_email: string | null
          contact_nom: string | null
          contact_telephone: string | null
          created_at: string
          email_facturation: string | null
          id: string
          notes: string | null
          numero_dossier: string | null
          numero_tva: string | null
          organisme_financeur: string | null
          pays: string | null
          raison_sociale: string | null
          siren: string | null
          siret: string | null
          type_financeur: string
          updated_at: string
          user_id: string
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          apprenant_id: string
          code_postal?: string | null
          contact_email?: string | null
          contact_nom?: string | null
          contact_telephone?: string | null
          created_at?: string
          email_facturation?: string | null
          id?: string
          notes?: string | null
          numero_dossier?: string | null
          numero_tva?: string | null
          organisme_financeur?: string | null
          pays?: string | null
          raison_sociale?: string | null
          siren?: string | null
          siret?: string | null
          type_financeur?: string
          updated_at?: string
          user_id: string
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          apprenant_id?: string
          code_postal?: string | null
          contact_email?: string | null
          contact_nom?: string | null
          contact_telephone?: string | null
          created_at?: string
          email_facturation?: string | null
          id?: string
          notes?: string | null
          numero_dossier?: string | null
          numero_tva?: string | null
          organisme_financeur?: string | null
          pays?: string | null
          raison_sociale?: string | null
          siren?: string | null
          siret?: string | null
          type_financeur?: string
          updated_at?: string
          user_id?: string
          ville?: string | null
        }
        Relationships: []
      }
      formateur_emargements: {
        Row: {
          blocs_snapshot: Json
          created_at: string
          date_jour: string
          formateur_id: string | null
          fournisseur_id: string
          id: string
          ip_address: string | null
          signature_data_url: string
          signed_at: string
          user_agent: string | null
        }
        Insert: {
          blocs_snapshot?: Json
          created_at?: string
          date_jour: string
          formateur_id?: string | null
          fournisseur_id: string
          id?: string
          ip_address?: string | null
          signature_data_url: string
          signed_at?: string
          user_agent?: string | null
        }
        Update: {
          blocs_snapshot?: Json
          created_at?: string
          date_jour?: string
          formateur_id?: string | null
          fournisseur_id?: string
          id?: string
          ip_address?: string | null
          signature_data_url?: string
          signed_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formateur_emargements_fournisseur_id_fkey"
            columns: ["fournisseur_id"]
            isOneToOne: false
            referencedRelation: "fournisseurs"
            referencedColumns: ["id"]
          },
        ]
      }
      formateurs: {
        Row: {
          adresse: string | null
          banque: string | null
          bic: string | null
          civilite: string | null
          code_postal: string | null
          created_at: string
          email: string | null
          iban: string | null
          id: string
          nom: string
          numero_tva: string | null
          prenom: string
          siren: string | null
          site_web: string | null
          societe_nom: string | null
          specialites: string | null
          tarif_horaire: number | null
          telephone: string | null
          type: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          banque?: string | null
          bic?: string | null
          civilite?: string | null
          code_postal?: string | null
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          nom: string
          numero_tva?: string | null
          prenom: string
          siren?: string | null
          site_web?: string | null
          societe_nom?: string | null
          specialites?: string | null
          tarif_horaire?: number | null
          telephone?: string | null
          type?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          banque?: string | null
          bic?: string | null
          civilite?: string | null
          code_postal?: string | null
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          nom?: string
          numero_tva?: string | null
          prenom?: string
          siren?: string | null
          site_web?: string | null
          societe_nom?: string | null
          specialites?: string | null
          tarif_horaire?: number | null
          telephone?: string | null
          type?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      formations: {
        Row: {
          code_nsf: string | null
          code_rncp: string | null
          code_rs: string | null
          created_at: string
          description: string | null
          duree_heures: number
          id: string
          nom: string
          objectifs: string | null
          prix_ht: number
          tva_taux: number
          updated_at: string
        }
        Insert: {
          code_nsf?: string | null
          code_rncp?: string | null
          code_rs?: string | null
          created_at?: string
          description?: string | null
          duree_heures?: number
          id?: string
          nom: string
          objectifs?: string | null
          prix_ht?: number
          tva_taux?: number
          updated_at?: string
        }
        Update: {
          code_nsf?: string | null
          code_rncp?: string | null
          code_rs?: string | null
          created_at?: string
          description?: string | null
          duree_heures?: number
          id?: string
          nom?: string
          objectifs?: string | null
          prix_ht?: number
          tva_taux?: number
          updated_at?: string
        }
        Relationships: []
      }
      fournisseur_apprenants: {
        Row: {
          adresse: string | null
          civilite: string | null
          code_postal: string | null
          created_at: string
          creneau_horaire: string | null
          date_examen_pratique: string | null
          date_examen_theorique: string | null
          date_formation_catalogue: string | null
          documents_complets: boolean | null
          email: string | null
          formation_choisie: string | null
          fournisseur_id: string
          id: string
          inscrit_france_travail: boolean | null
          mode_financement: string | null
          montant_ttc: number | null
          nom: string
          notes: string | null
          organisme_financeur: string | null
          prenom: string
          telephone: string | null
          type_apprenant: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          civilite?: string | null
          code_postal?: string | null
          created_at?: string
          creneau_horaire?: string | null
          date_examen_pratique?: string | null
          date_examen_theorique?: string | null
          date_formation_catalogue?: string | null
          documents_complets?: boolean | null
          email?: string | null
          formation_choisie?: string | null
          fournisseur_id: string
          id?: string
          inscrit_france_travail?: boolean | null
          mode_financement?: string | null
          montant_ttc?: number | null
          nom: string
          notes?: string | null
          organisme_financeur?: string | null
          prenom: string
          telephone?: string | null
          type_apprenant?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          civilite?: string | null
          code_postal?: string | null
          created_at?: string
          creneau_horaire?: string | null
          date_examen_pratique?: string | null
          date_examen_theorique?: string | null
          date_formation_catalogue?: string | null
          documents_complets?: boolean | null
          email?: string | null
          formation_choisie?: string | null
          fournisseur_id?: string
          id?: string
          inscrit_france_travail?: boolean | null
          mode_financement?: string | null
          montant_ttc?: number | null
          nom?: string
          notes?: string | null
          organisme_financeur?: string | null
          prenom?: string
          telephone?: string | null
          type_apprenant?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fournisseur_apprenants_fournisseur_id_fkey"
            columns: ["fournisseur_id"]
            isOneToOne: false
            referencedRelation: "fournisseurs"
            referencedColumns: ["id"]
          },
        ]
      }
      fournisseur_documents: {
        Row: {
          created_at: string
          fournisseur_apprenant_id: string
          fournisseur_id: string
          id: string
          nom_fichier: string
          titre: string
          type_document: string
          url: string
        }
        Insert: {
          created_at?: string
          fournisseur_apprenant_id: string
          fournisseur_id: string
          id?: string
          nom_fichier: string
          titre: string
          type_document?: string
          url: string
        }
        Update: {
          created_at?: string
          fournisseur_apprenant_id?: string
          fournisseur_id?: string
          id?: string
          nom_fichier?: string
          titre?: string
          type_document?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fournisseur_documents_fournisseur_apprenant_id_fkey"
            columns: ["fournisseur_apprenant_id"]
            isOneToOne: false
            referencedRelation: "fournisseur_apprenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fournisseur_documents_fournisseur_id_fkey"
            columns: ["fournisseur_id"]
            isOneToOne: false
            referencedRelation: "fournisseurs"
            referencedColumns: ["id"]
          },
        ]
      }
      fournisseur_factures: {
        Row: {
          created_at: string
          date_paiement: string | null
          description: string | null
          destinataire: string
          fournisseur_id: string
          id: string
          mois_annee: string | null
          montant: number | null
          moyen_paiement: string | null
          nom_fichier: string
          statut: string
          url: string
        }
        Insert: {
          created_at?: string
          date_paiement?: string | null
          description?: string | null
          destinataire: string
          fournisseur_id: string
          id?: string
          mois_annee?: string | null
          montant?: number | null
          moyen_paiement?: string | null
          nom_fichier: string
          statut?: string
          url: string
        }
        Update: {
          created_at?: string
          date_paiement?: string | null
          description?: string | null
          destinataire?: string
          fournisseur_id?: string
          id?: string
          mois_annee?: string | null
          montant?: number | null
          moyen_paiement?: string | null
          nom_fichier?: string
          statut?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fournisseur_factures_fournisseur_id_fkey"
            columns: ["fournisseur_id"]
            isOneToOne: false
            referencedRelation: "fournisseurs"
            referencedColumns: ["id"]
          },
        ]
      }
      fournisseur_paiements: {
        Row: {
          created_at: string
          date_paiement: string
          facture_id: string
          id: string
          montant: number
          moyen_paiement: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          date_paiement?: string
          facture_id: string
          id?: string
          montant?: number
          moyen_paiement?: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          date_paiement?: string
          facture_id?: string
          id?: string
          montant?: number
          moyen_paiement?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fournisseur_paiements_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "fournisseur_factures"
            referencedColumns: ["id"]
          },
        ]
      }
      fournisseur_shared_docs: {
        Row: {
          created_at: string
          description: string | null
          fournisseur_id: string
          id: string
          nom_fichier: string
          sent_at: string | null
          sent_to: string | null
          titre: string
          uploaded_by: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          fournisseur_id: string
          id?: string
          nom_fichier: string
          sent_at?: string | null
          sent_to?: string | null
          titre: string
          uploaded_by?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          fournisseur_id?: string
          id?: string
          nom_fichier?: string
          sent_at?: string | null
          sent_to?: string | null
          titre?: string
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fournisseur_shared_docs_fournisseur_id_fkey"
            columns: ["fournisseur_id"]
            isOneToOne: false
            referencedRelation: "fournisseurs"
            referencedColumns: ["id"]
          },
        ]
      }
      fournisseurs: {
        Row: {
          actif: boolean
          adresse: string | null
          banque: string | null
          bic: string | null
          code_postal: string | null
          comptable_only: boolean | null
          created_at: string
          email: string | null
          factures_only: boolean | null
          formateur_id: string | null
          iban: string | null
          id: string
          nom: string
          numero_tva: string | null
          pays: string | null
          siren: string | null
          siret: string | null
          site_web: string | null
          telephone: string | null
          token: string
          updated_at: string
          ville: string | null
        }
        Insert: {
          actif?: boolean
          adresse?: string | null
          banque?: string | null
          bic?: string | null
          code_postal?: string | null
          comptable_only?: boolean | null
          created_at?: string
          email?: string | null
          factures_only?: boolean | null
          formateur_id?: string | null
          iban?: string | null
          id?: string
          nom: string
          numero_tva?: string | null
          pays?: string | null
          siren?: string | null
          siret?: string | null
          site_web?: string | null
          telephone?: string | null
          token?: string
          updated_at?: string
          ville?: string | null
        }
        Update: {
          actif?: boolean
          adresse?: string | null
          banque?: string | null
          bic?: string | null
          code_postal?: string | null
          comptable_only?: boolean | null
          created_at?: string
          email?: string | null
          factures_only?: boolean | null
          formateur_id?: string | null
          iban?: string | null
          id?: string
          nom?: string
          numero_tva?: string | null
          pays?: string | null
          siren?: string | null
          siret?: string | null
          site_web?: string | null
          telephone?: string | null
          token?: string
          updated_at?: string
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fournisseurs_formateur_id_fkey"
            columns: ["formateur_id"]
            isOneToOne: false
            referencedRelation: "formateurs"
            referencedColumns: ["id"]
          },
        ]
      }
      grilles_notation_conduite: {
        Row: {
          apprenant_id: string
          avis: string | null
          created_at: string
          created_by: string | null
          criteres: Json
          date_passage: string
          evaluateur: string | null
          id: string
          note_globale: number | null
          notes_themes: Json
          observations: string | null
          passage: string | null
          session_id: string | null
          temps_preparation: string | null
          type_formation: string
          updated_at: string
        }
        Insert: {
          apprenant_id: string
          avis?: string | null
          created_at?: string
          created_by?: string | null
          criteres?: Json
          date_passage?: string
          evaluateur?: string | null
          id?: string
          note_globale?: number | null
          notes_themes?: Json
          observations?: string | null
          passage?: string | null
          session_id?: string | null
          temps_preparation?: string | null
          type_formation?: string
          updated_at?: string
        }
        Update: {
          apprenant_id?: string
          avis?: string | null
          created_at?: string
          created_by?: string | null
          criteres?: Json
          date_passage?: string
          evaluateur?: string | null
          id?: string
          note_globale?: number | null
          notes_themes?: Json
          observations?: string | null
          passage?: string | null
          session_id?: string | null
          temps_preparation?: string | null
          type_formation?: string
          updated_at?: string
        }
        Relationships: []
      }
      justificatifs: {
        Row: {
          categorie: string | null
          created_at: string
          date_operation: string | null
          description: string | null
          facture_id: string | null
          fournisseur: string | null
          id: string
          montant_ttc: number | null
          nom_fichier: string
          notes: string | null
          statut: string
          updated_at: string
          url: string
        }
        Insert: {
          categorie?: string | null
          created_at?: string
          date_operation?: string | null
          description?: string | null
          facture_id?: string | null
          fournisseur?: string | null
          id?: string
          montant_ttc?: number | null
          nom_fichier: string
          notes?: string | null
          statut?: string
          updated_at?: string
          url: string
        }
        Update: {
          categorie?: string | null
          created_at?: string
          date_operation?: string | null
          description?: string | null
          facture_id?: string | null
          fournisseur?: string | null
          id?: string
          montant_ttc?: number | null
          nom_fichier?: string
          notes?: string | null
          statut?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "justificatifs_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
        ]
      }
      module_admin_audit_log: {
        Row: {
          action: string
          after_value: Json | null
          author_email: string | null
          author_user_id: string | null
          before_value: Json | null
          created_at: string
          exercice_id: string | null
          field: string | null
          id: string
          module_id: number
          module_nom: string | null
          origin: string | null
          question_id: string | null
          summary: string | null
        }
        Insert: {
          action: string
          after_value?: Json | null
          author_email?: string | null
          author_user_id?: string | null
          before_value?: Json | null
          created_at?: string
          exercice_id?: string | null
          field?: string | null
          id?: string
          module_id: number
          module_nom?: string | null
          origin?: string | null
          question_id?: string | null
          summary?: string | null
        }
        Update: {
          action?: string
          after_value?: Json | null
          author_email?: string | null
          author_user_id?: string | null
          before_value?: Json | null
          created_at?: string
          exercice_id?: string | null
          field?: string | null
          id?: string
          module_id?: number
          module_nom?: string | null
          origin?: string | null
          question_id?: string | null
          summary?: string | null
        }
        Relationships: []
      }
      module_change_notifications: {
        Row: {
          change_summary: string
          changed_at: string
          created_at: string
          id: string
          module_id: number
          module_nom: string
        }
        Insert: {
          change_summary: string
          changed_at?: string
          created_at?: string
          id?: string
          module_id: number
          module_nom: string
        }
        Update: {
          change_summary?: string
          changed_at?: string
          created_at?: string
          id?: string
          module_id?: number
          module_nom?: string
        }
        Relationships: []
      }
      module_editor_state: {
        Row: {
          created_at: string
          deleted_cours: Json
          deleted_exercices: Json
          id: string
          module_data: Json
          module_id: number
          source_fingerprint: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_cours?: Json
          deleted_exercices?: Json
          id?: string
          module_data?: Json
          module_id: number
          source_fingerprint?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_cours?: Json
          deleted_exercices?: Json
          id?: string
          module_data?: Json
          module_id?: number
          source_fingerprint?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      module_notification_dismissals: {
        Row: {
          apprenant_id: string
          dismissed_at: string
          id: string
          notification_id: string
        }
        Insert: {
          apprenant_id: string
          dismissed_at?: string
          id?: string
          notification_id: string
        }
        Update: {
          apprenant_id?: string
          dismissed_at?: string
          id?: string
          notification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_notification_dismissals_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: false
            referencedRelation: "apprenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_notification_dismissals_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "module_change_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notes_frais: {
        Row: {
          categorie: string | null
          created_at: string
          date_depense: string
          description: string
          fournisseur: string | null
          id: string
          montant: number
          nom_fichier: string | null
          notes: string | null
          statut: string
          updated_at: string
          url: string | null
        }
        Insert: {
          categorie?: string | null
          created_at?: string
          date_depense?: string
          description: string
          fournisseur?: string | null
          id?: string
          montant?: number
          nom_fichier?: string | null
          notes?: string | null
          statut?: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          categorie?: string | null
          created_at?: string
          date_depense?: string
          description?: string
          fournisseur?: string | null
          id?: string
          montant?: number
          nom_fichier?: string | null
          notes?: string | null
          statut?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      organismes: {
        Row: {
          adresse: string | null
          code_naf: string | null
          code_postal: string | null
          created_at: string
          email: string | null
          id: string
          nom: string
          numero_declaration: string | null
          numero_tva: string | null
          siret: string | null
          siret_complet: string | null
          telephone: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          code_naf?: string | null
          code_postal?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nom: string
          numero_declaration?: string | null
          numero_tva?: string | null
          siret?: string | null
          siret_complet?: string | null
          telephone?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          code_naf?: string | null
          code_postal?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nom?: string
          numero_declaration?: string | null
          numero_tva?: string | null
          siret?: string | null
          siret_complet?: string | null
          telephone?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      planning_pratique_config: {
        Row: {
          created_at: string
          date_pratique: string
          day_time_slots: Json
          exam_date: string
          excluded_days: string[]
          extra_candidats: string[]
          extra_days: string[]
          id: string
          max_per_day: number
          max_per_day_map: Json
          planning_end_date: string
          planning_start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_pratique: string
          day_time_slots?: Json
          exam_date: string
          excluded_days?: string[]
          extra_candidats?: string[]
          extra_days?: string[]
          id?: string
          max_per_day?: number
          max_per_day_map?: Json
          planning_end_date: string
          planning_start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_pratique?: string
          day_time_slots?: Json
          exam_date?: string
          excluded_days?: string[]
          extra_candidats?: string[]
          extra_days?: string[]
          id?: string
          max_per_day?: number
          max_per_day_map?: Json
          planning_end_date?: string
          planning_start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quiz_questions_overrides: {
        Row: {
          choix: Json
          created_at: string
          enonce: string
          fournisseur_id: string
          id: string
          question_id: number
          quiz_id: string
          section_id: number
          updated_at: string
        }
        Insert: {
          choix?: Json
          created_at?: string
          enonce: string
          fournisseur_id: string
          id?: string
          question_id: number
          quiz_id: string
          section_id: number
          updated_at?: string
        }
        Update: {
          choix?: Json
          created_at?: string
          enonce?: string
          fournisseur_id?: string
          id?: string
          question_id?: number
          quiz_id?: string
          section_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_overrides_fournisseur_id_fkey"
            columns: ["fournisseur_id"]
            isOneToOne: false
            referencedRelation: "fournisseurs"
            referencedColumns: ["id"]
          },
        ]
      }
      rdv_carte_vtc_slots: {
        Row: {
          created_at: string
          date: string
          email: string | null
          heure: string
          id: string
          nom: string | null
          notes: string | null
          prenom: string | null
          statut: string
          telephone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          email?: string | null
          heure: string
          id?: string
          nom?: string | null
          notes?: string | null
          prenom?: string | null
          statut?: string
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          email?: string | null
          heure?: string
          id?: string
          nom?: string | null
          notes?: string | null
          prenom?: string | null
          statut?: string
          telephone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rdv_carte_vtc_slots_audit: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          changed_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          slot_id: string
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          changed_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          slot_id: string
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          changed_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          slot_id?: string
        }
        Relationships: []
      }
      releves_bancaires: {
        Row: {
          banque: string
          created_at: string
          id: string
          mois_annee: string
          nom_fichier: string
          notes: string | null
          url: string
        }
        Insert: {
          banque?: string
          created_at?: string
          id?: string
          mois_annee: string
          nom_fichier: string
          notes?: string | null
          url: string
        }
        Update: {
          banque?: string
          created_at?: string
          id?: string
          mois_annee?: string
          nom_fichier?: string
          notes?: string | null
          url?: string
        }
        Relationships: []
      }
      renouvellements: {
        Row: {
          categorie: string
          created_at: string
          date_debut: string | null
          date_echeance: string | null
          id: string
          libelle: string
          notes: string | null
          ordre: number
          reference: string | null
          updated_at: string
        }
        Insert: {
          categorie: string
          created_at?: string
          date_debut?: string | null
          date_echeance?: string | null
          id?: string
          libelle: string
          notes?: string | null
          ordre?: number
          reference?: string | null
          updated_at?: string
        }
        Update: {
          categorie?: string
          created_at?: string
          date_debut?: string | null
          date_echeance?: string | null
          id?: string
          libelle?: string
          notes?: string | null
          ordre?: number
          reference?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reponses_apprenants: {
        Row: {
          apprenant_id: string
          completed: boolean
          created_at: string
          exercice_id: string
          exercice_type: string
          id: string
          reponses: Json
          score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apprenant_id: string
          completed?: boolean
          created_at?: string
          exercice_id: string
          exercice_type?: string
          id?: string
          reponses?: Json
          score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apprenant_id?: string
          completed?: boolean
          created_at?: string
          exercice_id?: string
          exercice_type?: string
          id?: string
          reponses?: Json
          score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reponses_apprenants_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: false
            referencedRelation: "apprenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations_pratique: {
        Row: {
          apprenant_id: string
          created_at: string
          creneau: string
          date_choisie: string
          id: string
          type_formation: string
        }
        Insert: {
          apprenant_id: string
          created_at?: string
          creneau?: string
          date_choisie: string
          id?: string
          type_formation: string
        }
        Update: {
          apprenant_id?: string
          created_at?: string
          creneau?: string
          date_choisie?: string
          id?: string
          type_formation?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_pratique_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: true
            referencedRelation: "apprenants"
            referencedColumns: ["id"]
          },
        ]
      }
      revolut_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          expires_in: number | null
          id: string
          refresh_token: string | null
          token_type: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          expires_in?: number | null
          id?: string
          refresh_token?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          expires_in?: number | null
          id?: string
          refresh_token?: string | null
          token_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      session_apprenants: {
        Row: {
          apprenant_id: string
          created_at: string
          date_debut: string | null
          date_fin: string | null
          date_fin_personnalisee: string | null
          heure_debut_personnalisee: string | null
          heure_fin_personnalisee: string | null
          id: string
          liste_attente: boolean
          mode_financement: string | null
          montant_paye: number | null
          montant_total: number | null
          moyen_paiement: string | null
          notes: string | null
          presence_pratique: string | null
          session_id: string
          statut_suivi: string | null
        }
        Insert: {
          apprenant_id: string
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          date_fin_personnalisee?: string | null
          heure_debut_personnalisee?: string | null
          heure_fin_personnalisee?: string | null
          id?: string
          liste_attente?: boolean
          mode_financement?: string | null
          montant_paye?: number | null
          montant_total?: number | null
          moyen_paiement?: string | null
          notes?: string | null
          presence_pratique?: string | null
          session_id: string
          statut_suivi?: string | null
        }
        Update: {
          apprenant_id?: string
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          date_fin_personnalisee?: string | null
          heure_debut_personnalisee?: string | null
          heure_fin_personnalisee?: string | null
          id?: string
          liste_attente?: boolean
          mode_financement?: string | null
          montant_paye?: number | null
          montant_total?: number | null
          moyen_paiement?: string | null
          notes?: string | null
          presence_pratique?: string | null
          session_id?: string
          statut_suivi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_apprenants_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: false
            referencedRelation: "apprenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_apprenants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_formateurs: {
        Row: {
          created_at: string
          formateur_id: string
          heures_effectuees: number | null
          id: string
          presence: string
          session_id: string
        }
        Insert: {
          created_at?: string
          formateur_id: string
          heures_effectuees?: number | null
          id?: string
          presence?: string
          session_id: string
        }
        Update: {
          created_at?: string
          formateur_id?: string
          heures_effectuees?: number | null
          id?: string
          presence?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_formateurs_formateur_id_fkey"
            columns: ["formateur_id"]
            isOneToOne: false
            referencedRelation: "formateurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_formateurs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          creneaux: string[] | null
          date_debut: string
          date_fin: string
          formation_id: string | null
          heure_debut: string | null
          heure_fin: string | null
          id: string
          lieu: string | null
          nom: string | null
          places_disponibles: number | null
          statut: string | null
          type_session: string
          types_apprenant: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          creneaux?: string[] | null
          date_debut: string
          date_fin: string
          formation_id?: string | null
          heure_debut?: string | null
          heure_fin?: string | null
          id?: string
          lieu?: string | null
          nom?: string | null
          places_disponibles?: number | null
          statut?: string | null
          type_session?: string
          types_apprenant?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          creneaux?: string[] | null
          date_debut?: string
          date_fin?: string
          formation_id?: string | null
          heure_debut?: string | null
          heure_fin?: string | null
          id?: string
          lieu?: string | null
          nom?: string | null
          places_disponibles?: number | null
          statut?: string | null
          type_session?: string
          types_apprenant?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions_bancaires: {
        Row: {
          banque: string
          categorie: string | null
          created_at: string
          date_operation: string
          fournisseur_client: string | null
          id: string
          justificatif_id: string | null
          libelle: string
          montant: number
          montant_ht: number | null
          montant_tva: number | null
          notes: string | null
          reference: string | null
          releve_id: string | null
          solde: number | null
          source: string
          statut: string
          tva_rate: number | null
          updated_at: string
        }
        Insert: {
          banque?: string
          categorie?: string | null
          created_at?: string
          date_operation: string
          fournisseur_client?: string | null
          id?: string
          justificatif_id?: string | null
          libelle: string
          montant: number
          montant_ht?: number | null
          montant_tva?: number | null
          notes?: string | null
          reference?: string | null
          releve_id?: string | null
          solde?: number | null
          source?: string
          statut?: string
          tva_rate?: number | null
          updated_at?: string
        }
        Update: {
          banque?: string
          categorie?: string | null
          created_at?: string
          date_operation?: string
          fournisseur_client?: string | null
          id?: string
          justificatif_id?: string | null
          libelle?: string
          montant?: number
          montant_ht?: number | null
          montant_tva?: number | null
          notes?: string | null
          reference?: string | null
          releve_id?: string | null
          solde?: number | null
          source?: string
          statut?: string
          tva_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bancaires_justificatif_id_fkey"
            columns: ["justificatif_id"]
            isOneToOne: false
            referencedRelation: "justificatifs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_bancaires_releve_id_fkey"
            columns: ["releve_id"]
            isOneToOne: false
            referencedRelation: "releves_bancaires"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_apprenant_session: {
        Args: { _apprenant_id: string; _connexion_id: string; _event?: string }
        Returns: {
          disconnect_reason: string
          is_valid: boolean
          remaining_presence_seconds: number
          server_now: string
          session_started_at: string
          should_show_presence_prompt: boolean
        }[]
      }
      close_apprenant_connexion: {
        Args: { _apprenant_id?: string; _connexion_id: string }
        Returns: {
          closed: boolean
          ended_at: string
          reason: string
        }[]
      }
      daitch_mokotoff: { Args: { "": string }; Returns: string[] }
      dmetaphone: { Args: { "": string }; Returns: string }
      dmetaphone_alt: { Args: { "": string }; Returns: string }
      enforce_apprenant_session_limits: {
        Args: never
        Returns: {
          closed_max_duration: number
          closed_no_response: number
        }[]
      }
      get_active_apprenant_connexion_info: {
        Args: { _apprenant_id: string; _client_session_id?: string }
        Returns: {
          ip_address: string
          last_seen_at: string
          source: string
          started_at: string
          user_agent: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_current_user_apprenant: {
        Args: { _apprenant_id: string }
        Returns: boolean
      }
      log_error: {
        Args: {
          _component_stack?: string
          _context?: Json
          _fingerprint?: string
          _level?: string
          _message: string
          _route?: string
          _source?: string
          _stack?: string
          _url?: string
          _user_agent?: string
          _user_email?: string
          _user_id?: string
        }
        Returns: string
      }
      save_module_completion: {
        Args: {
          _apprenant_id: string
          _completed?: boolean
          _details?: Json
          _module_id: number
          _progress?: number
          _score_max?: number
          _score_obtenu?: number
        }
        Returns: {
          apprenant_id: string
          completed_at: string
          created_at: string
          details: Json | null
          id: string
          module_id: number
          progress: number
          score_max: number | null
          score_obtenu: number | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "apprenant_module_completion"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_module_editor_state: {
        Args: {
          p_deleted_cours: Json
          p_deleted_exercices: Json
          p_expected_updated_at?: string
          p_module_data: Json
          p_module_id: number
          p_source_fingerprint: string
        }
        Returns: {
          updated_at: string
        }[]
      }
      search_apprenant_onboarding: {
        Args: { p_nom: string; p_prenom: string }
        Returns: {
          adresse: string
          code_postal: string
          email: string
          id: string
          nom: string
          prenom: string
          telephone: string
          ville: string
        }[]
      }
      soundex: { Args: { "": string }; Returns: string }
      start_apprenant_connexion:
        | {
            Args: { _apprenant_id: string; _source?: string }
            Returns: {
              id: string
              started_at: string
            }[]
          }
        | {
            Args: {
              _apprenant_id: string
              _client_session_id?: string
              _source?: string
            }
            Returns: {
              id: string
              started_at: string
            }[]
          }
      text_soundex: { Args: { "": string }; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
