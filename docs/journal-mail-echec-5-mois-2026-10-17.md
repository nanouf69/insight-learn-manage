# Journal — Mail d'échec : disponibilité pratique 6 → 5 mois (17/10/2026)

## Changement
- `supabase/functions/_shared/modeleEchecChoixPratique.ts` : texte figé « pendant 6 mois » → « pendant 5 mois » (SUITE_PRATIQUE + constant PASSAGE_6_MOIS renommé PASSAGE_DELAI_MOIS, même phrase). Style rouge + gras du passage inchangé.
- `echeancesDepuisEnvoi` : fin de disponibilité calculée à +5 mois (au lieu de +6). La date « réponse attendue » (5 jours) inchangée.
- Tests mis à jour : `src/test/entrainement-pratique-vtc.test.ts`, `src/test/echec-choix-pratique-serveur.test.ts` — 41/41 PASS.

## Données et envois existants
- Aucun document envoyé modifié : chaque doc conserve son `texte_fige` + `texte_empreinte` figés (les mails déjà partis avec 6 mois restent valides, la page de signature lit l'instantané stocké).
- `MODELE_VERSION` conservé (« v2-2026-10-15 ») pour ne pas casser la détection « déjà envoyé » par examen (clé_envoi + version) : aucun risque de double envoi.

## Déploiement
- Fonction Edge `envoi-echec-choix-pratique` redéployée (source SHA-256 `5bfb4e61f943a5fc286d41e0e73d1f3366bcd00b5fcf0b1703df59e5cbfa5158`) ; OPTIONS 200 vérifié après déploiement. Aucun email envoyé pendant l'opération.
- `document-signature-public` non redéployée : elle lit le `texte_fige` stocké de chaque document, rien à changer.
