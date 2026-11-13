/** Live-only read projection. Date-only validations cannot prove a separate slot. */
export interface ValidationPresence {
  id?: string; heures?: unknown; date_presence?: string | null; categorie?: string | null;
  created_at?: string; statut?: string; annulee?: boolean;
}
export interface JourPresence { date: string; categorie: string; minutes: number }
export function fusionnerPresenceAdministrative(
  signes: readonly JourPresence[], validations: readonly ValidationPresence[],
  autorises?: ReadonlySet<string>,
) {
  const parJour = new Map<string, number>();
  for (const s of signes) {
    const k = `${s.date}|${s.categorie}`;
    parJour.set(k, (parJour.get(k) ?? 0) + Math.max(0, Math.round(s.minutes)));
  }
  const vus = new Map<string, ValidationPresence>();
  const groupes = new Map<string, Array<{ row: ValidationPresence; minutes: number }>>();
  const revue: string[] = [];
  for (const row of validations) {
    if (row.annulee || /annul|refus|brouillon/i.test(row.statut ?? '')) continue;
    const minutes = Math.round(Number(row.heures) * 60);
    if (!Number.isFinite(minutes) || minutes <= 0) continue;
    const id = row.id;
    if (!id) { revue.push('Validation sans identité : non comptée'); continue; }
    if (vus.has(id)) {
      if (JSON.stringify(vus.get(id)) !== JSON.stringify(row)) revue.push(`Validation contradictoire ${id}`);
      continue;
    }
    vus.set(id, row);
    const categorie = row.categorie === 'theorie' || row.categorie === 'pratique' ? row.categorie : 'generique';
    const k = row.date_presence ? `${row.date_presence}|${categorie}` : `sans-date:${id}|${categorie}`;
    if (autorises && row.date_presence && categorie !== 'generique' && !autorises.has(k)) {
      revue.push(`Validation hors séance autorisée ${id}`); continue;
    }
    if (!row.date_presence || categorie === 'generique') revue.push(`Date ou catégorie à vérifier ${id}`);
    groupes.set(k, [...(groupes.get(k) ?? []), { row, minutes }]);
  }
  const ajouts: Array<{ id: string; date: string | null; categorie: string; minutes: number }> = [];
  let minutesAdmin = 0;
  for (const [k, rows] of groupes) {
    const max = Math.max(...rows.map(r => r.minutes));
    const signed = parJour.get(k) ?? 0;
    if (rows.length > 1 || signed > 0) revue.push(`Couverture sans créneau précis ${rows.map(r => r.row.id).join(',')}`);
    // Never infer that the declaration is additional to a signed part of the same day.
    const ajout = Math.max(0, max - signed);
    const retenu = rows.find(r => r.minutes === max);
    if (!retenu) continue;
    const categorie = k.split('|').at(-1) ?? 'generique';
    ajouts.push({ id: retenu.row.id ?? '', date: retenu.row.date_presence ?? null, categorie, minutes: ajout });
    minutesAdmin += ajout;
  }
  return { minutesAdmin, ajouts, revue, theorieMinutes: ajouts.filter(r => r.categorie === 'theorie').reduce((s,r)=>s+r.minutes,0),
    pratiqueMinutes: ajouts.filter(r => r.categorie === 'pratique').reduce((s,r)=>s+r.minutes,0),
    generiqueMinutes: ajouts.filter(r => r.categorie === 'generique').reduce((s,r)=>s+r.minutes,0) };
}