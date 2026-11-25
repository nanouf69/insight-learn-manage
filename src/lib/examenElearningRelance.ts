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

export type FormationPratique = 'VTC' | 'TAXI';

export function formationPratiqueCandidat(candidat: CandidatElearning): FormationPratique {
  return /taxi|ta-e/i.test(`${candidat.type_apprenant ?? ''} ${candidat.formation_choisie ?? ''}`) ? 'TAXI' : 'VTC';
}

export function mailRelancePratique(prenom: string | null | undefined, formation: FormationPratique) {
  return {
    subject: `Modules obligatoires avant votre entraînement pratique ${formation}`,
    body: `Bonjour${prenom ? ` ${prenom}` : ''},\n\nNotre suivi indique que vous n'avez pas encore terminé tous les modules de votre formation.\n\nMerci de finaliser dès maintenant dans votre espace élève chacun des modules qui vous sont attribués, avec leurs cours, exercices, bilans et examens blancs. Les modules déjà terminés n'ont pas à être refaits.\n\nCette finalisation est indispensable pour participer à l’entraînement pratique ${formation}. Si vous rencontrez une difficulté, contactez-nous rapidement afin que nous puissions vous accompagner.`,
  };
}

export function texteMailVersHtml(texte: string): string {
  return texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, '<br>');
}

const nombreAffiche = (value: number) => Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;

/** Mise en forme de la relance pratique ; tout texte modifiable est échappé. */
export function mailRelancePratiqueHtml({ texte, formation, termines, total, restants }: { texte: string; formation: FormationPratique; termines: number; total: number; restants: number }) {
  const fait = nombreAffiche(termines);
  const totalSur = nombreAffiche(total);
  const aFaire = nombreAffiche(restants);
  return `<div style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#1f3040"><div style="max-width:640px;margin:0 auto;border:1px solid #b5d6e8;border-radius:14px;overflow:hidden;background:#ffffff"><div style="padding:24px 28px;background:#0d2540;color:#ffffff"><div style="font-size:13px;font-weight:bold;letter-spacing:1.5px;color:#7dd3fc">FTRANSPORT</div><div style="margin-top:7px;font-size:22px;font-weight:bold">Entraînement pratique ${formation}</div><div style="margin-top:5px;font-size:14px;color:#dbeafe">Finalisation de votre formation</div></div><div style="padding:26px 28px"><div style="padding:16px;border-radius:10px;background:#e8f4fb;border:1px solid #b5d6e8"><div style="font-size:18px;font-weight:bold;color:#0d2540">${fait} / ${totalSur} modules terminés</div><div style="margin-top:5px;font-size:14px;color:#295f85">${aFaire} module${aFaire > 1 ? 's' : ''} en ligne à réaliser</div></div><div style="margin-top:18px;padding:16px;border-left:5px solid #dc2626;border-radius:8px;background:#fef2f2;color:#991b1b;font-size:15px;line-height:1.55"><strong>Important :</strong> si vos modules ne sont pas tous terminés, vous ne pourrez pas participer à l’entraînement pratique. Toute date déjà choisie pourra être annulée ; une nouvelle date dépendra des places restantes.</div><div style="margin-top:22px;font-size:15px;line-height:1.7">${texteMailVersHtml(texte)}</div></div><div style="padding:14px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#52697a;font-size:12px;line-height:1.5">Besoin d’aide ? Répondez à ce message ou contactez le centre au 04 28 29 60 91.</div></div></div>`;
}
