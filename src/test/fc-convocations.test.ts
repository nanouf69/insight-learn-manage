// @vitest-environment node
import {describe,it,expect,vi} from 'vitest';
import {simulerConvocationFc,rendreConvocationFc,type VirementFcConvocation} from '../../supabase/functions/_shared/fcConvocationsRegles';
import {transporterConvocationFc} from '../../supabase/functions/_shared/fcConvocationsEnvoi';
const s={id:'s',nom:'Formation Continue VTC',date_debut:'2026-11-17',date_fin:'2026-11-18',lieu:'86 route de genas 69003 Lyon',heure_debut:'09:00',heure_fin:'17:00'};
const i={id:'i',apprenant_id:'a',session_id:'s',liste_attente:false,montant_total:200};
const a={id:'a',nom:'Fictif',prenom:'Karim',email:'fictif@example.invalid'};
const tx=(montant=200,id='t',reference='bank-id'):VirementFcConvocation=>({id,banque:'Revolut',reference,montant,date_operation:'2026-11-06',statut:'justifie',categorie:'recette_formation',libelle:'Formation continue Fictif Karim'});
const preuve=(id='t')=>({transaction_id:id,inscription_id:'i',confirme_par:'admin',piece_reference:'justificatif-unique'});
const base=()=>({session:s,inscription:i,stagiaire:a,virements:[tx()],preuves:[preuve()],exigible:{inscription_id:'i',montant:200,reference_contrat:'contrat-signe',confirme_par:'admin'},depuis:'2026-11-05T10:00:00Z',aujourdHui:'2026-11-05'});
describe('FC convocations : règles prouvées',()=>{
  it.each([50,150,200])('%i € confirmés suffisent (seuil 50 €)',m=>expect(simulerConvocationFc({...base(),virements:[tx(m)]}).statut).toBe('eligible'));
  it('49,99 € ne déclenche pas',()=>expect(simulerConvocationFc({...base(),virements:[tx(49.99)]}).statut).toBe('exclu'));
  it.each([200,300,500])('%i € atteint le contrat 200 €',m=>expect(simulerConvocationFc({...base(),virements:[tx(m)]}).statut).toBe('eligible'));
  it('solde complet non exigé : 50 € sans contrat suffit',()=>expect(simulerConvocationFc({...base(),virements:[tx(50)],exigible:undefined}).statut).toBe('eligible'));
  it('nom seul/homonyme sans association explicite refuse',()=>expect(simulerConvocationFc({...base(),preuves:[]}).statut).toBe('a_revoir'));
  it('CMA catégorisé examen jamais admissible',()=>expect(simulerConvocationFc({...base(),virements:[{...tx(),categorie:'frais_examen_cma'}]}).statut).toBe('a_revoir'));
  it('même virement importé trois fois ne fait que 50 €',()=>{
    const r=simulerConvocationFc({...base(),virements:[tx(50,'t'),tx(50,'u'),tx(50,'v')],preuves:[preuve('t'),preuve('u'),preuve('v')]});
    expect(r.totalCentimes).toBe(5000);expect(r.statut).toBe('eligible');
  });
  it('50 + 150 de deux références distinctes = 200',()=>expect(simulerConvocationFc({...base(),virements:[tx(50),tx(150,'u','distinct')],preuves:[preuve(),preuve('u')]})).toMatchObject({statut:'eligible',totalCentimes:20000}));
  it('référence manquante ou contradictoire refuse',()=>{
    expect(simulerConvocationFc({...base(),virements:[{...tx(),reference:null}]}).statut).toBe('a_revoir');
    expect(simulerConvocationFc({...base(),virements:[tx(),tx(50,'u')]}).statut).toBe('a_revoir');
  });
  it('un paiement ou un doublon ne peut servir deux sessions',()=>{
    expect(simulerConvocationFc({...base(),preuves:[preuve(),{...preuve(),inscription_id:'other'}]}).statut).toBe('a_revoir');
    expect(simulerConvocationFc({...base(),virements:[tx(),tx(200,'u')],preuves:[preuve(),{...preuve('u'),inscription_id:'other'}]}).statut).toBe('a_revoir');
  });
  it('paiement antérieur compte pour une session future, jamais pour une session passée',()=>{
    for(const date_operation of ['2026-10-28','2026-11-05']) expect(simulerConvocationFc({...base(),virements:[{...tx(),date_operation}]}).statut).toBe('eligible');
    expect(simulerConvocationFc({...base(),aujourdHui:'2099-01-01'}).statut).toBe('exclu');
  });
  it('remboursement bloque même avec versement complet',()=>expect(simulerConvocationFc({...base(),virements:[tx(),tx(-50,'u','refund')],preuves:[preuve(),preuve('u')]}).statut).toBe('exclu'));
  it('doublon convocation bloque',()=>expect(simulerConvocationFc({...base(),dejaEnvoyee:true}).statut).toBe('exclu'));
  it('ancienne preuve mail non liée à une session impose revue',()=>expect(simulerConvocationFc({...base(),historiquePossible:true}).statut).toBe('a_revoir'));
  it.each([{emails_bloques:true},{email:null}])('email indisponible refuse',extra=>expect(simulerConvocationFc({...base(),stagiaire:{...a,...extra}}).statut).toBe('a_revoir'));
  it('session manquante, en attente, hors FC ou commencée refuse',()=>{
    expect(simulerConvocationFc({...base(),session:{...s,lieu:null}}).statut).toBe('a_revoir');
    expect(simulerConvocationFc({...base(),inscription:{...i,liste_attente:true}}).statut).toBe('exclu');
    expect(simulerConvocationFc({...base(),session:{...s,nom:'VTC initiale'}}).statut).toBe('exclu');
    expect(simulerConvocationFc({...base(),aujourdHui:'2026-11-17'}).statut).toBe('exclu');
  });
  it('simulation sans activation refuse et ne mute pas ses entrées',()=>{const p=base();const before=JSON.stringify(p);expect(simulerConvocationFc({...p,depuis:null}).statut).toBe('a_revoir');expect(JSON.stringify(p)).toBe(before);});
});
describe('FC transport : simulations, aucun accès réseau réel',()=>{
  const p={to:a.email,subject:'FC',html:'Bonjour',envoiId:'one',apiKey:'fake-only'};
  it('200 avec ID est prouvé ; idempotency key stable',async()=>{
    const fetcher=vi.fn(async(_input:RequestInfo|URL,_init?:RequestInit)=>new Response(JSON.stringify({id:'accepted'}),{status:200}));
    expect(await transporterConvocationFc(p,fetcher)).toMatchObject({statut:'envoye',providerId:'accepted'});
    expect(fetcher).toHaveBeenCalledTimes(1);expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({'Idempotency-Key':'fc-convocation/one'});
  });
  it.each([429,500,408,409,400])('refus %i classé sans faux succès',async status=>{
    const f=vi.fn(async()=>new Response('{}',{status}));const r=await transporterConvocationFc(p,f);
    expect(r.statut).toBe(status===429?'echec':status===400?'a_revoir':'indetermine');expect(f).toHaveBeenCalledTimes(1);
  });
  it('rupture réseau et 200 sans preuve ne sont jamais réessayés',async()=>{
    expect((await transporterConvocationFc(p,vi.fn(async()=>{throw new Error('offline');}))).statut).toBe('indetermine');
    expect((await transporterConvocationFc(p,vi.fn(async()=>new Response('{}')))).statut).toBe('indetermine');
  });
});
describe('session et modèle officiels',()=>{
  const m={subject_template:'FC - {{prenom}} {{nom}}',body_template:'{{formation}}<br>Le <strong>{{date_debut}}</strong><br>Horaires : de 8h45 a 12h et de 13h a 17h<br>Adresse : 86 route de Genas 69003 Lyon<br>Présence obligatoire'};
  it('VTC 17–18 et TAXI 19–20 utilisent les deux dates et heures enregistrées',()=>{
    for(const session of [s,{...s,nom:'Formation Continue TAXI',date_debut:'2026-11-19',date_fin:'2026-11-20'}]){
      const r=rendreConvocationFc(m,a,session,i,'2026-11-05');
      expect(r.html).toContain('09:00–17:00');expect(r.html).toContain('Présence obligatoire');
      expect(r.html).toContain(session.date_debut==='2026-11-17'?'17 novembre':'19 novembre');
      expect(r.html).toContain(session.date_fin==='2026-11-18'?'18 novembre':'20 novembre');
      expect(r.html).not.toContain('8h45');
    }
  });
  it('informations personnalisées et nom HTML échappé',()=>{
    const r=rendreConvocationFc(m,{...a,nom:'<script>'},s,{...i,heure_debut_personnalisee:'13:00',heure_fin_personnalisee:'17:00'},'2026-11-05');
    expect(r.html).toContain('13:00–17:00');expect(r.subject).toContain('<script>');expect(r.html).not.toContain('<script>');
  });
  it('template inconnu et session incomplète refusent',()=>{
    expect(()=>rendreConvocationFc({...m,body_template:'{{non_supportee}}'},a,s,i,'2026-11-05')).toThrow();
    expect(()=>rendreConvocationFc(m,a,{...s,lieu:null},i,'2026-11-05')).toThrow();
  });
});