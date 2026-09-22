# Étape 4 — Diagnostic des alertes bloquées (lecture seule, non appliqué)

## Constat (vérifié en base, aucune modification)

Table `alertes_systeme` :

- Droits techniques : `anon`, `authenticated`, `service_role` ont bien SELECT et INSERT.
- Sécurité par ligne (RLS) : **les quatre règles exigent `has_role(auth.uid(), 'admin')`**
  (`Admins can insert/select/update/delete alertes_systeme`).

Conséquence exacte : toute alerte produite par un contexte **non administrateur**
(apprenant en cours d'examen, visiteur non connecté, tâche planifiée, fonction
serveur appelée avec la clé publique) est refusée — `permission denied` /
violation de la règle de sécurité. C'est la raison pour laquelle, le soir de la
panne, aucune alerte n'a pu être enregistrée : ce n'était pas un bug de code.

## Correction préparée (moindre privilège, NON appliquée)

On n'ouvre pas la table. On autorise uniquement l'écriture par le **rôle de
service**, c'est-à-dire par une fonction serveur de surveillance, jamais par le
navigateur :

```sql
-- Écriture réservée au service de surveillance (clé de service, côté serveur).
create policy "Service monitoring peut insérer une alerte"
on public.alertes_systeme
for insert
to service_role
with check (true);
```

- Lecture, modification et suppression restent réservées aux administrateurs.
- `anon` et `authenticated` n'obtiennent **aucun** droit supplémentaire.
- Le navigateur ne peut toujours pas écrire d'alerte : il passe par la fonction
  serveur de surveillance.

Rappel : la table d'alertes reste un canal **secondaire**. Le canal principal est
hors base (webhook/e-mail technique), afin qu'une alerte parte même quand la base
est totalement inaccessible.
