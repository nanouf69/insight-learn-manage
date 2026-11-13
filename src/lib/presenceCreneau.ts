import { z } from 'zod';
import type { SignatureManquante } from './signaturesManquantes';
import { heuresRestantSigner } from './heuresRestantSigner';
import type { ValidationPresence } from './presenceAdministrative';

export const commandePresenceCreneauSchema = z.object({
  operationId: z.string().uuid(), apprenantId: z.string().uuid(), inscriptionId: z.string().uuid(),
  sessionId: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  creneau: z.string().trim().min(1).max(80), horaires: z.string().trim().min(1).max(40),
  categorie: z.enum(['theorie', 'pratique']), minutes: z.number().int().positive().max(1440),
  formateurId: z.string().uuid(), preuveId: z.string().uuid(), confirmePresence: z.literal(true),
}).superRefine((c, ctx) => {
  if (c.categorie === 'pratique' && c.minutes > 360) ctx.addIssue({code:'custom',message:'La pratique ne peut pas dépasser 6 h'});
});
export interface PreuvePresenceCreneau {
  id: string; apprenantId: string; sessionId: string; inscriptionId: string;
  date: string; creneau: string; horaires: string; minutes: number;
  statut: 'validee' | 'annulee'; auteur: string; valideLe: string; preuveId: string;
}
/** Preview projection: only confirmed exact-slot receipts reduce justification, never signatures. */
export function projeterPresenceCreneaux(rows: readonly SignatureManquante[], preuves: readonly PreuvePresenceCreneau[],
  validations: readonly ValidationPresence[], apprenantId: string, dateReference: string) {
  const bilan = heuresRestantSigner(rows, dateReference);
  const vus = new Map<string, PreuvePresenceCreneau>();
  const details = bilan.details.map(r => {
    const candidates = preuves.filter(p => p.apprenantId === apprenantId && p.date === r.date && p.creneau === r.creneau && p.statut === 'validee');
    const ids = new Set(candidates.map(p => p.id));
    const p = candidates[0];
    const coherent = !!p && ids.size === 1 && candidates.every(x => JSON.stringify(x) === JSON.stringify(p)) &&
      !!p.sessionId && !!p.inscriptionId && !!p.auteur && !!p.preuveId && Number.isFinite(Date.parse(p.valideLe)) &&
      p.horaires === r.horaires && p.minutes === r.minutes && p.minutes > 0 && !vus.has(p.id);
    if (coherent && p) vus.set(p.id, p);
    const conflit = validations.some(v => !v.annulee && !/annul|refus|brouillon/i.test(v.statut ?? '') &&
      v.date_presence === r.date && Number(v.heures) > 0);
    return {...r, presenceValidee: coherent, conflit, revue: conflit || (candidates.length > 0 && !coherent)};
  });
  const aJustifier = details.filter(r => !r.presenceValidee).reduce((s,r) => s + (r.minutes ?? 0),0);
  return {...bilan,details,minutesAJustifier:bilan.minutes == null ? null : aJustifier,
    // Totals require an authoritative merged read; overlapping legacy declarations never become additions.
    minutesPresenceLiee: details.filter(r => r.presenceValidee).reduce((s,r)=>s+(r.minutes ?? 0),0)};
}

export const dureePratiqueSchema = z.coerce.number().finite().min(0).max(6)
  .refine(v => Math.abs(v * 60 - Math.round(v * 60)) < 0.000001, 'Durée en minutes entières');