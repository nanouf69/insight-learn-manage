# Lyon — seuil par cohorte et publication isolée

## Résultat préparé, non activé
- Quiz existant module 8 / exercice 1785332774763, aucun nouveau jalon.
- Historique (tentative, révision, archive, mention dans validation ou module déjà terminé) : version et fonctionnement 99 conservés.
- Aucun historique : 138 questions, toutes les réponses 1–138 exigées, sans changer le barème de justesse existant.
- Les 99 questions sources et leur ordre restent intacts ; 39 QCM uniques ajoutés en projection, IDs 100–138, sélection unique.
- PDF conservé sur le cours existant 1785334184827 ; aucun nouveau cours/jalon.

## Pourquoi un candidat serveur est nécessaire
Une simple lecture « aucune réponse » ne suffit pas : après le premier clic, la nouvelle cohorte aurait une trace et risquerait de repasser à 99 au rechargement. Le candidat SQL fige donc une cohorte 138 **au premier vrai INSERT de réponses**, sous verrou de la ligne propriétaire, jamais par une déclaration du navigateur. Pas de backfill ni de mutation des anciennes réponses. La table de cohorte est immuable, lecture propriétaire/admin seulement.

`quiz_lyon_seuil` lit la cohorte et l’historique réel. Les gardes contrôlent les soumissions (y compris écritures directes), première validation du module, auto-validation et verdict de jalons. Les trois fonctions partagées gardent leur code existant hors branche Lyon ; leurs empreintes sont vérifiées avant installation. Le SQL est uniquement dans docs/candidates, non enregistré comme migration automatique, non installé.

En aperçu actuel : garde client 138 et choix de version préparés. RPC absente en production : repli historique existant ; la stabilité multi-appareils de la nouvelle cohorte n’est pas déclarée active avant installation du candidat. Aucune publication partielle du client seul ne doit être faite.

## Base et isolation
- Publication observée par l’outil : **25/11/2026 18:28:55.372891 UTC**.
- Fichiers publics observés : `/assets/index-DL14sS3r.js`, `/assets/index-CRtzliuE.css`.
- Git **7880b585002471a066fbab0f9b2381946c54d5a0**, dernier commit daté avant cette publication, utilisé comme **base locale provisoire uniquement**. L’outil ne donne pas le commit du déploiement : correspondance non certifiée, ne pas appeler ce candidat « basé avec certitude sur la dernière production ».
- HEAD de départ **69847782d** conservé avec tous ses travaux. Aucun changement de branche, restauration, réinitialisation ou écrasement de HEAD.
- Candidat local assemblé hors dépôt `/tmp/lyon-candidate/source` ; delta durable : `docs/candidates/quiz_lyon_client.patch`, manifeste : `quiz_lyon_manifest.json`, SQL : `quiz_lyon_cohorte_138.sql`.
- Huit fichiers client seulement : ModuleDetailView, Fusion, Qcm2, Version, Achevement, Ressource, banque JSON et pointeur du PDF. Les wrappers purement visuels de la barre de questions ont été exclus. Aucun fichier sauvegarde, worker, examens, I21, sécurité-six-RPC ou fonction d’email n’entre dans le delta.

**Blocage publication** : la commande disponible publie la version courante du projet sans paramètre commit/candidat. Les brouillons ne sont pas publiables directement et leur acceptation rejoint la version principale. Ni identification certaine du commit public ni promotion isolée vers ce déploiement n’est disponible. Ne pas appeler Publish : cela embarquerait les autres correctifs préparés. Aucun déploiement serveur n’a été lancé non plus, car il affecterait immédiatement le backend partagé alors que le candidat client isolé n’est pas promouvable.

Procédure restant nécessaire : obtenir une référence source certifiée du déploiement public et un mécanisme de publication d’une source isolée, réappliquer ce seul delta, rejouer tests/compilation et accès PDF, comparer fraîchement les trois empreintes SQL puis activer le seul SQL Lyon et ce seul client. Les autres travaux restent en attente. Ce n’est pas une opération réalisable avec le Publish actuel.

## Tests réellement exécutés
- Vitest : **61 PASS** (banque 45, fusion 5, version 8, achèvement 3).
- PostgreSQL jetable Lyon : **10 PASS**. 99 historique terminé, 99 commencé malgré total client 138, archive/validation, nouvelle cohorte bloquée à 99 puis acceptée à 138, refus écriture directe, cohorte immuable, rechargement stable après première réponse, droits propriétaire/autre/anon, lecture jalons 138/99/false, acquis préservés. Catalogue RPC actuel capturé en lecture seule ; tables de réponses auxiliaires réduites, ce n’est pas une copie complète de tous les triggers de production.
- Contrat existant `module_completion_sql_contract.py` : **25 exécutés, 17 PASS, 8 SKIP** ; les SKIP concernent un autre candidat non chargé. Cette suite seule ne valide pas le nouveau SQL Lyon, testé séparément ci-dessus.
- Aperçu : quatre rendus PC/mobile, cohorte 99 et 138, véritable ModuleDetailView avec lectures fictives interceptées, zéro écriture réseau réelle et zéro erreur JavaScript. Q100 inspectée aux deux dimensions, quatre choix à sélection unique. Débordement mobile de la barre de questions observé sur **les deux versions 99 et 138**, non corrigé dans ce lot.
- Session apprenant réelle et soumission officielle : NON PROUVÉES ; aucun compte réel utilisé, aucune signature ni soumission réelle créée.
- PDF : référence préservée ; nouvelle tentative d’accès direct localhost retourne **403**. Le téléchargement authentifié réel n’est donc **pas revalidé** dans ce tour ; ne pas reprendre les anciens HTTP 200 comme preuve actuelle.
- Aperçu compilé : dernier journal **build OK**. Candidat local provisoire séparé : pas compilé/promu comme déploiement ; certification de base et rendu public restent bloqués.

## Production et emplacement
Lectures avant/après identiques : 133 lignes réponse/révision Lyon, empreinte agrégée `6f165bc8e48da21d5ceef1411fe3ad1c` ; module 8 `3c3d12c54078d43e234be53df7e4bd5f` ; table de cohorte absente (0). Aucun email, SMS, publication ou migration.

Aperçu : **Cours en ligne → Pratique VTC (module 8) → Aperçu → Quizz Ville De Lyon** ; IDs supplémentaires 100–138. PDF dans **Connaissances Ville de Lyon**, support existant. Le seuil serveur 138 est préparé mais non installé, pas annoncé en production.