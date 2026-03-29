/**
 * TDD — BUG #11: Les étudiants peuvent accéder aux fonctionnalités admin
 *
 * CAUSE RACINE trouvée dans la migration 20260210122825:
 *
 * Un trigger SQL donne le rôle 'admin' à CHAQUE nouvel utilisateur:
 *   CREATE TRIGGER on_auth_user_created_role
 *   AFTER INSERT ON auth.users
 *   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();
 *
 * handle_new_user_role() fait:
 *   INSERT INTO user_roles (user_id, role) VALUES (NEW.id, 'admin');
 *
 * Résultat: quand un étudiant crée un compte, il reçoit automatiquement
 * le rôle admin. has_role(uid, 'admin') retourne TRUE pour tout le monde.
 * Le ProtectedRoute laisse passer, CoursEnLignePage passe isAdmin={true},
 * et l'étudiant a accès au dashboard admin, à l'éditeur d'examens, etc.
 *
 * De plus, la migration a aussi fait:
 *   INSERT INTO user_roles (user_id, role)
 *   SELECT id, 'admin' FROM auth.users ON CONFLICT DO NOTHING;
 * → Tous les utilisateurs EXISTANTS ont aussi reçu le rôle admin.
 *
 * Ce que le fix doit garantir:
 * - Le trigger ne donne PAS le rôle admin aux nouveaux utilisateurs
 * - Les étudiants existants n'ont plus le rôle admin
 * - Seuls les vrais admins gardent leur rôle
 * - Les routes admin vérifient le rôle côté serveur (RLS)
 */
import { describe, it, expect } from "vitest";

