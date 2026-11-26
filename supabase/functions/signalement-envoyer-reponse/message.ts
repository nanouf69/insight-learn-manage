const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const STATUTS: Record<string, string> = { recu: "Non résolu", en_cours: "Non résolu", traite: "Résolu" };

export function construireReponse(p: { reference: string; nom: string | null; demande: string; reponse: string; statut: string }) {
  const sujet = `[${p.reference}] Réponse du centre à votre signalement`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:640px">
<p>Bonjour${p.nom ? ` ${esc(p.nom)}` : ""},</p>
<p>Voici la réponse du centre à votre signalement <strong>${esc(p.reference)}</strong> (état : ${esc(STATUTS[p.statut] ?? "Non résolu")}).</p>
<p style="white-space:pre-wrap;border-left:3px solid #1e40af;padding-left:12px">${esc(p.reponse)}</p>
<p style="color:#555"><strong>Votre demande :</strong></p><p style="white-space:pre-wrap;color:#555">${esc(p.demande)}</p>
<p>Vous retrouvez ce suivi dans votre espace, onglet « Signaler une remarque ou un bug ».</p>
</div>`;
  return { sujet, html };
}
