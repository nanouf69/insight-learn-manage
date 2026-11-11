# Chemoun EB3-TAXI : précédent T3P et sélection préparée

## Corrigé en aperçu
ExamenBlancsListe utilisait le second résultat par date de création et son score legacy, sans projection V2. Le 8,5 était le score historique pending de T3P t1, pas sa note définitive 13.

La carte résout maintenant la copie précédente par tentative enregistrée, ID de résultat exact et preuve officielle (attacherSourceUnique). Une correction tardive ne change pas l'identité. En attente ou lecture impossible : aucune note publiée. Deux copies distinctes pour une tentative ambiguë ne sont pas choisies arbitrairement.

Libellé vérifié : « Précédent passage — A - Transport Public Particulier de Personnes (T3P) (matière seule) : 13.0 / 20 ». Les résumés multi-matières annoncent explicitement couverture partielle ou moyenne des précédents passages par matière, jamais moyenne d'un examen historique complet sans preuve. La moyenne courante 11,6 et A=2 restent inchangées.

## Préparation admin uniquement
Chemin : CRM → fiche apprenant → Examen blanc → développer EB3-TAXI → « Simuler une copie retenue pour la moyenne ».

Rôle vérifié par getUser puis has_role serveur. Sélection explicite matière puis copie datée/ID. Copies non notées ou non prouvées désactivées ; autre compte/examen/matière ou lecture incertaine refusés. La simulation utilise la note officielle de la copie choisie et les contributions actuelles des autres matières.

Simulation du 01/11 : A13/B13/C14/D9,5/E9/F14/G18 ; coefficients 3/2/3/2/1/3/3, somme17. Total231/17 = 13,588235… → 13,6/20 ; aucune matière éliminatoire (anglais seuil4, autres6), verdict réussi. Les deux copies sont conservées ; aucune note modifiée ni nouvelle tentative.

Bouton « Retenir cette copie — non activé » toujours désactivé, fermeture sans enregistrement. Pas de nouvelle table/RPC/migration préparée ou exécutée. Aucun lecteur courant ne consomme une sélection persistante. Pour rendre la sélection effective, reste à préparer et tester un événement admin append-only scoped compte/examen/matière/attempt_id+result_id+version, CAS/idempotence, preuve remise+note définitive+non-neutralisation, confirmation nominative avant/après, retour au défaut journalisé, et projection partagée des trois écrans. Aucun reset ni recalcul enregistré autorisé par cette préparation.

## Vérifications exécutées
- 24 tests Vitest PASS : note précédente V2 13 vs legacy8,5, matière seule 1/7, attente, défaut t2, simulation 13,6/coef17/verdict réussi, autres dossiers refusés, conservation des entrées, correction rétroactive et relecture CRM.
- Chromium vrais composants sur fixtures à 1280×1800 et 390×844 : vraie carte élève précédent13 (captures élément inspectées), choix t1 dans dialogue admin, 11,6→13,6, zéro éliminatoire, bouton effectif désactivé, fermeture sans enregistrement. Tous appels externes interceptés ; aucune session réelle utilisée, aucune mutation Cloud.
- Build OK observé. Vérification réelle authentifiée non exécutée. Aucune publication, migration, IA, mail ou écriture de résultats.
- Écart préexistant laissé intact dans la carte : minuterie setInterval de 60s ; hors périmètre historique/simulation, aucune suppression effectuée.