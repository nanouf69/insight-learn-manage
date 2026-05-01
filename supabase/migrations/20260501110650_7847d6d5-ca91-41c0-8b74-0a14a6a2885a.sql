-- Détacher le mauvais lien sur l'apprenant GUENICHI NAOUFAL
-- Ce lien pointait vers le compte de tounsisoumia83@gmail.com par erreur
UPDATE public.apprenants
SET auth_user_id = NULL
WHERE id = 'f13c868c-1d14-4ac9-9cb0-66a25c100377'
  AND auth_user_id = 'b0897e8a-b509-4a92-b5a2-4076a9087577';