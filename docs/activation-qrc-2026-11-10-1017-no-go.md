# Activation QRC — contrôle du 10 novembre 2026 à partir de 10:17 UTC

## Décision : STOP / NO-GO

Aucune migration, réparation de liaison, correction réelle ni publication exécutée. L'autorisation était conditionnée à la sécurisation des cinq copies et à la réussite de tous les tests ; ces conditions ne sont pas satisfaites.

## Identification nominative des cinq copies

Toutes concernent **Meriem BENNANI**, EB2 VTC, tentative 3 du 9 novembre 2026. Les notes actuelles ont été relues avant/après, strictement inchangées.

| Matière | Résultat original | Remise originale retrouvée | Note /20 | Fin UTC |
|---|---|---|---:|---|
| A — T3P | eb1e925b-53ee-4995-8cf2-df3cebdcc478 | e79c2183-42ac-4874-989b-df675d9444bb | 17,5 | 13:23:10.241173 |
| B — Gestion | 7e9d1b67-f6de-4ab0-a8e0-b43ecfd7cf22 | 40b2964b-7a38-4317-a989-ac3b481d7383 | 18 | 13:27:40.027959 |
| D — Français | 2fa844d9-1e7d-4b66-b2fd-3c38c6088bce | f897ee73-61a9-4413-9f95-259c22519d0f | 8,5 | 13:47:49.980185 |
| F(V) — Développement commercial | d1dc3592-95eb-4a95-aed6-0e04b0a8b9e5 | bd8a8a66-1d1a-44ae-a5d4-28ad952913ab | 12,5 | 14:05:34.161794 |
| G(V) — Réglementation VTC | 65ff5584-95cc-4e12-a926-543d809c186c | 4fa3c89e-a2e0-4b53-96bd-9a51d8b5d0f7 | 15 | 14:11:27.820384 |

## Diagnostic corrigé par rapport à l'audit précédent

L'affirmation « aucune fiche remise » était trop forte : les cinq remises originales **existent**. Elles sont toutes du même apprenant, de type examen_blanc, completed=true, status=submitted et submitted_at renseigné.

Deux divergences d'identité empêchent le correctif actuellement préparé de les accepter :
- le serveur recherche `EB2__matiere`, tandis que les remises ont `EB2__matiere__t3` ;
- les cinq remises portent `tentative=1`, alors que les résultats portent `tentative=3` et que leur suffixe d'exercice indique `__t3`.

L'interface utilise déjà le suffixe `__t3`, mais exige aussi l'égalité du champ tentative : elle refuse donc également ces cinq remises.

Les réponses sont strictement identiques pour Français, Gestion et G(V). Les deux autres ne diffèrent que par une permutation QCM du snapshot : T3P question 14 `[B,D]` / `[D,B]`, F(V) question 10 `[A,B,C]` / `[A,C,B]`. Aucune différence QRC ni différence de clés : respectivement 15, 18, 10, 16 et 8 clés conservées. Les cinq snapshots sont présents et leurs empreintes ont été relevées.

Les remises précèdent la fin enregistrée de 0,628 à 0,886 seconde : corroboration seulement, **jamais utilisée comme identité**. Le journal contient également des réponses sous les exercices suffixés `__t3`, avec tentative 3 (211 événements T3P, 70 Gestion, 219 Français, 226 F(V), 151 G(V)). Aucune archive `reponses_apprenants_historique` EB2 trouvée pour cette apprenante.

Ces preuves permettent de poursuivre une sécurisation ciblée ; elles ne justifient pas de simplement ignorer le champ tentative contradictoire, de modifier les remises ou de réintroduire une reconnaissance manuelle. La preuve atomique de liaison acceptée par le serveur reste à préparer et à tester. Aucune liaison réparée aujourd'hui.

## Sauvegarde et intégrité

Sauvegarde ciblée conservée dans les métadonnées privées persistantes : cinq résultats complets, remises EB2 de l'apprenant, journal de corrections EB2 et définitions/permissions des deux fonctions serveur. Empreinte SHA-256 du fichier enregistrée. Ce n'est pas une sauvegarde complète de la base ni un test de restauration.

Empreintes MD5 des résultats avant/après identiques :
- Français : fdd242768a36fabd214764ea14ea8958
- G(V) : a199f462a2282f474117f8b58eb5eb97
- Gestion : b311fec951f1878b77a5e6c4d7dcd714
- F(V) : 76590c8a869dec5d8f2323c2c4d31f8c
- T3P : 26acba635fcfe053770e8d7361a91467

Nombre de corrections inchangé : 3, 2, 2, 4 et 5, respectivement. Aucune écriture applicative en production, aucun appel manuel à geler_releves_fin_acces, aucune mutation de questions/modules/signatures/examens.

Les deux nouvelles fonctions du candidat ne sont toujours pas installées. Les définitions actuelles ont été sauvegardées ; le rollback antérieur ne doit pas être utilisé aveuglément sans comparaison avec cette relecture fraîche.

## Tests réellement exécutés

- **51 PASS / 20 FAIL**, sept fichiers applicatifs : liaison QCM, consultation EB2, affichage des notes historiques, tri, navigation après correction, notes matière/globale et attente de la tentative exacte.
- Les 20 échecs sont dans `correction-qrc-navigation-auto.test.tsx` : le transport fictif ne fournit pas `supabase.channel`, désormais appelé par l'alerte note globale. Les cas d'enregistrement/navigation ne sont donc **pas validés** par ce rejeu. Aucun contournement ni changement de code pour masquer cet échec.
- Le fichier PostgreSQL jetable `contrat_audit_permutation.py` a été lancé ; des cas ont réussi, mais l'exécution s'est arrêtée avant son bilan final après la limite de 180 secondes. **Suite complète et rollback NON PROUVÉS sur ce rejeu**, aucun total PASS annoncé.
- Tri : fichier dédié réussi dans les 51 PASS ; grille et navigation utilisent le tri partagé par fin réelle décroissante. Nouveau candidat réel et rechargement navigateur non rejoués aujourd'hui.
- Case/encadré de confirmation : anciens textes absents du fichier de l'écran ; contrôle fonctionnel d'un clic et persistance réelle **NON PROUVÉS**, suite concernée en échec et aucune note réelle saisie.

## Blocages précis et suite nécessaire

1. Sécuriser les cinq liens avec une preuve serveur ciblée, append-only, fondée sur résultats/remises/journal/snapshot, sans réécrire le champ tentative historique ni assouplir globalement l'identité.
2. Corriger les doubles de test de l'alerte pour pouvoir réellement rejouer l'enregistrement, la relecture et la navigation ; tous les cas doivent passer.
3. Terminer les tests PostgreSQL isolés, comparer les fonctions de rollback au catalogue fraîchement sauvegardé.
4. Seulement ensuite : contrôle avant/après, activation conditionnelle et publication. Aucune vraie correction ne peut être testée sans une note explicitement choisie pour une copie sûre ; la demande ne fournit pas de valeur de note à saisir.

**Aucun déploiement aujourd'hui : les notes sont intactes, mais la possibilité de modifier ces cinq copies n'est pas rétablie.**