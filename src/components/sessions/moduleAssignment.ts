import { FORMATION_DEFAULT_MODULES, resolveFormationId } from '@/lib/parcoursModulesDashboard';

export interface ModuleRecipient {
  id: string;
  nom: string;
  prenom: string;
}

export interface AssignmentRecord {
  id: string;
  auth_user_id: string | null;
  modules_autorises: number[] | null;
  type_apprenant: string | null;
  formation_choisie: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  compte_cours_archive_at: string | null;
}

export function assignmentTargets(recipients: ModuleRecipient[], scope: string, selected: Set<string>) {
  return [...new Map(recipients.filter(r => scope === 'all' || selected.has(r.id)).map(r => [r.id, r])).values()];
}

export function appendAssignedModules(record: AssignmentRecord, additions: number[]): number[] {
  const formation = resolveFormationId(record.type_apprenant, record.formation_choisie, record.modules_autorises);
  const existing = record.modules_autorises?.length ? record.modules_autorises : formation ? FORMATION_DEFAULT_MODULES[formation] : null;
  if (!existing) throw new Error('Parcours non déterminé : ouvrir la fiche pour vérifier les modules.');
  // Preserve order, duplicates and legacy IDs already stored; append only new IDs.
  return [...existing, ...[...new Set(additions)].filter(id => !existing.includes(id))];
}

export interface AssignmentPort {
  read: (id: string) => Promise<AssignmentRecord>;
  isProtected: (id: string) => Promise<boolean>;
  write: (record: AssignmentRecord, modules: number[]) => Promise<void>;
}

export async function assignModules(port: AssignmentPort, recipients: ModuleRecipient[], additions: number[]) {
  const results: { recipient: ModuleRecipient; status: 'added' | 'unchanged' | 'refused'; reason?: string }[] = [];
  for (const recipient of recipients) {
    try {
      const before = await port.read(recipient.id);
      if (!before.auth_user_id) throw new Error('Compte cours non créé : attribution non effectuée, aucun accès envoyé.');
      if (before.deleted_at || before.compte_cours_archive_at) throw new Error('Dossier ou compte archivé.');
      if (await port.isProtected(recipient.id)) throw new Error('Fin de formation validée EDOF : dossier protégé.');
      const next = appendAssignedModules(before, additions);
      if (JSON.stringify(next) === JSON.stringify(before.modules_autorises)) {
        results.push({ recipient, status: 'unchanged' });
        continue;
      }
      await port.write(before, next);
      const after = await port.read(recipient.id);
      if (after.auth_user_id !== before.auth_user_id || JSON.stringify(after.modules_autorises) !== JSON.stringify(next)) {
        throw new Error('Attribution non confirmée : vérifier la fiche avant de réessayer.');
      }
      results.push({ recipient, status: 'added' });
    } catch (error) {
      results.push({ recipient, status: 'refused', reason: error instanceof Error ? error.message : 'Lecture ou enregistrement impossible.' });
    }
  }
  return results;
}