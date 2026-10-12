# Diagnostic 12/10 (lecture seule) — résultats et correction conseillée

Rien n'a été modifié : ni code, ni données, ni alertes, ni publication.

## 1. ExamensEditor « Aucune version active enregistrée » — 11/10 23:53:45 Paris

Vérifié :
- L'ancien bundle `index-DV-5SCpl.js` n'est plus servi (réponse 404), tout comme `index-33Gq3v-A.js`. Impossible donc de lire la ligne 1553:20815. Le site sert aujourd'hui `index-D79o7dVD.js`, qui contient le message et la logique de relecture.
- `DV-5SCpl` ne correspond à aucun des deux bundles publiés connus (33Gq3v-A à 12:54, D79o7dVD à 15:27). C'est donc une autre version, dont la date n'est pas prouvable.
- L'alerte a `context = null` et le format brut `[console.error]`. La nouvelle trace, elle, remplit toujours un contexte (phase, session, relecture). C'est un indice fort que le téléphone exécutait un code sans cette trace, donc probablement un onglet ouvert avant le correctif. Ce n'est pas une preuve formelle.
- Corrélation forte : le même iPhone Chrome (même navigateur, iOS 18.7.8) est celui de l'élève `0760af63…` (compte m.sawadogo). Cet élève a enregistré une matière EB1 à 21:53:44 UTC, soit une seconde avant l'alerte. Sa QRC a été corrigée par l'IA à 21:53:43. Aucune autre erreur dans la fenêtre 21:40–22:05.
- `user_id` est null dans l'alerte, alors que l'écriture de la seconde précédente a bien réussi. La session était donc absente ou en cours de bascule au moment de la lecture, et non manquante côté contenu.
- Aucun signe d'un vrai manque dans `module_editor_state` : les autres élèves et l'admin chargent normalement.

Conclusion (niveau de preuve) : cause la plus probable = ancien onglet resté ouvert, sans le correctif, avec une session non lisible à la relecture. Le contenu ne manquait pas. Ce n'est pas certifié, car le bundle n'est plus lisible et l'alerte n'a pas de contexte. Le correctif publié couvre ce scénario.
Impact : aucun sur les réponses (l'écriture EB1 est enregistrée et corrigée). Au pire, un message d'erreur temporaire à l'écran.

## 2. « 3 passages en attente sans QRC » — élève 0760af63 (EB1 français P3, réglementation VTC P2 et VTC2 P2)

Vérifié :
- Le calcul se trouve dans `auditQrcCoherence` (src/lib/examPassageIdentity.ts). Il signale une ligne qui porte encore `details.qrc_pending_correction = true` alors qu'aucune QRC du passage n'est « à corriger ».
- Côté serveur pour cet élève : 100 QRC dans `qrc_instances_v2`, toutes `corrigee`, 0 en attente.
- Les lignes EB1 du 11/10 ont toutes autant d'entrées `correctionsIA` que de QRC (5/5, 2/2, 3/3, 4/4, 2/2), mais gardent le drapeau `qrc_pending_correction = true`.

Conclusion (prouvée) : c'est un drapeau d'affichage resté à « true » après la correction IA. Ce n'est ni une correction réellement en attente, ni une perte. Aucune note n'est à forcer.
Impact : risque qu'un écran lise ce drapeau brut et affiche « En attente » à tort. La règle commune, elle, se base sur les QRC réelles.

## 3. « Fetch aborted » 11/10 16:48:37 (compte 855c6df1)

Aucune preuve qui relie cet abandon au lot écrit à 17:08:47–49. La correspondance reste inconnue. Aucun signe de perte.

## Boudjorf

Toujours 23 réponses, non terminé. Aucune preuve de récupération de sa file locale.

## Correction minimale conseillée (seulement avec votre accord)

1. Point 2 : quand l'IA écrit une correction, l'affichage ne doit plus faire confiance au drapeau brut `qrc_pending_correction`. Il doit utiliser uniquement l'état réel des QRC, qui est déjà la règle commune. Aucune donnée réécrite, le drapeau historique est conservé. Le test existant de non-régression sera étendu.
2. Point 1 : rien à corriger dans le code. Optionnel : ajouter le nom du bundle dans chaque trace ExamensEditor pour confirmer la prochaine fois qu'il s'agit d'un ancien onglet.
