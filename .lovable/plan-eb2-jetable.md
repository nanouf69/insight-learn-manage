# EB2 — préparation isolée autorisée

- Garder l’application active et le commutateur serveur inchangés.
- Conserver le SQL candidat et la copie du composant corrigé exclusivement dans les fichiers de test, hors historique des migrations.
- Exécuter sur un PostgreSQL créé sous /tmp avec connexion explicite locale et sans variables de connexion héritées : atomicité, concurrence, reprise, unicité et refus sécurisé.
- Tester la copie de révision : chargement write_seq, changement d’appareil, Terminer, rechargement et QRC sans mots-clés, avec transports fictifs uniquement.
- Fournir les fichiers, preuves, résultats et limites ; aucune application réelle ni publication.

## Technique
Le candidat existant du 08/11 servira de référence, sans modification. Le nouveau candidat regroupera la clôture et le résultat dans la même transaction ; les historiques ambigus resteront refusés. La compatibilité avec tous les déclencheurs hébergés restera à valider avant une future activation.