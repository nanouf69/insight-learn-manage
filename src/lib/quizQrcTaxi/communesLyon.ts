// Listes de référence vérifiées le 30/10/2026 :
// - Métropole de Lyon : 58 communes, identiques au registre officiel geo.api.gouv.fr (EPCI 200046977)
//   et à QUIZ_COMMUNES_METROPOLE (module 7).
// - ZUPC : arrêté préfectoral du Rhône du 21/09/2026, article 17 : Aéroport de Lyon-Saint-Exupéry
//   + 23 communes (Oullins-Pierre-Bénite = une seule commune depuis la fusion).

export interface ElementReference {
  nom: string;
  /** false pour l'aéroport : à citer mais ce n'est pas une commune. */
  estCommune: boolean;
  /** Variantes acceptées (anciens noms, abréviations courantes). */
  alias?: string[];
}

export const METROPOLE_LYON: ElementReference[] = [
  "Albigny-sur-Saône", "Bron", "Cailloux-sur-Fontaines", "Caluire-et-Cuire", "Champagne-au-Mont-d'Or",
  "Charbonnières-les-Bains", "Charly", "Chassieu", "Collonges-au-Mont-d'Or", "Corbas",
  "Couzon-au-Mont-d'Or", "Craponne", "Curis-au-Mont-d'Or", "Dardilly", "Décines-Charpieu",
  "Écully", "Feyzin", "Fleurieu-sur-Saône", "Fontaines-Saint-Martin", "Fontaines-sur-Saône",
  "Francheville", "Genay", "Givors", "Grigny-sur-Rhône", "Irigny", "Jonage", "La Mulatière",
  "La Tour-de-Salvagny", "Limonest", "Lissieu", "Lyon", "Marcy-l'Étoile", "Meyzieu", "Mions",
  "Montanay", "Neuville-sur-Saône", "Oullins-Pierre-Bénite", "Poleymieux-au-Mont-d'Or",
  "Quincieux", "Rillieux-la-Pape", "Rochetaillée-sur-Saône", "Saint-Cyr-au-Mont-d'Or",
  "Saint-Didier-au-Mont-d'Or", "Saint-Fons", "Saint-Genis-Laval", "Saint-Genis-les-Ollières",
  "Saint-Germain-au-Mont-d'Or", "Saint-Priest", "Saint-Romain-au-Mont-d'Or", "Sainte-Foy-lès-Lyon",
  "Sathonay-Camp", "Sathonay-Village", "Solaize", "Tassin-la-Demi-Lune", "Vaulx-en-Velin",
  "Vénissieux", "Vernaison", "Villeurbanne",
].map((nom) => ({ nom, estCommune: true }));

export const ZUPC_LYON: ElementReference[] = [
  { nom: "Aéroport de Lyon-Saint-Exupéry", estCommune: false, alias: ["Aéroport", "Aéroport Saint-Exupéry", "Saint-Exupéry", "Aéroport de Lyon", "Lyon Saint-Exupéry"] },
  ...[
    "Bron", "Caluire-et-Cuire", "Champagne-au-Mont-d'Or", "Chassieu", "Collonges-au-Mont-d'Or",
    "Décines-Charpieu", "Écully", "Francheville", "Genas", "La Mulatière", "Lyon", "Meyzieu",
    "Oullins-Pierre-Bénite", "Rillieux-la-Pape", "Saint-Cyr-au-Mont-d'Or", "Saint-Didier-au-Mont-d'Or",
    "Saint-Fons", "Saint-Priest", "Sainte-Foy-lès-Lyon", "Tassin-la-Demi-Lune", "Vaulx-en-Velin",
    "Vénissieux", "Villeurbanne",
  ].map((nom) => ({ nom, estCommune: true })),
];

/** Anciens noms / formes courtes acceptés pour toutes les zones. */
export const ALIAS_COMMUNS: Record<string, string[]> = {
  "Oullins-Pierre-Bénite": ["Oullins", "Pierre-Bénite"],
  "Décines-Charpieu": ["Décines", "Charpieu"],
  "Caluire-et-Cuire": ["Caluire"],
  "Tassin-la-Demi-Lune": ["Tassin"],
  "Grigny-sur-Rhône": ["Grigny"],
};

/** Communes voisines hors zone servant de distracteurs et de garde contre les faux positifs. */
export const COMMUNES_HORS_METROPOLE = [
  "Anse", "Brignais", "Chaponost", "Villefranche-sur-Saône", "Communay", "L'Arbresle", "Tarare",
  "Ternay", "Colombier-Saugnieu", "Mornant", "Pusignan", "Saint-Symphorien-d'Ozon", "Grézieu-la-Varenne",
  "Millery", "Sainte-Consorce", "Vourles", "Genas", "Saint-Bonnet-de-Mure", "Saint-Laurent-de-Mure",
  "Vienne", "Marennes", "Chasselay", "Dommartin", "Brindas", "Messimy", "Montluel", "Miribel",
];

export function distracteurs(zone: "metropole" | "zupc"): string[] {
  const ref = new Set((zone === "metropole" ? METROPOLE_LYON : ZUPC_LYON).map((e) => e.nom));
  const pool = zone === "metropole"
    ? COMMUNES_HORS_METROPOLE
    : [...METROPOLE_LYON.map((e) => e.nom), ...COMMUNES_HORS_METROPOLE];
  return Array.from(new Set(pool.filter((n) => !ref.has(n))));
}
