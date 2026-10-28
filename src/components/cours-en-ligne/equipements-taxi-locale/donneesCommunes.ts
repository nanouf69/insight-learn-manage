/**
 * Module 7 « Connaissance de la ville » — deux quiz additifs (demande du 28/10/2026 14:17 UTC) :
 * les 58 communes de la Métropole de Lyon et les communes de la ZUPC (23 communes + aéroport).
 * Listes reprises à l'identique des bonnes réponses des quiz existants 7020 et 7021 (non modifiés).
 * Identité immuable : changement = nouvel ID + nouvelle version.
 */
import type { QuestionEquipement } from "./donnees";

export const BORNE_COMMUNES_M7 = "2026-10-28T14:17:00Z";
export const ID_QUIZ_METROPOLE = "quiz_m7_58_communes_metropole_v1";
export const VERSION_QUIZ_METROPOLE = "2026-10-28-m7-metropole-v1";
export const ID_QUIZ_ZUPC = "quiz_m7_communes_zupc_v1";
export const VERSION_QUIZ_ZUPC = "2026-10-28-m7-zupc-v1";

export const COMMUNES_METROPOLE = [
  "Albigny-sur-Saône", "Bron", "Cailloux-sur-Fontaines", "Caluire-et-Cuire", "Champagne-au-Mont-d'Or", "Charbonnières-les-Bains",
  "Charly", "Chassieu", "Collonges-au-Mont-d'Or", "Corbas", "Couzon-au-Mont-d'Or", "Craponne", "Curis-au-Mont-d'Or", "Dardilly",
  "Décines-Charpieu", "Écully", "Feyzin", "Fleurieu-sur-Saône", "Fontaines-Saint-Martin", "Fontaines-sur-Saône", "Francheville",
  "Genay", "Givors", "Grigny-sur-Rhône", "Irigny", "Jonage", "La Mulatière", "La Tour-de-Salvagny", "Limonest", "Lissieu", "Lyon",
  "Marcy-l'Étoile", "Meyzieu", "Mions", "Montanay", "Neuville-sur-Saône", "Oullins-Pierre-Bénite", "Poleymieux-au-Mont-d'Or",
  "Quincieux", "Rillieux-la-Pape", "Rochetaillée-sur-Saône", "Saint-Cyr-au-Mont-d'Or", "Saint-Didier-au-Mont-d'Or", "Saint-Fons",
  "Saint-Genis-Laval", "Saint-Genis-les-Ollières", "Saint-Germain-au-Mont-d'Or", "Saint-Priest", "Saint-Romain-au-Mont-d'Or",
  "Sainte-Foy-lès-Lyon", "Sathonay-Camp", "Sathonay-Village", "Solaize", "Tassin-la-Demi-Lune", "Vaulx-en-Velin", "Vénissieux",
  "Vernaison", "Villeurbanne",
];
const HORS_METROPOLE = [
  "Anse", "Brignais", "Chaponnay", "Chaponost", "Chasselay", "Civrieux-d'Azergues", "Colombier-Saugnieu", "Communay", "Genas",
  "Grézieu-la-Varenne", "L'Arbresle", "Marennes", "Millery", "Mornant", "Pusignan", "Saint-Bonnet-de-Mure",
  "Saint-Symphorien-d'Ozon", "Sainte-Consorce", "Simandres", "Tarare", "Ternay", "Toussieu", "Villefranche-sur-Saône", "Vourles",
];
export const COMMUNES_ZUPC = [
  "Aéroport de Lyon-Saint-Exupéry", "Bron", "Caluire-et-Cuire", "Champagne-au-Mont-d'Or", "Chassieu", "Collonges-au-Mont-d'Or",
  "Décines-Charpieu", "Écully", "Francheville", "Genas", "La Mulatière", "Lyon", "Meyzieu", "Oullins-Pierre-Bénite",
  "Rillieux-la-Pape", "Saint-Cyr-au-Mont-d'Or", "Saint-Didier-au-Mont-d'Or", "Saint-Fons", "Saint-Priest", "Sainte-Foy-lès-Lyon",
  "Tassin-la-Demi-Lune", "Vaulx-en-Velin", "Vénissieux", "Villeurbanne",
];
const HORS_ZUPC = COMMUNES_METROPOLE.filter((c) => !COMMUNES_ZUPC.includes(c));

/** Une question par commune : la bonne réponse + 2 intrus, position de la bonne réponse alternée (déterministe). */
function construire(bonnes: string[], intrus: string[], enonce: string, justif: (c: string) => string): QuestionEquipement[] {
  return bonnes.map((c, i) => {
    const a = intrus[(i * 2) % intrus.length];
    const b = intrus[(i * 2 + 1) % intrus.length];
    const pos = i % 3;
    const choix = [a, b];
    choix.splice(pos, 0, c);
    return { id: `q${String(i + 1).padStart(2, "0")}`, enonce, choix, correct: pos, justification: justif(c) };
  });
}

export const QUESTIONS_METROPOLE = construire(COMMUNES_METROPOLE, HORS_METROPOLE,
  "Laquelle de ces communes fait partie de la Métropole de Lyon ?",
  (c) => `${c} fait partie des 58 communes de la Métropole de Lyon. Les deux autres communes proposées n'en font pas partie.`);

export const QUESTIONS_ZUPC = construire(COMMUNES_ZUPC, [...HORS_ZUPC, ...HORS_METROPOLE.filter((c) => c !== "Genas" && c !== "Colombier-Saugnieu")],
  "Laquelle de ces communes (ou lieu) fait partie de la ZUPC de Lyon ?",
  (c) => `${c} fait partie de la ZUPC de Lyon (23 communes + l'aéroport de Lyon-Saint-Exupéry). Les deux autres propositions n'en font pas partie.`);
