// Logique PURE commune aux relances pédagogiques (aucun accès base, testable hors Deno).
// Objectif = terminer les modules attribués du parcours ; les connexions ne sont qu'un indice d'inactivité.

/** Modules de pratique physique (VTC 8, TAXI 6) : jamais « à faire en ligne ». */
export const MODULES_PRATIQUE_PHYSIQUE = new Set([6, 8]);
export const FORMATIONS_ELEARNING = new Set(["vtc-e", "taxi-e", "ta-e", "va-e"]);
/** Balises d'objet utilisées pour l'anti-doublon (anciens + nouveaux objets). */
export const TAGS_RELANCE_PEDAGOGIQUE = ["Nous sommes là pour vous", "Terminez vos modules", "les modules à terminer"];

export interface EtatModules {
  requis: number[];
  termines: number[];
  restantsEnLigne: number[];
  pratiqueRestante: boolean;
  /** true seulement si un module en ligne reste à terminer (statut serveur ≠ completed). */
  relancePertinente: boolean;
}

/** Seul le statut serveur « completed » compte (jamais progress = 100 seul). */
export function etatModules(modulesAutorises: unknown, completions: Array<{ module_id: number | string; status?: string | null }>): EtatModules {
  const requis = Array.isArray(modulesAutorises) ? [...new Set(modulesAutorises.map(Number).filter((n) => Number.isFinite(n) && n > 0))] : [];
  const done = new Set(completions.filter((c) => String(c.status ?? "").toLowerCase() === "completed").map((c) => Number(c.module_id)));
  const termines = requis.filter((m) => done.has(m));
  const restants = requis.filter((m) => !done.has(m));
  const restantsEnLigne = restants.filter((m) => !MODULES_PRATIQUE_PHYSIQUE.has(m));
  return { requis, termines, restantsEnLigne, pratiqueRestante: restants.some((m) => MODULES_PRATIQUE_PHYSIQUE.has(m)), relancePertinente: requis.length > 0 && restantsEnLigne.length > 0 };
}

const passed = (v: unknown) => ["oui", "admis", "reussi", "réussi"].includes(String(v ?? "").toLowerCase());

/** Exclusions communes : accès non actif/terminé, archivé, supprimé, test, examen réussi, relevé gelé (fin d'accès). */
export function exclusionRelance(a: any, now: Date, ctx: { testIds: Set<string>; gelIds: Set<string> }): string | null {
  const t = String(a.type_apprenant || a.formation_choisie || "").toLowerCase().trim();
  if (!FORMATIONS_ELEARNING.has(t)) return "non e-learning";
  if (ctx.testIds.has(a.id)) return "compte test";
  if (a.deleted_at || a.compte_cours_archive_at || String(a.statut || "").toLowerCase() === "archive") return "archivé";
  if (ctx.gelIds.has(a.id)) return "accès terminés (relevé figé)";
  if (passed(a.resultat_examen) || a.resultat_examen_pratique === "non") return "non éligible (règle existante)";
  const debut = a.date_debut_cours_en_ligne || a.date_debut_formation;
  const fin = a.date_fin_cours_en_ligne || a.date_fin_formation;
  if (!debut || new Date(debut) > now) return "accès non commencé";
  if (fin && new Date(String(fin).slice(0, 10) + "T23:59:59") < now) return "accès terminés";
  return null;
}

const esc = (s: string) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export const SUJET_RELANCE_MODULES = "Votre formation : les modules à terminer";
export const LIEN_ESPACE_ELEVE = "https://gestion.ftransport.fr/cours-public";

/** Texte du mail : aucun identifiant, aucune note/réponse, aucune promesse CPF. */
export function mailModulesATerminer(p: { prenom?: string | null; etat: EtatModules; nomModule: (id: number) => string; avertissementHtml?: string }) {
  const { etat } = p;
  const liste = etat.restantsEnLigne.slice(0, 5).map((id) => `<li>${esc(p.nomModule(id))}</li>`).join("");
  const plus = etat.restantsEnLigne.length > 5 ? `<li>… et ${etat.restantsEnLigne.length - 5} autre(s)</li>` : "";
  const pratique = etat.pratiqueRestante
    ? `<p>Votre séance de pratique se fait en présentiel : elle n'est pas à réaliser en ligne. Nous revenons vers vous pour les dates si elle n'est pas encore planifiée.</p>`
    : "";
  const html = `<p>Bonjour ${esc(p.prenom || "")},</p>
<p>L'objectif de votre formation en ligne est de <strong>terminer tous les modules qui vous ont été attribués</strong> : cours, exercices, bilans et examens blancs. Le temps passé connecté ne suffit pas : ce sont les modules terminés qui comptent.</p>
<p>Vous avez terminé <strong>${etat.termines.length} module(s) sur ${etat.requis.length}</strong>. Il vous reste notamment :</p>
<ul>${liste}${plus}</ul>
<p>👉 Reprenez dès que possible avec le prochain module non terminé, depuis votre espace élève :<br><a href="${LIEN_ESPACE_ELEVE}">Accéder à mes cours</a></p>
${pratique}
<p>Terminer un module, c'est faire son contenu jusqu'au bout ; réussir l'examen est une étape distincte, que ces modules vous aident à préparer.</p>
<p>Besoin d'aide ? Contactez-nous au 04 28 29 60 91 ou à contact@ftransport.fr.</p>
${p.avertissementHtml ?? ""}
<p>Cordialement,<br>L'équipe FTRANSPORT</p>`;
  return { subject: SUJET_RELANCE_MODULES, html, preview: `Il vous reste ${etat.restantsEnLigne.length} module(s) à terminer (${etat.termines.length}/${etat.requis.length}).` };
}
