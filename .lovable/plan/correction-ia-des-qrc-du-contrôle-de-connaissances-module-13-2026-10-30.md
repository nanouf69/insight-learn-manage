# Correction IA des QRC du Contrôle de connaissances (module 13) — plan

Statut : diagnostic fait en lecture seule, rien modifié, rien publié. Publication bloquée tant que ce plan n'est pas réalisé et validé.

## Diagnostic

- Les élèves passent le module en ce moment (dernières soumissions 13:12, notes enregistrées 59 à 77 %, sur 211 questions).
- Le module 13 n'utilise pas le circuit des examens blancs. Après la validation, c'est le navigateur de l'élève qui demande la correction de chaque QRC, une par une (des dizaines d'appels en rafale vers 13:15–13:16).
- Les résultats de ces corrections restent seulement dans l'onglet de l'élève. Rien n'est enregistré sur le serveur : si l'élève ferme la page, la correction est perdue, et l'admin ne la voit jamais.
- La note enregistrée est calculée avant la correction : chaque QRC y compte comme fausse. Cela fait le « 0 technique » sur les QRC.
- Une QRC compte 1 point si elle est juste, 0 sinon : pas de points partiels, pas de barème.
- Le circuit des examens blancs, lui, fonctionne : 1 377 corrections appliquées, dernière à 11:48 aujourd'hui. Il est fiable (file d'attente côté serveur, une seule correction par réponse, aucune double facturation, publication contrôlée). Mais il ne contrôle pas de budget en euros : il limite seulement le nombre de relances. Il ne traite que les élèves en e-learning.

## Décisions à prendre avant que je code

1. **Budget.** Le plafond de 20 €/mois n'est garanti nulle part, pas même pour les examens blancs, qui tournent déjà. Je propose d'ajouter un vrai compteur en euros, commun aux examens blancs et au module 13, qui réserve le coût avant chaque appel et bloque à 20 €. Au blocage, la réponse reste enregistrée et s'affiche « en attente », jamais 0.
2. **Barème.** 2 points par QRC avec des points partiels, comme les examens blancs, ou 1 point juste/faux comme aujourd'hui ?
3. **Présentiel.** Les élèves en présentiel du module 13 doivent-ils aussi être corrigés par l'IA ? Le circuit des examens blancs les exclut aujourd'hui.

## Ce que je construirai après votre accord

1. À chaque soumission validée du module 13, le serveur crée une copie figée : questions, réponses attendues, barème et réponses de l'élève, chaque question avec un identifiant stable. Le texte des questions et les copies déjà rendues ne changent pas. La Q29 n'est pas touchée.
2. Les QRC entrent dans la même file d'attente que les examens blancs. La correction se fait côté serveur, même si l'élève ferme la page.
3. Chaque QRC reçoit sa note selon le barème choisi, avec un commentaire qui justifie les points. La note finale QCM + QRC est recalculée sur le serveur, en nouvelle version : l'ancienne reste dans l'historique, rien n'est écrasé.
4. Ce que voient l'élève et l'admin :
   - « Correction en cours » tant qu'une seule QRC n'est pas corrigée ;
   - « Corrigé » seulement quand toutes les QRC sont corrigées ;
   - en cas d'erreur de l'IA, « À vérifier » : la question passe en revue par un formateur, jamais 0, et ne reste pas en attente sans fin.
5. Le circuit de correction actuel dans le navigateur sera retiré du module 13.
6. Copies déjà rendues : aucune correction rétroactive automatique. Un rattrapage admin, sur demande, pourra être proposé à part.

## Tests prévus (sur une copie jetable de la base, sans faux élève en production)

- QRC juste, partielle et fausse ; panne de l'IA ; budget épuisé.
- Reprise après fermeture de la page ; double soumission (une seule correction facturée).
- La note finale ne passe pas à « corrigé » avant la fin de la correction.
- Les examens blancs ne changent pas.

Puis contrôle complet et publication, dans le cadre de l'autorisation globale déjà donnée.

## Détails techniques

- Adaptateur serveur (RPC) : soumission du module 13 → tentative `exam_attempts_v2` (avec `attempt_id`) + `qrc_instances_v2`, avec un espace de noms propre au module 13, puis `qrc_ia_enfiler`. Les règles d'éligibilité des EB ne sont pas élargies globalement.
- Nouvelle table de réservation budgétaire, mois civil Europe/Paris. `qrc-ia-correction` réserve le coût avant l'appel, ajuste après réponse, et refuse avec un code 402 au plafond.
- Le module 13 lit les résultats publiés, en temps réel. `corriger-qrc` n'est plus appelé depuis ce module.
