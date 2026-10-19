/**
 * Mail unique « Résultat théorique (VTC/TAXI) + choix entraînement pratique ».
 * Texte du bloc pratique fourni par le gérant (15/10/2026), repris fidèlement.
 * Aucune conséquence administrative n'est déclenchée par le choix : modèle fourni,
 * aucune déclaration automatique (Caisse des Dépôts, France Travail, abandon).
 */

export const MODELE_CODE = "echec_theorie_choix_pratique";
export const MODELE_VERSION = "v3-2026-10-19";
export const MODELE_NOM = "Choix entraînement pratique";

export type Filiere = "vtc" | "taxi" | "ta";
/** Libellé de filière inséré dans le texte fourni (seul élément adapté). */
export const LIBELLE_FILIERE: Record<Filiere, string> = { vtc: "VTC", taxi: "TAXI", ta: "TAXI (passerelle)" };
const COURT: Record<Filiere, string> = { vtc: "VTC", taxi: "TAXI", ta: "TAXI" };

/**
 * Filière déduite du dossier réel (type_apprenant). null = inconnue ou ambiguë :
 * la préparation est bloquée, rien n'est inventé.
 */
export function filiereDepuisDossier(typeApprenant: string | null | undefined): Filiere | null {
  const t = (typeApprenant || "").toLowerCase().trim();
  if (!t || t.includes("+")) return null;
  // Formations continues / passerelles PA / RP : pas d'examen théorique initial ni de pratique incluse prouvée.
  if (t.startsWith("continue") || t.startsWith("pa") || t.startsWith("rp")) return null;
  if (t.includes("ta-i")) return "taxi";
  if (t === "ta" || t.startsWith("ta-") || t.includes("ta-e")) return "ta";
  if (t.includes("taxi")) return t.includes("vtc") ? null : "taxi";
  if (t === "va" || t.startsWith("va-")) return null;
  if (t.includes("vtc")) return "vtc";
  return null;
}
/** Marqueur de stockage : ce document n'a pas de PDF source importé. */
export const MODELE_FILE_PATH = `modele:${MODELE_CODE}`;

export const objetMail = (f: Filiere) =>
  `Résultat de votre examen théorique ${COURT[f]} et votre entraînement pratique – réponse attendue sous 5 jours`;

export type ChoixCode = "maintenant" | "plus_tard" | "renonce";

export const CHOIX: ReadonlyArray<{ code: ChoixCode; label: string }> = [
  {
    code: "maintenant",
    label: "Je souhaite faire l'entraînement pratique dès maintenant (nous vous proposerons une date rapidement).",
  },
  {
    code: "plus_tard",
    label:
      "Je souhaite faire l'entraînement pratique plus tard, après avoir réussi l'examen théorique, lors d'une prochaine session.",
  },
  {
    code: "renonce",
    label: "Je ne souhaite pas faire l'entraînement pratique et je renonce à cette partie de la formation.",
  },
];

export const introPratique = (f: Filiere) => [
  `Vous avez suivi la partie théorique de votre formation ${LIBELLE_FILIERE[f]} chez FTRANSPORT SERVICES PRO. Malheureusement, vous n'avez pas obtenu l'examen théorique cette fois-ci.`,
  "Nous vous rappelons que l'entraînement pratique est compris dans votre formation. Vous y avez droit, même sans avoir encore réussi la théorie.",
];

export const CONSIGNE_CHOIX = "Merci de nous indiquer votre choix en cochant une seule case :";

export const SUITE_PRATIQUE = [
  "Si vous choisissez de faire l'entraînement pratique plus tard, celui-ci reste à votre disposition pendant 5 mois à compter de ce message. Il vous appartient de revenir vers nous pendant cette période pour convenir d'une date, que vous ayez réussi ou non l'examen théorique. Sans demande de votre part dans ce délai, l'entraînement pratique ne pourra plus être réalisé dans le cadre de cette formation.",
  "Attention : si vous renoncez à l'entraînement pratique, votre sortie de formation sera déclarée comme un abandon de votre part auprès de la Caisse des Dépôts (Mon Compte Formation). Selon votre situation, notamment si vous êtes inscrit à France Travail, cela peut avoir des conséquences sur votre dossier.",
  "Merci de nous répondre par écrit (réponse à ce mail ou document signé) dans un délai de 5 jours à compter de la réception de ce message.",
];

