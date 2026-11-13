# Fiabiliser les notes et statuts des examens blancs

## Périmètre
Tous les EB1–EB6 TAXI/VTC, toutes les matières et tous les candidats. Travail en aperçu et lectures réelles uniquement : aucune note, réponse, tentative, signature, progression ou autorisation modifiée ; aucune migration ni publication.

## Audit exhaustif
- Inventorier les passages ouverts/remis, les résultats officiels et leur publication, les QRC, les reçus secondaires, les archives/reset et les lecteurs CRM/élève/correction.
- Lire par petits lots déterministes ; compter séparément natifs, historiques importés, tests et archives. Un échec de lecture signifie **audit incomplet**, jamais zéro anomalie.
- Produire un tableau par type : note publiée masquée, matière remise indiquée non passée, attente QRC injustifiée, publication réellement manquante, compteur divergent, faux brouillon reprenable, ambiguïté de provenance, snapshot/preuve insuffisants. Identifier les comptes et les copies sans exposer les réponses.
- Les lectures globales ont actuellement échoué ; les chiffres exhaustifs et la sauvegarde/restauration restent donc non prouvés jusqu’à une lecture complète réussie.

## Source commune d’affichage
- Centraliser le choix et le statut d’une copie par compte/examen/matière dans un adaptateur réutilisé par la liste élève, les résultats détaillés, Mes notes, le CRM et Notes par session.
- **Priorité proposée** : pour les vues actuelles, dernière copie réellement remise de chaque matière après exclusions serveur des archives/reset ; départager par heure de remise puis ID immuable. Une copie récente encore en attente ne récupère jamais la note d’une ancienne copie. Les écrans historiques restent liés à l’ID choisi.
- La vue actuelle agrège les dernières matières comme Notes par session ; le diagnostic d’un passage complet conserve séparément la règle stricte des sept matières d’une même tentative enregistrée. Aucun numéro de tentative déduit d’une proximité de dates.
- Une copie native est affichée depuis son propre snapshot, ses réponses et son résultat ; aucun reçu secondaire nécessaire et aucune liaison fictive créée. Un reçu ultérieur divergent reste séparé et déclenche une revue explicite.
- Distinguer : QRC réellement à corriger, publication en attente, identité à vérifier, lecture impossible et non passé. Une copie remise incertaine est **à vérifier**, jamais non passée ni zéro technique.
- La reprise exige un passage ouvert prouvé ou une vraie copie legacy non remise ; les restes exacts de sauvegarde antérieurs à une remise ne créent pas de bouton de reprise. Incertitude = revue, pas nouveau démarrage.

## Contrôle réexécutable
- Ajouter un rapport administratif en lecture seule dans la surveillance existante, avec comptages, comptes/copies concernés, date du contrôle et bouton de vérification.
- Lectures paginées, annulation et contrôle de génération ; un résultat partiel ou ancien ne devient pas une confirmation. Confirmer les anomalies par une seconde lecture réussie.
- Mises à jour sur événements de correction/finalisation/reset et retour de connexion/onglet, sans polling supplémentaire ni action de recalcul.

## Tests et décision
- Matrice EB1–6 TAXI/VTC × sept matières : absence de reçu, reçu périmé, vrai zéro, QRC partielle/restante, publication manquante, copies multiples, snapshots divergents, reset/archive, compte différent.
- Tests de concurrence : anciennes réponses réseau ignorées, lecture incomplète refusée, correction pendant lecture, reconnexion et événements regroupés.
- Tests PC/mobile avec scénarios fictifs protégés contre les écritures ; lectures administrateur réelles seulement si disponibles. Exécuter la suite complète et contrôler la compilation, en séparant PASS/FAIL/NON PROUVÉ.
- Livrer métriques exactes si l’audit aboutit, preuves et limites. **NO-GO publication** tant que sécurité, restauration et parcours réels nécessaires ne sont pas prouvés ; aucune promesse de zéro bug.

## Détails techniques
- Réutiliser `ebNativeDisplay`, `copieRecenteSession`, `coreExamPublication`, les règles de score figées et les lecteurs paginés existants ; éviter un deuxième moteur de notation.
- Garder la correction et les autorisations de reset liées à leurs IDs immuables ; l’adaptateur d’affichage ne donne aucun droit d’écriture.
- Le parent des examens conserve actuellement un polling de 8 secondes, contrairement à la règle historique « zéro polling ». Il restera inchangé dans ce périmètre ; sa suppression exige une décision séparée et des tests dédiés. Aucun nouveau polling ajouté.