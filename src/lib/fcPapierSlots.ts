export function fcPapierSlots(debut: string, fin: string) {
  const slots: { key: string; date: string; creneau: string; heures: number }[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(debut) || !/^\d{4}-\d{2}-\d{2}$/.test(fin) || fin < debut) return slots;
  const d = new Date(`${debut}T00:00:00Z`);
  for (let i = 0; i < 400 && d.toISOString().slice(0, 10) <= fin; i++, d.setUTCDate(d.getUTCDate() + 1)) {
    if ([0, 6].includes(d.getUTCDay())) continue;
    const date = d.toISOString().slice(0, 10);
    for (const [creneau, heures] of [['matin', 3], ['apres_midi', 4]] as const) slots.push({ key: `${date}|${creneau}`, date, creneau, heures });
  }
  return slots;
}