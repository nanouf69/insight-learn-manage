import { MODULES_DATA, type FormationId } from '@/components/cours-en-ligne/formations-data';

const EMARGEMENT_PAR_PARCOURS: Partial<Record<FormationId, number>> = {
  vtc: 83,
  'vtc-cours-du-soir': 83,
  'vtc-pour-taxi': 83,
  'continue-vtc': 83,
  taxi: 84,
  'taxi-pour-vtc': 84,
  'continue-taxi': 84,
  'mobilite-taxi': 84,
};

/** Standalone access only; never add a milestone or fabricate a session/signature. */
export function moduleEmargementPresentiel(formation: FormationId) {
  const id = EMARGEMENT_PAR_PARCOURS[formation];
  return id === undefined ? null : MODULES_DATA.find(m => m.id === id) ?? null;
}