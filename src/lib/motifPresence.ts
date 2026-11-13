import { z } from 'zod';
/** Optional addition note only; cancellation/restoration reasons remain mandatory. */
export const motifPresenceSchema = z.string().trim().max(200, 'Le motif ne doit pas dépasser 200 caractères').transform(v => v || null);