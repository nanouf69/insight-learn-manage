# Faille : attribution du nouveau Bilan 5/11 par n'importe quel compte connecté (29/10, non appliquée)

Constat (lecture seule) : `bilan_future_grant_internal(p_owner uuid, p_module int)` est SECURITY DEFINER et
EXECUTE est accordé à `authenticated` (et `PUBLIC`). Un compte connecté peut donc l'appeler directement
avec l'identifiant d'un AUTRE élève et l'inscrire au nouveau circuit, même si `open_to_new = false`.

Correction minimale proposée (une migration, aucune donnée touchée) :

```sql
REVOKE EXECUTE ON FUNCTION public.bilan_future_grant_internal(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bilan_future_route(integer) FROM PUBLIC, anon;
-- bilan_future_route (appelée par l'élève) et bilan_future_admin_grant restent les seules entrées ;
-- la fonction interne continue d'être appelée par elles (SECURITY DEFINER, propriétaire).
```

Contrôle après : `has_function_privilege('authenticated','public.bilan_future_grant_internal(uuid,integer)','execute') = false`,
et `bilan_future_route(5)` renvoie toujours `future` pour le compte de test déjà autorisé.
