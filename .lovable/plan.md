# Envoi automatique des accès à 6 h : élèves ayant déjà un compte

## Cause exacte, trouvée en lecture seule
- L'alerte du 01/10 à 06:00 et celle du 02/10 à 06:00 indiquent la même chose : 0 envoyé, 1 échec, raison « Utilisateur existant introuvable ».
- L'élève concerné est **OUERFELLI ISAM** (issam.ouerfelli@gmail.com), avec un dossier créé le 17/09/2026.
- Le cas était déjà là les 29 et 30/09 pour **naoufal.guenichi@yahoo.fr**.
- Le compte de connexion de cet e-mail existe bien : créé le 10/03/2026, dernière connexion le 28/09/2026.
- **Le bug :** quand le compte existe déjà, l'envoi cherche ce compte dans la liste des comptes, mais il n'en lit que la première page (50 comptes sur 286). Les comptes au-delà ne sont jamais trouvés, donc l'envoi échoue.

## Point qui demande votre décision
- ISAM a **2 dossiers** : un dossier VTC e-learning de février 2026 et un nouveau dossier VTC de septembre 2026. Le compte existant appartient à son premier dossier.
- La règle enregistrée dit : « Réinscription = nouveau dossier avec de NOUVEAUX identifiants, sans toucher au dossier initial ». Or une adresse e-mail ne peut porter qu'un seul compte de connexion.
- Donc, si l'e-mail est déjà rattaché à un autre dossier, je propose de **ne rien rattacher automatiquement**. L'envoi s'arrête pour cet élève, avec la mention « Réinscription : compte déjà lié au dossier du JJ/MM — décision Admin requise », et le personnel est alerté. Ainsi, aucun mélange entre deux dossiers.
- Si l'e-mail n'est rattaché à aucun autre dossier (compte orphelin), il est réutilisé tel quel. Son mot de passe n'est pas modifié, puis l'e-mail d'accès part.

## Correctif
1. Recherche du compte existant par e-mail, exacte et sans tenir compte des majuscules, sur **tous** les comptes : lecture paginée, plus de limite à 50.
2. Règle de réutilisation ci-dessus : compte orphelin réutilisé, compte lié à un autre dossier bloqué et signalé.
3. **Alerte au personnel :** dès qu'un envoi échoue, un e-mail part à contact@ftransport.fr avec le nom de l'élève, l'e-mail et la raison. L'alerte de la page admin est gardée.
4. **Test de non-régression** sur des données fictives, sans vrai élève, avec 4 cas :
   - nouveau compte : envoyé ;
   - compte existant au-delà des 50 premiers : trouvé et envoyé ;
   - e-mail en majuscules : trouvé ;
   - compte déjà lié à un autre dossier : bloqué et signalé, aucun rattachement.

Aucun e-mail ne sera envoyé à ISAM ni à aucun autre élève pendant les essais. Le prochain passage réel aura lieu demain à 6 h.

## Détails techniques
- `supabase/functions/auto-send-credentials/index.ts` : remplacement de `listUsers()` (1re page) par une recherche paginée (perPage 1000) avec comparaison en minuscules. Contrôle `apprenants.auth_user_id` avant tout rattachement. Envoi d'un e-mail d'échec par le même canal que les e-mails actuels.
- `src/test/auto-send-credentials-compte-existant.test.ts` (nouveau) : logique de recherche et de décision extraite en fonction pure, testée sur les 4 cas.
- Aucune migration, aucune donnée modifiée.
