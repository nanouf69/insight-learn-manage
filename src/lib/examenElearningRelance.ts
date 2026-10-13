export interface CandidatElearning {
  id: string;
  prenom?: string | null;
  email?: string | null;
  type_apprenant?: string | null;
  formation_choisie?: string | null;
  modalite_formation?: string | null;
}

export function estCandidatElearning(candidat: CandidatElearning): boolean {
  const modalite = candidat.modalite_formation?.toLowerCase() ?? '';
  const parcours = `${candidat.type_apprenant ?? ''} + ${candidat.formation_choisie ?? ''}`;
  return /^elearning_/.test(modalite) || /(?:^|[\s+])(?:vtc|taxi|ta|va)-e(?:-presentiel)?(?:$|[\s+])/i.test(parcours) || /e[ -]?learning/i.test(parcours);
}

export function mailRelanceElearning(prenom?: string | null) {
  return {
    subject: 'Votre formation : modules à terminer',
    body: `Bonjour${prenom ? ` ${prenom}` : ''},\n\nVous n'avez pas encore terminé tous les modules de votre formation. Vous devez terminer tous les modules qui vous sont attribués, y compris leurs cours, exercices, bilans et examens blancs, même après la réussite de l'examen.\n\nMerci de reprendre les modules qui restent à terminer dans votre espace élève et d'aller jusqu'au bout de chacun. Les modules déjà terminés n'ont pas à être refaits.\n\nLe non-respect de vos obligations de formation peut vous exposer à une sanction du CPF ou de France Travail, selon votre financement et les règles applicables à votre dossier.\n\nNous restons à votre disposition si vous rencontrez des difficultés.\n\nCordialement,\nL'équipe Ftransport`,
  };
}

export function texteMailVersHtml(texte: string): string {
  return texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, '<br>');
}