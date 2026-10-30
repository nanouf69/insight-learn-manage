import { describe, expect, it } from 'vitest';
import { calculerBilanSignaturesEdof } from '@/lib/signaturesManquantes';
import { calculerRatioSignatures } from '@/lib/suiviFormationIndicateurs';
import { planningSignaturesReel } from '@/lib/signaturesPlanningReel';

const inscription = { sessions: { type_session: 'theorique', date_debut: '2026-10-26', date_fin: '2026-11-16' } };
const blocs = [0,1,2,3,4].flatMap(jour => [
  { semaine_debut: '2026-10-26', jour, heure_debut: '09:00', heure_fin: '12:00', publics_cibles: ['TA','TAXI','VTC','VA'] },
  { semaine_debut: '2026-10-26', jour, heure_debut: '13:00', heure_fin: '16:00', publics_cibles: ['TA','TAXI','VTC','VA'] },
]);
const signatures = [26,27,28,29,30].flatMap(d => ['matin','apres_midi'].map(demi_journee => ({ date_emargement: `2026-10-${d}`, demi_journee, signature_data_url: 'data:image/png;base64,YQ==', signed_at: '2026-10-30T14:24:00Z' })));
describe('Attentes réelles : Ilyes TA et tous parcours, aucune écriture', () => {
  it('Ilyes : exactement 10 attendues, 10 recueillies, pratique 0/0', () => {
    expect(calculerBilanSignaturesEdof(signatures, [inscription], [], 'ta', [], blocs)).toMatchObject({ objectifTheorie: 10, objectifPratique: 0, objectifTotal: 10, total: 10, complet: true });
    expect(calculerRatioSignatures(signatures, [inscription], [], blocs, [], 'TA')).toMatchObject({ attendues: 10, signees: 10, taux: 100 });
  });
  it.each(['TA','TAXI','VTC','VA'])('%s : pas de +2 sans pratique planifiée', filiere => {
    expect(calculerBilanSignaturesEdof([], [inscription], [], filiere, [], blocs).objectifPratique).toBe(0);
  });
  it('vraie pratique samedi : deux attentes restent requises, aucune présence de réservation', () => {
    const rs = [{ date_choisie: '2026-10-31', creneau: 'journee', type_formation: 'taxi' }];
    const cs = [{ day_time_slots: { '2026-10-31': { matin: '9h-12h', apresmidi: '13h-16h' } } }];
    expect(calculerBilanSignaturesEdof(signatures, [inscription], rs, 'TA', cs, blocs)).toMatchObject({ objectifTotal: 12, objectifPratique: 2, pratique: 0, complet: false });
  });
  it('pratique matin seulement : aucune attente après-midi, réservation/session dédupliquées', () => {
    const ss = [{ sessions: { type_session: 'pratique_taxi', date_debut: '2026-10-31', heure_debut: '09:00', heure_fin: '16:00' } }];
    const rs = [{ date_choisie: '2026-10-31', creneau: 'journee' }];
    const cs = [{ day_time_slots: { '2026-10-31': { matin: '9h-12h' } } }];
    expect(planningSignaturesReel(ss, rs, [], cs, 'TA').creneaux.size).toBe(1);
  });
  it.each(['annulee','attente','exclue'])('%s : réservation ne contourne pas une inscription pratique rejetée', statut => {
    const ss = [{ liste_attente: statut === 'attente', emargements_exclus: statut === 'exclue', sessions: { type_session: 'pratique', statut, date_debut: '2026-10-31', heure_debut: '09:00', heure_fin: '16:00' } }];
    expect(planningSignaturesReel(ss, [{date_choisie:'2026-10-31'}], [], [], 'TA').creneaux.size).toBe(0);
  });
  it('horaire pratique inconnu : aucune complétude ni faux zéro confirmé', () => {
    expect(calculerBilanSignaturesEdof([], [], [{date_choisie:'2026-10-31'}], 'TA', [], [])).toMatchObject({ complet: false, planningIncomplet: true });
  });
  it('doublons, masqués, absences, horodatages sans image ne prouvent pas une signature', () => {
    const rows = [...signatures.slice(0,1), ...signatures.slice(0,1), {...signatures[1], absent:true}, {...signatures[2],masque:true}, {...signatures[3],signature_data_url:null}];
    const before = JSON.stringify(rows);
    expect(calculerBilanSignaturesEdof(rows, [inscription], [], 'TA', [], blocs).total).toBe(1);
    expect(JSON.stringify(rows)).toBe(before);
  });
  it('e-learning : aucune théorie attribuée, pratique réelle conservée', () => {
    const ss = [{...inscription,elearning_apprenant:true}, { sessions: {type_session:'pratique_vtc',date_debut:'2026-10-31',heure_debut:'09:00',heure_fin:'16:00'} }];
    expect(calculerBilanSignaturesEdof([],ss,[],'vtc-e',[],blocs)).toMatchObject({objectifTheorie:0,objectifPratique:2,objectifTotal:2,complet:false});
  });
  it('planning vide jamais complet ni attestation acquise', () => {
    expect(calculerBilanSignaturesEdof([],[],[],'TA',[],[]).complet).toBe(false);
  });
});