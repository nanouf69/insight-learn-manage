# Assistance pédagogique et technique dans les futures convocations

20/11/2026 — autorisation du dirigeant à 09:52 UTC. **Aperçu uniquement, aucun envoi ou publication.**

## Modèles réels concernés

Les modèles sont lus dans `email_templates`, puis personnalisés et présentés par `SessionDetail.habillerConvocation` et `construireConvocationHtml` avant aperçu et confirmation d'envoi. L'ajout est fait uniquement dans ce générateur, sans UPDATE des modèles ni des messages historiques.

| Modèle enregistré | Parcours | Modification prospective |
|---|---|---|
| `convocation-taxi` | TAXI | Paragraphe ajouté après Informations pratiques |
| `convocation-ta` | TA Mobilité | Même ajout |
| `convocation-vtc` | VTC journée ; VA via sélection VTC existante | Même ajout |
| `convocation-vtc-soir` | VTC soir ; sélection VTC soir existante | Même ajout |

**Aucun modèle VA distinct n'existe en base.** Le sélecteur existant ne distingue que TA, TAXI et VTC/soir ; il reste inchangé, aucun changement de parcours ou d'intitulé n'est fabriqué ici.

FC VTC/TAXI et `convocation-examen` restent exclus. Les convocations FC suivent une règle antérieure sans référence aux cours en ligne et un circuit séparé `rendreConvocationFc` ; le paragraphe demandé est limité aux convocations initiales pour ne pas y promettre un accès à la plateforme. Ce circuit n'a pas été modifié ni activé.

## Texte ajouté, sans délai chiffré

**Assistance pédagogique et technique**

« Pendant votre formation, en cas de difficulté pour vous connecter, accéder aux cours, réaliser les exercices ou comprendre une notion, contactez notre équipe directement depuis la messagerie de la plateforme de formation ou par email à contact@ftransport.fr. Nous assurons le suivi de votre demande et vous répondons dans les meilleurs délais. »

Le reste du générateur, les objets, consignes, dates, accès et horaires sont inchangés. Le texte ajouté ne garantit pas une permanence 24h/24 ou un délai de réponse chiffré.

## Vérifications réellement exécutées

- **51 tests Vitest** : 7 nouveaux tests de génération sans transport et sans mutation des paramètres/historique fictif ; 7 accès/convocation, 5 règles FC et 32 règles de convocations FC existants. Deux exécutions séparées (44 + 7), pas de tests de copie ou de snapshots ajoutés.
- **8 aperçus Playwright** : quatre vrais corps de modèles lus en base, variables remplacées par données fictives, générateur actuel exécuté dans le navigateur ; PC 1280×1800 et mobile 390×844. Texte exact présent une fois, sans débordement de son encadré. Captures de l'encadré vues : TA PC, VTC mobile.
- Pas d'ouverture de session administrateur ou élève, pas d'appel de transport d'envoi ; ceci vérifie le générateur utilisé par l'aperçu, pas un clic CRM connecté ni une remise de courriel réelle.
- Compilation de l'aperçu : journal `build OK` à 09:53:40 UTC.
- Avant : modèles datés existants en base (TA/TAXI/VTC 08/10, VTC soir 27/08). Aucun appel d'écriture base réalisé. Les anciennes convocations restent leurs HTML enregistrés, sans transformation à la lecture.

## Qualiopi 19 — preuve prospective uniquement

Cette évolution documente les canaux annoncés par le dirigeant et prépare leur communication dans les nouvelles convocations **après publication autorisée**. Elle ne prouve pas une convocation effectivement envoyée, l'appropriation individuelle, un délai tenu ou la résolution des incidents ouverts. Elle n'est pas présentée comme une pièce déjà remise à un apprenant.

État relu en base : **`a_completer`, 17 preuves actives**. Aucun changement de statut ni rattachement en base d'une preuve d'envoi fictive. La présente pièce est conservée dans le projet comme preuve prospective, distincte des preuves réelles déjà rattachées. Les autres pièces manquantes de la revue probatoire restent nécessaires.

## Fichiers changés et activation

- `src/lib/convocationFormation.ts` : encadré dans le générateur de nouvelles convocations initiales uniquement.
- `src/test/convocation-assistance-generation.test.ts` : contrôles sans envoi ni mutation.
- `src/lib/AGENTS.md` : règle de séparation des générations et historiques.
- `roadmap.md` et ce rapport : suivi documentaire.

**Non publié/non déployé.** Les futurs envois réalisés depuis la version publiée actuelle ne sont pas déclarés modifiés par cet aperçu. Validation de publication nécessaire pour activer cet ajout sur l'application en ligne. Aucun mail envoyé, aucun historique, compte, droit ou dossier apprenant modifié.