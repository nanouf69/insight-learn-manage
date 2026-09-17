// ======================================================================
// Recherche de notions, cours et exercices dans tous les modules
// Lecture seule : n'écrit jamais dans les modules ni les données apprenants
// ======================================================================
import { VTC_COURS_DATA } from "./vtc-cours-data";
import { TAXI_COURS_DATA } from "./taxi-cours-data";
import { TA_COURS_DATA } from "./ta-cours-data";
import { VA_COURS_DATA } from "./va-cours-data";
import { BILAN_EXERCICES_VTC } from "./bilan-exercices-vtc-data";
import { BILAN_EXERCICES_TAXI } from "./bilan-exercices-taxi-data";
import { BILAN_EXERCICES_TA } from "./bilan-exercices-ta-data";
import { BILAN_EXERCICES_VA } from "./bilan-exercices-va-data";
import { BILAN_EXERCICES_FC_VTC } from "./bilan-exercices-fc-vtc-data";
import { BILAN_EXERCICES_FC_TAXI } from "./bilan-exercices-fc-taxi-data";
import { BILAN_EXAMEN_VTC } from "./bilan-examen-vtc-data";
import { BILAN_EXAMEN_TAXI } from "./bilan-examen-taxi-data";
import { BILAN_EXAMEN_TA } from "./bilan-examen-ta-data";
import { BILAN_EXAMEN_VA } from "./bilan-examen-va-data";
import { QRC_COURS_VTC, QRC_COURS_TAXI, QRC_COURS_TA, QRC_COURS_VA } from "./bilan-qrc-cours-data";

export interface SearchableModule {
  id: number;
  nom: string;
  cours: any[];
  exercices: any[];
}

export type SearchResultKind = "cours" | "exercice" | "question";

export interface ModuleSearchResult {
  key: string;
  moduleId: number;
  moduleNom: string;
  kind: SearchResultKind;
  titre: string;
  contexte?: string;
  extrait?: string;
}

const asModule = (id: number, nom: string, cours: any[], exercices: any[]): SearchableModule => ({
  id,
  nom,
  cours: cours || [],
  exercices: exercices || [],
});

/** Contenu source de référence, par module */
export const SEARCHABLE_MODULES: SearchableModule[] = [
  asModule(2, "2.COURS ET EXERCICES VTC", VTC_COURS_DATA.cours, VTC_COURS_DATA.exercices),
  asModule(10, "2.COURS ET EXERCICES TAXI", TAXI_COURS_DATA.cours, TAXI_COURS_DATA.exercices),
  asModule(40, "2.COURS ET EXERCICES TA", TA_COURS_DATA.cours, TA_COURS_DATA.exercices),
  asModule(41, "2.COURS ET EXERCICES VA", VA_COURS_DATA.cours, VA_COURS_DATA.exercices),
  asModule(4, "4.BILAN EXERCICES VTC", QRC_COURS_VTC as any[], BILAN_EXERCICES_VTC as any[]),
  asModule(9, "4.BILAN EXERCICES TAXI", QRC_COURS_TAXI as any[], BILAN_EXERCICES_TAXI as any[]),
  asModule(27, "4.BILAN EXERCICES TA", QRC_COURS_TA as any[], BILAN_EXERCICES_TA as any[]),
  asModule(29, "4.BILAN EXERCICES VA", QRC_COURS_VA as any[], BILAN_EXERCICES_VA as any[]),
  asModule(81, "1.BILAN EXERCICES FORMATION CONTINUE VTC", [], BILAN_EXERCICES_FC_VTC as any[]),
  asModule(82, "1.BILAN EXERCICES FORMATION CONTINUE TAXI", [], BILAN_EXERCICES_FC_TAXI as any[]),
  asModule(5, "6.BILAN EXAMEN VTC", [], BILAN_EXAMEN_VTC as any[]),
  asModule(11, "6.BILAN EXAMEN TAXI", [], BILAN_EXAMEN_TAXI as any[]),
  asModule(28, "6.BILAN EXAMEN TA", [], BILAN_EXAMEN_TA as any[]),
  asModule(30, "6.BILAN EXAMEN VA", [], BILAN_EXAMEN_VA as any[]),
];

