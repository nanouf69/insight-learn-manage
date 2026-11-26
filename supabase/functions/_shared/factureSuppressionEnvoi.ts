import { destinataireAvisSuppression, identifiantAvisSuppression, notificationSuppressionFacture, suppressionNotifiable, type AvisTrace } from './factureSuppressionAvis.ts';

interface AvisClient { from(table: string): any }
interface AvisTransport {
  configure: boolean;
  envoyer: (message: { to: string; subject: string; html: string }) => Promise<string | null>;
}

const escaped = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));

/** Called only after the common endpoint's server-side administrator check. No invoice mutation. */
export async function envoyerAvisSuppression(admin: AvisClient, suppressionId: string, user: { id: string; email?: string }, transport: AvisTransport) {
  const { data: trace, error: readError } = await admin.from('factures_supprimees').select('*').eq('id', suppressionId).single();
  if (readError || !trace?.facture_id) return { error: 'Suppression confirmée introuvable. Aucun mail envoyé.', statut: 'non_envoye' };
  const destinataire = destinataireAvisSuppression(trace.snapshot);
  if (!destinataire) return { error: 'Adresse du destinataire absente ou invalide dans la facture supprimée. Aucun mail envoyé.', statut: 'non_envoye' };
  const claimId = await identifiantAvisSuppression(trace.id, 'engage');
  const ackId = await identifiantAvisSuppression(trace.id, 'envoye');
  const { data: ack, error: ackReadError } = await admin.from('factures_supprimees').select('id').eq('id', ackId).maybeSingle();
  if (ackReadError) return { error: 'Historique des envois illisible. Aucun nouvel envoi.', statut: 'non_envoye' };
  if (ack) return { envoye: true, dejaEnvoye: true, suppressionId };
  const rows: AvisTrace[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from('factures_supprimees').select('id,facture_id,numero,snapshot')
      .eq('facture_id', trace.facture_id).order('id').range(from, from + 999);
    if (error) return { error: 'Corbeille illisible. Aucun mail envoyé.', statut: 'non_envoye' };
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  if (!suppressionNotifiable(trace, rows)) return { error: 'Cette facture n’est plus dans la corbeille ou la trace est historique. Aucun mail envoyé.', statut: 'non_envoye' };
  const { data: original, error: invoiceError } = await admin.from('factures').select('id,numero,client_email,updated_at').eq('id', trace.facture_id).single();
  const snapshot = trace.snapshot as Record<string, unknown>;
  if (invoiceError || !original || original.numero !== trace.numero || original.client_email?.trim() !== destinataire || original.updated_at !== snapshot.updated_at) {
    return { error: 'La facture ou le destinataire a changé. Aucun mail envoyé ; vérifiez la facture.', statut: 'non_envoye' };
  }
  if (!transport.configure) return { error: 'Service email indisponible. La facture reste dans la corbeille, aucun mail envoyé.', statut: 'non_envoye' };
  const notice = notificationSuppressionFacture(trace.numero);
  const journal = (id: string, action: string, messageId?: string) => ({
    id, facture_id: trace.facture_id, numero: trace.numero, client_nom: trace.client_nom,
    type_financement: trace.type_financement, montant_ttc: trace.montant_ttc, date_emission: trace.date_emission,
    statut: trace.statut, motif: 'Avis au destinataire après suppression', deleted_by: user.id, deleted_by_email: user.email ?? null,
    snapshot: { _corbeille: { version: 1, action, suppression_id: trace.id, destinataire, sujet: notice.sujet, message: notice.message, ...(messageId ? { message_id: messageId } : {}) } },
  });
  const { data: claim, error: claimError } = await admin.from('factures_supprimees')
    .insert(journal(claimId, 'avis_suppression_engage')).select('id').single();
  if (claimError || claim?.id !== claimId) return { error: 'Envoi déjà engagé ou non confirmé. Ne pas renvoyer sans vérification.', statut: 'indetermine' };
  try {
    const messageId = await transport.envoyer({ to: destinataire, subject: notice.sujet, html: `<p>Bonjour,</p><p>${escaped(notice.message)}</p>` });
    if (!messageId) throw new Error('Envoi non confirmé.');
    const { data: receipt, error: ackError } = await admin.from('factures_supprimees')
      .insert(journal(ackId, 'avis_suppression_envoye', messageId)).select('id').single();
    if (ackError || receipt?.id !== ackId) throw new Error('Confirmation non enregistrée.');
    return { envoye: true, suppressionId };
  } catch {
    await admin.from('factures_supprimees').insert(journal(await identifiantAvisSuppression(trace.id, 'indetermine'), 'avis_suppression_indetermine'));
    return { error: 'Facture dans la corbeille, mais envoi non confirmé. Vérifiez l’historique ; aucun renvoi automatique.', statut: 'indetermine' };
  }
}