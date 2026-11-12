# Complément isolé : carte QRC VTC

SELECT module 5 confirmé : carte active `1794399472264`, titre `Questions QRC VTC`, description et sous-titre contenant `https://quick-qna-engine.lovable.app`. `9001` est l'autre carte `📝 Questions QRC`, sans ce lien.

Modification fonctionnelle unique : constante `BILAN_VTC_QRC_COURS` dans `src/lib/bilanVtcComplements.ts`. Le filtre complémentaire affiche la carte demandée au lieu de 9001 ; le reste des banques et routes legacy demeure intact. Aucun contenu serveur modifié. F/G/H, indices et persistance inchangés. Test et règle locale mis à jour.

Mise en service future : reporter cette constante avec le correctif F/G/H isolé, pas le bundle global. Aucun déploiement frontend effectué.

Vérifications : 20 tests exécutés PASS ; filtre refuse module 11 et 9001. Chromium sur vrai ModuleDetailView, contenu serveur et réponses fictives : aperçu admin, un lien exact, clic vers destination exacte interceptée (pas d'accès au service externe), zéro appel pédagogique mutateur ; F/G/H 49/46/48, réponse F conservée. Route élève future simulée : lien exact visible et cliqué ; le composant A–E monté demande son ouverture habituelle bilan_future_open, entièrement interceptée, jamais envoyée. Donc zéro écriture réelle, mais absence absolue de demande mutatrice n'est prouvée que dans l'aperçu admin. Pas de soumission ni session réelle élève utilisée. Build OK.