export const SIGNATURE_GERANT = [
  "Naoufal Guenichi",
  "Gérant – Responsable pédagogique",
  "FTRANSPORT SERVICES PRO",
  "86 route de Genas, 69003 Lyon",
  "06 12 32 20 50",
];

export interface TexteFige {
  modele: string;
  filiere?: Filiere;
  titre?: string;
  version: string;
  intro: string[];
  consigne: string;
  choix: { code: ChoixCode; label: string }[];
  suite: string[];
  signataire: string[];
}

export function texteFige(f: Filiere): TexteFige {
  return {
    modele: MODELE_CODE,
    filiere: f,
    titre: `Votre entraînement pratique ${COURT[f]}`,
    version: MODELE_VERSION,
    intro: introPratique(f),
    consigne: CONSIGNE_CHOIX,
    choix: CHOIX.map((c) => ({ ...c })),
    suite: [...SUITE_PRATIQUE],
    signataire: [...SIGNATURE_GERANT],
  };
}

export const estChoixValide = (v: unknown): v is ChoixCode =>
  typeof v === "string" && CHOIX.some((c) => c.code === v);

/** Candidat VTC (garde l'ancien sens pour compatibilité). */
export const estCandidatVtc = (t: string | null | undefined) => filiereDepuisDossier(t) === "vtc";

/** Éligible au mail unique : échec théorique, filière connue, email présent. */
/**
 * Éligibilité revalidée côté serveur depuis le dossier en base (jamais depuis le client).
 * La clé d'envoi identifie l'examen : un nouvel examen permettra un nouveau mail.
 */
export function eligibiliteServeur(a: {
  resultat_examen?: string | null; type_apprenant?: string | null; email?: string | null;
  date_examen_theorique?: string | null; nom?: string | null; prenom?: string | null;
}): { ok: true; filiere: Filiere; cle: string } | { ok: false; raison: string } {
  if (a.resultat_examen !== "non") return { ok: false, raison: "Résultat théorique enregistré différent de « non » (échec)." };
  const filiere = filiereDepuisDossier(a.type_apprenant);
  if (!filiere) return { ok: false, raison: `Filière absente, ambiguë ou sans pratique incluse prouvée (« ${a.type_apprenant || "vide"} »).` };
  const email = (a.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, raison: "Adresse mail absente ou invalide." };
  if (!(a.nom || "").trim() && !(a.prenom || "").trim()) return { ok: false, raison: "Nom et prénom absents du dossier." };
  if (!a.date_examen_theorique) return { ok: false, raison: "Date d'examen théorique absente : examen non identifiable." };
  return { ok: true, filiere, cle: `examen_theorique:${String(a.date_examen_theorique).slice(0, 10)}` };
}

export function estEligibleMailEchec(a: { resultat_examen?: string | null; type_apprenant?: string | null; email?: string | null }) {
  return a.resultat_examen === "non" && filiereDepuisDossier(a.type_apprenant) !== null && !!a.email;
}

