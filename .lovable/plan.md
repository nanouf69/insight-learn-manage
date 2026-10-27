# Audit approfondi des 211 questions TAXI : lecture seule

Rien n'est modifié : aucune question, aucun fichier du projet, aucun élève, aucune publication. Le seul résultat est un rapport à lire et à valider.

## 1. Vérifier que les supports lus sont bien ceux affichés aux élèves
- Télécharger les 10 fichiers réellement affichés aux élèves (5 PDF et 5 PPTX, modules 10 et 64) pour les comparer.
- Comparer leur empreinte aux originaux joints et aux PDF de conversion. Si une empreinte ne correspond pas, le signaler et arrêter la comparaison pour la partie concernée.
- Vérifier le nombre de pages et de diapositives : 33, 21, 17, 15, 17 et 13.

## 2. Lire les diapositives en entier
- Extraire le texte complet de chaque diapositive depuis le PPTX : zones de texte, tableaux, notes et groupes. On corrige ainsi les passages coupés dans l'audit précédent.
- Transformer chaque diapositive en image et la regarder, notamment N1 6–8, 13 et 25, ainsi que la carte ZUPC (L1 11).
- Dresser la liste des diapositives encore illisibles, s'il en reste.

## 3. Reprendre chaque question signalée
Les points à reprendre : 11 contradictions, environ 12 ambiguïtés, 22 questions déplacées et environ 30 non couvertes. Les questions conformes seront aussi contrôlées rapidement.

Pour chaque question, le rapport donnera :
- l'identifiant, la partie et l'exercice ;
- le texte exact de l'énoncé, des propositions et de la bonne réponse actuelle ;
- la ou les diapositives concernées, avec la citation exacte ;
- un classement : contradiction prouvée, ambiguïté, non couverte, mauvaise partie, ou conforme après relecture complète ;
- un niveau de preuve : prouvé par le support, incertain, ou source officielle nécessaire (arrêté préfectoral ou métropolitain, code des transports, CPAM, DDPP). Le cours n'est pas considéré comme exact d'office ;
- un projet de correction exact, à valider : nouvel énoncé, nouvelles propositions, nouvelle bonne réponse, ou déplacement vers telle partie, avec la raison.

## 4. Points à valider sur le plan réglementaire, avec les textes exacts
- L'ivresse : N1 Q87 face à la diapositive 29 de N1 et à la diapositive 6 de L1.
- La ZUPC, 23 ou 24 communes : L1-73 Q9 face aux diapositives 1, 10 et 16 de L1 et à la carte.
- Pour chacun, le titre et la page du support, ainsi que le texte de toutes les questions qui citent le même sujet ailleurs.

## 5. Ce que changerait un déplacement ou une correction (simple estimation)
- Compter les réponses, tentatives, quiz validés et élèves terminés concernés, pour chaque exercice touché (70, 71, 73, 74, 75, 76 et le complément du module 64).
- Expliquer ce qu'un déplacement changerait pour les quiz partagés, les Bilans, les jalons et les compteurs, et ce qu'il ne changerait pas. Rappel de la règle : une nouvelle version pour les futures tentatives, les copies passées restent figées et les élèves terminés sont protégés.
- Aucune donnée n'est écrite.

## 6. Ce que vous recevrez
- Un rapport lisible dans Fichiers : `audit-approfondi-questions-taxi-2026-10-27.md`, avec un tableau par partie et une synthèse.
- La liste des points encore manquants ou non prouvés.

## Détails techniques
- Lectures uniquement : requêtes SELECT, téléchargement des fichiers affichés aux élèves dans /tmp, markitdown et python-pptx pour le texte, LibreOffice et pdftoppm pour les images.
- Le rapport est écrit seulement dans /mnt/documents. Aucun fichier du projet n'est modifié.
