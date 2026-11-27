"""Contrôle LECTURE SEULE du catalogue réel après 0307/0308 (aucune écriture).

Vérifie que : la liste de questions du navigateur n'est plus appelable ni lue comme preuve (0307) ;
la validation automatique n'est appelable que par le service ; l'écriture directe du relevé est gardée ;
la nouvelle règle de remise par quiz est en place ; les validations Admin append-only (empreintes)
concordent toujours avec les remises d'origine.
Usage : python3 src/test/completion_preuve_serveur_live_contract.py   (nécessite PGHOST)
"""
import subprocess, unittest

def live(q):
    return subprocess.check_output(['psql', '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-c', q], text=True).strip()

def droit(role, fn):
    return live(f"select has_function_privilege('{role}', '{fn}', 'execute')")

class CatalogueReel(unittest.TestCase):
    def test_0307_liste_navigateur_retiree(self):
        fn = 'public.enregistrer_questions_affichees(uuid,text,text[])'
        self.assertEqual((droit('authenticated', fn), droit('anon', fn)), ('f', 'f'))
        self.assertEqual(live("select position('quiz_questions_affichees' in pg_get_functiondef('public.etat_completion_modules'::regproc))"), '0')
        self.assertEqual(live("select count(*) from public.quiz_questions_affichees"), '0')

    def test_0308_autovalidation_service_seul(self):
        fn = 'public.autovalidate_module_if_complete(uuid,integer,integer)'
        self.assertEqual((droit('authenticated', fn), droit('anon', fn), droit('service_role', fn)), ('f', 'f', 't'))

    def test_0308_garde_ecriture_directe_et_remise_par_quiz(self):
        self.assertEqual(live("select count(*) from pg_trigger where tgname='trg_000_garde_ecriture_directe_releve' and tgenabled='O'"), '1')
        self.assertNotEqual(live("select position('quiz non remis au serveur' in pg_get_functiondef('public.save_module_completion'::regproc))"), '0')

    def test_droits_application_inchanges(self):
        for fn in ['public.save_module_completion(uuid,integer,boolean,integer,integer,integer,jsonb)', 'public.etat_completion_modules(uuid)',
                   'public.submit_quiz_attempt(uuid,text,text,jsonb,numeric,integer,integer)']:
            self.assertEqual(droit('authenticated', fn), 't', fn)
            self.assertEqual(droit('anon', fn), 'f', fn)

    def test_validations_admin_toujours_concordantes(self):
        ko = live("""select count(*) from public.module_completion_validations_admin va, jsonb_array_elements(va.preuves) p
          where not exists (select 1 from public.reponses_apprenants r where r.apprenant_id=va.apprenant_id
            and r.exercice_id=p->>'exercice_id' and r.status='submitted'
            and r.submitted_at=(p->>'submitted_at')::timestamptz and md5(r.reponses::text)=p->>'empreinte')""")
        self.assertEqual(ko, '0')
        self.assertEqual(live("select count(*) from public.module_completion_validations_admin"), '2')

if __name__ == '__main__':
    unittest.main(verbosity=2)