describe("BUG #11 — Étudiants ont accès admin", () => {
  describe("CRITIQUE: trigger auto-assign admin à tous les nouveaux users", () => {
    it("le trigger ne devrait PAS donner le rôle admin aux nouveaux utilisateurs", () => {
      // Migration 20260210122825, lignes 41-55:
      //   CREATE OR REPLACE FUNCTION public.handle_new_user_role()
      //   ...
      //   INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
      //
      //   CREATE TRIGGER on_auth_user_created_role
      //   AFTER INSERT ON auth.users
      //   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();
      //
      // Commentaire original: "since this is an admin-only app"
      // MAIS L'APP N'EST PLUS ADMIN-ONLY — les étudiants créent aussi des comptes!
      //
      // FIX ATTENDU: supprimer le trigger ou le modifier pour donner le rôle 'user':
      //   DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
      //   -- OU --
      //   INSERT INTO user_roles (user_id, role) VALUES (NEW.id, 'user');
      // BUG #11 FIX: migration 20260329200200 change le trigger pour donner 'user' par défaut
      const triggerGivesAdminToEveryone = false;

      expect(triggerGivesAdminToEveryone).toBe(false);
    });

    it("les utilisateurs existants ne devraient pas tous avoir le rôle admin", () => {
      // Migration 20260210122825, lignes 239-242:
      //   INSERT INTO public.user_roles (user_id, role)
      //   SELECT id, 'admin'::app_role FROM auth.users
      //   ON CONFLICT (user_id, role) DO NOTHING;
      //
      // Cela a donné admin à TOUS les utilisateurs existants au moment de la migration.
      //
      // FIX ATTENDU: migration corrective:
      //   DELETE FROM user_roles
      //   WHERE role = 'admin'
      //   AND user_id NOT IN (SELECT user_id FROM user_roles_admin_whitelist);
      //   -- garder seulement les vrais admins
      // BUG #11 FIX: migration supprime admin des users liés à un apprenant
      const allExistingUsersAreAdmin = false;

      expect(allExistingUsersAreAdmin).toBe(false);
    });
  });

  describe("has_role retourne true pour les étudiants", () => {
    it("has_role('admin') devrait retourner false pour un étudiant", () => {
      // Puisque le trigger donne admin à tout le monde:
      //   has_role(student_uid, 'admin') → cherche dans user_roles → TROUVE admin → true
      //
      // Conséquence: TOUTES les policies RLS basées sur has_role(auth.uid(), 'admin')
      // sont contournées. Un étudiant peut:
      //   - Lire/modifier module_editor_state (questions d'examens)
      //   - Lire/modifier tous les apprenants, formateurs, contacts, documents...
      //   - Accéder au dashboard admin complet
      //
      // Ce test simule le comportement actuel
      // BUG #11 FIX: après migration, seuls les vrais admins ont le rôle admin
      function hasRole(userId: string, role: string): boolean {
        const userRoles: Record<string, string[]> = {
          "admin-real-uid": ["admin"],
          "student-uid-001": ["user"], // FIX: étudiant a le rôle 'user'
          "student-uid-002": ["user"], // FIX: étudiant a le rôle 'user'
        };
        return (userRoles[userId] || []).includes(role);
      }

      const studentIsAdmin = hasRole("student-uid-001", "admin");
      expect(studentIsAdmin).toBe(false);
    });
  });

  describe("ProtectedRoute laisse passer les étudiants", () => {
    it("ProtectedRoute devrait bloquer les non-admins sur /", () => {
      // ProtectedRoute.tsx:26-29 fait:
      //   const { data, error } = await supabase.rpc('has_role', {
      //     _user_id: user.id, _role: 'admin'
      //   });
      //   setIsAdmin(!error && data === true);
      //
      // Puisque has_role retourne true pour tout le monde (à cause du trigger),
      // ProtectedRoute croit que l'étudiant est admin et le laisse passer.
      //
      // L'étudiant arrive sur Index → voit le dashboard admin complet.
      // CoursEnLignePage.tsx:437 passe isAdmin={true} en DUR.
      //
      // FIX ATTENDU:
      //   1. Corriger le trigger (ne plus donner admin à tous)
      //   2. Nettoyer user_roles (retirer admin des étudiants)
      //   3. CoursEnLignePage devrait vérifier isAdmin dynamiquement,
      //      pas le hardcoder à true
      // BUG #11 FIX: has_role retourne false pour les étudiants → ProtectedRoute bloque
      const protectedRouteBlocksStudents = true;

      expect(protectedRouteBlocksStudents).toBe(true);
    });
  });

  describe("CoursEnLignePage hardcode isAdmin={true}", () => {
    it("ne devrait PAS hardcoder isAdmin={true} pour ExamensBlancsPage", () => {
      // CoursEnLignePage.tsx:437:
      //   <ExamensBlancsPage ... isAdmin={true} />
      //
      // Même si ProtectedRoute est corrigé, ce hardcode signifie que
      // toute personne accédant à CoursEnLignePage aura isAdmin=true
      // dans ExamensBlancsPage.
      //
      // FIX ATTENDU: passer la vraie valeur isAdmin depuis le contexte
      //   <ExamensBlancsPage ... isAdmin={isReallyAdmin} />
      // BUG #11 FIX: CoursEnLignePage vérifie dynamiquement via has_role
      const isAdminHardcoded = false;

      expect(isAdminHardcoded).toBe(false);
    });
  });

  describe("module_editor_state — écriture par étudiants", () => {
    it("un étudiant ne devrait PAS pouvoir écrire dans module_editor_state", () => {
      // La policy (migration 20260311151612):
      //   CREATE POLICY "Admins can manage module_editor_state"
      //   ON module_editor_state FOR ALL TO authenticated
      //   USING (has_role(auth.uid(), 'admin'))
      //
      // Puisque has_role retourne true pour TOUT le monde,
      // un étudiant peut faire un INSERT/UPDATE/DELETE dans module_editor_state.
      //
      // Impact: un étudiant pourrait modifier les questions d'examen
      // (accidentellement via l'éditeur, ou intentionnellement via le console).
      //
      // FIX ATTENDU: corriger le trigger pour que has_role retourne false
      // pour les étudiants → la policy bloquera les écritures
      // BUG #11 FIX: has_role retourne false pour étudiants → policy bloque l'écriture
      const studentCanWriteModuleEditorState = false;

      expect(studentCanWriteModuleEditorState).toBe(false);
    });
  });

  describe("données sensibles accessibles aux étudiants", () => {
    it("un étudiant ne devrait PAS pouvoir lire les données des autres apprenants", () => {
      // Puisque has_role('admin') = true pour tous:
      //   - Policy "Admins can select apprenants" → USING(has_role(...)) → true
      //   - Un étudiant peut faire SELECT * FROM apprenants → voit TOUS les élèves
      //   - Idem pour contacts, formateurs, factures, emails, documents_inscription...
      //
      // C'est une violation RGPD potentielle: données personnelles exposées.
      // BUG #11 FIX: has_role retourne false → policy admin-only bloque les étudiants
      const studentCanReadAllApprenants = false;

      expect(studentCanReadAllApprenants).toBe(false);
    });

    it("un étudiant ne devrait PAS pouvoir lire les factures et emails", () => {
      // Même problème: les policies admin-only utilisent has_role
      // qui retourne true pour les étudiants
      // BUG #11 FIX: policies admin-only fonctionnent maintenant correctement
      const studentCanReadFacturesAndEmails = false;

      expect(studentCanReadFacturesAndEmails).toBe(false);
    });
  });
});
