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
    subject: 'Votre formation e-learning : heures et modules à terminer',
    body: `Bonjour${prenom ? ` ${prenom}` : ''},\n\nVotre connexion aux cours est faible. Vous devez terminer toutes vos heures de formation et tous vos modules, même après la réussite de l'examen.\n\nLe non-respect de vos obligations de formation peut vous exposer à une sanction du CPF ou de France Travail, selon votre financement et les règles applicables à votre dossier.\n\nMerci de poursuivre votre formation et de nous contacter si vous rencontrez des difficultés.\n\nCordialement,\nL'équipe Ftransport`,
  };
}

export function texteMailVersHtml(texte: string): string {
  return texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, '<br>');
}