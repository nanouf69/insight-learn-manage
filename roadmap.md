# Roadmap

- [x] Corriger la date de début selon la première connexion pédagogique réelle.
- [x] Réserver le libellé pratique aux inscriptions ou réservations pratiques réelles.
- [x] Vérifier Aba-Bakre BENJELLOUN dans l’interface : début le 04/09/2026, aucune fausse pratique.
- [x] Auditer les autres apprenants en lecture seule : 94 dossiers protégés contre les faux libellés pratique.
- [x] Remplacer les neuf autres supports Connaissances de la ville TAXI fournis.
- [x] Contrôler visuellement toutes les pages des neuf nouveaux PDF.
- [x] Actualiser les liens du module 7 sans toucher aux données apprenants.
- [ ] Auditer le rattachement des réponses historiques aux questions actuellement affichées sur plusieurs apprenants et anciens quiz.
- [ ] Corriger uniquement l’affichage des réponses historiques sans modifier réponses, scores, tentatives, progressions, jalons ni historiques.
- [ ] Vérifier réellement plusieurs tentatives terminées dans l’espace apprenant sur ordinateur et mobile.
- [x] Comparer réellement un même quiz de Komi HOMAWOO entre Admin, base et espace apprenant, question par question.
- [x] Corriger la source générale qui fournit une ancienne version lors d’une nouvelle tentative, sans modifier l’historique apprenant.
- [ ] Vérifier nouvelle tentative, actualisation, reconnexion et plusieurs autres apprenants.

- [x] Unifier la sauvegarde durable de toutes les réponses de quiz, bilans et examens blancs.
- [x] Bloquer toute finalisation tant que les réponses de la tentative ne sont pas confirmées en base.
- [x] Garantir la reprise hors-ligne après actualisation, fermeture, reconnexion et changement de session.
- [x] Ajouter l’idempotence et le rattachement stable apprenant/tentative/quiz/question côté base.
- [x] Tester coupure réseau, reprise, déduplication et finalisation sur examens blancs et quiz modules.

- [x] Rendre la reprise des examens blancs compatible avec les identifiants historiques et actuels, sans migration de données.
- [x] Faire primer toute réponse non vide sur une ligne vide compatible du même passage.
- [x] Reprendre le passage incomplet depuis les réponses, résultats, tentative et dernière activité.
- [x] Exiger la finalisation réelle de toutes les matières avant d’afficher « Refaire l’examen ».
- [x] Tester F5, déconnexion, fermeture, retour et coupure réseau sans aucune modification pédagogique.
- [x] Produire les audits en lecture seule des passages multiples et des zéros suspects.
- [x] Verrouiller atomiquement tous les résultats d’Examens Blancs jusqu’à la dernière QRC validée.
- [x] Masquer notes, bilans, statuts, révisions et statistiques provisoires sur toutes les vues.
- [x] Tester 0 QRC, correction partielle, dernière validation, F5 et reconnexion sans écriture apprenant.
- [x] Aligner toutes les listes et tous les compteurs Correction QRC sur le filtre Tentative sélectionné.
- [x] Contrôler que toute QRC du jour réellement bloquante existe dans la file QRC bloquantes avec la même identité stable.

- [x] Nouveau moteur QRC : 1 QRC = 1 identifiant unique et immuable (table qrc_instances, contrainte d'unicité, états EN_ATTENTE/CORRIGÉE).
- [x] Écriture idempotente serveur (upsert_qrc_instances) et validation formateur réservée aux admins (validate_qrc_instance).
- [x] Source unique pour la file de correction et le blocage de note (qrc_attempt_publication_state).
- [x] Tests sur examen blanc de test EB-TEST-QRC : 10 IDs, double envoi, F5, correction 1 → 9 → 0, nouvelle tentative = 10 nouveaux IDs.
- [x] Brancher l'interface Correction QRC et le portail apprenant sur qrc_instances — UNIQUEMENT sur l'examen de test EB-TEST-QRC (drapeau par examen conservé pour un déploiement progressif).
- [x] Test 20 QRC sur l'examen de test : 20 identifiants, renvois multiples, correction 20 → 0, note bloquée puis publiable, nouvelle tentative indépendante.
- [ ] Migration éventuelle de l'historique QRC (interdite sans accord explicite).
