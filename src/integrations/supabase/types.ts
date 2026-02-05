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
    PostgrestVersion: "14.1"
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
      apprenants: {
        Row: {
          adresse: string | null
          civilite: string | null
          code_postal: string | null
          created_at: string
          creneau_horaire: string | null
          date_debut_formation: string | null
          date_examen_theorique: string | null
          date_fin_formation: string | null
          date_formation_catalogue: string | null
          date_naissance: string | null
          email: string | null
          formation_choisie: string | null
          id: string
          mode_financement: string | null
          montant_ttc: number | null
          nom: string
          numero_dossier_cma: string | null
          organisme_financeur: string | null
          prenom: string
          statut: string | null
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
          date_debut_formation?: string | null
          date_examen_theorique?: string | null
          date_fin_formation?: string | null
          date_formation_catalogue?: string | null
          date_naissance?: string | null
          email?: string | null
          formation_choisie?: string | null
          id?: string
          mode_financement?: string | null
          montant_ttc?: number | null
          nom: string
          numero_dossier_cma?: string | null
          organisme_financeur?: string | null
          prenom: string
          statut?: string | null
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
          date_debut_formation?: string | null
          date_examen_theorique?: string | null
          date_fin_formation?: string | null
          date_formation_catalogue?: string | null
          date_naissance?: string | null
          email?: string | null
          formation_choisie?: string | null
          id?: string
          mode_financement?: string | null
          montant_ttc?: number | null
          nom?: string
          numero_dossier_cma?: string | null
          organisme_financeur?: string | null
          prenom?: string
          statut?: string | null
          telephone?: string | null
          type_apprenant?: string | null
          updated_at?: string
          ville?: string | null
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
      formateurs: {
        Row: {
          adresse: string | null
          civilite: string | null
          code_postal: string | null
          created_at: string
          email: string | null
          id: string
          nom: string
          numero_tva: string | null
          prenom: string
          siren: string | null
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
          civilite?: string | null
          code_postal?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nom: string
          numero_tva?: string | null
          prenom: string
          siren?: string | null
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
          civilite?: string | null
          code_postal?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nom?: string
          numero_tva?: string | null
          prenom?: string
          siren?: string | null
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
          siret: string | null
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
          siret?: string | null
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
          siret?: string | null
          telephone?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      session_apprenants: {
        Row: {
          apprenant_id: string
          created_at: string
          date_debut: string | null
          date_fin: string | null
          id: string
          mode_financement: string | null
          session_id: string
        }
        Insert: {
          apprenant_id: string
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          id?: string
          mode_financement?: string | null
          session_id: string
        }
        Update: {
          apprenant_id?: string
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          id?: string
          mode_financement?: string | null
          session_id?: string
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
          session_id: string
        }
        Insert: {
          created_at?: string
          formateur_id: string
          heures_effectuees?: number | null
          id?: string
          session_id: string
        }
        Update: {
          created_at?: string
          formateur_id?: string
          heures_effectuees?: number | null
          id?: string
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
          id: string
          lieu: string | null
          nom: string | null
          places_disponibles: number | null
          statut: string | null
          types_apprenant: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          creneaux?: string[] | null
          date_debut: string
          date_fin: string
          formation_id?: string | null
          id?: string
          lieu?: string | null
          nom?: string | null
          places_disponibles?: number | null
          statut?: string | null
          types_apprenant?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          creneaux?: string[] | null
          date_debut?: string
          date_fin?: string
          formation_id?: string | null
          id?: string
          lieu?: string | null
          nom?: string | null
          places_disponibles?: number | null
          statut?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
