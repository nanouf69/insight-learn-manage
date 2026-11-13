import type { CoreMatiereState } from './coreExamPublication';

export type StatutCopieEB = 'definitif' | 'qrc_a_corriger' | 'publication' | 'revue' | 'lecture_impossible';
/** Status of THIS immutable submitted copy. Receipts/current editor never determine it. */
export function statutCopieEB(s: CoreMatiereState | null | undefined): StatutCopieEB {
  if (!s || (s as any).lectureImpossible) return 'lecture_impossible';
  if (!s.attemptId || !s.apprenantId || !Number.isFinite(Date.parse(s.finishedAt))) return 'revue';
  const qs = s.questions ?? s.historicalDetails?.snapshot?.questions ?? s.historicalDetails?.questions;
  if (!Array.isArray(qs) || !qs.length) return 'revue';
  const qrcIds = qs.filter(q => q.type === 'QRC').map(q => String(q.id ?? q.questionId));
  const norm = (id: string) => id.startsWith(`${s.matiereId}:`) ? id.slice(s.matiereId.length + 1) : id;
  const proofs = s.qrcProofs ?? [];
  if (new Set(qrcIds.map(norm)).size !== qrcIds.length || proofs.length !== qrcIds.length
    || qrcIds.some(id => proofs.filter(p => norm(p.questionId) === norm(id)).length !== 1)) return 'revue';
  if (proofs.some(p => p.etat !== 'corrigee' || p.note == null)) return 'qrc_a_corriger';
  if (proofs.some(p => !Number.isFinite(p.note))) return 'revue';
  if (s.qrcRestantes > 0 || s.status !== 'definitif' || s.note20 == null || !Number.isFinite(s.note20)
    || s.publishedAt === null) return 'publication';
  return s.pending ? 'publication' : 'definitif';
}

export const LIBELLE_STATUT_EB: Record<StatutCopieEB, string> = {
  definitif: 'Définitive', qrc_a_corriger: 'En attente de correction des QRC', publication: 'Publication en attente',
  revue: 'Copie remise — à vérifier', lecture_impossible: 'Lecture des notes indisponible',
};

/** Never call a publication/identity problem an uncorrected QRC. */
export function libelleAttenteEB(rows: any[]): string {
  if (rows.some(r => r.__core?.lectureImpossible)) return LIBELLE_STATUT_EB.lecture_impossible;
  if (rows.some(r => r.__revueProvenance || r.__statutCopieEB === 'revue')) return LIBELLE_STATUT_EB.revue;
  const core = rows.filter(r => r.__core?.attemptId);
  if (core.some(r => statutCopieEB(r.__core) === 'qrc_a_corriger') || rows.some(r => !r.__core && r.details?.qrc_pending_correction)) return LIBELLE_STATUT_EB.qrc_a_corriger;
  return LIBELLE_STATUT_EB.publication;
}