-- Retour arrière du commentaire seul QRC (10/11/2026).
-- Retire uniquement les trois nouvelles fonctions. Les commentaires déjà enregistrés restent dans les
-- journaux append-only (même note) et restent lisibles par les écrans existants ; aucune donnée supprimée.
DROP FUNCTION IF EXISTS public.core_commenter_qrc(uuid, uuid, numeric, bigint, text, text);
DROP FUNCTION IF EXISTS public.qrc_historique_commenter(text, uuid, text, numeric, integer, text);
DROP FUNCTION IF EXISTS public.qrc_historique_commentaires_eleve(uuid[]);
