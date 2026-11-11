# Sessions indépendantes du catalogue QRC — 11 novembre 2026

Correctif complémentaire du timeout, frontend uniquement. Aucune migration, modification de notes ou publication.

## Preuves exécutées
- PASS : session administrateur réelle, référentiel 103 sessions en 458 ms ; contrôle admin existant et lectures sous droits du compte.
- PASS : session « VTC et TAXI - Du 2 au 13 novembre 2026 », catalogue ciblé + notes EB1 en 7,53 s : 68 copies V2, 157 QRC ; zéro requête de copies non filtrée.
- PASS : écran réel, erreur 57014 injectée uniquement pour le catalogue global : 107 options restent sélectionnables (103 sessions, 3 groupes spéciaux, option globale).
- PASS : sélection de cette session après l'erreur : 11 examens, zéro erreur de lecture ; Toutes les notes affiche 157 cellules. Le mode À corriger reste vide lorsque les notes sont déjà enregistrées.
- PASS : 46 tests Vitest (navigation et vrais lecteurs avec fixtures), dont filtrage serveur par apprenants et exclusion de la session voisine.
- PASS : compilation de l'aperçu.

## Fonctionnement et limites
Les choix CRM chargent uniquement id, nom et dates. Les copies lourdes passent par les curseurs PK de 100, filtrés par lots de 100 apprenants réellement inscrits. Le rattachement partagé existant vérifie ensuite toutes leurs inscriptions et dates ; les inscriptions croisées restent explicites. Les historiques et preuves miroirs restent inchangés.

Le catalogue global et les groupes spéciaux sont toujours disponibles à la demande ; leur chargement peut encore être long. L'avertissement global reste visible après une lecture ciblée réussie. Les URL, tentatives et droits de correction sont conservés ; les erreurs ne deviennent pas un faux résultat vide.

Captures locales de vérification : `/tmp/browser/qrc-sessions/global-timeout.png`, `/tmp/browser/qrc-sessions/session-loaded.png`. Aucune note enregistrée pendant ces contrôles.