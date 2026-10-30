# IA immédiate des entraînements QRC TAXI — 30 octobre 2026

## Livré et statut
- Nouvelle fonction `qrc-taxi-ia` active dans Cloud, indépendante du circuit officiel. Interface des deux quiz préparée dans l'aperçu, **non publiée**.
- À validation explicite : sauvegarde locale conservée, « Correction en cours », correction sémantique et explication sur1 point, puis bouton Question suivante. Résultats gardés séparément par compte/quiz/version/question/réponse.
- QCM, QCM locaux TA, cases et communes restent automatiques exacts sans IA ; aucun ajout d’IA pour communes nécessaire.
- Références serveur identiques aux39 questions sources. Pas de changement d’énoncé/corrigé, ni du Contrôle13, des fiches, de H ou des examens.
- Q5/Q6/Q13 : avertissements préexistants conservés ; résultat à arbitrer sans note définitive, aucun appel IA pour certifier une référence litigieuse.

## Sécurité/coûts
- Authentification côté serveur ; admin dans user_roles, apprenant via auth_user_id, accès aux modules11/28 et dates réelles, dossiers archivés exclus. Aucun rôle venant du navigateur.
- Tables nouvelles privées seulement (`qrc_taxi_ia_receipts`, `qrc_taxi_ia_gate`), droits service uniquement ; aucune écriture sur notes/réponses/progression historiques. Identités SHA256 par compte+quiz+version+question+empreinte de réponse ; aucune réponse brute dans la table.
- Limites approuvées :60/heure et200/jour cumulées sur deux quiz, fenêtres glissantes, une active par compte. Relecture de reçu sans nouvel appel IA. Le reçu d’une question litigieuse consomme une réservation mais pas un appel IA.
- SDK Responses, modèle par défaut, raisonnement léger, schéma strict ; clé uniquement serveur. Jamais de retry SDK automatique ;429/5xx terminés seulement peuvent être retentés explicitement après attente (maximum3 appels, reçus distincts). Réseau inconnu, refus,400/401/402/403/404 et erreur de schéma : pas de replay aveugle. Pause persistante après402/403, à lever uniquement après réparation/accord propriétaire.
- Flux NDJSON et battement5s pour maintenir la connexion ; pas de délai programmé de correction ni file d’attente. Échec technique sans score zéro fabriqué.
- Journaux de panne : identifiant reçu, code, run-id et succès d’enregistrement ; pas de réponse/nom/token. Explication pédagogique conservée dans le reçu ; le modèle n’a accès à aucun dossier, seulement à la réponse libre et sa référence.

## Preuves exécutées
-39/39 tests Vitest PASS :9 nouveaux transport/identité/résultat/erreur réseau/changement compte/persistance +22 quiz existants +3 alertes +5 Contrôle.
- PostgreSQL jetable :8 groupes PASS (double clic concurrent, isolation et une active, relecture sans consommation, inconnu non rejoué, limites60 et200, backoff/3 reprises append-only, permissions serveur). Pas de test de limites sur un vrai élève.
- Vérification Deno du nouvel endpoint PASS ; contrôle automatique frontend build OK10:15:48Z après correction des deux erreurs TypeScript détectées.
- IA réelle compte enregistré dans comptes_test_techniques : QRC2 complet « Une carte pro à jour, être médicalement apte, et un permis qui a fini sa période probatoire. » =1/1 ; QRC21 spécialités « Le maire de la commune ou le prefet de police. » =1/1. Réponse hors sujet QRC2 =0/1. Trois succès HTTP200 Gateway, durées3,3–3,9s, coûts unitaires observés0,0196–0,02596 crédits (non garantie future).
- Composants réellement utilisés montés dans le navigateur sur localhost avec session du compte technique : choixQCM→QRC→saisie→validation→résultat1/1 pour spécialités PC/mobile et complet mobile. Captures /tmp/browser/qrc-ai/. Pas de dépassement horizontal390px ni erreur console. Réutilisation des mêmes réponses renvoie les reçus sans nouvel appel IA.
- Comparaison quizData avec copie avant audit strictement identique ; test JSON serveur équivalent aux données importées.

## Limites NON PROUVÉES
- Navigation complète dans le portail par les étapes8TAXI et3TA : le compte technique disponible a l’autorisation11 mais affiche une formationVTC ; garde de session existante bloque la navigation. Aucune formation/attribution/session forcée pour contourner cela. Vérification des composants réels séparée, pas présentée comme un parcours portail complet.
- Pas de panne réelle du fournisseur provoquée : erreurs réseau/reprises simulées sur tests isolés ; pas de consommation200 appels pour tester les limites hébergées.
- Aucune publication. Les élèves sur le site public gardent l’interface déjà publiée jusqu’à accord distinct.