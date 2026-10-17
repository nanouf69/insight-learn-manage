import { format, isValid, parseISO } from 'date-fns';

export function formatDevisDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = parseISO(value);
  return isValid(date) ? format(date, 'dd/MM/yyyy') : '';
}

export function devisDatesSignature(dateDevis: string, dateValidite: string, datesFormation: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateDevis) || !formatDevisDate(dateDevis)) {
    throw new Error('Veuillez renseigner une date de devis valide');
  }
  return { date_devis: dateDevis, date_validite: dateValidite || null, dates_formation: datesFormation || null };
}