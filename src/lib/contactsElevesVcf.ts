import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

export interface DossierContactEleve {
  id: string;
  prenom?: string | null;
  nom?: string | null;
  telephone?: string | null;
  email?: string | null;
  auth_user_id?: string | null;
}
export interface ContactIgnore { id: string; nom: string; motif: string }

export function telephoneContact(valeur: string | null | undefined): string | null {
  const brut = valeur?.trim();
  if (!brut || !/^(?:\+|00)?[\d\s().-]+$/.test(brut)) return null;
  const phone = parsePhoneNumberFromString(brut.replace(/^00/, '+'), 'FR');
  return phone?.isValid() ? phone.number : null;
}

const texteVcf = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const identite = (value: string) => value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr');

// vCard 3.0: CRLF and UTF-8 folding at 75 bytes without splitting a character.
function plierLigne(value: string): string {
  const lines: string[] = [];
  let line = ''; let bytes = 0;
  for (const char of value) {
    const size = new TextEncoder().encode(char).length;
    if (bytes + size > 75) { lines.push(line); line = ' '; bytes = 1; }
    line += char; bytes += size;
  }
  lines.push(line);
  return lines.join('\r\n');
}

export function genererContactsEleves(dossiers: DossierContactEleve[]) {
  const ignores: ContactIgnore[] = [];
  const vus = new Set<string>();
  const parTelephone = new Map<string, DossierContactEleve[]>();
  const contacts: { id: string; prenom: string; nom: string; telephone: string }[] = [];
  for (const dossier of dossiers) {
    const prenom = dossier.prenom?.trim() ?? '';
    const nom = dossier.nom?.trim() ?? '';
    const affichage = `${prenom} ${nom}`.trim() || 'Identité manquante';
    const ignorer = (motif: string) => ignores.push({ id: dossier.id, nom: affichage, motif });
    if (!dossier.id || vus.has(dossier.id)) { ignorer('Dossier en double ou identifiant absent'); continue; }
    vus.add(dossier.id);
    if (!prenom || !nom) { ignorer('Prénom ou nom manquant'); continue; }
    const telephone = telephoneContact(dossier.telephone);
    if (!telephone) { ignorer(dossier.telephone?.trim() ? 'Numéro invalide' : 'Numéro absent'); continue; }
    const precedents = parTelephone.get(telephone) ?? [];
    // Same phone alone never proves the same learner (family/shared number).
    const doublon = precedents.some(p =>
      (dossier.auth_user_id && p.auth_user_id === dossier.auth_user_id) ||
      (identite(p.prenom ?? '') === identite(prenom) && identite(p.nom ?? '') === identite(nom) &&
        dossier.email?.trim() && identite(p.email ?? '') === identite(dossier.email)));
    if (doublon) { ignorer('Même élève et même numéro déjà exportés'); continue; }
    precedents.push(dossier); parTelephone.set(telephone, precedents);
    contacts.push({ id: dossier.id, prenom, nom, telephone });
  }
  const partages = [...parTelephone.entries()].filter(([, rows]) => rows.length > 1).map(([, rows]) => ({
    noms: rows.map(r => `${r.prenom?.trim()} ${r.nom?.trim()}`),
  }));
  const vcf = contacts.map(c => [
    'BEGIN:VCARD', 'VERSION:3.0',
    `N:${texteVcf(`${c.nom} – Élève`)};${texteVcf(c.prenom)};;;`,
    `FN:${texteVcf(`${c.prenom} ${c.nom} – Élève`)}`,
    `TEL;TYPE=VOICE:${c.telephone}`,
    `UID:urn:uuid:${texteVcf(c.id)}`,
    'END:VCARD',
  ].map(plierLigne).join('\r\n')).join('\r\n');
  return { vcf: vcf ? `${vcf}\r\n` : '', nombre: contacts.length, ignores, partages, dossiers: dossiers.length };
}

export function telechargerContacts(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}