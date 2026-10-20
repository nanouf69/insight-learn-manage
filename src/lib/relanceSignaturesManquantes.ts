import type { SignatureManquante } from './signaturesManquantes';

export function creneauxRelancables(rows: SignatureManquante[], dateParis: string): SignatureManquante[] {
  return rows.filter(row => row.etat === 'manquante' && row.date <= dateParis);
}

export function empreinteCreneauxRelance(rows: SignatureManquante[]): string {
  return JSON.stringify(rows.map(row => [row.date, row.creneau, row.source]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
export const dateSignatureLisible = (date: string) => date.split('-').reverse().join('/');

export function preparerRelanceSignatures(nom: string, rows: SignatureManquante[]) {
  const subject = 'Signatures de présence manquantes — FTRANSPORT';
  const intro = `Bonjour ${nom.trim()},`;
  const message = 'Votre dossier comporte les créneaux suivants sans signature de présence enregistrée :';
  const consigne = 'Signez uniquement si vous étiez réellement présent(e) à ces créneaux. La signature est possible le jour du cours ou après, jamais avant. La date du cours et la date réelle de votre signature restent distinctes.';
  const absence = 'Si vous étiez absent(e), ne signez pas ce créneau et contactez le centre par retour de mail. Si le créneau n’est pas accessible dans votre espace, contactez-nous également.';
  const lien = 'https://gestion.ftransport.fr/cours';
  const lignes = rows.map(row => `${dateSignatureLisible(row.date)} — ${row.creneau} — ${row.source}`);
  const text = [intro, message, ...lignes, consigne, absence, `Votre espace apprenant (connexion requise) : ${lien}`, 'Cordialement,', 'L’équipe FTRANSPORT'].join('\n\n');
  const html = `<p>${escapeHtml(intro)}</p><p>${escapeHtml(message)}</p><ul>${lignes.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul><p>${escapeHtml(consigne)}</p><p>${escapeHtml(absence)}</p><p><a href="${lien}">Accéder à votre espace apprenant (connexion requise)</a></p><p>Cordialement,<br>L’équipe FTRANSPORT</p>`;
  return { subject, text, html };
}

export function resultatRelance(data: { success?: boolean; skipped?: boolean } | null | undefined): 'envoye' | 'doublon' | 'indetermine' {
  if (data?.skipped) return 'doublon';
  return data?.success === true ? 'envoye' : 'indetermine';
}