# Résolution des blocages restants — 07/11/2026 (depuis 296b9aba)

Aperçu/code isolé uniquement. Aucune migration, aucun déploiement, aucune écriture réelle,
aucun export ni restauration réels, aucun mail/SMS/IA. Rien de publié.

## 1. Refus 22P05 (U+0000) — solution complète prête à appliquer

Choix : projection sans U+0000 + original exact versionné par question (base64 UTF-8 du JSON),
au lieu du codec U+2400 (abandonné : il modifiait des symboles littéraux).
- L'appareil envoie la saisie exacte (aucune transformation côté client).
- `upsert-reponse-apprenant` : lot sans U+0000 → `persist_answer_batch_v2` inchangé ;
  lot avec U+0000 → `persist_answer_batch_v3` (projection + marqueurs + événements marqués),
  puis ACK seulement après relecture exacte des réponses appliquées ET des événements du
  journal ; valeurs « sautées » renvoyées exactes (reprise après réponse perdue).
- v3 absente (migration non appliquée) → refus définitif 22P05 visible, mémorisé 10 min,
  aucune boucle ; identifiant contenant U+0000 → refus avant écriture.
- Marqueur valide seulement si version connue, projection = valeur stockée et seq = seq de la
  question ; tout autre écrivain l'invalide. Ancienne valeur non marquée jamais décodée.
- Lecteurs : élève/admin/notes/IA lisent la projection (texte visible identique, U+0000 est
  invisible) ; export nocturne inclut la colonne (select *) ; `lireReponsesExactes` restitue
  l'original (export/historique/restauration). Historique de nouvelle tentative : projection,
  original exact conservé dans le journal append-only.
- Noyau V2 (`core_save_answer`) : refus local déterministe sans appel, élément écarté et
  conservé (copie de référence via la fonction serveur).
- Stockage local plein : le message n'affirme plus « conservée sur cet appareil ».
- Après activation, la prochaine saisie sur le même exercice renvoie les éléments bloqués
  compatibles (mécanisme existant) ; aucun déblocage forcé.

## 2. Durcissement sécurité — réserves levées

Vérifié en SELECT (aucun secret lu) : 21 tâches planifiées, aucune n'appelle les fonctions
de correction/notation, ni directement ni via `qrc_ia_publier_*` ; aucun déclencheur ;
appelants réels = admin (publish/revise), élève propriétaire (recalc), IA via
`qrc_ia_publier_auto/reprise` (service_role imbriqué). Le rôle cron dédié est donc retiré :
aucune adaptation du scheduler nécessaire. Garde-fou : l'application s'interrompt si une
tâche dépendante apparaît. Retour arrière figé préparé et testé.

## 3. Sauvegarde cohérente

Constaté (lecture seule) : base 1 552 Mo, `archive_mode=on`, `wal_level=logical` (gérés par
l'hébergement). Cela NE prouve PAS un PITR accessible : la documentation Lovable Cloud indique
sauvegardes quotidiennes (~14 j), restauration en place uniquement, pas de PITR.
Un instantané cohérent ne peut pas être produit par l'export paginé HTTP. Seules voies :
sauvegarde quotidienne gérée (en place) ou « Export data » complet (UI : More → Database →
Manage → Settings, limite 1 par 24 h, coût non documenté). Ajout : `scripts/restauration_jetable.py`
restaure un export nocturne dans une base locale jetable et contrôle comptes, doublons,
fichiers tronqués, références, marqueurs ; refuse toute cible non locale ; garde
`instantane_coherent: false`.

## Tests exécutés (07/11 ~13:10–13:25 UTC)
- PostgreSQL jetable : `originaux_exacts_nul_contract.py` 1/1 OK ; `core_correction_securite_contract.py` 1/1 OK ;
  `restauration_jetable_contract.py` 1/1 OK ; `transport_nul_22p05_contract.py` 1/1 OK.
- Vitest : 30 fichiers ciblés 246/246 ; suite complète 3 688 réussis, 13 ignorés, 0 échec.
- Build aperçu : OK.

## Non vérifié
Fonction serveur réelle déployée avec PostgREST réel (handler testé avec base simulée, SQL
testé séparément) ; parcours élève sur appareil ; attribution exacte du 22P05 d'Ahmed ;
file locale de son appareil ; export « Export data » et sa restauration.

## Activation (ordre, chacun réversible)
1. Migration `2026-11-07-originaux-exacts-nul.sql` (additive). Retour : rien à supprimer.
2. Déployer `upsert-reponse-apprenant`. Retour : redéployer la version précédente.
3. Hors correction en cours : `2026-11-07-securiser-fonctions-correction-notes.sql`.
   Retour : `2026-11-07-securiser-fonctions-RETOUR-ARRIERE.sql`.
4. Publication frontend (lot global de l'aperçu, revue séparée).
5. Contrôle : un enregistrement réel contenant U+0000 n'est pas provoqué ; surveiller les
   journaux `nul_*`/`original_non_prouve`.
