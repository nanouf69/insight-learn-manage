# Correction visible EB5 et autres examens blancs

## Diagnostic confirmé
- EB5 VTC : l’éditeur et la version publiée n°10 portent C « 4 minutes » ; 53 copies figées portent C « 8 minutes ».
- Le lecteur actuel ne compare que les lettres correctes : C restant C, il ne détecte pas le changement de texte.
- Les résultats gardent volontairement le sujet du passage ; la table des publications n’émet pas d’événements Realtime actuellement.

## Correctif en aperçu uniquement
- Ajouter une lecture ciblée du corrigé administrateur enregistré, actualisée par les événements existants de l’éditeur, retour réseau et visibilité, sans nouveau polling.
- Afficher une zone distincte « Corrigé administrateur actuel » pour les corrections remises élève/admin, y compris les changements de texte. Identité exacte examen/matière/question, doublons ou correspondances absentes refusés.
- Conserver les propositions, réponses, barèmes et notes du passage. Un texte modifié est signalé sans prétendre que l’ancienne réponse correspond au nouveau choix.
- Aucun dévoilement de corrigé pendant une épreuve ; les nouveaux passages continuent à utiliser leur version serveur.

## Vérification et limites
- Fixtures Q3 C 8→4, changement de clé, multi-choix, doublons, matières/filières/EB1–6, lectures périmées, panne et événements ; vérification navigateur fictif ordinateur/mobile.
- Aucun recalcul historique automatique, aucune écriture réelle, migration ou publication.
- Le polling préexistant de la page générale reste hors périmètre ; sa suppression est un chantier distinct.
- Publication NO-GO tant que sauvegarde/restauration complète et garde-fous de stabilisation ne sont pas prouvés.

## Détails techniques
- Lecteur partagé ciblant module_editor_state avec référence updated_at, projection pure et abonnement nettoyé à la sortie.
- Composant d’avertissement partagé entre résultats élève/admin et consultation native QCM.