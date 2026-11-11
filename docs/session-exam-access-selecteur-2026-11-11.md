# Sélecteur admin des sessions pour accès aux examens blancs

Périmètre : ExamCardAccess et tests uniquement ; commande partagée SessionExamAccess, SQL candidat et règles d'accès inchangés. Aucune publication/migration/écriture réelle.

## Comportement
- Lecture authentifiée du catalogue existant examens_blancs_parcours ; compatibilité reproduit session_exam_catalog (35 VTC/TAXI, 36 TAXI, 37 TA, 38 VA et variantes « E Présentiel »).
- Type théorique présentiel, dates renseignées non inversées, date de fin au moins aujourd'hui Paris. Sessions e-learning/distance identifiées par nom/type/catalogue de filières exclues même futures. « E Présentiel » ne signifie pas une session à distance.
- Dates inclusives Europe/Paris, sessions en cours en tête (« En cours », rouge semantic text-destructive, fond neutre lors du focus), puis futures par date. Aucun choix automatique, UUID absent du libellé mais conservé comme clé.
- Select Radix accessible existant, libellés enveloppés sur téléphone. Choix exclu démonté immédiatement, aucune commande ni dialogue ne subsiste. Erreur de lecture vide le catalogue et interdit l'action.
- Changement de jour : un timeout unique jusqu'au prochain minuit Paris (DST compris), réévaluation au retour fenêtre, aucun polling/rechargement réseau périodique.

## Preuves
31 tests Vitest PASS : 17 règles de dates/filières/remote/tri/DST, 1 invalidation du choix, 6 carte/droits/placement et 7 contrôle partagé. Premier lancement échoué parce que jsdom ne fournit pas scrollIntoView ; polyfill dans tests puis relance complète PASS.
Chromium PC 1280×1800 et mobile 390×844 : deux sessions en cours devant future, absences des passées/e-learning/incompatibles/UUID, sélection explicite puis invalidation avec suppression du contrôle, zéro erreur JS et débordement. Réponses fixture, appels externes bloqués ; aucune mutation d'accès. Captures de la liste ouverte inspectées ; fond focus neutralisé après inspection.
Compilation automatique build OK. Catalogue réel vérifié en SELECT, pas d'interface admin authentifiée réelle testée ; contrôle serveur d'ouverture/fermeture reste non installé comme avant.