export async function empreinteTexte(texte: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Mail unique : résultat théorique (contenu de l'ancien mail de repassage, réécrit)
 * puis bloc pratique fourni, puis bouton « Choisir et signer ».
 * Aucune case cochable dans le mail : le choix se fait sur la page sécurisée.
 */
/** Passage mis en évidence (rouge + gras) dans le HTML ; le texte lui-même est inchangé. */
export const PASSAGE_DELAI_MOIS = "celui-ci reste à votre disposition pendant 5 mois à compter de ce message";
const paraSuite = (t: string) => {
  const e = esc(t);
  const m = esc(PASSAGE_DELAI_MOIS);
  return `<p style="margin:0 0 14px">${e.replace(m, `<strong style="color:#b91c1c;font-weight:bold">${m}</strong>`)}</p>`;
};

export function construireMailEchec(params: { prenom: string; lien: string; filiere: Filiere }): { subject: string; html: string } {
  const intro = introPratique(params.filiere);
  const p = esc(params.prenom || "");
  const lien = esc(params.lien);
  const para = (t: string) => `<p style="margin:0 0 14px">${esc(t)}</p>`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#1f2937;max-width:640px">
<p style="margin:0 0 14px">Bonjour ${p},</p>
${para(intro[0])}
<p style="margin:0 0 14px">Ce résultat ne remet pas en cause vos capacités : beaucoup de nos stagiaires réussissent lors d'un nouveau passage. Nous restons à vos côtés pour la suite.</p>
<p style="margin:18px 0 8px"><strong>1. Repasser l'examen théorique</strong></p>
<p style="margin:0 0 8px">Pour vous réinscrire :</p>
<ol style="margin:0 0 14px;padding-left:22px">
<li>Rendez-vous sur <a href="https://www.exament3p.fr" target="_blank">www.exament3p.fr</a>.</li>
<li>Connectez-vous avec votre adresse email ; si besoin, cliquez sur « Mot de passe oublié » pour en créer un nouveau.</li>
<li>Procédez à votre réinscription à l'examen théorique en suivant les instructions du site.</li>
</ol>
<p style="margin:0 0 14px;color:#b91c1c;font-weight:bold">Important : lors de votre réinscription, vous devez impérativement sélectionner le département 69 (Rhône), même si vous résidez dans un autre département. Si vous choisissez un autre département, nous ne pourrons pas vous former ni vous louer un véhicule pour l'examen pratique.</p>
<p style="margin:0 0 14px">Une fois votre réinscription effectuée, merci de nous recontacter immédiatement afin que nous puissions finaliser votre dossier et vous accompagner pour la suite (Tél : <strong>04 28 29 60 91</strong> – contact@ftransport.fr).</p>
<p style="margin:18px 0 8px"><strong>2. Votre entraînement pratique</strong></p>
${para(intro[1])}
<p style="margin:0 0 8px">Merci de nous indiquer votre choix (une seule réponse possible) parmi les trois propositions suivantes, en cliquant sur le bouton « Choisir et signer » en bas de ce message :</p>
<ul style="margin:0 0 14px;padding-left:22px">
${CHOIX.map((c) => `<li style="margin-bottom:6px">${esc(c.label)}</li>`).join("\n")}
</ul>
${SUITE_PRATIQUE.map(paraSuite).join("\n")}
<p style="margin:22px 0;text-align:center"><a href="${lien}" target="_blank" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:8px">Choisir et signer</a></p>
<p style="margin:0 0 14px;font-size:13px;color:#4b5563">Sur la page sécurisée, votre nom et votre prénom sont déjà indiqués ; vous cochez une seule case, puis vous signez. La date est enregistrée automatiquement. Si le bouton ne fonctionne pas, copiez ce lien : <a href="${lien}">${lien}</a></p>
<p style="margin:0 0 14px">Nous restons à votre disposition pour toute question.</p>
<p style="margin:0 0 4px">Cordialement,</p>
<p style="margin:0">${SIGNATURE_GERANT.map(esc).join("<br>")}</p>
</div>`;
  return { subject: objetMail(params.filiere), html };
}

/** Échéances calculées UNIQUEMENT depuis la date d'envoi réelle enregistrée (pas une preuve de réception). */
export function echeancesDepuisEnvoi(envoyeLe: string | null | undefined) {
  if (!envoyeLe) return null;
  const d = new Date(envoyeLe);
  if (isNaN(d.getTime())) return null;
  const j5 = new Date(d.getTime() + 5 * 86400000);
  const m5 = new Date(d);
  m5.setMonth(m5.getMonth() + 5);
  return { envoi: d, reponseAttendue: j5, finDisponibilite: m5 };
}

export const formatParis = (d: Date | string) =>
  new Date(d).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "medium" });
