import { MODULES_DATA, type FormationId } from '@/components/cours-en-ligne/formations-data';
import { normalizeModuleIdForDashboard } from '@/lib/parcoursModulesDashboard';
import { TrainingContract, Funding } from './model';

export interface ContractLearner {
  id: string; nom?: string | null; prenom?: string | null; adresse?: string | null;
  code_postal?: string | null; ville?: string | null; telephone?: string | null; email?: string | null;
  formation_choisie?: string | null; type_apprenant?: string | null; mode_financement?: string | null;
  organisme_financeur?: string | null; societe_nom?: string | null; montant_ttc?: number | null;
  modules_autorises?: number[] | null;
}
export function fundingFromLearner(a: ContractLearner): Funding {
  const text = `${a.mode_financement ?? ''} ${a.organisme_financeur ?? ''} ${a.societe_nom ?? ''}`.toLowerCase();
  if (/cpf|caisse des d[eé]p[oô]ts/.test(text)) return 'cpf';
  if (/opco/.test(text)) return 'opco';
  if (a.societe_nom || /entreprise/.test(text)) return 'entreprise';
  if (a.organisme_financeur) return 'autre';
  return /personnel|auto.?financement/.test(text) ? 'personnel' : '';
}
export function contractProgramme(a: ContractLearner, pathway: string) {
  const ids = [...new Set((a.modules_autorises ?? []).map(normalizeModuleIdForDashboard))];
  // Contract programmes never infer a track from answers or invent default assignments.
  return MODULES_DATA.filter(m => ids.includes(m.id) && m.formations.includes(pathway as FormationId)).map(m => ({
    id: `module-${m.id}`, title: m.nom, activities: m.description, modality: '', hours: '', evaluation: '', value: '',
  }));
}
export function newTrainingContract(a: ContractLearner): TrainingContract {
  return {
    reference: `CF-${crypto.randomUUID()}`, learnerId: a.id, sessionId: '', pathway: '', funding: fundingFromLearner(a),
    fields: { learnerName: `${a.prenom ?? ''} ${a.nom ?? ''}`.trim(),
      learnerAddress: [a.adresse, a.code_postal, a.ville].filter(Boolean).join(' '),
      learnerPhone: a.telephone ?? '', learnerEmail: a.email ?? '', title: a.formation_choisie ?? '',
      price: a.montant_ttc == null ? '' : String(a.montant_ttc) },
    activities: [], payments: ['Premier versement','Deuxième étape','Troisième étape','Achèvement'].map(milestone => ({ amount: '', date: '', milestone })),
    verified: false, concludedAt: null, signedAt: null,
  };
}