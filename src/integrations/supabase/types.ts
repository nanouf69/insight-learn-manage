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
      answer_events: {
        Row: {
          apprenant_id: string
          attempt_id: string
          auteur: string | null
          created_at: string
          event_id: number
          origine: string | null
          question_id: string
          response_id: string
          revision_nouvelle: number
          revision_precedente: number | null
          session_origine: string | null
          valeur_nouvelle: Json | null
          valeur_precedente: Json | null
        }
        Insert: {
          apprenant_id: string
          attempt_id: string
          auteur?: string | null
          created_at?: string
          event_id?: number
          origine?: string | null
          question_id: string
          response_id: string
          revision_nouvelle: number
          revision_precedente?: number | null
          session_origine?: string | null
          valeur_nouvelle?: Json | null
          valeur_precedente?: Json | null
        }
        Update: {
          apprenant_id?: string
          attempt_id?: string
          auteur?: string | null
          created_at?: string
          event_id?: number
          origine?: string | null
          question_id?: string
          response_id?: string
          revision_nouvelle?: number
          revision_precedente?: number | null
          session_origine?: string | null
          valeur_nouvelle?: Json | null
          valeur_precedente?: Json | null
        }
        Relationships: []
      }
      answer_state: {
        Row: {
          apprenant_id: string
          attempt_id: string
          question_id: string
          response_id: string
          revision: number
          session_origine: string | null
          updated_at: string
          updated_by: string | null
          valeur: Json | null
        }
        Insert: {
          apprenant_id: string
          attempt_id: string
          question_id: string
          response_id?: string
          revision?: number
          session_origine?: string | null
          updated_at?: string
          updated_by?: string | null
          valeur?: Json | null
        }
        Update: {
          apprenant_id?: string
          attempt_id?: string
          question_id?: string
          response_id?: string
          revision?: number
          session_origine?: string | null
          updated_at?: string
          updated_by?: string | null
          valeur?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "answer_state_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts_v2"
            referencedColumns: ["attempt_id"]
          },
        ]
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
      apprenant_changement_mdp_requis: {
        Row: {
          annule_le: string | null
          annule_par: string | null
          apprenant_id: string
          demande_le: string
          demande_par: string | null
          effectue_le: string | null
          id: string
          lot: string | null
          motif: string
        }
        Insert: {
          annule_le?: string | null
          annule_par?: string | null
          apprenant_id: string
          demande_le?: string
          demande_par?: string | null
          effectue_le?: string | null
          id?: string
          lot?: string | null
          motif?: string
        }
        Update: {
          annule_le?: string | null
          annule_par?: string | null
          apprenant_id?: string
          demande_le?: string
          demande_par?: string | null
          effectue_le?: string | null
          id?: string
          lot?: string | null
          motif?: string
        }
        Relationships: [
          {
            foreignKeyName: "apprenant_changement_mdp_requis_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: true
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
      apprenant_examen_timers: {
        Row: {
          apprenant_id: string
          created_at: string
          duree_secondes: number
          exercice_id: string
          id: string
          started_at: string
          tentative: number
          user_id: string | null
        }
        Insert: {
          apprenant_id: string
          created_at?: string
          duree_secondes: number
          exercice_id: string
          id?: string
          started_at?: string
          tentative?: number
          user_id?: string | null
        }
        Update: {
          apprenant_id?: string
          created_at?: string
          duree_secondes?: number
          exercice_id?: string
          id?: string
          started_at?: string
          tentative?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apprenant_examen_timers_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: false
            referencedRelation: "apprenants"
            referencedColumns: ["id"]
          },
        ]
      }
      apprenant_identifiants_t3p: {
        Row: {
          apprenant_id: string
          created_at: string
          id: string
          nouveau_mot_de_passe: string | null
          nouvel_email: string | null
          recu_at: string | null
          token: string
          updated_at: string
        }
        Insert: {
          apprenant_id: string
          created_at?: string
          id?: string
          nouveau_mot_de_passe?: string | null
          nouvel_email?: string | null
          recu_at?: string | null
          token?: string
          updated_at?: string
        }
        Update: {
          apprenant_id?: string
          created_at?: string
          id?: string
          nouveau_mot_de_passe?: string | null
          nouvel_email?: string | null
          recu_at?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apprenant_identifiants_t3p_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: true
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
          pages_completees: Json
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
          pages_completees?: Json
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
          pages_completees?: Json
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
          formation: string | null
          id: string
          montant: number
          moyen_paiement: string | null
          notes: string | null
        }
        Insert: {
          apprenant_id: string
          created_at?: string
          date_paiement?: string | null
          formation?: string | null
          id?: string
          montant?: number
          moyen_paiement?: string | null
          notes?: string | null
        }
        Update: {
          apprenant_id?: string
          created_at?: string
          date_paiement?: string | null
          formation?: string | null
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
      apprenant_question_temps: {
        Row: {
          answered: boolean
          apprenant_id: string
          correct: boolean | null
          created_at: string
          exercice_id: string | null
          id: string
          module_id: number | null
          module_nom: string | null
          occurred_at: string
          question_key: string
          question_num: number | null
          seconds: number
          user_id: string | null
        }
        Insert: {
          answered?: boolean
          apprenant_id: string
          correct?: boolean | null
          created_at?: string
          exercice_id?: string | null
          id?: string
          module_id?: number | null
          module_nom?: string | null
          occurred_at?: string
          question_key: string
          question_num?: number | null
          seconds?: number
          user_id?: string | null
        }
        Update: {
          answered?: boolean
          apprenant_id?: string
          correct?: boolean | null
          created_at?: string
          exercice_id?: string | null
          id?: string
          module_id?: number | null
          module_nom?: string | null
          occurred_at?: string
          question_key?: string
          question_num?: number | null
          seconds?: number
          user_id?: string | null
        }
        Relationships: []
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
          abandonnee: boolean
          adresse: string | null
          auth_user_id: string | null
          b2_vierge: boolean | null
          civilite: string | null
          code_postal: string | null
          created_at: string
          creneau_horaire: string | null
          date_abandon: string | null
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
          emails_bloques: boolean
          facture_contact_email: string | null
          facture_contact_nom: string | null
          facture_contact_telephone: string | null
          formation_choisie: string | null
          frais_examen: string | null
          heure_examen_pratique: string | null
          heures_elearning: number | null
          heures_pratique: number | null
          heures_presentiel: number | null
          heures_totales: number | null
          id: string
          inscrit_france_travail: boolean | null
          lieu_examen: string | null
          modalite_formation: string | null
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
          statut_suivi: string | null
          telephone: string | null
          type_apprenant: string | null
          type_examen: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          abandonnee?: boolean
          adresse?: string | null
          auth_user_id?: string | null
          b2_vierge?: boolean | null
          civilite?: string | null
          code_postal?: string | null
          created_at?: string
          creneau_horaire?: string | null
          date_abandon?: string | null
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
          emails_bloques?: boolean
          facture_contact_email?: string | null
          facture_contact_nom?: string | null
          facture_contact_telephone?: string | null
          formation_choisie?: string | null
          frais_examen?: string | null
          heure_examen_pratique?: string | null
          heures_elearning?: number | null
          heures_pratique?: number | null
          heures_presentiel?: number | null
          heures_totales?: number | null
          id?: string
          inscrit_france_travail?: boolean | null
          lieu_examen?: string | null
          modalite_formation?: string | null
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
          statut_suivi?: string | null
          telephone?: string | null
          type_apprenant?: string | null
          type_examen?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          abandonnee?: boolean
          adresse?: string | null
          auth_user_id?: string | null
          b2_vierge?: boolean | null
          civilite?: string | null
          code_postal?: string | null
          created_at?: string
          creneau_horaire?: string | null
          date_abandon?: string | null
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
          emails_bloques?: boolean
          facture_contact_email?: string | null
          facture_contact_nom?: string | null
          facture_contact_telephone?: string | null
          formation_choisie?: string | null
          frais_examen?: string | null
          heure_examen_pratique?: string | null
          heures_elearning?: number | null
          heures_pratique?: number | null
          heures_presentiel?: number | null
          heures_totales?: number | null
          id?: string
          inscrit_france_travail?: boolean | null
          lieu_examen?: string | null
          modalite_formation?: string | null
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
          statut_suivi?: string | null
          telephone?: string | null
          type_apprenant?: string | null
          type_examen?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      audit_journal: {
        Row: {
          apprenant_id: string | null
          apres: Json | null
          attempt_id: string | null
          auteur: string | null
          auteur_email: string | null
          avant: Json | null
          cible_id: string | null
          cible_type: string
          created_at: string
          event_id: number
          exam_id: string | null
          exam_version_id: string | null
          operation: string
          origine: string | null
          session_technique: string | null
        }
        Insert: {
          apprenant_id?: string | null
          apres?: Json | null
          attempt_id?: string | null
          auteur?: string | null
          auteur_email?: string | null
          avant?: Json | null
          cible_id?: string | null
          cible_type: string
          created_at?: string
          event_id?: number
          exam_id?: string | null
          exam_version_id?: string | null
          operation: string
          origine?: string | null
          session_technique?: string | null
        }
        Update: {
          apprenant_id?: string | null
          apres?: Json | null
          attempt_id?: string | null
          auteur?: string | null
          auteur_email?: string | null
          avant?: Json | null
          cible_id?: string | null
          cible_type?: string
          created_at?: string
          event_id?: number
          exam_id?: string | null
          exam_version_id?: string | null
          operation?: string
          origine?: string | null
          session_technique?: string | null
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
      backup_bilan_examen_modules: {
        Row: {
          created_at: string
          id: string
          module_data: Json
          module_id: number
          motif: string
          source_updated_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          module_data: Json
          module_id: number
          motif: string
          source_updated_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          module_data?: Json
          module_id?: number
          motif?: string
          source_updated_at?: string | null
        }
        Relationships: []
      }
      backup_resultats_0_technique: {
        Row: {
          apprenant_id: string | null
          backup_at: string
          backup_id: string
          completed_at: string | null
          created_at: string | null
          details: Json | null
          duree_secondes: number | null
          id: string
          matiere_id: string | null
          matiere_nom: string | null
          note_sur_20: number | null
          quiz_id: string | null
          quiz_titre: string | null
          quiz_type: string | null
          reussi: boolean | null
          score_max: number | null
          score_obtenu: number | null
          tentative: number | null
          user_id: string | null
        }
        Insert: {
          apprenant_id?: string | null
          backup_at?: string
          backup_id?: string
          completed_at?: string | null
          created_at?: string | null
          details?: Json | null
          duree_secondes?: number | null
          id: string
          matiere_id?: string | null
          matiere_nom?: string | null
          note_sur_20?: number | null
          quiz_id?: string | null
          quiz_titre?: string | null
          quiz_type?: string | null
          reussi?: boolean | null
          score_max?: number | null
          score_obtenu?: number | null
          tentative?: number | null
          user_id?: string | null
        }
        Update: {
          apprenant_id?: string | null
          backup_at?: string
          backup_id?: string
          completed_at?: string | null
          created_at?: string | null
          details?: Json | null
          duree_secondes?: number | null
          id?: string
          matiere_id?: string | null
          matiere_nom?: string | null
          note_sur_20?: number | null
          quiz_id?: string | null
          quiz_titre?: string | null
          quiz_type?: string | null
          reussi?: boolean | null
          score_max?: number | null
          score_obtenu?: number | null
          tentative?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      bilan_identite_flags: {
        Row: {
          actif: boolean
          module_id: number
          updated_at: string
        }
        Insert: {
          actif?: boolean
          module_id: number
          updated_at?: string
        }
        Update: {
          actif?: boolean
          module_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      bilan_nouvelle_tentative_autorisations: {
        Row: {
          apprenant_id: string
          autorise_par: string | null
          created_at: string
          exercice_id: number
          id: string
          module_id: number
          motif: string
          tentative_autorisee: number
          tentative_source: number
        }
        Insert: {
          apprenant_id: string
          autorise_par?: string | null
          created_at?: string
          exercice_id: number
          id?: string
          module_id: number
          motif: string
          tentative_autorisee: number
          tentative_source: number
        }
        Update: {
          apprenant_id?: string
          autorise_par?: string | null
          created_at?: string
          exercice_id?: number
          id?: string
          module_id?: number
          motif?: string
          tentative_autorisee?: number
          tentative_source?: number
        }
        Relationships: []
      }
      bilan_passage_categories: {
        Row: {
          apprenant_id: string
          categorie: string
          created_at: string
          created_by: string | null
          exercice_id: number
          id: string
          module_id: number
          motif: string | null
          tentative: number
        }
        Insert: {
          apprenant_id: string
          categorie: string
          created_at?: string
          created_by?: string | null
          exercice_id: number
          id?: string
          module_id: number
          motif?: string | null
          tentative?: number
        }
        Update: {
          apprenant_id?: string
          categorie?: string
          created_at?: string
          created_by?: string | null
          exercice_id?: number
          id?: string
          module_id?: number
          motif?: string | null
          tentative?: number
        }
        Relationships: []
      }
      bilan_passage_snapshots: {
        Row: {
          apprenant_id: string
          bareme: Json | null
          created_at: string
          empreinte: string
          empreinte_source: string
          exercice_id: number
          filiere: string
          id: string
          matiere: string
          module_id: number
          nb_questions: number
          operation_id: string | null
          passage_cle: string
          questions: Json
          tentative: number
        }
        Insert: {
          apprenant_id: string
          bareme?: Json | null
          created_at?: string
          empreinte: string
          empreinte_source: string
          exercice_id: number
          filiere: string
          id?: string
          matiere: string
          module_id: number
          nb_questions: number
          operation_id?: string | null
          passage_cle: string
          questions: Json
          tentative: number
        }
        Update: {
          apprenant_id?: string
          bareme?: Json | null
          created_at?: string
          empreinte?: string
          empreinte_source?: string
          exercice_id?: number
          filiere?: string
          id?: string
          matiere?: string
          module_id?: number
          nb_questions?: number
          operation_id?: string | null
          passage_cle?: string
          questions?: Json
          tentative?: number
        }
        Relationships: []
      }
      bilan_passages_figes: {
        Row: {
          apprenant_id: string | null
          cle_figee: Json
          empreinte_passage: string
          exercice_id: string
          fige_at: string
          id: string
          module_id: number
          motif: string
          nb_questions: number
          nb_repondues: number
          passage_created_at: string | null
          passage_updated_at: string | null
          reponse_apprenant_id: string
          reponses: Json
          score_bonnes: number
          statut_passage: string | null
          tentative: number | null
        }
        Insert: {
          apprenant_id?: string | null
          cle_figee: Json
          empreinte_passage: string
          exercice_id: string
          fige_at?: string
          id?: string
          module_id: number
          motif: string
          nb_questions: number
          nb_repondues: number
          passage_created_at?: string | null
          passage_updated_at?: string | null
          reponse_apprenant_id: string
          reponses: Json
          score_bonnes: number
          statut_passage?: string | null
          tentative?: number | null
        }
        Update: {
          apprenant_id?: string | null
          cle_figee?: Json
          empreinte_passage?: string
          exercice_id?: string
          fige_at?: string
          id?: string
          module_id?: number
          motif?: string
          nb_questions?: number
          nb_repondues?: number
          passage_created_at?: string | null
          passage_updated_at?: string | null
          reponse_apprenant_id?: string
          reponses?: Json
          score_bonnes?: number
          statut_passage?: string | null
          tentative?: number | null
        }
        Relationships: []
      }
      bilan_question_identite_etats: {
        Row: {
          created_at: string
          empreinte_contenu: string | null
          etat: string
          id: number
          motif: string | null
          numero_affiche: string | null
          uid: string
        }
        Insert: {
          created_at?: string
          empreinte_contenu?: string | null
          etat: string
          id?: number
          motif?: string | null
          numero_affiche?: string | null
          uid: string
        }
        Update: {
          created_at?: string
          empreinte_contenu?: string | null
          etat?: string
          id?: number
          motif?: string | null
          numero_affiche?: string | null
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "bilan_question_identite_etats_uid_fkey"
            columns: ["uid"]
            isOneToOne: false
            referencedRelation: "bilan_question_identites"
            referencedColumns: ["uid"]
          },
        ]
      }
      bilan_question_identites: {
        Row: {
          created_at: string
          date_connue: string | null
          empreinte_contenu: string | null
          etat_initial: string
          exercice_id: number
          filiere: string
          litigieux: boolean
          matiere: string | null
          module_id: number
          motif: string | null
          numero_technique: string
          uid: string
        }
        Insert: {
          created_at?: string
          date_connue?: string | null
          empreinte_contenu?: string | null
          etat_initial?: string
          exercice_id: number
          filiere: string
          litigieux?: boolean
          matiere?: string | null
          module_id: number
          motif?: string | null
          numero_technique: string
          uid?: string
        }
        Update: {
          created_at?: string
          date_connue?: string | null
          empreinte_contenu?: string | null
          etat_initial?: string
          exercice_id?: number
          filiere?: string
          litigieux?: boolean
          matiere?: string | null
          module_id?: number
          motif?: string | null
          numero_technique?: string
          uid?: string
        }
        Relationships: []
      }
      bilan_reponse_reclassements: {
        Row: {
          ancien_statut: string
          apprenant_id: string
          cle: string
          created_at: string
          exercice_id: number
          id: string
          module_id: number
          motif: string
          nouveau_statut: string
          operation_id: string
          preuve: Json
          tentative: number
          uid: string
        }
        Insert: {
          ancien_statut: string
          apprenant_id: string
          cle: string
          created_at?: string
          exercice_id: number
          id?: string
          module_id: number
          motif: string
          nouveau_statut: string
          operation_id: string
          preuve?: Json
          tentative: number
          uid: string
        }
        Update: {
          ancien_statut?: string
          apprenant_id?: string
          cle?: string
          created_at?: string
          exercice_id?: number
          id?: string
          module_id?: number
          motif?: string
          nouveau_statut?: string
          operation_id?: string
          preuve?: Json
          tentative?: number
          uid?: string
        }
        Relationships: []
      }
      bilan_reponse_statuts: {
        Row: {
          apprenant_id: string
          cle: string
          created_at: string
          exercice_id: number
          id: string
          module_id: number
          reponse: Json | null
          statut: string
          tentative: number
          uid: string | null
        }
        Insert: {
          apprenant_id: string
          cle: string
          created_at?: string
          exercice_id: number
          id?: string
          module_id: number
          reponse?: Json | null
          statut: string
          tentative?: number
          uid?: string | null
        }
        Update: {
          apprenant_id?: string
          cle?: string
          created_at?: string
          exercice_id?: number
          id?: string
          module_id?: number
          reponse?: Json | null
          statut?: string
          tentative?: number
          uid?: string | null
        }
        Relationships: []
      }
      bilan_snapshot_flags: {
        Row: {
          actif: boolean
          module_id: number
          updated_at: string
        }
        Insert: {
          actif?: boolean
          module_id: number
          updated_at?: string
        }
        Update: {
          actif?: boolean
          module_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      bilan_sync_backups: {
        Row: {
          created_at: string
          id: string
          label: string
          module_data: Json
          module_id: number
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          module_data: Json
          module_id: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          module_data?: Json
          module_id?: number
        }
        Relationships: []
      }
      bilan_sync_journal: {
        Row: {
          apres: Json | null
          auteur: string | null
          avant: Json | null
          cible_module_id: number | null
          created_at: string
          empreinte_apres: string | null
          empreinte_avant: string | null
          evenement: string
          id: string
          lien_id: string | null
          motif: string | null
          question_id: number | null
          sens: string | null
          source_module_id: number | null
        }
        Insert: {
          apres?: Json | null
          auteur?: string | null
          avant?: Json | null
          cible_module_id?: number | null
          created_at?: string
          empreinte_apres?: string | null
          empreinte_avant?: string | null
          evenement: string
          id?: string
          lien_id?: string | null
          motif?: string | null
          question_id?: number | null
          sens?: string | null
          source_module_id?: number | null
        }
        Update: {
          apres?: Json | null
          auteur?: string | null
          avant?: Json | null
          cible_module_id?: number | null
          created_at?: string
          empreinte_apres?: string | null
          empreinte_avant?: string | null
          evenement?: string
          id?: string
          lien_id?: string | null
          motif?: string | null
          question_id?: number | null
          sens?: string | null
          source_module_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bilan_sync_journal_lien_id_fkey"
            columns: ["lien_id"]
            isOneToOne: false
            referencedRelation: "bilan_sync_liens"
            referencedColumns: ["id"]
          },
        ]
      }
      bilan_sync_liens: {
        Row: {
          created_at: string
          created_by: string | null
          empreinte_taxi_ref: string | null
          empreinte_vtc_ref: string | null
          id: string
          matiere_key: string
          motif: string | null
          statut: string
          taxi_exercice_id: number
          taxi_module_id: number
          taxi_question_id: number
          updated_at: string
          vtc_exercice_id: number
          vtc_module_id: number
          vtc_question_id: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          empreinte_taxi_ref?: string | null
          empreinte_vtc_ref?: string | null
          id?: string
          matiere_key: string
          motif?: string | null
          statut?: string
          taxi_exercice_id: number
          taxi_module_id?: number
          taxi_question_id: number
          updated_at?: string
          vtc_exercice_id: number
          vtc_module_id?: number
          vtc_question_id: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          empreinte_taxi_ref?: string | null
          empreinte_vtc_ref?: string | null
          id?: string
          matiere_key?: string
          motif?: string | null
          statut?: string
          taxi_exercice_id?: number
          taxi_module_id?: number
          taxi_question_id?: number
          updated_at?: string
          vtc_exercice_id?: number
          vtc_module_id?: number
          vtc_question_id?: number
        }
        Relationships: []
      }
      bilan_sync_removed_questions: {
        Row: {
          created_at: string
          exercice_id: string
          exercice_titre: string | null
          id: string
          module_id: number
          question: Json
        }
        Insert: {
          created_at?: string
          exercice_id: string
          exercice_titre?: string | null
          id?: string
          module_id: number
          question: Json
        }
        Update: {
          created_at?: string
          exercice_id?: string
          exercice_titre?: string | null
          id?: string
          module_id?: number
          question?: Json
        }
        Relationships: []
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
      canonical_exam_attempts: {
        Row: {
          apprenant_ref: string
          attempt_id: string
          is_pilot: boolean
          quiz_id: string
          snapshot: Json
          snapshot_versions: Json
          started_at: string
          tentative: number
        }
        Insert: {
          apprenant_ref: string
          attempt_id?: string
          is_pilot?: boolean
          quiz_id: string
          snapshot: Json
          snapshot_versions?: Json
          started_at?: string
          tentative?: number
        }
        Update: {
          apprenant_ref?: string
          attempt_id?: string
          is_pilot?: boolean
          quiz_id?: string
          snapshot?: Json
          snapshot_versions?: Json
          started_at?: string
          tentative?: number
        }
        Relationships: []
      }
      canonical_pilot_flags: {
        Row: {
          created_at: string
          enabled: boolean
          note: string | null
          scope_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          note?: string | null
          scope_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          note?: string | null
          scope_id?: string
        }
        Relationships: []
      }
      canonical_question_usages: {
        Row: {
          created_at: string
          exercise_id: number | null
          id: string
          module_id: number | null
          position: number
          question_id: string
          quiz_id: string
          usage_kind: string
        }
        Insert: {
          created_at?: string
          exercise_id?: number | null
          id?: string
          module_id?: number | null
          position?: number
          question_id: string
          quiz_id: string
          usage_kind: string
        }
        Update: {
          created_at?: string
          exercise_id?: number | null
          id?: string
          module_id?: number | null
          position?: number
          question_id?: string
          quiz_id?: string
          usage_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "canonical_question_usages_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "canonical_questions"
            referencedColumns: ["question_id"]
          },
        ]
      }
      canonical_question_write_log: {
        Row: {
          accepted: boolean
          created_at: string
          expected_version: number | null
          id: string
          origin: string | null
          payload: Json | null
          question_id: string
          reason: string | null
          resulting_version: number | null
          server_version_before: number | null
        }
        Insert: {
          accepted: boolean
          created_at?: string
          expected_version?: number | null
          id?: string
          origin?: string | null
          payload?: Json | null
          question_id: string
          reason?: string | null
          resulting_version?: number | null
          server_version_before?: number | null
        }
        Update: {
          accepted?: boolean
          created_at?: string
          expected_version?: number | null
          id?: string
          origin?: string | null
          payload?: Json | null
          question_id?: string
          reason?: string | null
          resulting_version?: number | null
          server_version_before?: number | null
        }
        Relationships: []
      }
      canonical_questions: {
        Row: {
          bareme: number
          bonnes_reponses: Json
          choix: Json
          coefficient: number
          created_at: string
          enonce: string
          explication: string | null
          explications_choix: Json
          identity_key: string
          is_pilot: boolean
          medias: Json
          mots_cles: Json
          proprietes: Json
          question_id: string
          reponse_qrc: string | null
          type: string
          updated_at: string
          version: number
        }
        Insert: {
          bareme?: number
          bonnes_reponses?: Json
          choix?: Json
          coefficient?: number
          created_at?: string
          enonce?: string
          explication?: string | null
          explications_choix?: Json
          identity_key: string
          is_pilot?: boolean
          medias?: Json
          mots_cles?: Json
          proprietes?: Json
          question_id?: string
          reponse_qrc?: string | null
          type?: string
          updated_at?: string
          version?: number
        }
        Update: {
          bareme?: number
          bonnes_reponses?: Json
          choix?: Json
          coefficient?: number
          created_at?: string
          enonce?: string
          explication?: string | null
          explications_choix?: Json
          identity_key?: string
          is_pilot?: boolean
          medias?: Json
          mots_cles?: Json
          proprietes?: Json
          question_id?: string
          reponse_qrc?: string | null
          type?: string
          updated_at?: string
          version?: number
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
      core_bridge_comptes_test: {
        Row: {
          apprenant_id: string
          created_at: string
          created_email: string | null
          libelle: string | null
        }
        Insert: {
          apprenant_id: string
          created_at?: string
          created_email?: string | null
          libelle?: string | null
        }
        Update: {
          apprenant_id?: string
          created_at?: string
          created_email?: string | null
          libelle?: string | null
        }
        Relationships: []
      }
      core_bridge_flags: {
        Row: {
          actif: boolean
          cle: string
          motif: string | null
          updated_at: string
          updated_email: string | null
        }
        Insert: {
          actif?: boolean
          cle: string
          motif?: string | null
          updated_at?: string
          updated_email?: string | null
        }
        Update: {
          actif?: boolean
          cle?: string
          motif?: string | null
          updated_at?: string
          updated_email?: string | null
        }
        Relationships: []
      }
      core_exam_resets: {
        Row: {
          apprenant_id: string
          archived_attempt_ids: Json
          archived_core_result_ids: Json
          archived_legacy_result_ids: Json
          created_at: string
          created_by: string | null
          created_email: string | null
          cutoff_at: string
          exam_id: string
          motif: string
          operation_id: string
          reset_id: string
        }
        Insert: {
          apprenant_id: string
          archived_attempt_ids?: Json
          archived_core_result_ids?: Json
          archived_legacy_result_ids?: Json
          created_at?: string
          created_by?: string | null
          created_email?: string | null
          cutoff_at?: string
          exam_id: string
          motif: string
          operation_id: string
          reset_id?: string
        }
        Update: {
          apprenant_id?: string
          archived_attempt_ids?: Json
          archived_core_result_ids?: Json
          archived_legacy_result_ids?: Json
          created_at?: string
          created_by?: string | null
          created_email?: string | null
          cutoff_at?: string
          exam_id?: string
          motif?: string
          operation_id?: string
          reset_id?: string
        }
        Relationships: []
      }
      core_exam_results: {
        Row: {
          apprenant_id: string
          attempt_id: string
          published_at: string | null
          qrc_restantes: number
          result_id: string
          result_revision: number
          score: number | null
          status: string
          total: number | null
          updated_at: string
        }
        Insert: {
          apprenant_id: string
          attempt_id: string
          published_at?: string | null
          qrc_restantes?: number
          result_id?: string
          result_revision?: number
          score?: number | null
          status?: string
          total?: number | null
          updated_at?: string
        }
        Update: {
          apprenant_id?: string
          attempt_id?: string
          published_at?: string | null
          qrc_restantes?: number
          result_id?: string
          result_revision?: number
          score?: number | null
          status?: string
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_exam_results_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "exam_attempts_v2"
            referencedColumns: ["attempt_id"]
          },
        ]
      }
      core_operations: {
        Row: {
          apprenant_id: string | null
          attempt_id: string | null
          auteur: string | null
          cible: Json
          created_at: string
          operation_id: string
          operation_type: string
          resultat: Json
        }
        Insert: {
          apprenant_id?: string | null
          attempt_id?: string | null
          auteur?: string | null
          cible?: Json
          created_at?: string
          operation_id: string
          operation_type: string
          resultat?: Json
        }
        Update: {
          apprenant_id?: string | null
          attempt_id?: string | null
          auteur?: string | null
          cible?: Json
          created_at?: string
          operation_id?: string
          operation_type?: string
          resultat?: Json
        }
        Relationships: []
      }
      core_tentatives_neutralisees: {
        Row: {
          apprenant_id: string
          attempt_id: string
          exam_id: string
          motif: string
          neutralise_at: string
          neutralise_par: string | null
          resultat_avant: Json | null
        }
        Insert: {
          apprenant_id: string
          attempt_id: string
          exam_id: string
          motif: string
          neutralise_at?: string
          neutralise_par?: string | null
          resultat_avant?: Json | null
        }
        Update: {
          apprenant_id?: string
          attempt_id?: string
          exam_id?: string
          motif?: string
          neutralise_at?: string
          neutralise_par?: string | null
          resultat_avant?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "core_tentatives_neutralisees_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: true
            referencedRelation: "exam_attempts_v2"
            referencedColumns: ["attempt_id"]
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
      demandes_inscription_urgentes: {
        Row: {
          apprenant_id: string
          apprenant_nom: string | null
          apprenant_prenom: string | null
          created_at: string
          date_examen: string
          date_limite: string
          email_destinataire: string
          email_envoye_at: string | null
          email_erreur: string | null
          email_statut: string
          examen_libelle: string
          formation: string | null
          id: string
          jours_restants: number | null
          statut: string
          statut_inscription: string | null
          traitee_at: string | null
          traitee_par: string | null
        }
        Insert: {
          apprenant_id: string
          apprenant_nom?: string | null
          apprenant_prenom?: string | null
          created_at?: string
          date_examen: string
          date_limite: string
          email_destinataire?: string
          email_envoye_at?: string | null
          email_erreur?: string | null
          email_statut?: string
          examen_libelle: string
          formation?: string | null
          id?: string
          jours_restants?: number | null
          statut?: string
          statut_inscription?: string | null
          traitee_at?: string | null
          traitee_par?: string | null
        }
        Update: {
          apprenant_id?: string
          apprenant_nom?: string | null
          apprenant_prenom?: string | null
          created_at?: string
          date_examen?: string
          date_limite?: string
          email_destinataire?: string
          email_envoye_at?: string | null
          email_erreur?: string | null
          email_statut?: string
          examen_libelle?: string
          formation?: string | null
          id?: string
          jours_restants?: number | null
          statut?: string
          statut_inscription?: string | null
          traitee_at?: string | null
          traitee_par?: string | null
        }
        Relationships: []
      }
      devis_envois: {
        Row: {
          apprenant_id: string | null
          client_adresse: string | null
          client_code_postal: string | null
          client_email: string | null
          client_nom: string | null
          client_telephone: string | null
          client_ville: string | null
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
          organisation_id: string | null
          signed_at: string | null
          statut: string
          token: string
        }
        Insert: {
          apprenant_id?: string | null
          client_adresse?: string | null
          client_code_postal?: string | null
          client_email?: string | null
          client_nom?: string | null
          client_telephone?: string | null
          client_ville?: string | null
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
          organisation_id?: string | null
          signed_at?: string | null
          statut?: string
          token?: string
        }
        Update: {
          apprenant_id?: string | null
          client_adresse?: string | null
          client_code_postal?: string | null
          client_email?: string | null
          client_nom?: string | null
          client_telephone?: string | null
          client_ville?: string | null
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
          organisation_id?: string | null
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
          {
            foreignKeyName: "devis_envois_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organismes"
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
      email_accuses: {
        Row: {
          apprenant_id: string | null
          created_at: string
          delivered_at: string | null
          destinataire: string
          erreur: string | null
          failed_at: string | null
          id: string
          last_opened_at: string | null
          open_count: number
          opened_at: string | null
          provider_message_id: string | null
          sent_at: string
          statut: string
          sujet: string | null
          updated_at: string
        }
        Insert: {
          apprenant_id?: string | null
          created_at?: string
          delivered_at?: string | null
          destinataire: string
          erreur?: string | null
          failed_at?: string | null
          id?: string
          last_opened_at?: string | null
          open_count?: number
          opened_at?: string | null
          provider_message_id?: string | null
          sent_at?: string
          statut?: string
          sujet?: string | null
          updated_at?: string
        }
        Update: {
          apprenant_id?: string | null
          created_at?: string
          delivered_at?: string | null
          destinataire?: string
          erreur?: string | null
          failed_at?: string | null
          id?: string
          last_opened_at?: string | null
          open_count?: number
          opened_at?: string | null
          provider_message_id?: string | null
          sent_at?: string
          statut?: string
          sujet?: string | null
          updated_at?: string
        }
        Relationships: []
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
      envois_lien_teams: {
        Row: {
          created_at: string
          created_by: string | null
          destinataires: Json
          id: string
          lien: string
          nb_echecs: number
          nb_succes: number
          session_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          destinataires?: Json
          id?: string
          lien: string
          nb_echecs?: number
          nb_succes?: number
          session_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          destinataires?: Json
          id?: string
          lien?: string
          nb_echecs?: number
          nb_succes?: number
          session_id?: string | null
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
      exam_attempts_v2: {
        Row: {
          apprenant_id: string
          attempt_id: string
          etat: string
          exam_id: string
          exam_version_id: string
          finished_at: string | null
          is_test: boolean
          snapshot: Json
          snapshot_fingerprint: string
          started_at: string
        }
        Insert: {
          apprenant_id: string
          attempt_id?: string
          etat?: string
          exam_id: string
          exam_version_id: string
          finished_at?: string | null
          is_test?: boolean
          snapshot: Json
          snapshot_fingerprint: string
          started_at?: string
        }
        Update: {
          apprenant_id?: string
          attempt_id?: string
          etat?: string
          exam_id?: string
          exam_version_id?: string
          finished_at?: string | null
          is_test?: boolean
          snapshot?: Json
          snapshot_fingerprint?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_v2_exam_version_id_fkey"
            columns: ["exam_version_id"]
            isOneToOne: false
            referencedRelation: "exam_content_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_content_backup_20260921: {
        Row: {
          backup_at: string
          deleted_cours: Json | null
          deleted_exercices: Json | null
          id: string
          module_data: Json
          module_id: number
          source_fingerprint: string | null
          updated_at: string | null
        }
        Insert: {
          backup_at?: string
          deleted_cours?: Json | null
          deleted_exercices?: Json | null
          id?: string
          module_data: Json
          module_id: number
          source_fingerprint?: string | null
          updated_at?: string | null
        }
        Update: {
          backup_at?: string
          deleted_cours?: Json | null
          deleted_exercices?: Json | null
          id?: string
          module_data?: Json
          module_id?: number
          source_fingerprint?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      exam_content_shares: {
        Row: {
          actif: boolean
          created_at: string
          declared_by: string | null
          declared_email: string | null
          id: string
          motif: string | null
          revoked_at: string | null
          source_exam_id: string
          source_matiere: string
          target_exam_id: string
          target_matiere: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          declared_by?: string | null
          declared_email?: string | null
          id?: string
          motif?: string | null
          revoked_at?: string | null
          source_exam_id: string
          source_matiere: string
          target_exam_id: string
          target_matiere: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          declared_by?: string | null
          declared_email?: string | null
          id?: string
          motif?: string | null
          revoked_at?: string | null
          source_exam_id?: string
          source_matiere?: string
          target_exam_id?: string
          target_matiere?: string
        }
        Relationships: []
      }
      exam_content_versions: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          created_email: string | null
          exam_id: string
          exam_numero: string
          filiere: string
          fingerprint: string
          id: string
          is_test: boolean
          module_id: number | null
          motif: string | null
          published_at: string | null
          published_by: string | null
          published_email: string | null
          retired_at: string | null
          statut: string
          version_number: number
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          created_email?: string | null
          exam_id: string
          exam_numero: string
          filiere: string
          fingerprint?: string
          id?: string
          is_test?: boolean
          module_id?: number | null
          motif?: string | null
          published_at?: string | null
          published_by?: string | null
          published_email?: string | null
          retired_at?: string | null
          statut?: string
          version_number: number
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          created_email?: string | null
          exam_id?: string
          exam_numero?: string
          filiere?: string
          fingerprint?: string
          id?: string
          is_test?: boolean
          module_id?: number | null
          motif?: string | null
          published_at?: string | null
          published_by?: string | null
          published_email?: string | null
          retired_at?: string | null
          statut?: string
          version_number?: number
        }
        Relationships: []
      }
      exam_content_write_log: {
        Row: {
          action: string
          author_email: string | null
          author_user_id: string | null
          created_at: string
          details: Json | null
          editor_schema_version: string | null
          exam_id: string | null
          examen_source_suspecte: string | null
          id: string
          matiere_id: string | null
          module_id: number | null
          motif_refus: string | null
          origine: string | null
          questions_apres: number | null
          questions_avant: number | null
          signature_apres: string | null
          signature_avant: string | null
          statut: string
        }
        Insert: {
          action: string
          author_email?: string | null
          author_user_id?: string | null
          created_at?: string
          details?: Json | null
          editor_schema_version?: string | null
          exam_id?: string | null
          examen_source_suspecte?: string | null
          id?: string
          matiere_id?: string | null
          module_id?: number | null
          motif_refus?: string | null
          origine?: string | null
          questions_apres?: number | null
          questions_avant?: number | null
          signature_apres?: string | null
          signature_avant?: string | null
          statut?: string
        }
        Update: {
          action?: string
          author_email?: string | null
          author_user_id?: string | null
          created_at?: string
          details?: Json | null
          editor_schema_version?: string | null
          exam_id?: string | null
          examen_source_suspecte?: string | null
          id?: string
          matiere_id?: string | null
          module_id?: number | null
          motif_refus?: string | null
          origine?: string | null
          questions_apres?: number | null
          questions_avant?: number | null
          signature_apres?: string | null
          signature_avant?: string | null
          statut?: string
        }
        Relationships: []
      }
      exam_retake_authorizations: {
        Row: {
          apprenant_id: string
          consumed_at: string | null
          created_at: string
          exam_id: string
          granted_by: string | null
          granted_email: string | null
          id: string
          motif: string
          result_ids: Json
          revoked_at: string | null
        }
        Insert: {
          apprenant_id: string
          consumed_at?: string | null
          created_at?: string
          exam_id: string
          granted_by?: string | null
          granted_email?: string | null
          id?: string
          motif?: string
          result_ids?: Json
          revoked_at?: string | null
        }
        Update: {
          apprenant_id?: string
          consumed_at?: string | null
          created_at?: string
          exam_id?: string
          granted_by?: string | null
          granted_email?: string | null
          id?: string
          motif?: string
          result_ids?: Json
          revoked_at?: string | null
        }
        Relationships: []
      }
      examen_theorique_decalages: {
        Row: {
          ancienne_date: string
          ancienne_session_id: string | null
          apprenant_id: string
          apprenant_nom: string | null
          apprenant_prenom: string | null
          auteur: string | null
          auteur_email: string | null
          created_at: string
          demandes_urgentes_closes: number
          id: string
          nouvelle_date: string
          nouvelle_session_id: string | null
          operation_id: string
          type_apprenant: string | null
        }
        Insert: {
          ancienne_date: string
          ancienne_session_id?: string | null
          apprenant_id: string
          apprenant_nom?: string | null
          apprenant_prenom?: string | null
          auteur?: string | null
          auteur_email?: string | null
          created_at?: string
          demandes_urgentes_closes?: number
          id?: string
          nouvelle_date: string
          nouvelle_session_id?: string | null
          operation_id: string
          type_apprenant?: string | null
        }
        Update: {
          ancienne_date?: string
          ancienne_session_id?: string | null
          apprenant_id?: string
          apprenant_nom?: string | null
          apprenant_prenom?: string | null
          auteur?: string | null
          auteur_email?: string | null
          created_at?: string
          demandes_urgentes_closes?: number
          id?: string
          nouvelle_date?: string
          nouvelle_session_id?: string | null
          operation_id?: string
          type_apprenant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "examen_theorique_decalages_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: false
            referencedRelation: "apprenants"
            referencedColumns: ["id"]
          },
        ]
      }
      examens_blancs_audit_log: {
        Row: {
          action: string
          ancienne_valeur: Json | null
          author_email: string | null
          author_user_id: string | null
          created_at: string
          exam_id: string
          filiere: string | null
          id: string
          matiere_id: string | null
          matiere_nom: string | null
          nouvelle_valeur: Json | null
          numero_examen: number | null
          question_id: string | null
        }
        Insert: {
          action: string
          ancienne_valeur?: Json | null
          author_email?: string | null
          author_user_id?: string | null
          created_at?: string
          exam_id: string
          filiere?: string | null
          id?: string
          matiere_id?: string | null
          matiere_nom?: string | null
          nouvelle_valeur?: Json | null
          numero_examen?: number | null
          question_id?: string | null
        }
        Update: {
          action?: string
          ancienne_valeur?: Json | null
          author_email?: string | null
          author_user_id?: string | null
          created_at?: string
          exam_id?: string
          filiere?: string | null
          id?: string
          matiere_id?: string | null
          matiere_nom?: string | null
          nouvelle_valeur?: Json | null
          numero_examen?: number | null
          question_id?: string | null
        }
        Relationships: []
      }
      facture_electronique_evenements: {
        Row: {
          created_at: string
          date_evenement: string
          facture_electronique_id: string
          id: string
          libelle: string | null
          raw: Json | null
          statut: string
        }
        Insert: {
          created_at?: string
          date_evenement?: string
          facture_electronique_id: string
          id?: string
          libelle?: string | null
          raw?: Json | null
          statut: string
        }
        Update: {
          created_at?: string
          date_evenement?: string
          facture_electronique_id?: string
          id?: string
          libelle?: string | null
          raw?: Json | null
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "facture_electronique_evenements_facture_electronique_id_fkey"
            columns: ["facture_electronique_id"]
            isOneToOne: false
            referencedRelation: "factures_electroniques"
            referencedColumns: ["id"]
          },
        ]
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
      factures_electroniques: {
        Row: {
          created_at: string
          date_echeance: string | null
          date_emission: string | null
          derniere_erreur: string | null
          devise: string
          environnement: string
          facture_id: string | null
          fichier_url: string | null
          format: string
          fournisseur_facture_id: string | null
          id: string
          montant_ht: number | null
          montant_ttc: number | null
          montant_tva: number | null
          numero: string | null
          partenaire_nom: string | null
          partenaire_siren: string | null
          pdp_document_id: string | null
          raw: Json | null
          sens: string
          statut: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_echeance?: string | null
          date_emission?: string | null
          derniere_erreur?: string | null
          devise?: string
          environnement?: string
          facture_id?: string | null
          fichier_url?: string | null
          format?: string
          fournisseur_facture_id?: string | null
          id?: string
          montant_ht?: number | null
          montant_ttc?: number | null
          montant_tva?: number | null
          numero?: string | null
          partenaire_nom?: string | null
          partenaire_siren?: string | null
          pdp_document_id?: string | null
          raw?: Json | null
          sens?: string
          statut?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_echeance?: string | null
          date_emission?: string | null
          derniere_erreur?: string | null
          devise?: string
          environnement?: string
          facture_id?: string | null
          fichier_url?: string | null
          format?: string
          fournisseur_facture_id?: string | null
          id?: string
          montant_ht?: number | null
          montant_ttc?: number | null
          montant_tva?: number | null
          numero?: string | null
          partenaire_nom?: string | null
          partenaire_siren?: string | null
          pdp_document_id?: string | null
          raw?: Json | null
          sens?: string
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factures_electroniques_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_electroniques_fournisseur_facture_id_fkey"
            columns: ["fournisseur_facture_id"]
            isOneToOne: false
            referencedRelation: "fournisseur_factures"
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
      incidents_examens_statut: {
        Row: {
          apprenant_id: string | null
          attempt_id: string | null
          code: string
          exam_id: string | null
          id: string
          incident_cle: string
          matiere: string | null
          note: string | null
          resolu: boolean
          resolu_le: string
          resolu_par: string | null
        }
        Insert: {
          apprenant_id?: string | null
          attempt_id?: string | null
          code: string
          exam_id?: string | null
          id?: string
          incident_cle: string
          matiere?: string | null
          note?: string | null
          resolu?: boolean
          resolu_le?: string
          resolu_par?: string | null
        }
        Update: {
          apprenant_id?: string | null
          attempt_id?: string | null
          code?: string
          exam_id?: string | null
          id?: string
          incident_cle?: string
          matiere?: string | null
          note?: string | null
          resolu?: boolean
          resolu_le?: string
          resolu_par?: string | null
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
      live_participants: {
        Row: {
          apprenant_id: string | null
          device_token: string
          display_name: string
          id: string
          joined_at: string
          last_seen_at: string
          live_session_id: string
          score: number
        }
        Insert: {
          apprenant_id?: string | null
          device_token: string
          display_name: string
          id?: string
          joined_at?: string
          last_seen_at?: string
          live_session_id: string
          score?: number
        }
        Update: {
          apprenant_id?: string | null
          device_token?: string
          display_name?: string
          id?: string
          joined_at?: string
          last_seen_at?: string
          live_session_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_participants_live_session_id_fkey"
            columns: ["live_session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_responses: {
        Row: {
          commentaire: string | null
          corrected_at: string | null
          corrected_by: string | null
          corrigee_manuellement: boolean
          created_at: string
          est_correcte: boolean | null
          id: string
          live_session_id: string
          participant_id: string
          points_max: number
          points_obtenus: number | null
          question_id: string
          question_index: number
          question_type: string
          reponse: string | null
          updated_at: string
        }
        Insert: {
          commentaire?: string | null
          corrected_at?: string | null
          corrected_by?: string | null
          corrigee_manuellement?: boolean
          created_at?: string
          est_correcte?: boolean | null
          id?: string
          live_session_id: string
          participant_id: string
          points_max?: number
          points_obtenus?: number | null
          question_id: string
          question_index?: number
          question_type?: string
          reponse?: string | null
          updated_at?: string
        }
        Update: {
          commentaire?: string | null
          corrected_at?: string | null
          corrected_by?: string | null
          corrigee_manuellement?: boolean
          created_at?: string
          est_correcte?: boolean | null
          id?: string
          live_session_id?: string
          participant_id?: string
          points_max?: number
          points_obtenus?: number | null
          question_id?: string
          question_index?: number
          question_type?: string
          reponse?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_responses_live_session_id_fkey"
            columns: ["live_session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_responses_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "live_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          current_index: number
          ended_at: string | null
          id: string
          masquer_noms: boolean
          questions_snapshot: Json
          reveal_results: boolean
          source_label: string | null
          source_quiz_id: string | null
          statut: string
          titre: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          current_index?: number
          ended_at?: string | null
          id?: string
          masquer_noms?: boolean
          questions_snapshot?: Json
          reveal_results?: boolean
          source_label?: string | null
          source_quiz_id?: string | null
          statut?: string
          titre?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          current_index?: number
          ended_at?: string | null
          id?: string
          masquer_noms?: boolean
          questions_snapshot?: Json
          reveal_results?: boolean
          source_label?: string | null
          source_quiz_id?: string | null
          statut?: string
          titre?: string
          updated_at?: string
        }
        Relationships: []
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
      onboarding_invitations: {
        Row: {
          apprenant_id: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          last_sent_at: string | null
          last_used_at: string | null
          revoked_at: string | null
          sent_count: number
          token_hash: string
        }
        Insert: {
          apprenant_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          last_sent_at?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
          sent_count?: number
          token_hash: string
        }
        Update: {
          apprenant_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          last_sent_at?: string | null
          last_used_at?: string | null
          revoked_at?: string | null
          sent_count?: number
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_invitations_apprenant_id_fkey"
            columns: ["apprenant_id"]
            isOneToOne: false
            referencedRelation: "apprenants"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_invite_rate_limit: {
        Row: {
          created_at: string
          id: string
          ip_hash: string
          kind: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash: string
          kind?: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string
          kind?: string
        }
        Relationships: []
      }
      onboarding_search_rate_limit: {
        Row: {
          attempts: number
          created_at: string
          id: string
          ip_hash: string
          window_start: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          ip_hash: string
          window_start?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          ip_hash?: string
          window_start?: string
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
      prestataire_dossiers: {
        Row: {
          adresse: string | null
          commentaire_interne: string | null
          created_at: string
          created_by: string | null
          date_paiement: string | null
          date_prestation: string | null
          derniere_action_le: string | null
          description_prestation: string | null
          email: string | null
          est_test: boolean
          facture_montant_ht: number | null
          facture_montant_ttc: number | null
          facture_numero: string | null
          facture_recue_le: string | null
          facture_tva: number | null
          id: string
          mode_paiement: string | null
          montant_ht: number | null
          montant_paye: number | null
          montant_ttc: number | null
          numero_commande: string | null
          periode_debut: string | null
          periode_fin: string | null
          prestataire_nom: string | null
          prestataire_prenom: string | null
          raison_sociale: string | null
          reference: string | null
          reference_paiement: string | null
          siren: string | null
          siret: string | null
          statut: string
          telephone: string | null
          tva: number | null
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          commentaire_interne?: string | null
          created_at?: string
          created_by?: string | null
          date_paiement?: string | null
          date_prestation?: string | null
          derniere_action_le?: string | null
          description_prestation?: string | null
          email?: string | null
          est_test?: boolean
          facture_montant_ht?: number | null
          facture_montant_ttc?: number | null
          facture_numero?: string | null
          facture_recue_le?: string | null
          facture_tva?: number | null
          id?: string
          mode_paiement?: string | null
          montant_ht?: number | null
          montant_paye?: number | null
          montant_ttc?: number | null
          numero_commande?: string | null
          periode_debut?: string | null
          periode_fin?: string | null
          prestataire_nom?: string | null
          prestataire_prenom?: string | null
          raison_sociale?: string | null
          reference?: string | null
          reference_paiement?: string | null
          siren?: string | null
          siret?: string | null
          statut?: string
          telephone?: string | null
          tva?: number | null
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          commentaire_interne?: string | null
          created_at?: string
          created_by?: string | null
          date_paiement?: string | null
          date_prestation?: string | null
          derniere_action_le?: string | null
          description_prestation?: string | null
          email?: string | null
          est_test?: boolean
          facture_montant_ht?: number | null
          facture_montant_ttc?: number | null
          facture_numero?: string | null
          facture_recue_le?: string | null
          facture_tva?: number | null
          id?: string
          mode_paiement?: string | null
          montant_ht?: number | null
          montant_paye?: number | null
          montant_ttc?: number | null
          numero_commande?: string | null
          periode_debut?: string | null
          periode_fin?: string | null
          prestataire_nom?: string | null
          prestataire_prenom?: string | null
          raison_sociale?: string | null
          reference?: string | null
          reference_paiement?: string | null
          siren?: string | null
          siret?: string | null
          statut?: string
          telephone?: string | null
          tva?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      prestataire_email_templates: {
        Row: {
          corps: string
          id: string
          objet: string
          updated_at: string
        }
        Insert: {
          corps?: string
          id: string
          objet?: string
          updated_at?: string
        }
        Update: {
          corps?: string
          id?: string
          objet?: string
          updated_at?: string
        }
        Relationships: []
      }
      prestataire_envois: {
        Row: {
          corps_html: string
          created_at: string
          declenche_par: string | null
          declenche_par_email: string | null
          destinataire_email: string
          destinataire_nom: string | null
          dossier_id: string
          envoye_le: string | null
          erreur: string | null
          id: string
          objet: string
          provider_message_id: string | null
          statut: string
          type_envoi: string
        }
        Insert: {
          corps_html: string
          created_at?: string
          declenche_par?: string | null
          declenche_par_email?: string | null
          destinataire_email: string
          destinataire_nom?: string | null
          dossier_id: string
          envoye_le?: string | null
          erreur?: string | null
          id?: string
          objet: string
          provider_message_id?: string | null
          statut?: string
          type_envoi?: string
        }
        Update: {
          corps_html?: string
          created_at?: string
          declenche_par?: string | null
          declenche_par_email?: string | null
          destinataire_email?: string
          destinataire_nom?: string | null
          dossier_id?: string
          envoye_le?: string | null
          erreur?: string | null
          id?: string
          objet?: string
          provider_message_id?: string | null
          statut?: string
          type_envoi?: string
        }
        Relationships: [
          {
            foreignKeyName: "prestataire_envois_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "prestataire_dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      prestataire_historique: {
        Row: {
          action: string
          created_at: string
          details: Json
          dossier_id: string
          id: string
          utilisateur: string | null
          utilisateur_email: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          dossier_id: string
          id?: string
          utilisateur?: string | null
          utilisateur_email?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          dossier_id?: string
          id?: string
          utilisateur?: string | null
          utilisateur_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prestataire_historique_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "prestataire_dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      prestataire_pieces: {
        Row: {
          chemin: string
          content_type: string | null
          created_at: string
          created_by: string | null
          dossier_id: string
          id: string
          nom_fichier: string | null
          taille: number | null
          titre: string | null
          type_piece: string
        }
        Insert: {
          chemin: string
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          dossier_id: string
          id?: string
          nom_fichier?: string | null
          taille?: number | null
          titre?: string | null
          type_piece?: string
        }
        Update: {
          chemin?: string
          content_type?: string | null
          created_at?: string
          created_by?: string | null
          dossier_id?: string
          id?: string
          nom_fichier?: string | null
          taille?: number | null
          titre?: string | null
          type_piece?: string
        }
        Relationships: [
          {
            foreignKeyName: "prestataire_pieces_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "prestataire_dossiers"
            referencedColumns: ["id"]
          },
        ]
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
      qrc_bareme_restaure: {
        Row: {
          bareme: number
          created_at: string
          mention: string
          nb_preuves: number
          preuves: Json
          qrc_instance_id: string
        }
        Insert: {
          bareme: number
          created_at?: string
          mention?: string
          nb_preuves: number
          preuves: Json
          qrc_instance_id: string
        }
        Update: {
          bareme?: number
          created_at?: string
          mention?: string
          nb_preuves?: number
          preuves?: Json
          qrc_instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qrc_bareme_restaure_qrc_instance_id_fkey"
            columns: ["qrc_instance_id"]
            isOneToOne: true
            referencedRelation: "qrc_instances_v2"
            referencedColumns: ["qrc_instance_id"]
          },
        ]
      }
      qrc_correction_events: {
        Row: {
          apprenant_id: string
          attempt_id: string
          commentaire: string | null
          correction_event_id: number
          corrige_email: string | null
          corrige_par: string | null
          created_at: string
          etat_nouveau: string
          etat_precedent: string | null
          note_nouvelle: number | null
          note_precedente: number | null
          operation_id: string | null
          qrc_instance_id: string
          question_id: string
        }
        Insert: {
          apprenant_id: string
          attempt_id: string
          commentaire?: string | null
          correction_event_id?: never
          corrige_email?: string | null
          corrige_par?: string | null
          created_at?: string
          etat_nouveau: string
          etat_precedent?: string | null
          note_nouvelle?: number | null
          note_precedente?: number | null
          operation_id?: string | null
          qrc_instance_id: string
          question_id: string
        }
        Update: {
          apprenant_id?: string
          attempt_id?: string
          commentaire?: string | null
          correction_event_id?: never
          corrige_email?: string | null
          corrige_par?: string | null
          created_at?: string
          etat_nouveau?: string
          etat_precedent?: string | null
          note_nouvelle?: number | null
          note_precedente?: number | null
          operation_id?: string | null
          qrc_instance_id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qrc_correction_events_qrc_instance_id_fkey"
            columns: ["qrc_instance_id"]
            isOneToOne: false
            referencedRelation: "qrc_instances_v2"
            referencedColumns: ["qrc_instance_id"]
          },
        ]
      }
      qrc_engine_flags: {
        Row: {
          created_at: string
          enabled: boolean
          note: string | null
          quiz_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          note?: string | null
          quiz_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          note?: string | null
          quiz_id?: string
        }
        Relationships: []
      }
      qrc_ia_config: {
        Row: {
          actif: boolean
          actif_depuis: string | null
          id: boolean
          modele: string
          pause_depuis: string | null
          pause_motif: string | null
          updated_at: string
          updated_by: string | null
          updated_email: string | null
        }
        Insert: {
          actif?: boolean
          actif_depuis?: string | null
          id?: boolean
          modele?: string
          pause_depuis?: string | null
          pause_motif?: string | null
          updated_at?: string
          updated_by?: string | null
          updated_email?: string | null
        }
        Update: {
          actif?: boolean
          actif_depuis?: string | null
          id?: boolean
          modele?: string
          pause_depuis?: string | null
          pause_motif?: string | null
          updated_at?: string
          updated_by?: string | null
          updated_email?: string | null
        }
        Relationships: []
      }
      qrc_ia_corrections: {
        Row: {
          apprenant_id: string
          attempt_id: string
          bareme: number | null
          cle_idempotence: string
          cout_estime: number | null
          created_at: string
          exam_id: string | null
          http_status: number | null
          id: string
          justification: string | null
          matiere: string | null
          modele: string | null
          motif: string | null
          note: number | null
          qrc_instance_id: string
          question_id: string
          reponse_hash: string
          statut: string
          termine_at: string | null
        }
        Insert: {
          apprenant_id: string
          attempt_id: string
          bareme?: number | null
          cle_idempotence: string
          cout_estime?: number | null
          created_at?: string
          exam_id?: string | null
          http_status?: number | null
          id?: string
          justification?: string | null
          matiere?: string | null
          modele?: string | null
          motif?: string | null
          note?: number | null
          qrc_instance_id: string
          question_id: string
          reponse_hash: string
          statut?: string
          termine_at?: string | null
        }
        Update: {
          apprenant_id?: string
          attempt_id?: string
          bareme?: number | null
          cle_idempotence?: string
          cout_estime?: number | null
          created_at?: string
          exam_id?: string | null
          http_status?: number | null
          id?: string
          justification?: string | null
          matiere?: string | null
          modele?: string | null
          motif?: string | null
          note?: number | null
          qrc_instance_id?: string
          question_id?: string
          reponse_hash?: string
          statut?: string
          termine_at?: string | null
        }
        Relationships: []
      }
      qrc_instances: {
        Row: {
          apprenant_id: string
          attempt_id: string
          commentaire: string | null
          corrected_at: string | null
          corrected_by: string | null
          created_at: string
          etat: Database["public"]["Enums"]["qrc_instance_etat"]
          id: string
          matiere_id: string
          points_max: number
          points_obtenus: number | null
          question_id: string
          quiz_id: string
          reponse_eleve: string
          updated_at: string
        }
        Insert: {
          apprenant_id: string
          attempt_id: string
          commentaire?: string | null
          corrected_at?: string | null
          corrected_by?: string | null
          created_at?: string
          etat?: Database["public"]["Enums"]["qrc_instance_etat"]
          id?: string
          matiere_id: string
          points_max?: number
          points_obtenus?: number | null
          question_id: string
          quiz_id: string
          reponse_eleve?: string
          updated_at?: string
        }
        Update: {
          apprenant_id?: string
          attempt_id?: string
          commentaire?: string | null
          corrected_at?: string | null
          corrected_by?: string | null
          created_at?: string
          etat?: Database["public"]["Enums"]["qrc_instance_etat"]
          id?: string
          matiere_id?: string
          points_max?: number
          points_obtenus?: number | null
          question_id?: string
          quiz_id?: string
          reponse_eleve?: string
          updated_at?: string
        }
        Relationships: []
      }
      qrc_instances_v2: {
        Row: {
          apprenant_id: string
          attempt_id: string
          corrige_at: string | null
          corrige_email: string | null
          corrige_par: string | null
          created_at: string
          etat: string
          note: number | null
          qrc_instance_id: string
          question_id: string
          reponse: Json | null
        }
        Insert: {
          apprenant_id: string
          attempt_id: string
          corrige_at?: string | null
          corrige_email?: string | null
          corrige_par?: string | null
          created_at?: string
          etat?: string
          note?: number | null
          qrc_instance_id?: string
          question_id: string
          reponse?: Json | null
        }
        Update: {
          apprenant_id?: string
          attempt_id?: string
          corrige_at?: string | null
          corrige_email?: string | null
          corrige_par?: string | null
          created_at?: string
          etat?: string
          note?: number | null
          qrc_instance_id?: string
          question_id?: string
          reponse?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "qrc_instances_v2_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts_v2"
            referencedColumns: ["attempt_id"]
          },
        ]
      }
      qrc_verification_demandes: {
        Row: {
          apprenant_id: string
          attempt_id: string
          created_at: string
          id: string
          note_finale: number | null
          note_ia: number | null
          qrc_instance_id: string
          question_id: string
          statut: string
          traitee_at: string | null
          traitee_email: string | null
          traitee_par: string | null
        }
        Insert: {
          apprenant_id: string
          attempt_id: string
          created_at?: string
          id?: string
          note_finale?: number | null
          note_ia?: number | null
          qrc_instance_id: string
          question_id: string
          statut?: string
          traitee_at?: string | null
          traitee_email?: string | null
          traitee_par?: string | null
        }
        Update: {
          apprenant_id?: string
          attempt_id?: string
          created_at?: string
          id?: string
          note_finale?: number | null
          note_ia?: number | null
          qrc_instance_id?: string
          question_id?: string
          statut?: string
          traitee_at?: string | null
          traitee_email?: string | null
          traitee_par?: string | null
        }
        Relationships: []
      }
      qualiopi_indicateurs_etat: {
        Row: {
          applicable: boolean
          commentaire_auditeur: string | null
          created_at: string
          date_verification: string | null
          id: string
          indicateur: number
          maj_annuelle: boolean
          points_vigilance: string | null
          remarques: string | null
          responsable: string | null
          script_auditeur: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          applicable?: boolean
          commentaire_auditeur?: string | null
          created_at?: string
          date_verification?: string | null
          id?: string
          indicateur: number
          maj_annuelle?: boolean
          points_vigilance?: string | null
          remarques?: string | null
          responsable?: string | null
          script_auditeur?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          applicable?: boolean
          commentaire_auditeur?: string | null
          created_at?: string
          date_verification?: string | null
          id?: string
          indicateur?: number
          maj_annuelle?: boolean
          points_vigilance?: string | null
          remarques?: string | null
          responsable?: string | null
          script_auditeur?: string | null
          statut?: string
          updated_at?: string
        }
        Relationships: []
      }
      qualiopi_preuve_liens: {
        Row: {
          created_at: string
          id: string
          indicateur: number
          justification: string | null
          preuve_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          indicateur: number
          justification?: string | null
          preuve_id: string
        }
        Update: {
          created_at?: string
          id?: string
          indicateur?: number
          justification?: string | null
          preuve_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qualiopi_preuve_liens_preuve_id_fkey"
            columns: ["preuve_id"]
            isOneToOne: false
            referencedRelation: "qualiopi_preuves"
            referencedColumns: ["id"]
          },
        ]
      }
      qualiopi_preuves: {
        Row: {
          archivee: boolean
          archivee_le: string | null
          ce_que_demontre: string | null
          created_at: string
          created_by: string | null
          date_preuve: string | null
          description: string | null
          emplacement: string | null
          fichiers: Json
          id: string
          lien_url: string | null
          ref_key: string | null
          remarque_interne: string | null
          remplace_preuve_id: string | null
          source_id: string | null
          source_libelle: string | null
          source_table: string | null
          source_type: string
          titre: string
          updated_at: string
          valide_au: string | null
          valide_du: string | null
        }
        Insert: {
          archivee?: boolean
          archivee_le?: string | null
          ce_que_demontre?: string | null
          created_at?: string
          created_by?: string | null
          date_preuve?: string | null
          description?: string | null
          emplacement?: string | null
          fichiers?: Json
          id?: string
          lien_url?: string | null
          ref_key?: string | null
          remarque_interne?: string | null
          remplace_preuve_id?: string | null
          source_id?: string | null
          source_libelle?: string | null
          source_table?: string | null
          source_type?: string
          titre: string
          updated_at?: string
          valide_au?: string | null
          valide_du?: string | null
        }
        Update: {
          archivee?: boolean
          archivee_le?: string | null
          ce_que_demontre?: string | null
          created_at?: string
          created_by?: string | null
          date_preuve?: string | null
          description?: string | null
          emplacement?: string | null
          fichiers?: Json
          id?: string
          lien_url?: string | null
          ref_key?: string | null
          remarque_interne?: string | null
          remplace_preuve_id?: string | null
          source_id?: string | null
          source_libelle?: string | null
          source_table?: string | null
          source_type?: string
          titre?: string
          updated_at?: string
          valide_au?: string | null
          valide_du?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qualiopi_preuves_remplace_preuve_id_fkey"
            columns: ["remplace_preuve_id"]
            isOneToOne: false
            referencedRelation: "qualiopi_preuves"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_question_bindings: {
        Row: {
          created_at: string
          exercise_id: number
          id: string
          module_id: number
          quiz_id: string
          section_id: number
        }
        Insert: {
          created_at?: string
          exercise_id: number
          id?: string
          module_id: number
          quiz_id: string
          section_id: number
        }
        Update: {
          created_at?: string
          exercise_id?: number
          id?: string
          module_id?: number
          quiz_id?: string
          section_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_question_bindings_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz_question_sets"
            referencedColumns: ["quiz_id"]
          },
        ]
      }
      quiz_question_migration_audit: {
        Row: {
          canonical_question_id: string | null
          content_fingerprint: string
          created_at: string
          id: string
          legacy_question_id: number
          quiz_id: string
          section_id: number
          source_kind: string
          source_reference: Json
          source_updated_at: string
          was_selected: boolean
        }
        Insert: {
          canonical_question_id?: string | null
          content_fingerprint: string
          created_at?: string
          id?: string
          legacy_question_id: number
          quiz_id: string
          section_id: number
          source_kind: string
          source_reference?: Json
          source_updated_at: string
          was_selected?: boolean
        }
        Update: {
          canonical_question_id?: string | null
          content_fingerprint?: string
          created_at?: string
          id?: string
          legacy_question_id?: number
          quiz_id?: string
          section_id?: number
          source_kind?: string
          source_reference?: Json
          source_updated_at?: string
          was_selected?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "quiz_question_migration_audit_canonical_question_id_fkey"
            columns: ["canonical_question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["question_id"]
          },
        ]
      }
      quiz_question_sets: {
        Row: {
          created_at: string
          label: string
          quiz_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          label: string
          quiz_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          label?: string
          quiz_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          active: boolean
          choix: Json
          created_at: string
          enonce: string
          explication: string | null
          image: string | null
          image_size: string | null
          legacy_question_id: number
          position: number
          question_id: string
          quiz_id: string
          section_id: number
          source: string
          updated_at: string
          updated_by_fournisseur_id: string | null
        }
        Insert: {
          active?: boolean
          choix?: Json
          created_at?: string
          enonce: string
          explication?: string | null
          image?: string | null
          image_size?: string | null
          legacy_question_id: number
          position?: number
          question_id?: string
          quiz_id: string
          section_id: number
          source?: string
          updated_at?: string
          updated_by_fournisseur_id?: string | null
        }
        Update: {
          active?: boolean
          choix?: Json
          created_at?: string
          enonce?: string
          explication?: string | null
          image?: string | null
          image_size?: string | null
          legacy_question_id?: number
          position?: number
          question_id?: string
          quiz_id?: string
          section_id?: number
          source?: string
          updated_at?: string
          updated_by_fournisseur_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quiz_question_sets"
            referencedColumns: ["quiz_id"]
          },
          {
            foreignKeyName: "quiz_questions_updated_by_fournisseur_id_fkey"
            columns: ["updated_by_fournisseur_id"]
            isOneToOne: false
            referencedRelation: "fournisseurs"
            referencedColumns: ["id"]
          },
        ]
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
          bonnes_reponses: number | null
          completed: boolean
          created_at: string
          exercice_id: string
          exercice_type: string
          id: string
          reponses: Json
          reponses_meta: Json
          score: number | null
          source_noyau: string | null
          status: string
          submitted_at: string | null
          tentative: number
          total_questions: number | null
          updated_at: string
          user_id: string
          write_seq: number
        }
        Insert: {
          apprenant_id: string
          bonnes_reponses?: number | null
          completed?: boolean
          created_at?: string
          exercice_id: string
          exercice_type?: string
          id?: string
          reponses?: Json
          reponses_meta?: Json
          score?: number | null
          source_noyau?: string | null
          status?: string
          submitted_at?: string | null
          tentative?: number
          total_questions?: number | null
          updated_at?: string
          user_id: string
          write_seq?: number
        }
        Update: {
          apprenant_id?: string
          bonnes_reponses?: number | null
          completed?: boolean
          created_at?: string
          exercice_id?: string
          exercice_type?: string
          id?: string
          reponses?: Json
          reponses_meta?: Json
          score?: number | null
          source_noyau?: string | null
          status?: string
          submitted_at?: string | null
          tentative?: number
          total_questions?: number | null
          updated_at?: string
          user_id?: string
          write_seq?: number
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
      reponses_apprenants_historique: {
        Row: {
          apprenant_id: string
          archived_at: string
          bonnes_reponses: number | null
          created_at: string
          exercice_id: string
          exercice_type: string
          id: string
          reponses: Json
          score: number | null
          status: string
          submitted_at: string | null
          tentative: number
          total_questions: number | null
          user_id: string | null
        }
        Insert: {
          apprenant_id: string
          archived_at?: string
          bonnes_reponses?: number | null
          created_at?: string
          exercice_id: string
          exercice_type: string
          id?: string
          reponses?: Json
          score?: number | null
          status?: string
          submitted_at?: string | null
          tentative?: number
          total_questions?: number | null
          user_id?: string | null
        }
        Update: {
          apprenant_id?: string
          archived_at?: string
          bonnes_reponses?: number | null
          created_at?: string
          exercice_id?: string
          exercice_type?: string
          id?: string
          reponses?: Json
          score?: number | null
          status?: string
          submitted_at?: string | null
          tentative?: number
          total_questions?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      reponses_apprenants_journal: {
        Row: {
          apprenant_id: string
          client_saved_at: string | null
          created_at: string
          event_id: string
          exercice_id: string
          exercice_type: string
          id: string
          module_id: number | null
          question_id: string
          tentative: number
          user_id: string | null
          valeur: Json
        }
        Insert: {
          apprenant_id: string
          client_saved_at?: string | null
          created_at?: string
          event_id?: string
          exercice_id: string
          exercice_type?: string
          id?: string
          module_id?: number | null
          question_id: string
          tentative?: number
          user_id?: string | null
          valeur?: Json
        }
        Update: {
          apprenant_id?: string
          client_saved_at?: string | null
          created_at?: string
          event_id?: string
          exercice_id?: string
          exercice_type?: string
          id?: string
          module_id?: number | null
          question_id?: string
          tentative?: number
          user_id?: string | null
          valeur?: Json
        }
        Relationships: []
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
      sms_envois: {
        Row: {
          created_at: string
          declencheur_email: string | null
          declencheur_type: string
          declencheur_user_id: string | null
          destinataire_hash: string | null
          destinataire_masque: string | null
          detail: string | null
          id: string
          nb_caracteres: number | null
          nb_destinataires: number
          ovh_ids: Json | null
          resultat: string
          type_sms: string | null
        }
        Insert: {
          created_at?: string
          declencheur_email?: string | null
          declencheur_type: string
          declencheur_user_id?: string | null
          destinataire_hash?: string | null
          destinataire_masque?: string | null
          detail?: string | null
          id?: string
          nb_caracteres?: number | null
          nb_destinataires?: number
          ovh_ids?: Json | null
          resultat: string
          type_sms?: string | null
        }
        Update: {
          created_at?: string
          declencheur_email?: string | null
          declencheur_type?: string
          declencheur_user_id?: string | null
          destinataire_hash?: string | null
          destinataire_masque?: string | null
          detail?: string | null
          id?: string
          nb_caracteres?: number | null
          nb_destinataires?: number
          ovh_ids?: Json | null
          resultat?: string
          type_sms?: string | null
        }
        Relationships: []
      }
      taches: {
        Row: {
          created_at: string
          cree_par: string | null
          description: string | null
          echeance: string | null
          id: string
          priorite: string
          terminee: boolean
          terminee_at: string | null
          terminee_par: string | null
          titre: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cree_par?: string | null
          description?: string | null
          echeance?: string | null
          id?: string
          priorite?: string
          terminee?: boolean
          terminee_at?: string | null
          terminee_par?: string | null
          titre: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cree_par?: string | null
          description?: string | null
          echeance?: string | null
          id?: string
          priorite?: string
          terminee?: boolean
          terminee_at?: string | null
          terminee_par?: string | null
          titre?: string
          updated_at?: string
        }
        Relationships: []
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
      bilan_reponse_statuts_effectifs: {
        Row: {
          apprenant_id: string | null
          cle: string | null
          created_at: string | null
          exercice_id: number | null
          id: string | null
          module_id: number | null
          reclasse: boolean | null
          reponse: Json | null
          statut: string | null
          statut_initial: string | null
          tentative: number | null
          uid: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_admin_canonical_quiz_actions: {
        Args: { p_actions: Json; p_module_id: number }
        Returns: {
          active: boolean
          choix: Json
          created_at: string
          enonce: string
          explication: string | null
          image: string | null
          image_size: string | null
          legacy_question_id: number
          position: number
          question_id: string
          quiz_id: string
          section_id: number
          source: string
          updated_at: string
          updated_by_fournisseur_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "quiz_questions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      apprenant_examen_blanc_en_cours: {
        Args: { _apprenant_id: string }
        Returns: boolean
      }
      autovalidate_module_if_complete: {
        Args: {
          _apprenant_id: string
          _module_id: number
          _total_questions: number
        }
        Returns: {
          answered: number
          total: number
          validated: boolean
        }[]
      }
      bilan_autoriser_nouvelle_tentative: {
        Args: {
          p_apprenant_id: string
          p_confirmation: string
          p_exercice_id: number
          p_module_id: number
          p_motif: string
        }
        Returns: {
          apprenant_id: string
          autorise_par: string | null
          created_at: string
          exercice_id: number
          id: string
          module_id: number
          motif: string
          tentative_autorisee: number
          tentative_source: number
        }
        SetofOptions: {
          from: "*"
          to: "bilan_nouvelle_tentative_autorisations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      bilan_corriger_snapshot: {
        Args: { p_reponses: Json; p_snapshot_id: string }
        Returns: Json
      }
      bilan_demarrer_passage: {
        Args: {
          p_apprenant_id: string
          p_exercice_id: number
          p_module_id: number
          p_operation_id?: string
          p_tentative: number
        }
        Returns: {
          apprenant_id: string
          bareme: Json | null
          created_at: string
          empreinte: string
          empreinte_source: string
          exercice_id: number
          filiere: string
          id: string
          matiere: string
          module_id: number
          nb_questions: number
          operation_id: string | null
          passage_cle: string
          questions: Json
          tentative: number
        }
        SetofOptions: {
          from: "*"
          to: "bilan_passage_snapshots"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      bilan_identite_creer: {
        Args: { p_exercice_id: number; p_module_id: number; p_question: Json }
        Returns: Json
      }
      bilan_ouvrir_passage_eleve: {
        Args: { p_exercice_id: number; p_module_id: number }
        Returns: Json
      }
      bilan_reponse_identite_valide: {
        Args: {
          p_cle_historique: string
          p_exercice_id: number
          p_module_id: number
          p_uid: string
        }
        Returns: boolean
      }
      bilan_snapshot_question_valide: {
        Args: { p_cle: string; p_snapshot_id: string }
        Returns: boolean
      }
      bilan_sync_champs: { Args: never; Returns: string[] }
      bilan_sync_empreinte: { Args: { q: Json }; Returns: string }
      bilan_sync_enregistrer: {
        Args: {
          p_cote_source: string
          p_empreinte_attendue: string
          p_lien_id: string
          p_motif?: string
          p_question: Json
        }
        Returns: Json
      }
      bilan_sync_mapping: { Args: never; Returns: Json }
      bilan_sync_payload: { Args: { q: Json }; Returns: Json }
      bilan_sync_router_editeur: {
        Args: {
          p_expected_updated_at: string
          p_module_data: Json
          p_module_id: number
        }
        Returns: Json
      }
      canonical_get_quiz_questions: {
        Args: { p_quiz_id: string }
        Returns: Json
      }
      canonical_start_exam_attempt: {
        Args: {
          p_apprenant_ref: string
          p_quiz_id: string
          p_tentative?: number
        }
        Returns: Json
      }
      canonical_update_question: {
        Args: {
          p_expected_version: number
          p_fields: Json
          p_origin?: string
          p_question_id: string
        }
        Returns: Json
      }
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
      confirmer_changement_mdp_effectue: { Args: never; Returns: boolean }
      core_admin_reset_exam: {
        Args: {
          p_admin_email?: string
          p_apprenant_id: string
          p_exam_id: string
          p_motif: string
          p_operation_id: string
        }
        Returns: {
          apprenant_id: string
          archived_attempt_ids: Json
          archived_core_result_ids: Json
          archived_legacy_result_ids: Json
          created_at: string
          created_by: string | null
          created_email: string | null
          cutoff_at: string
          exam_id: string
          motif: string
          operation_id: string
          reset_id: string
        }
        SetofOptions: {
          from: "*"
          to: "core_exam_resets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      core_assert_session_owner: {
        Args: { p_apprenant_id: string }
        Returns: undefined
      }
      core_bridge_actif: { Args: { p_is_test: boolean }; Returns: boolean }
      core_bridge_actif_pour: {
        Args: { p_apprenant_id: string }
        Returns: boolean
      }
      core_bridge_compte_test: {
        Args: { p_apprenant_id: string }
        Returns: boolean
      }
      core_correct_qrc: {
        Args: {
          p_commentaire?: string
          p_corrige_email?: string
          p_note: number
          p_operation_id: string
          p_qrc_instance_id: string
        }
        Returns: Json
      }
      core_correct_qrc_publish: {
        Args: {
          p_commentaire?: string
          p_corrige_email?: string
          p_note: number
          p_operation_id: string
          p_qrc_instance_id: string
        }
        Returns: Json
      }
      core_est_proprietaire: {
        Args: { p_apprenant_id: string }
        Returns: boolean
      }
      core_finalize_attempt: {
        Args: {
          p_attempt_id: string
          p_operation_id: string
          p_qrc_questions?: string[]
          p_resultat?: Json
        }
        Returns: Json
      }
      core_import_passage_finalise: {
        Args: { p_result_id: string }
        Returns: Json
      }
      core_import_passages_finalises: {
        Args: { p_exam_prefix?: string; p_limit?: number }
        Returns: Json
      }
      core_note_attempt: {
        Args: { p_attempt_id: string }
        Returns: {
          points_qcm: number
          points_qrc: number
          qrc_restantes: number
          score20: number
          total: number
        }[]
      }
      core_operation_replay: {
        Args: { p_operation_id: string; p_operation_type: string }
        Returns: Json
      }
      core_publish_exam_version: {
        Args: {
          p_operation_id: string
          p_published_email?: string
          p_version_id: string
        }
        Returns: Json
      }
      core_publish_version_contenu: {
        Args: {
          p_content: Json
          p_email?: string
          p_exam_id: string
          p_exam_numero: string
          p_filiere: string
          p_is_test?: boolean
          p_module_id: number
          p_operation_id: string
        }
        Returns: {
          content: Json
          created_at: string
          created_by: string | null
          created_email: string | null
          exam_id: string
          exam_numero: string
          filiere: string
          fingerprint: string
          id: string
          is_test: boolean
          module_id: number | null
          motif: string | null
          published_at: string | null
          published_by: string | null
          published_email: string | null
          retired_at: string | null
          statut: string
          version_number: number
        }
        SetofOptions: {
          from: "*"
          to: "exam_content_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      core_purge_donnees_test: { Args: never; Returns: Json }
      core_recalc_result: {
        Args: { p_attempt_id: string }
        Returns: {
          apprenant_id: string
          attempt_id: string
          published_at: string | null
          qrc_restantes: number
          result_id: string
          result_revision: number
          score: number | null
          status: string
          total: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "core_exam_results"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      core_restart_matiere: {
        Args: { p_attempt_id: string; p_motif?: string; p_operation_id: string }
        Returns: {
          apprenant_id: string
          attempt_id: string
          etat: string
          exam_id: string
          exam_version_id: string
          finished_at: string | null
          is_test: boolean
          snapshot: Json
          snapshot_fingerprint: string
          started_at: string
        }
        SetofOptions: {
          from: "*"
          to: "exam_attempts_v2"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      core_retirer_version_examen: {
        Args: { p_exam_id: string; p_motif?: string; p_operation_id: string }
        Returns: {
          content: Json
          created_at: string
          created_by: string | null
          created_email: string | null
          exam_id: string
          exam_numero: string
          filiere: string
          fingerprint: string
          id: string
          is_test: boolean
          module_id: number | null
          motif: string | null
          published_at: string | null
          published_by: string | null
          published_email: string | null
          retired_at: string | null
          statut: string
          version_number: number
        }
        SetofOptions: {
          from: "*"
          to: "exam_content_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      core_revise_qrc_publish: {
        Args: {
          p_commentaire?: string
          p_corrige_email?: string
          p_note: number
          p_note_attendue: number
          p_operation_id: string
          p_qrc_instance_id: string
        }
        Returns: Json
      }
      core_save_answer: {
        Args: {
          p_attempt_id: string
          p_expected_revision: number
          p_operation_id: string
          p_question_id: string
          p_session_origine?: string
          p_valeur: Json
        }
        Returns: Json
      }
      core_snapshot_has_question: {
        Args: { p_question_id: string; p_snapshot: Json }
        Returns: boolean
      }
      core_snapshot_question_ids: { Args: { p_node: Json }; Returns: string[] }
      core_start_attempt: {
        Args: {
          p_apprenant_id: string
          p_exam_id: string
          p_is_test?: boolean
          p_matiere: string
          p_operation_id: string
        }
        Returns: {
          apprenant_id: string
          attempt_id: string
          etat: string
          exam_id: string
          exam_version_id: string
          finished_at: string | null
          is_test: boolean
          snapshot: Json
          snapshot_fingerprint: string
          started_at: string
        }
        SetofOptions: {
          from: "*"
          to: "exam_attempts_v2"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      daitch_mokotoff: { Args: { "": string }; Returns: string[] }
      decaler_examen_theorique: {
        Args: {
          p_ancienne_date: string
          p_apprenant_id: string
          p_email?: string
          p_nouveau_lieu?: string
          p_nouvelle_date: string
          p_nouvelle_iso: string
          p_operation_id: string
        }
        Returns: {
          ancienne_date: string
          ancienne_session_id: string | null
          apprenant_id: string
          apprenant_nom: string | null
          apprenant_prenom: string | null
          auteur: string | null
          auteur_email: string | null
          created_at: string
          demandes_urgentes_closes: number
          id: string
          nouvelle_date: string
          nouvelle_session_id: string | null
          operation_id: string
          type_apprenant: string | null
        }
        SetofOptions: {
          from: "*"
          to: "examen_theorique_decalages"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      dmetaphone: { Args: { "": string }; Returns: string }
      dmetaphone_alt: { Args: { "": string }; Returns: string }
      enforce_apprenant_session_limits: {
        Args: never
        Returns: {
          closed_max_duration: number
          closed_no_response: number
        }[]
      }
      exam_editor_required_schema_version: { Args: never; Returns: string }
      exam_id_for_module: { Args: { _module_id: number }; Returns: string }
      exam_matiere_signature: { Args: { _matiere: Json }; Returns: string }
      exam_numero_from_id: { Args: { _exam_id: string }; Returns: number }
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
      get_canonical_quiz_questions: {
        Args: { p_fournisseur_token: string; p_quiz_id: string }
        Returns: {
          active: boolean
          choix: Json
          created_at: string
          enonce: string
          explication: string | null
          image: string | null
          image_size: string | null
          legacy_question_id: number
          position: number
          question_id: string
          quiz_id: string
          section_id: number
          source: string
          updated_at: string
          updated_by_fournisseur_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "quiz_questions"
          isOneToOne: false
          isSetofReturn: true
        }
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
      jsonb_as_array: { Args: { p: Json }; Returns: Json }
      live_correct_response: {
        Args: { _commentaire: string; _points: number; _response_id: string }
        Returns: {
          commentaire: string | null
          corrected_at: string | null
          corrected_by: string | null
          corrigee_manuellement: boolean
          created_at: string
          est_correcte: boolean | null
          id: string
          live_session_id: string
          participant_id: string
          points_max: number
          points_obtenus: number | null
          question_id: string
          question_index: number
          question_type: string
          reponse: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "live_responses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      live_join_session: {
        Args: { _code: string; _device_token: string; _display_name: string }
        Returns: {
          apprenant_id: string | null
          device_token: string
          display_name: string
          id: string
          joined_at: string
          last_seen_at: string
          live_session_id: string
          score: number
        }
        SetofOptions: {
          from: "*"
          to: "live_participants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      live_submit_response: {
        Args: {
          _device_token: string
          _est_correcte: boolean
          _participant_id: string
          _points_max: number
          _question_id: string
          _question_index: number
          _question_type: string
          _reponse: string
        }
        Returns: {
          commentaire: string | null
          corrected_at: string | null
          corrected_by: string | null
          corrigee_manuellement: boolean
          created_at: string
          est_correcte: boolean | null
          id: string
          live_session_id: string
          participant_id: string
          points_max: number
          points_obtenus: number | null
          question_id: string
          question_index: number
          question_type: string
          reponse: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "live_responses"
          isOneToOne: true
          isSetofReturn: false
        }
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
      mon_changement_mdp_requis: { Args: never; Returns: Json }
      persist_answer_batch: {
        Args: {
          p_apprenant_id: string
          p_completed: boolean
          p_events: Json
          p_exercice_id: string
          p_exercice_type: string
          p_module_id: number
          p_reponses: Json
          p_score: number
          p_updated_at: string
          p_user_id: string
        }
        Returns: {
          accepted_event_ids: string[]
          saved: boolean
          stored_reponses: Json
          stored_tentative: number
          stored_updated_at: string
        }[]
      }
      persist_answer_batch_v2: {
        Args: {
          p_apprenant_id: string
          p_base_seq: number
          p_completed: boolean
          p_events: Json
          p_exercice_id: string
          p_exercice_type: string
          p_module_id: number
          p_reponses: Json
          p_score: number
          p_user_id: string
        }
        Returns: {
          accepted_event_ids: string[]
          frozen: boolean
          saved: boolean
          skipped_questions: string[]
          stored_reponses: Json
          stored_tentative: number
          stored_updated_at: string
          stored_write_seq: number
        }[]
      }
      qrc_attempt_publication_state: {
        Args: { p_attempt_id: string }
        Returns: {
          corrigees: number
          en_attente: number
          publiable: boolean
          total: number
        }[]
      }
      qrc_demander_verification: {
        Args: { p_qrc_instance_id: string }
        Returns: Json
      }
      qrc_disable_engine: {
        Args: { p_quiz_id: string; p_reason?: string }
        Returns: boolean
      }
      qrc_engine_enabled: { Args: { _quiz_id: string }; Returns: boolean }
      qrc_ia_definir_actif: {
        Args: { p_actif: boolean; p_email?: string }
        Returns: Json
      }
      qrc_pilot_integrity: {
        Args: { p_quiz_id: string }
        Returns: {
          anomalie: boolean
          corrections_perdues: number
          corrigees: number
          doublons: number
          en_attente: number
          ids_crees: number
          manquantes: number
          passages: number
          qrc_repondues: number
        }[]
      }
      reset_quiz_attempt: {
        Args: { _apprenant_id: string; _exercice_id: string }
        Returns: {
          apprenant_id: string
          bonnes_reponses: number | null
          completed: boolean
          created_at: string
          exercice_id: string
          exercice_type: string
          id: string
          reponses: Json
          reponses_meta: Json
          score: number | null
          source_noyau: string | null
          status: string
          submitted_at: string | null
          tentative: number
          total_questions: number | null
          updated_at: string
          user_id: string
          write_seq: number
        }
        SetofOptions: {
          from: "*"
          to: "reponses_apprenants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_canonical_quiz_question: {
        Args: {
          p_active?: boolean
          p_choix: Json
          p_enonce: string
          p_explication?: string
          p_fournisseur_token: string
          p_image?: string
          p_image_size?: string
          p_legacy_question_id: number
          p_position: number
          p_quiz_id: string
          p_section_id: number
        }
        Returns: {
          active: boolean
          choix: Json
          created_at: string
          enonce: string
          explication: string | null
          image: string | null
          image_size: string | null
          legacy_question_id: number
          position: number
          question_id: string
          quiz_id: string
          section_id: number
          source: string
          updated_at: string
          updated_by_fournisseur_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "quiz_questions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_canonical_quiz_question_v2: {
        Args: {
          p_active?: boolean
          p_choix: Json
          p_enonce: string
          p_expected_updated_at?: string
          p_explication?: string
          p_fournisseur_token: string
          p_image?: string
          p_image_size?: string
          p_legacy_question_id: number
          p_position: number
          p_quiz_id: string
          p_section_id: number
        }
        Returns: {
          active: boolean
          choix: Json
          created_at: string
          enonce: string
          explication: string | null
          image: string | null
          image_size: string | null
          legacy_question_id: number
          position: number
          question_id: string
          quiz_id: string
          section_id: number
          source: string
          updated_at: string
          updated_by_fournisseur_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "quiz_questions"
          isOneToOne: true
          isSetofReturn: false
        }
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
          pages_completees: Json
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
      save_module_pages_progress: {
        Args: {
          _apprenant_id: string
          _module_id: number
          _pages: Json
          _progress?: number
        }
        Returns: {
          apprenant_id: string
          completed_at: string
          created_at: string
          details: Json | null
          id: string
          module_id: number
          pages_completees: Json
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
      shared_exercice_key: { Args: { e: Json }; Returns: string }
      shared_exercice_strict_key: { Args: { e: Json }; Returns: string }
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
      start_or_get_exam_timer:
        | {
            Args: {
              _apprenant_id: string
              _duree_secondes: number
              _exercice_id: string
            }
            Returns: {
              duree_secondes: number
              remaining_seconds: number
              server_now: string
              started_at: string
            }[]
          }
        | {
            Args: {
              _apprenant_id: string
              _duree_secondes: number
              _exercice_id: string
              _tentative: number
            }
            Returns: {
              duree_secondes: number
              remaining_seconds: number
              server_now: string
              started_at: string
            }[]
          }
      submit_quiz_attempt: {
        Args: {
          _apprenant_id: string
          _bonnes_reponses?: number
          _exercice_id: string
          _exercice_type: string
          _reponses: Json
          _score?: number
          _total_questions?: number
        }
        Returns: {
          apprenant_id: string
          bonnes_reponses: number | null
          completed: boolean
          created_at: string
          exercice_id: string
          exercice_type: string
          id: string
          reponses: Json
          reponses_meta: Json
          score: number | null
          source_noyau: string | null
          status: string
          submitted_at: string | null
          tentative: number
          total_questions: number | null
          updated_at: string
          user_id: string
          write_seq: number
        }
        SetofOptions: {
          from: "*"
          to: "reponses_apprenants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      surveillance_compte_reponses: {
        Args: { p_attempt_ids: string[] }
        Returns: {
          attempt_id: string
          nb_reponses: number
        }[]
      }
      surveillance_compte_reponses_service: {
        Args: { p_attempt_ids: string[] }
        Returns: {
          attempt_id: string
          nb_reponses: number
        }[]
      }
      sync_admin_canonical_quiz_questions: {
        Args: { p_exercises: Json; p_module_id: number }
        Returns: undefined
      }
      sync_bilan_from_cours: {
        Args: {
          _dst_module: number
          _log_removed?: boolean
          _src_module: number
        }
        Returns: number
      }
      text_soundex: { Args: { "": string }; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
      update_own_apprenant_coordonnees: {
        Args: {
          _adresse: string
          _apprenant_id: string
          _code_postal: string
          _email: string
          _telephone: string
          _ville: string
        }
        Returns: {
          abandonnee: boolean
          adresse: string | null
          auth_user_id: string | null
          b2_vierge: boolean | null
          civilite: string | null
          code_postal: string | null
          created_at: string
          creneau_horaire: string | null
          date_abandon: string | null
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
          emails_bloques: boolean
          facture_contact_email: string | null
          facture_contact_nom: string | null
          facture_contact_telephone: string | null
          formation_choisie: string | null
          frais_examen: string | null
          heure_examen_pratique: string | null
          heures_elearning: number | null
          heures_pratique: number | null
          heures_presentiel: number | null
          heures_totales: number | null
          id: string
          inscrit_france_travail: boolean | null
          lieu_examen: string | null
          modalite_formation: string | null
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
          statut_suivi: string | null
          telephone: string | null
          type_apprenant: string | null
          type_examen: string | null
          updated_at: string
          ville: string | null
        }
        SetofOptions: {
          from: "*"
          to: "apprenants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_qrc_instances: {
        Args: {
          p_apprenant_id: string
          p_attempt_id: string
          p_items: Json
          p_matiere_id: string
          p_quiz_id: string
        }
        Returns: {
          apprenant_id: string
          attempt_id: string
          commentaire: string | null
          corrected_at: string | null
          corrected_by: string | null
          created_at: string
          etat: Database["public"]["Enums"]["qrc_instance_etat"]
          id: string
          matiere_id: string
          points_max: number
          points_obtenus: number | null
          question_id: string
          quiz_id: string
          reponse_eleve: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "qrc_instances"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      validate_qrc_instance: {
        Args: { p_commentaire: string; p_instance_id: string; p_points: number }
        Returns: {
          apprenant_id: string
          attempt_id: string
          commentaire: string | null
          corrected_at: string | null
          corrected_by: string | null
          created_at: string
          etat: Database["public"]["Enums"]["qrc_instance_etat"]
          id: string
          matiere_id: string
          points_max: number
          points_obtenus: number | null
          question_id: string
          quiz_id: string
          reponse_eleve: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "qrc_instances"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      qrc_instance_etat: "en_attente" | "corrigee"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      qrc_instance_etat: ["en_attente", "corrigee"],
    },
  },
} as const
