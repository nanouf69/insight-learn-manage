export const RI_SERVICES_PRO_VERSION = "services-pro-ri-2026-11-24-v2";
export const RI_SERVICES_PRO_DATE = "2026-11-24";

export const RI_SERVICES_PRO_V1 = [
  { num: 1, titre: "Personnes concernees", contenu: "Le present reglement s'applique a toutes les personnes inscrites a une action de formation organisee par FTRANSPORT - Services Pro." },
  { num: 2, titre: "Conditions generales", contenu: "Toute personne en stage doit respecter le present reglement pour toutes les questions relatives a l'hygiene et securite, aux regles generales et permanentes et aux dispositions relatives aux droits de la defense du stagiaire." },
  { num: 3, titre: "Regles generales d'hygiene et de securite", contenu: "Chaque stagiaire doit veiller a sa securite personnelle et a celle des autres en respectant les consignes generales et particulieres de securite et d'hygiene en vigueur sur les lieux de stage." },
  { num: 4, titre: "Produits illicites et boissons alcoolisees", contenu: "Il est interdit de penetrer dans les locaux de formation avec des produits illicites ou des boissons alcoolisees, ou de sejourner en etat d'ivresse dans l'etablissement." },
  { num: 5, titre: "Consignes d'incendie", contenu: "Les consignes d'incendie et un plan de localisation des extincteurs et des issues de secours sont affiches dans les locaux. Tout stagiaire est tenu de respecter scrupuleusement les consignes relatives a la prevention des incendies." },
  { num: 6, titre: "Interdiction de fumer", contenu: "Il est strictement interdit de fumer dans les lieux affectes a un usage collectif ainsi que dans les salles de formation." },
  { num: 7, titre: "Tenue et comportement", contenu: "Les stagiaires sont invites a se presenter en tenue decente et a avoir un comportement correct. Il est formellement interdit de bavarder durant les heures de cours. L'usage du telephone portable est strictement interdit dans les salles de formation, sauf cas exceptionnel." },
  { num: 8, titre: "Horaires, absences et retards", contenu: "Les stagiaires doivent respecter les horaires de stage. En cas d'absence ou de retard, les stagiaires doivent avertir le formateur. Les stagiaires sont tenus de signer obligatoirement l'attestation de presence." },
  { num: 9, titre: "Entrees, sorties et deplacements", contenu: "Les stagiaires n'ont acces aux locaux que pour le deroulement des seances de formation. Sauf autorisation expresse, ils ne peuvent entrer ou demeurer dans l'etablissement a d'autres fins." },
  { num: 10, titre: "Usage du materiel et connexion internet", contenu: "Chaque stagiaire a l'obligation de conserver en bon etat le materiel qui lui est confie. L'utilisation du materiel ou d'une connexion internet a des fins personnelles est interdite." },
  { num: 11, titre: "Enregistrement et videosurveillance", contenu: "Il est formellement interdit d'enregistrer ou de filmer les seances de formation. L'etablissement est place sous videosurveillance pour la securite des personnes et des biens." },
  { num: 12, titre: "Methode pedagogique et documentation", contenu: "Les methodes pedagogiques et la documentation diffusees sont protegees au titre des droits d'auteur et ne peuvent etre reutilisees que pour un strict usage personnel." },
  { num: 13, titre: "Accident", contenu: "Tout accident ou incident survenu a l'occasion ou en cours de formation doit etre immediatement declare par le stagiaire accidente ou les temoins au responsable de la formation." },
  { num: 14, titre: "Information", contenu: "La publicite commerciale, la propagande politique, syndicale ou religieuse sont interdites dans l'enceinte de l'organisme." },
  { num: 15, titre: "Responsabilite en cas de vol", contenu: "L'organisme decline toute responsabilite en cas de perte, vol ou deterioration des objets personnels deposes par les stagiaires dans son enceinte." },
  { num: 16, titre: "Sanctions", contenu: "Tout manquement aux prescriptions du present reglement pourra faire l'objet d'une sanction : avertissement oral, exclusion temporaire ou exclusion definitive. L'exclusion ne pourra en aucun cas donner lieu au remboursement des sommes payees." },
  { num: 17, titre: "Procedure disciplinaire", contenu: "Aucune sanction ne peut etre infligee a un stagiaire sans que celui-ci ait ete informe au prealable des griefs retenus contre lui." },
  { num: 18, titre: "Representation des stagiaires", contenu: "Dans les stages d'une duree superieure a 200 heures, il est procede a l'election d'un delegue titulaire et d'un delegue suppleant au scrutin uninominal a deux tours." },
  { num: 19, titre: "Role des delegues", contenu: "Les delegues font toute suggestion pour ameliorer le deroulement des stages et les conditions de vie des stagiaires." },
  { num: 20, titre: "Entree en application", contenu: "Du gel hydroalcoolique est mis a disposition. Le present reglement interieur entre en application a compter du premier jour de formation." },
];

export const RI_ARTICLE_21 = {
  num: 21,
  titre: "Prévention et traitement des violences, du harcèlement et des discriminations",
  contenu: "Toute violence, tout harcèlement moral ou sexuel, tout agissement sexiste et toute discrimination sont interdits au sein de SERVICES PRO, pendant les formations, en présentiel comme à distance, ainsi que dans les échanges liés à la formation. Toute personne concernée ou témoin peut adresser un signalement confidentiel à contact@ftransport.fr. Le responsable de SERVICES PRO veille à un traitement diligent et impartial du signalement, dans le respect des droits des personnes concernées et avec un accès aux informations limité aux personnes ayant besoin d’en connaître pour le traiter, sous réserve des obligations légales. Les personnes qui signalent de bonne foi des faits ou témoignent sont protégées contre les représailles. Des mesures de protection et d’accompagnement adaptées peuvent être prises. Les faits établis peuvent donner lieu à des sanctions proportionnées, selon la procédure applicable et dans le respect des droits de la défense, notamment des articles 16 et 17 du présent règlement et des dispositions légales impératives. Ce dispositif ne limite pas le droit de saisir les autorités compétentes."
};
export const RI_SERVICES_PRO_V2 = [...RI_SERVICES_PRO_V1, RI_ARTICLE_21];

export function snapshotReglementServicesPro() {
  return {
    ri_version: RI_SERVICES_PRO_VERSION,
    ri_date_version: RI_SERVICES_PRO_DATE,
    ri_articles: RI_SERVICES_PRO_V2.map(article => ({ ...article })),
  };
}
