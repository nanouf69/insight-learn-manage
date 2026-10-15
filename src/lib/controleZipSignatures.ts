import type JSZip from 'jszip';
import { chargerSignaturesRassemblees } from '@/lib/signaturesRassemblees';
import { generateSignaturesRassembleesPdf } from '@/lib/pdf/signatures-rassemblees';

export function inclureSignaturesPresentiel(apprenant: { type_apprenant?: string | null; formation_choisie?: string | null }): boolean {
  const type = String(apprenant.type_apprenant || apprenant.formation_choisie || '').trim().toLowerCase();
  if (!type) return false;
  return /presentiel/.test(type) || !/(^|-)e($|-)|elearning|e-learning/.test(type);
}

/** Same read-only planning-scoped PDF as the learner form export. */
export async function ajouterSignaturesPresentielAuZip(zip: JSZip, apprenant: { id: string; nom?: string; prenom?: string; type_apprenant?: string | null; formation_choisie?: string | null }) {
  if (!inclureSignaturesPresentiel(apprenant)) return;
  let rows;
  try {
    rows = await chargerSignaturesRassemblees(apprenant.id, true);
  } catch {
    throw new Error('Signatures session + pratique indisponibles : dossier ZIP interrompu, aucune signature modifiée.');
  }
  if (!rows.length) {
    zip.file('signatures-session-pratique/aucune-signature.txt', 'Aucune signature enregistrée aux dates du planning de session et de pratique. Aucun justificatif de présence ne peut être produit.');
    return;
  }
  const pdf = generateSignaturesRassembleesPdf(apprenant, rows);
  zip.file(`signatures-session-pratique/${pdf.fileName}`, pdf.blob);
}