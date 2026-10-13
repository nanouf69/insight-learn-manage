import { describe, expect, it } from 'vitest';
import { calculerRatioSignatures, regleSuiviFormation } from '@/lib/suiviFormationIndicateurs';
const session = (extra: any = {}) => ({ sessions: { type_session: 'theorique', date_debut: '2026-07-06', date_fin: '2026-07-06', heure_debut: '09:00', heure_fin: '16:00', ...extra } });
const sig = (demi: string, extra: any = {}) => ({ date_emargement: '2026-07-06', demi_journee: demi, signature_data_url: 'data:image/png;base64,YQ==', ...extra });
const ratio = (rows: any[], sessions: any[] = [session()], rs: any[] = [], bs: any[] = [], cs: any[] = []) => calculerRatioSignatures(rows, sessions, rs, bs, cs, 'vtc');
describe('Règles indicateurs juillet 2026, sans mutation', () => {
  it.each([['vtc',66],['taxi',96],['ta',36],['taxi-pour-vtc',36],['vtc-cours-du-soir',66],['ta-e-presentiel',36]])('heures prévues %s = %s', (type, h) => {
    expect(regleSuiviFormation({type_apprenant: type,date_debut_formation:'2026-07-01',heures_totales:69}).heures).toBe(h);
  });
  it.each(['vtc-e','taxi-e','ta-e','va-e'])('jalons rouges uniquement e-learning %s', type => {
    expect(regleSuiviFormation({type_apprenant:type,date_debut_formation:'2026-07-01'}).elearning).toBe(true);
  });
  it.each(['2026-06-30','2025-09-01',null,'inconnue'])('ancienne règle ou date non prouvée %s', date => {
    const r = regleSuiviFormation({type_apprenant:'vtc',date_debut_formation:date,heures_totales:69});
    expect(r.heures).toBeNull(); expect(r.presentiel).toBe(false); expect(r.elearning).toBe(false);
  });
  it('aucun créneau ne donne jamais 100 %', () => expect(ratio([], []).taux).toBeNull());
  it('attendus incluent les feuilles non générées et dates à venir', () => expect(ratio([sig('matin')])).toMatchObject({signees:1,attendues:2,taux:50}));
  it('doublons, absences, masqués, hors planning et signature formateur exclus', () => {
    expect(ratio([sig('matin'),sig('matin'),sig('apres_midi',{absent:true}),sig('apres_midi',{masque:true}),sig('soir_1'),sig('apres_midi',{signature_data_url:null,signature_formateur:'image'})])).toMatchObject({signees:1,attendues:2,taux:50});
  });
  it('soir attend deux signatures, pas une signature globale inventée', () => expect(ratio([sig('soir_1'),sig('soir')],[session({heure_debut:'17:00',heure_fin:'21:00'})])).toMatchObject({signees:1,attendues:2,taux:50}));
  it('planning agenda effectif prime, sans ajout de samedi artificiel', () => {
    const bloc = {semaine_debut:'2026-07-06',jour:0,heure_debut:'09:00',heure_fin:'12:00',publics_cibles:['VTC']};
    expect(ratio([sig('matin')],[session()],[],[bloc,bloc,{...bloc,publics_cibles:['TA']}])).toMatchObject({attendues:1,taux:100});
  });
  it('pratique du week-end, réservation et session sans doublon', () => {
    const rs=[{date_choisie:'2026-07-11',creneau:'journee'}];
    const cs=[{day_time_slots:{'2026-07-11':{matin:'9h-12h',apresmidi:'13h-16h'}}}];
    const ss=[{sessions:{type_session:'pratique',date_debut:'2026-07-11',heure_debut:'09:00',heure_fin:'16:00'}}];
    const rows=[sig('matin',{date_emargement:'2026-07-11'}),sig('apres_midi',{date_emargement:'2026-07-11'})];
    expect(ratio(rows,ss,rs,[],cs)).toMatchObject({attendues:2,signees:2,taux:100});
  });
  it('planning pratique inconnu reste indisponible, pas un défaut 9h-16h', () => expect(ratio([],[],[{date_choisie:'2026-07-11'}]).taux).toBeNull());
  it('listes attente et sessions annulées ignorées', () => expect(ratio([],[{...session(),liste_attente:true},session({statut:'annulee'})]).attendues).toBe(0));
  it('heures de connexion et quiz sans influence, données conservées', () => {
    const rows=[sig('matin')]; const before=JSON.stringify(rows);
    expect(ratio(rows)).toMatchObject({taux:50}); expect(JSON.stringify(rows)).toBe(before);
  });
});