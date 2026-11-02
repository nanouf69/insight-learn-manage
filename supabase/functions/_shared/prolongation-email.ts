// Fonction pure (testée par src/test/prolongation-acces-email.test.ts).
// Jamais de mot de passe, jamais de lien de définition : le compte et les identifiants restent inchangés.
export const PROLONGATION_SUJET = "Prolongation de votre accès à la formation";
export const PROLONGATION_LIEN = "https://insight-learn-manage.lovable.app/cours-public";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export function dateFr(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function construireMailProlongation(p: { prenom?: string | null; fin: string }): { subject: string; html: string; preview: string } {
  const prenom = (p.prenom ?? "").trim();
  const fin = dateFr(p.fin);
  const texte = "Votre accès à la plateforme de formation a été prolongé d'un mois. Vous pouvez continuer à vous connecter avec votre compte habituel et vos identifiants actuels.";
  const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
<p>Bonjour${prenom ? " " + esc(prenom) : ""},</p>
<p>${texte}</p>
<p>Nouvelle date de fin d'accès : <strong>${fin}</strong> (incluse).</p>
<p><a href="${PROLONGATION_LIEN}" style="background-color:#1e40af;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Se connecter à la plateforme</a></p>
<p style="font-size:13px;color:#6b7280;">Lien : ${PROLONGATION_LIEN}</p>
</div>`;
  return { subject: PROLONGATION_SUJET, html, preview: `${texte} Nouvelle date de fin d'accès : ${fin}.` };
}
