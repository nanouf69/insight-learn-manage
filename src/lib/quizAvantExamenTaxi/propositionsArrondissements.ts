/**
 * Propositions À VALIDER (aperçu admin seul, jamais écrites en production) :
 * QCM multi-réponses « Cochez toutes les … situées dans le Ne arrondissement de Lyon ».
 * Rattachements pris UNIQUEMENT des corrigés existants (module 7 : 7010 avenues, 7011 boulevards,
 * 7013 places) quand une seule bonne réponse « Ne arrondissement » est enregistrée. Rien d'inventé.
 */
import type { ItemInventaire } from "./inventaire";

export type Categorie = "avenues" | "boulevards" | "places";
export const CATEGORIES: Record<Categorie, { exercice: number; libelle: string; accord: string }> = {
  avenues: { exercice: 7010, libelle: "Avenues", accord: "toutes les avenues situées" },
  boulevards: { exercice: 7011, libelle: "Boulevards", accord: "tous les boulevards situés" },
  places: { exercice: 7013, libelle: "Places", accord: "toutes les places situées" },
};

export interface Rattachement { voie: string; arrondissement: number; source: string }
export interface Proposition {
  id: string; arrondissement: number; categorie: Categorie; enonce: string;
  choix: { texte: string; correct: boolean; arrondissement: number; source: string }[];
}
export interface Lacune { arrondissement: number; categorie: Categorie; raison: string }

const ord = (n: number) => (n === 1 ? "1er" : `${n}e`);
const voieDe = (enonce: string) => enonce.match(/se trouve (?:l'|la |le |les )?(.+?)\s*\?\s*$/i)?.[1]?.trim() ?? null;
const arrDe = (t: string) => { const m = t.match(/^(\d)\s*(?:er|e|ème|eme)\s+arrondissement/i); return m ? Number(m[1]) : null; };

export function extraireRattachements(items: ItemInventaire[], cat: Categorie): { ok: Rattachement[]; ecartes: string[] } {
  const ok: Rattachement[] = []; const ecartes: string[] = [];
  for (const it of items) {
    if (it.module !== 7 || it.exercice !== CATEGORIES[cat].exercice || it.type !== "QCM" || it.doublonDe) continue;
    const bonnes = it.choix.filter((c) => c.correct);
    const voie = voieDe(it.enonce); const arr = bonnes.length === 1 ? arrDe(bonnes[0].texte) : null;
    if (!voie || !arr || it.conflitAvec.length) { ecartes.push(`${it.enonce} (rattachement non unique ou non lisible)`); continue; }
    if (!ok.some((r) => r.voie === voie)) ok.push({ voie, arrondissement: arr, source: `7/${it.exercice}/${it.questionId}` });
  }
  return { ok, ecartes };
}

/** Ordre déterministe (pas d'aléatoire) : vraies puis jusqu'à 3 fausses d'autres arrondissements, triées par nom. */
export function construirePropositions(items: ItemInventaire[]) {
  const propositions: Proposition[] = []; const lacunes: Lacune[] = []; const ecartes: string[] = [];
  for (const cat of Object.keys(CATEGORIES) as Categorie[]) {
    const r = extraireRattachements(items, cat); ecartes.push(...r.ecartes);
    for (let n = 1; n <= 9; n++) {
      const vraies = r.ok.filter((x) => x.arrondissement === n);
      const fausses = r.ok.filter((x) => x.arrondissement !== n).slice(0, Math.max(3, 6 - vraies.length));
      if (!vraies.length) { lacunes.push({ arrondissement: n, categorie: cat, raison: "Aucune voie rattachée à cet arrondissement dans les sources" }); continue; }
      if (!fausses.length) { lacunes.push({ arrondissement: n, categorie: cat, raison: "Aucune proposition incorrecte vérifiée disponible" }); continue; }
      const choix = [...vraies.map((v) => ({ ...v, correct: true })), ...fausses.map((v) => ({ ...v, correct: false }))]
        .sort((a, b) => a.voie.localeCompare(b.voie, "fr"))
        .map((v) => ({ texte: v.voie, correct: v.correct, arrondissement: v.arrondissement, source: v.source }));
      propositions.push({ id: `proposition:arr${n}:${cat}`, arrondissement: n, categorie: cat,
        enonce: `Cochez ${CATEGORIES[cat].accord} dans le ${ord(n)} arrondissement de Lyon.`, choix });
    }
  }
  return { propositions, lacunes, ecartes };
}
