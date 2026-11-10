# Audit pédagogique « Cours et exercices » — lecture seule

## Garanties
- Aucune écriture : ni code, ni fichier projet, ni base, ni contenu, ni note, ni progression, ni publication.
- Lectures seulement : fichiers source, requêtes SELECT, téléchargement des PowerPoint dans un dossier temporaire hors projet.
- Bilans, examens blancs et banques d'examen exclus du périmètre (signalés à part s'ils apparaissent mêlés au module).

## Étapes
1. **Cartographie du module** : lister parcours (TAXI, VTC, TA, VA si présents), matières, parties, avec les PowerPoint rattachés (code + version enregistrée côté admin).
2. **Lecture des supports** : extraire le texte de chaque diapositive de chaque PowerPoint réellement rattaché ; noter les supports manquants ou illisibles par nom.
3. **Questions visibles élève** : reconstruire la liste effective (version serveur + métadonnées du code, même fusion que l'écran élève), avec ID, type QCM/QRC, partie affichée, position.
4. **Comparaison admin / élève** : écarts de rattachement ou d'ordre entre éditeur admin et affichage élève.
5. **Rapprochement question ↔ diapositive** : pour chaque question, diapositive de référence, partie attendue, position proposée ; classement en : erreur d'affectation, ordre incorrect, hors support, doublon, incertain.
6. **Couverture** : notions du support sans exercice ou partiellement couvertes, avec référence diapositive.
7. **Rapport** en français dans `/mnt/documents/audit-cours-exercices.md` (+ tableur des anomalies) : inventaire chiffré par parcours/matière/partie, nombre vérifié / total, liste exhaustive des anomalies (ID + début d'énoncé), notions manquantes, cas incertains, exemples vérifiables, reste à contrôler.

## Limites annoncées
- Le rapprochement par contenu est un jugement pédagogique ; tout cas non tranché sera marqué « INCERTAIN », jamais extrapolé.
- Si le volume dépasse ce qu'un tour permet, le rapport indiquera précisément les parties non encore contrôlées.
