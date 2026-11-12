# Notes par session — chargement visible

Préparé en aperçu, aucune publication ni mutation de données.

- Barre visible dès la sélection et durant les relectures : Chargement des candidats → Récupération des notes → Préparation du tableau.
- Pendant la récupération des publications/preuves, total inconnu : barre indéterminée, aucun pourcentage inventé. Compteur candidats/tableau uniquement lorsque les éléments ont réellement été lus/préparés. Aucun compte à rebours : temps écoulé local et « Temps restant indisponible ».
- Les candidats sont exposés dès leur lecture, puis les notes calculées avant le dernier rattachement des liens. Les notes déjà confirmées restent visibles lors d’une actualisation ou d’une erreur ; filtres conservés.
- Succès : barre retirée. Échec/timeout de 60 s : erreur et Réessayer. Changement de session : attente annulée, anciens retours/callbacks ignorés ; contrôles entre étapes pour arrêter les lectures suivantes. Les requêtes partagées déjà en vol ne sont pas toutes physiquement interrompues, mais ne peuvent plus mettre à jour l’écran.
- Horloge d’affichage uniquement, aucun polling de données ajouté. Les transports partagés et calculs de notes restent inchangés.

Tests : 15 Vitest PASS (4 fichiers), dont timeout, étapes, compteur, partiel, réseau, ancienne réponse, filtres et actualisation. Les deux anciennes assertions de liste d’arguments ont été adaptées au paramètre de suivi optionnel, sans modifier leurs scénarios. Chromium 1280×1800 et 390×844 : journée/soirée/vide, lenteur 1,2 s par étape, compteur réel 2/5, candidats visibles, erreur/réessai et changement rapide ; aucune erreur JS, captures inspectées sans chevauchement. Build OK.

Limite : tests navigateur sur données fictives uniquement ; temps réel d’une session authentifiée non vérifié. Aucun chiffre de durée estimée promis, aucune donnée réelle modifiée.