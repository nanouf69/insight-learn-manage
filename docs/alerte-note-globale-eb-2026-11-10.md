# Alerte note globale des examens blancs présentiel — 10 novembre 2026

## Diagnostic

La note globale n’a pas de ligne globale dédiée : les écrans l’assemblent à partir des résultats des sept matières et du verdict partagé. Les incidents existants détectaient notamment une matière sans résultat, pas le cas « sept matières terminées et QRC validées, résultat final indisponible ».

`pending` V2 mélange plusieurs causes : QRC restantes, résultat absent, statut provisoire et note absente. Il ne peut pas servir de preuve de correction terminée. Le diagnostic sépare désormais soumission, couverture des QRC figées, corrections validées et publication. Un zéro de correction est une note valide.

La sélection d’affichage habituelle peut compléter une nouvelle tentative avec d’anciennes matières. L’alerte ne le fait pas : elle exige sept identités de matières distinctes au même numéro de tentative enregistré. Les liens ancien/V2 sont uniquement des identifiants explicites ou des rapprochements univoques déjà prouvés par réponses figées, jamais une fenêtre horaire nouvelle.

## Livré en aperçu uniquement

- Surveillance administrative dans Cours en ligne (donc examens, résultats et correction QRC), et sur la page directe Correction QRC V2.
- Présentiel confirmé par la règle existante de mode, inscription enregistrée, exclusions des comptes/copies techniques, archives et neutralisations.
- Lectures paginées par identifiant, petits groupes V2 séquentiels et partage de la lecture en cours entre surfaces pour réduire la pression serveur.
- Première observation : « Publication en cours de vérification… ». Une relecture réussie au moins cinq secondes plus tard est nécessaire pour confirmer l’anomalie identique. Le délai est monotone : une mauvaise horloge de l’appareil ne peut pas confirmer prématurément.
- Une alerte par candidat/examen/tentative, sans notifications répétées. Nom lié au CRM, TAXI/VTC, examen, tentative, sept statuts, cause et heure Paris de détection.
- Relecture sur événements serveur, reconnexion ou retour à l’écran ; pas de polling périodique. Une lecture échouée affiche une erreur et ne résout jamais une alerte existante.
- Disparition automatique quand la publication et le verdict redeviennent disponibles.
- Les anciennes attentes QRC ne prennent pas priorité sur un V2 prouvé ; compteur V2 resté positif malgré toutes les instances corrigées = cause explicite, pas recalcul ni modification du compteur.
- Aucun appel de notation, finalisation, migration, mail, gel ou écriture d’alerte en base. Aucun changement de note, réponse, copie ou examen. `published_at` et `is_test` ajoutés uniquement à la projection de lecture partagée, sans changer ses règles de notation.

## Tests exécutés

**PASS : 77 tests sur neuf fichiers.**

- Sept matières corrigées et note absente ; seuil de cinq secondes ; une seule alerte.
- Note présente, résolution automatique et retour pendant le délai normal.
- QRC en attente, QRC manquante, zéro corrigé, identité ambiguë.
- Nouvelle tentative distincte ; aucune complétion depuis une ancienne copie.
- Mixte ancien/V2, drapeau historique obsolète et compteur serveur obsolète.
- V2 terminé sans résultat d’affichage, date de publication manquante, copie technique exclue.
- Verdict global indéterminé malgré les sept notes.
- Événements regroupés, absence de polling, date d’alerte stable, erreur de lecture sans résolution, nettoyage au démontage.
- Non-régressions : publication source unique, copies figées, identité native, pagination et actualisation des résultats.

**PASS navigateur avec transport de lecture synthétique dans le vrai écran administrateur authentifié :** une alerte visible avec sept statuts, ordinateur 1280 × 1800 et téléphone 390 × 844 sans débordement ; résultat réapparu → alerte disparue ; aucune écriture réelle tentée. Le transport synthétique ne crée aucune donnée de test dans le service hébergé.

**Contrôle réel lecture seule exécuté :** 563 groupes de tentative, 128 prêts et publiables, aucune anomalie « prête sans note » dans cette lecture. Ce relevé précède le dernier ajustement de débit et l’ajout de `published_at` ; ce n’est pas une preuve exhaustive du dernier état hébergé.

Compilation automatique : dernier signal **build OK**.

## Limites et publication

- **Non publié**, conformément à la demande.
- **Surveillance active seulement lorsque l’administration Cours en ligne / Correction QRC V2 est ouverte.** Aucun service permanent ni journal persistant d’alerte n’a été activé ; pour garantir la détection sans aucun administrateur connecté et la persistance inter-appareils, une extension serveur distincte reste nécessaire, avec accord sur les écritures de suivi et les droits. Ne pas présenter cette version comme une alerte persistante 24 h/24.
- Le premier essai réel a rencontré des lectures 500/503 dans les résultats historiques et la complétion des modules ; l’alerte a affiché « contrôle indisponible » au lieu d’un faux feu vert. La lecture indépendante a ensuite réussi. Les lectures V2 ont depuis été réduites à des groupes séquentiels ; absence exhaustive de saturation sous charge NON PROUVÉE.
- Aucun nouveau passage réel et aucune correction réelle n’ont été créés. Arrivée de la dernière correction et résolution ont été testées sur preuves synthétiques ; le signal Realtime hébergé lors d’une vraie notation reste NON PROUVÉ.
- Les copies sans identité ou sans questions figées suffisantes restent inconnues, jamais déclarées « sept corrections validées ».
- Un affichage défaillant uniquement sur un autre appareil alors que toutes les données et le verdict sont disponibles n’est pas observable depuis ce détecteur ; ce cas exige le diagnostic de cet appareil.