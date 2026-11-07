-- BROUILLON UNIQUEMENT — NE PAS APPLIQUER, aucun backfill des réponses anciennes.
-- Prérequis structurel seulement, PAS une activation du codec.
-- Une version par question est indispensable : les lots mélangent anciens et nouveaux textes.
ALTER TABLE public.reponses_apprenants
  ADD COLUMN IF NOT EXISTS encodages_par_question jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.reponses_apprenants_journal
  ADD COLUMN IF NOT EXISTS transport_encodage text DEFAULT NULL;
ALTER TABLE public.answer_state
  ADD COLUMN IF NOT EXISTS transport_encodage text DEFAULT NULL;
ALTER TABLE public.answer_events
  ADD COLUMN IF NOT EXISTS transport_encodage text DEFAULT NULL;
ALTER TABLE public.answer_state_historique
  ADD COLUMN IF NOT EXISTS transport_encodage text DEFAULT NULL;
ALTER TABLE public.qrc_instances_v2
  ADD COLUMN IF NOT EXISTS transport_encodage text DEFAULT NULL;
-- Ne jamais inférer une version depuis les caractères du texte ou depuis le lot.
-- BLOQUÉ : contrats RPC atomiques (valeur + version + seq + événements), CAS et ACK
-- exact de la valeur relue, refus des versions inconnues, projection QRC/historiques,
-- lecteurs UI/admin/IA/export et corrections manuelles doivent TOUS être adaptés/testés.
-- Le prototype Python ajoute ses colonnes uniquement sur PostgreSQL jetable.
-- Ne pas activer frontend/edge/V2 sur ces seules colonnes : ils restent non codés.
-- Aucun changement aux règles pédagogiques, notes, réponses ou anciens contenus.