export const normalizeText = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/<[^>]*>/g, " ")
    .toLowerCase();

const makeExtrait = (haystack: string, terms: string[], max = 160): string => {
  const plain = String(haystack ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!plain) return "";
  const norm = normalizeText(plain);
  const idx = terms.map((t) => norm.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, idx - 50);
  const slice = plain.slice(start, start + max);
  return `${start > 0 ? "…" : ""}${slice}${start + max < plain.length ? "…" : ""}`;
};

const matchAll = (terms: string[], haystack: string) => terms.every((t) => haystack.includes(t));

/**
 * Recherche dans les cours, exercices et questions de tous les modules.
 * `overrides` permet d'utiliser le contenu réellement enregistré en base (module_editor_state).
 */
export function searchModuleContent(
  query: string,
  overrides: Record<number, { cours?: any[]; exercices?: any[] }> = {},
  limit = 80,
): ModuleSearchResult[] {
  const terms = normalizeText(query).split(/\s+/).filter((t) => t.length >= 2);
  if (terms.length === 0) return [];

  const results: ModuleSearchResult[] = [];

  for (const mod of SEARCHABLE_MODULES) {
    const ov = overrides[mod.id];
    const cours = Array.isArray(ov?.cours) ? ov!.cours! : mod.cours;
    const exercices = Array.isArray(ov?.exercices) ? ov!.exercices! : mod.exercices;

    for (const c of cours) {
      const hay = normalizeText([c?.titre, c?.sousTitre, c?.description].filter(Boolean).join(" "));
      if (matchAll(terms, hay)) {
        results.push({
          key: `c-${mod.id}-${c?.id}`,
          moduleId: mod.id,
          moduleNom: mod.nom,
          kind: "cours",
          titre: String(c?.titre ?? "Cours sans titre"),
          contexte: c?.sousTitre ? String(c.sousTitre) : undefined,
          extrait: makeExtrait([c?.description, c?.sousTitre].filter(Boolean).join(" — "), terms),
        });
      }
    }

    for (const ex of exercices) {
      const exTitre = String(ex?.titre ?? "Exercice");
      const hayEx = normalizeText([ex?.titre, ex?.sousTitre].filter(Boolean).join(" "));
      if (matchAll(terms, hayEx)) {
        results.push({
          key: `e-${mod.id}-${ex?.id}`,
          moduleId: mod.id,
          moduleNom: mod.nom,
          kind: "exercice",
          titre: exTitre,
          contexte: ex?.sousTitre ? String(ex.sousTitre) : undefined,
        });
      }

      const questions: any[] = Array.isArray(ex?.questions) ? ex.questions : [];
      for (const q of questions) {
        const choixTexte = Array.isArray(q?.choix) ? q.choix.map((c: any) => c?.texte).join(" ") : "";
        const hayQ = normalizeText(
          [q?.enonce, choixTexte, q?.reponseQRC, q?.explication].filter(Boolean).join(" "),
        );
        if (matchAll(terms, hayQ)) {
          results.push({
            key: `q-${mod.id}-${ex?.id}-${q?.id}`,
            moduleId: mod.id,
            moduleNom: mod.nom,
            kind: "question",
            titre: String(q?.enonce ?? "Question").replace(/<[^>]*>/g, " ").trim(),
            contexte: exTitre,
            extrait: makeExtrait([choixTexte, q?.reponseQRC, q?.explication].filter(Boolean).join(" — "), terms),
          });
        }
        if (results.length >= limit) return results;
      }
      if (results.length >= limit) return results;
    }
    if (results.length >= limit) return results;
  }

  return results;
}
