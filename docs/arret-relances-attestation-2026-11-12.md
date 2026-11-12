# Arrêt des relances après le lien de signature

Statut : préparé et testé, non déployé. Aucun envoi ni changement de données réelles.

La garde partagée lit `documents_a_signer` par apprenant et modèle `attestation_fin_formation`, sans cache et avec pagination, immédiatement avant le transport des relances. Un envoi enregistré (date, statut envoyé/signé), en cours ou indéterminé suspend les relances. Une attestation préparée seule ne les suspend pas. Un document révoqué conserve la preuve d'envoi et donc la suspension. Une erreur de lecture refuse l'envoi. Les anciens scripts nominatifs exigent une correspondance unique de l'adresse, jamais du nom.

Couverture : onze fonctions `relance-*`, deux anciens `send-relance-*`, mode relance de `auto-send-pratique-booking`. Aucun blocage global `emails_bloques`, aucune modification des signatures, modules, heures, réponses ou notes. Aucun changement du circuit d'authentification ou d'envoi du premier lien de signature.

Vérifications exécutées : 12 tests de garde + 8 relances pédagogiques + 10 circuit attestation = 30 PASS ; Deno check des 15 fichiers PASS ; build observé OK. Catalogue réel des sept champs requis confirmé par SELECT. Aucun appel réel aux fonctions d'envoi.

Limite : un mail de relance déjà accepté par le transport avant l'envoi d'attestation ne peut pas être rappelé. La lecture pré-transport n'est pas un verrou transactionnel entre deux services d'envoi concurrents. Les messages manuels saisis librement dans la messagerie ne sont pas classés automatiquement comme relances. Déploiement ciblé et contrôle hébergé restent à autoriser ; aucune publication globale.