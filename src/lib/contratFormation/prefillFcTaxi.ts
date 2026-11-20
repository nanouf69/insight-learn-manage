import { parse, isValid, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FTRANSPORT } from '@/lib/convocationFormation';
import { PROGRAMME_FC_TAXI_URL } from '@/lib/pdf/devis-fc-taxi';
import type { TrainingContract } from './model';

/** Jours choisis dans le devis (« 19 novembre 2026 + 20 novembre 2026 ») → ISO triés ; libellé illisible = ignoré. */
export function joursIsoDepuisSelection(selection: string): string[] {
  return [...new Set(selection.split(' + ').map(s => parse(s.trim(), 'd MMMM yyyy', new Date(), { locale: fr }))
    .filter(isValid).map(d => format(d, 'yyyy-MM-dd')))].sort();
}

/**
 * Champs du contrat FC TAXI déduits uniquement de sources déjà utilisées dans les documents envoyés
 * (fiche société FTRANSPORT, offre FC TAXI v6, dates de session choisies, mode de signature).
 * Toute information non prouvée reste marquée « à compléter » pour rester signalée.
 */
export function champsSourcesFcTaxi(p: { prix: number; selectionDates: string; mode: 'centre' | 'distance' }): Record<string, string> {
  const jours = joursIsoDepuisSelection(p.selectionDates);
  const lieu = '86 route de Genas, 69003 Lyon';
  const champs: Record<string, string> = {
    centre: `${FTRANSPORT.raisonSociale} — nom commercial ${FTRANSPORT.nom}`,
    legalForm: 'SASU au capital social de 5 000 €',
    centreAddress: FTRANSPORT.adresse,
    registration: `SIRET ${FTRANSPORT.siret} — RCS à compléter`,
    nda: `${FTRANSPORT.nda} — autorité d’enregistrement à confirmer`,
    approval: 'Agrément préfectoral n° 69-18-001 — date de validité à compléter',
    centrePhone: FTRANSPORT.telephone,
    centreEmail: FTRANSPORT.email,
    title: 'Formation continue obligatoire des conducteurs de TAXI',
    totalHours: '14', presenceHours: '14', distanceHours: '0', practiceHours: '0',
    modality: 'Présentiel', locations: lieu,
    prerequisites: 'Être titulaire d’une carte professionnelle de conducteur de TAXI à renouveler',
    programReference: PROGRAMME_FC_TAXI_URL,
    platform: 'Sans objet : formation en présentiel', digitalRequirements: 'Sans objet : formation en présentiel',
    accessRecovery: 'Sans objet : formation en présentiel', distanceActivities: 'Sans objet : formation en présentiel',
    pedagogicSupport: `${FTRANSPORT.email} ou messagerie de la plateforme ; réponse dans les meilleurs délais`,
    paymentMode: 'Virement bancaire ou espèces',
    complaints: `${FTRANSPORT.email} ou courrier : ${lieu}`,
    place: 'Lyon',
    conclusionMode: p.mode === 'centre' ? 'sur place' : 'à distance',
    withdrawalOnline: p.mode === 'distance' ? `Formulaire type annexé au devis ; notification par e-mail à ${FTRANSPORT.email}` : 'Sans objet : contrat signé au centre',
  };
  if (p.prix > 0) champs.price = String(p.prix);
  if (jours.length) {
    champs.start = jours[0]; champs.end = jours[jours.length - 1];
    champs.planning = `${jours.join(' + ')} ; 9h–12h / 13h–17h ; ${lieu}`;
  }
  return champs;
}

/** Remplit seulement les champs vides : une saisie administrateur n'est jamais écrasée. */
export function appliquerChampsVides(contract: TrainingContract, champs: Record<string, string>): TrainingContract {
  const fields = { ...contract.fields };
  let change = false;
  for (const [k, v] of Object.entries(champs)) if (!fields[k]?.trim() && v) { fields[k] = v; change = true; }
  return change ? { ...contract, fields, verified: false } : contract;
}
