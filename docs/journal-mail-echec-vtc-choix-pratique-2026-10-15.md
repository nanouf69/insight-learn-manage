# 15/10/2026 — Mail échec théorique VTC + choix entraînement pratique
- Mail unique (ancien repassage réécrit + bloc pratique fourni + bouton « Choisir et signer »), VTC en échec seulement ; ancien mail de repassage conservé pour TAXI/TA.
- Envoi : Examens → carte « Non réussi » → bouton dédié, sélection manuelle, aperçu complet, envoi via la messagerie existante (archivée).
- Ajouts en base : colonnes nullables sur documents_a_signer + trigger d'immuabilité (aucune donnée existante modifiée).
- Tests : 20 fictifs PASS ; typecheck OK. Fonction serveur de signature modifiée, NON déployée ; non publié ; aucun mail envoyé.
- 15/10 21:21 : périmètre étendu à TAXI et passerelle TAXI (texte adapté à la filière, filière inconnue = préparation bloquée) ; 22 tests PASS.
