"""Catalogue admin + sauvegarde commentaire candidat sur PostgREST/PostgreSQL jetables seulement."""
import json, pathlib, unittest, uuid
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import qrc_commentaire_http_e2e as m

ROOT = pathlib.Path(__file__).resolve().parents[2]
ADMIN2 = str(uuid.uuid4())

class Catalogue(m.E2E):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        sql = (ROOT/'docs/sql-revue/2026-11-10-qrc-mots-cles.sql').read_text()
        c, o = cls.pg.sql(sql); assert c == 0, o
        c, o = cls.pg.sql(f"INSERT INTO public.user_roles(user_id,role) VALUES ('{ADMIN2}','admin'); NOTIFY pgrst, 'reload schema';")
        assert c == 0, o
        import time; time.sleep(1)

    def http(self, user, path, method='GET', body=None, role='authenticated'):
        r = Request(f'http://127.0.0.1:{self.rest_port}/{path}',
                    headers={'Authorization':f'Bearer {m.jwt(user,role)}','Content-Type':'application/json'},
                    data=json.dumps(body).encode() if body is not None else None, method=method)
        try:
            with urlopen(r) as res: return res.status, json.loads(res.read() or b'null')
        except HTTPError as e: return e.code, e.read().decode()

    def save(self, user, id, texte, version=None, archive=False):
        return self.http(user,'rpc/qrc_commentaire_rapide_enregistrer','POST',
            {'p_id':id,'p_texte':texte,'p_version':version,'p_archive':archive})

    def test_catalogue_partage_rejeu_conflit_archivage(self):
        id = str(uuid.uuid4())
        status, row = self.save(m.ADMIN,id,'Texte libre <script>non exécuté</script>'); self.assertEqual(status,200,row)
        self.assertEqual(row['version'],1)
        self.assertEqual(self.save(m.ADMIN,id,row['texte'])[1]['version'],1)
        status, rows = self.http(ADMIN2,f'qrc_commentaires_rapides?id=eq.{id}'); self.assertEqual(status,200); self.assertEqual(rows[0]['texte'],row['texte'])
        status, edited = self.save(ADMIN2,id,'Renommé',1); self.assertEqual(status,200,edited); self.assertEqual(edited['version'],2)
        self.assertEqual(self.save(m.ADMIN,id,'Écrasement périmé',1)[0],400)
        self.assertEqual(self.save(ADMIN2,id,'Renommé',1)[1]['version'],2)
        status, removed = self.save(m.ADMIN,id,'Renommé',2,True); self.assertEqual(status,200,removed)
        self.assertEqual(self.http(ADMIN2,f'qrc_commentaires_rapides?id=eq.{id}&archive=eq.false')[1],[])
        self.assertEqual(self.http(ADMIN2,f'qrc_commentaires_rapides?id=eq.{id}')[1][0]['texte'],'Renommé')
        self.assertEqual(self.save(m.ADMIN,id,'Résurrection',3)[0],400)

    def test_acces_admin_exclusif(self):
        id = str(uuid.uuid4()); self.assertEqual(self.save(m.ADMIN,id,'Privé')[0],200)
        self.assertEqual(self.http(m.ELEVE,f'qrc_commentaires_rapides?id=eq.{id}')[1],[])
        self.assertEqual(self.save(m.ELEVE,id,'Intrusion',1)[0],403)
        self.assertEqual(self.http(None,'qrc_commentaires_rapides',role='anon')[0],401)
        self.assertEqual(self.http(m.ELEVE,'qrc_commentaires_rapides','POST',{'texte':'Intrusion'})[0],403)
        self.assertEqual(self.http(m.ADMIN,f'qrc_commentaires_rapides?id=eq.{id}','DELETE')[0],403)
        self.assertEqual(self.save(m.ADMIN,str(uuid.uuid4()),'   ')[0],400)

    def test_commentaire_candidat_independant_du_catalogue(self):
        id = str(uuid.uuid4()); texte = 'Mon retour personnalisé'
        self.assertEqual(self.save(m.ADMIN,id,texte)[0],200)
        att, qrcs = self.preparer('snap_eb3_vtc_gestion.json'); qi, pts = qrcs[0]
        self.assertIsNone(self.client(m.ADMIN,'corriger',{'qi':qi,'note':pts})['erreur'])
        before = self.empreinte(att)
        # Exact RPC used by the UI, with version read from the existing journal.
        ev = self.http(m.ADMIN,f'qrc_correction_events?qrc_instance_id=eq.{qi}&order=correction_event_id.desc')[1][0]['correction_event_id']
        status, out = self.http(m.ADMIN,'rpc/core_commenter_qrc','POST',{
            'p_operation_id':str(uuid.uuid4()), 'p_qrc_instance_id':qi,'p_note_attendue':pts,
            'p_dernier_evenement_attendu':ev, 'p_commentaire':texte,'p_corrige_email':None})
        self.assertEqual(status,200,out)
        self.assertEqual(self.save(ADMIN2,id,'Nouveau texte',1)[0],200)
        self.assertEqual(self.save(ADMIN2,id,'Nouveau texte',2,True)[0],200)
        self.assertEqual(self.client(m.ELEVE,'candidat',{'att':att})['commentaires'][qi],texte)
        self.assertEqual(before,self.empreinte(att))

if __name__ == '__main__': unittest.main(verbosity=2)