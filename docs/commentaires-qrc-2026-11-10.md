# Commentaires prédéfinis QRC — 10/11/2026

## Décision : NO-GO publication
Les quatre boutons sont ajoutés dans l’aperçu, mais la demande complète n’est pas validée. Aucune publication, aucune migration, aucune correction de copie réelle et aucun message/email n’ont été effectués.

## Réalisé
- Textes exacts : « Précisez !!! », « Mal dit !!! », « Précisez permis de conduire hors période probatoire », « Attention aux fautes !!! ».
- Ajout au commentaire courant sans écrasement, cumul, refus des doublons identiques, édition libre. Boutons et champ désactivés pendant l’enregistrement.
- Utilisation exclusive des fonctions de correction/révision existantes, sans modification des barèmes, questions, réponses ou règles de notation.
- Commentaire existant relu dans le journal de la QRC avant toute révision ; brouillon effacé au changement de copie, réponses tardives ignorées.
- Relecture du commentaire après envoi : aucune navigation/succès si le journal ne confirme pas le texte exact. Le texte local est conservé en cas de refus.
- Lecture candidat V2 ajoutée par instance + élève + passage + question et note actuelle ; le dernier événement seulement fait foi. Lecture paginée, aucune reprise d’un commentaire plus ancien si la dernière note ne correspond pas.
- Affichage candidat ajouté au détail des résultats V2 et aux corrections historiques compatibles qui portent déjà `commentaire`. Note et explication existantes conservées.

## Défaut bloquant prouvé
Lecture du catalogue actuel : `core_log_qrc_correction` journalise seulement si état ou note changent. `core_revise_qrc_publish` accepte une révision à note inchangée, mais ne crée alors aucun événement contenant le nouveau commentaire.

Conséquence : ajouter uniquement un commentaire à une note V2 déjà validée ne peut pas satisfaire la persistance demandée avec le mécanisme actuel. Changer artificiellement la note est interdit et n’a pas été fait. L’aperçu détecte le commentaire absent à la relecture et conserve le brouillon avec une erreur claire.

Un correctif serveur append-only dédié et testé est nécessaire. Cette intervention est restée limitée à la présentation et aux lectures ; aucune règle serveur n’a été modifiée.

## Contrôles exécutés
- **107/107 tests applicatifs PASS** : onze fichiers, ajout cumulatif, doublon, bonne identité, changement de copie, relecture admin simulée, commentaire manquant sans faux succès, projection candidat, commentaires obsolètes/d’un autre élève/passage/question refusés, publication/notes/anciens résultats.
- **7/7 contrats PostgreSQL jetables PASS** : VTC/TAXI, remontée note, révision CAS, isolation, limites barème ; un test reproduit explicitement la perte du commentaire à note inchangée. Ce PASS diagnostique ne signifie pas que le défaut est réparé.
- Navigateur authentifié, lecture réelle de la session VTC soir : 298 cellules ; copie SAIDI Aymen EB1 T3P ouverte, cumul et double clic contrôlés sans envoi. Toutes les fonctions de notation étaient bloquées dans le navigateur pour préserver les données réelles.
- Ordinateur 1280×1800 et téléphone 390×844 : boutons visibles, texte long sur plusieurs lignes, champ éditable ; sur mobile le correcteur reste en deux panneaux étroits. Validation mobile globale non revendiquée.
- Dernier contrôle compilation : `build OK`.
- Avertissements des mocks existants : `auth.getSession` absent dans la dépendance ExamensEditor ; assertions ciblées réussies, pas une validation exhaustive de cette dépendance.

## Non prouvé / non effectué
- Enregistrement réel admin → affichage candidat → rechargement, à travers une API isolée complète : **NON PROUVÉ**. La projection candidat et la relecture admin sont testées séparément avec transport simulé.
- Parcours navigateur TAXI jour/soir et VTC journée, anciens circuits compatibles : **NON PROUVÉS** pour cette nouvelle fonctionnalité.
- Sauvegarde à note V2 inchangée : **FAIL fonctionnel**, cause serveur reproduite.
- Les changements précédents « Révisions admin » restent en NO-GO (rapport 12:41) ; une publication les embarquerait également.
- Vérification de la fonctionnalité sur le site publié : **NON EFFECTUÉE**, car aucune publication autorisée par les critères n’a été réalisée.
- Aucune empreinte exhaustive avant/après n’est revendiquée. Le navigateur n’a envoyé aucune correction et les écritures SQL des tests ont utilisé exclusivement une instance jetable.

## Suite nécessaire avant GO
1. Autoriser et préparer séparément une correction append-only du commentaire à note inchangée, sans changement de note et avec contrôles d’identité/concurrence.
2. Réunir en un test isolé l’écran admin, l’API sécurisée et l’écran candidat avec sauvegarde/rechargement, VTC/TAXI jour/soir et historiques compatibles.
3. Lever les blocages antérieurs de publication ou isoler réellement une livraison ciblée ; vérifier sauvegarde source durable et retour arrière de déploiement.
4. Publication seulement après ces preuves, puis contrôle du site publié.