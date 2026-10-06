export function escapePratiqueNote(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function pratiqueNoteHTML(note?: string): string {
  const text = note?.trim();
  return text ? `<p><strong>Note :</strong> ${escapePratiqueNote(text).replace(/\r?\n/g, '<br>')}</p>` : '';
}

export function pratiqueCandidateNameHTML(name: string, note?: string): string {
  const text = note?.trim();
  return escapePratiqueNote(name) + (text ? ` — ${escapePratiqueNote(text).replace(/\r?\n/g, '<br>')}` : '');
}