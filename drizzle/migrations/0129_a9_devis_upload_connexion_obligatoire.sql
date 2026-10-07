-- 07/10/2026 (A9, accord explicite) : plus aucun envoi de fichier sans connexion dans « devis ».
-- Les fichiers existants ne sont pas touchés. La signature publique passe par la fonction
-- serveur upload-devis-signe (droits serveur), les admins gardent leur propre règle.
DROP POLICY IF EXISTS "Public can upload signed devis" ON storage.objects;