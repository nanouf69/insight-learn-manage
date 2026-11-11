import { SESSION_TYPES } from '@/lib/sessionTypes';
export type SessionFormation = { debut: string | null; fin: string | null; typeSession?: string | null };
export const jourParis = (date = new Date()) => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(date);
export function sessionFormationActuelle(session: SessionFormation, jour = jourParis()) {
  return SESSION_TYPES.some(t => t.value === session.typeSession && t.value !== 'examen') &&
    !!session.debut && !!session.fin && session.debut <= jour && jour <= session.fin;
}