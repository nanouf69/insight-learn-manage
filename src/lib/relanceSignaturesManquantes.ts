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
  const text = [intro, message, ...lignes, consigne, absence, `👉 Signer mes présences (connexion requise) : ${lien}`, 'Cordialement,', 'L’équipe FTRANSPORT'].join('\n\n');
  const lignesHtml = lignes.map(l => `<tr><td style="padding:10px 14px;border-left:4px solid #dc2626;background:#fef2f2;color:#991b1b;font-weight:bold;font-size:15px">✍ ${escapeHtml(l)}</td></tr><tr><td style="height:6px"></td></tr>`).join('');
  const bouton = `<p style="text-align:center;margin:26px 0"><a href="${lien}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 28px;border-radius:8px">✍ Signer mes présences maintenant</a></p><p style="text-align:center;font-size:12px;color:#6b7280;margin-top:-14px">Lien direct : <a href="${lien}" style="color:#1d4ed8">${lien}</a> (connexion avec vos identifiants habituels)</p>`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111827;font-size:15px;line-height:1.5"><div style="background:#1d4ed8;color:#ffffff;padding:16px 20px;border-radius:8px 8px 0 0;font-size:18px;font-weight:bold">FTRANSPORT — Signatures de présence</div><div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px"><p>${escapeHtml(intro)}</p><p>${escapeHtml(message)}</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${lignesHtml}</table>${bouton}<p style="background:#fff7ed;border:1px solid #fdba74;color:#9a3412;padding:12px;border-radius:6px"><strong>⚠ Important :</strong> ${escapeHtml(consigne)}</p><p style="background:#f3f4f6;padding:12px;border-radius:6px;color:#374151">${escapeHtml(absence)}</p><p>Cordialement,<br><strong style="color:#1d4ed8">L’équipe FTRANSPORT</strong></p></div></div>`;
  return { subject, text, html };
}

export function resultatRelance(data: { success?: boolean; skipped?: boolean } | null | undefined): 'envoye' | 'doublon' | 'indetermine' {
  if (data?.skipped) return 'doublon';
  return data?.success === true ? 'envoye' : 'indetermine';
}