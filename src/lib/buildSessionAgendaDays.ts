import { creneauxSessionInscrite } from '@/lib/emargementSessionSlots';
import { isPratiqueType } from '@/lib/sessionTypes';
import type { AgendaDaySlot } from '@/components/sessions/EmargementIndividuelGenerator';

export interface SessionAgendaContext {
  dateDebut: string;
  dateFin: string;
  title?: string | null;
  type_session?: string | null;
  typeApprenant?: string | null;
  heuresPresentielRequis?: number | null;
  inscription?: any;
}

/** New blank PDF layout from enrollment only; never pads days to satisfy a quota. */
export async function buildSessionAgendaDays(ctx: SessionAgendaContext): Promise<AgendaDaySlot[]> {
  const row = ctx.inscription ?? { sessions: { date_debut: ctx.dateDebut, date_fin: ctx.dateFin, nom: ctx.title, type_session: ctx.type_session } };
  const type = String(ctx.typeApprenant ?? '').toLowerCase();
  if (isPratiqueType(ctx.type_session)) {
    // This helper has no real booking/config evidence: do not invent practical sheets.
    throw new Error('Les horaires pratiques inscrits doivent être vérifiés avant de générer la feuille.');
  }
  const filiere = type.split('-')[0].toUpperCase();
  const slots = creneauxSessionInscrite({ ...row, type_apprenant: type, elearning_apprenant: /^(vtc|taxi|ta|va)-e$/.test(type) }, filiere);
  const days = new Map<string, AgendaDaySlot>();
  for (const slot of slots) {
    const day = days.get(slot.date) ?? { date: new Date(`${slot.date}T00:00:00`) };
    if (slot.creneau === 'matin' || slot.creneau === 'soir_1') { day.matinDebut = slot.debut; day.matinFin = slot.fin; }
    else { day.apremDebut = slot.debut; day.apremFin = slot.fin; }
    if (slot.creneau.startsWith('soir')) day.isSoir = true;
    days.set(slot.date, day);
  }
  return [...days.values()];
}
