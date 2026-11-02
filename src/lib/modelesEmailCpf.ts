// Liens CPF copiés tels quels depuis les boutons « (Lien CPF) » de https://ftransport.fr/ (relevé 02/11/2026).
// Ne jamais inventer ni remplacer un lien : le modifier uniquement s'il change sur le site.
const MCF = "https://www.moncompteformation.gouv.fr/espace-prive/html/#/formation/recherche/";

export const LIENS_CPF = {
  vtcJournee: `${MCF}82346156100016_VTC/82346156100016_VTC`,
  vtcSoiree: `${MCF}82346156100016_TAXIS/82346156100016_TAXIS`,
  vtcElearning: `${MCF}82346156100016_VTCEP/82346156100016_VTCEP`,
  passerelleTaxiVersVtc: `${MCF}82346156100016_vtcc/82346156100016_vtcc`,
  taxiPresentiel: `${MCF}82346156100016_TAXIF/82346156100016_TAXIP`,
  taxiElearning: `${MCF}82346156100016_TAXIE/82346156100016_TAXIE`,
  passerelleVtcVersTaxi: `${MCF}82346156100016_TAXIcourt/82346156100016_TAXI3`,
} as const;

export interface ModeleEmailCpf {
  id: string;
  label: string;
  icon: string;
  getSubject: (a: { prenom?: string | null }) => string;
  getBody: (a: { prenom?: string | null }) => string;
}

const corps = (formation: string, lien: string) => (a: { prenom?: string | null }) => {
  const prenom = (a?.prenom ?? "").trim();
  return `Bonjour${prenom ? ` ${prenom}` : ""},

Voici le lien pour vous inscrire à la ${formation} de FTRANSPORT avec votre CPF.

Comment faire :
1. Cliquez sur le lien ci-dessous.
2. Connectez-vous à Mon Compte Formation (moncompteformation.gouv.fr) avec vos identifiants.
3. Vérifiez la formation et la session, puis validez votre demande d'inscription.

👉 Lien CPF de la formation : ${lien}

Le financement dépend de vos droits CPF disponibles et de la validation de votre dossier sur Mon Compte Formation ; il n'est pas automatique.

Pour toute question, contactez-nous :
📞 Tél : 04 28 29 60 91
📧 Email : contact@ftransport.fr

Cordialement,
L'équipe Ftransport
86 Route de Genas, 69003 Lyon`;
};

const modele = (id: string, label: string, formation: string, lien: string): ModeleEmailCpf => ({
  id, label, icon: "🔗",
  getSubject: () => `Votre lien CPF : ${formation} — FTRANSPORT`,
  getBody: corps(formation, lien),
});

export const MODELES_EMAIL_CPF: ModeleEmailCpf[] = [
  modele("cpf-vtc-journee", "🔗 CPF VTC — Journée", "formation VTC en présentiel (journée)", LIENS_CPF.vtcJournee),
  modele("cpf-vtc-soiree", "🔗 CPF VTC — Soirée", "formation VTC en présentiel (soirée)", LIENS_CPF.vtcSoiree),
  modele("cpf-vtc-elearning", "🔗 CPF VTC — E-learning", "formation VTC en e-learning", LIENS_CPF.vtcElearning),
  modele("cpf-taxi-presentiel", "🔗 CPF TAXI — Présentiel", "formation TAXI en présentiel", LIENS_CPF.taxiPresentiel),
  modele("cpf-taxi-elearning", "🔗 CPF TAXI — E-learning", "formation TAXI en e-learning", LIENS_CPF.taxiElearning),
  modele("cpf-passerelle-taxi-vtc", "🔗 CPF Passerelle TAXI → VTC", "passerelle chauffeur TAXI vers chauffeur VTC", LIENS_CPF.passerelleTaxiVersVtc),
  modele("cpf-passerelle-vtc-taxi", "🔗 CPF Passerelle VTC → TAXI", "passerelle chauffeur VTC vers chauffeur TAXI", LIENS_CPF.passerelleVtcVersTaxi),
];
