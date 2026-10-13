/**
 * Point d'entrée du calcul figé EXÉCUTÉ CÔTÉ SERVEUR (regroupé dans la fonction
 * `resoudre-releves-gel`). N'utilise que les archives du gel : contenu figé,
 * sources figées, programme du code embarqué dans la fonction déployée.
 */
import { getInitialModuleContentForVolume } from "@/components/cours-en-ligne/ModuleDetailView";
import { loadSavedExamens } from "@/components/cours-en-ligne/ExamensBlancsEditor";
import { assemblerCalculJalons, METHODE_CALCUL_JALONS, type CalculJalons } from "@/lib/jalonsCalculCore";
import { formationJalonsElearning, modulesDuCalcul } from "@/lib/jalonsPedagogiques";
import { pratiqueSlotDetailsDepuisGel } from "@/lib/pratiqueSlots";
import { calculerJalonsPonderes, completionPratique, PRATIQUE_PHYSIQUE } from "@/lib/jalonsPonderes";
import { computePresentielHours } from "@/lib/presentielHours";
import { normaliserHeuresValidees } from "@/lib/heuresValideesAdmin";

export { METHODE_CALCUL_JALONS };

export interface LigneContenuFige { empreinte: string; module_id: number; module_data: any; deleted_exercices: any; deleted_cours: any; source_updated_at: string | null }

function lignesFigees(gel: any, contenus: Map<string, LigneContenuFige>, moduleIds: number[]) {
  const out: any[] = [];
  for (const id of [...new Set(moduleIds)]) {
    const emp = gel.contenu?.[String(id)];
    if (!emp) continue; // module sans version enregistrée au gel
    const r = contenus.get(emp);
    if (!r) throw new Error(`Contenu figé manquant (module ${id})`);
    out.push({ module_id: r.module_id, module_data: r.module_data, deleted_exercices: r.deleted_exercices, deleted_cours: r.deleted_cours, updated_at: r.source_updated_at });
  }
  return out;
}

/** Version 1 d'un gel : calcul complet depuis les archives. */
export async function calculerGelInitial(gel: any, apprenant: { type_apprenant?: string | null; formation_choisie?: string | null }, contenus: Map<string, LigneContenuFige>): Promise<CalculJalons> {
  const key = formationJalonsElearning(apprenant.type_apprenant, apprenant.formation_choisie);
  if (!key) throw new Error("Formation e-learning non concernée");
  const s = gel.sources ?? {};
  for (const cle of ["completions", "emargements", "heures_validees"]) if (!Array.isArray(s[cle])) throw new Error(`Source ${cle} non archivée`);
  const { filiere, parcoursInitial, parcours, ids } = modulesDuCalcul(key);
  const examens = await loadSavedExamens(false, async (mids) => lignesFigees(gel, contenus, mids));
  return assemblerCalculJalons({
    key, filiere, parcours, parcoursInitial, gelId: gel.id,
    editorRows: lignesFigees(gel, contenus, ids), examens: examens as any,
    initialDe: (id) => getInitialModuleContentForVolume(id, apprenant.type_apprenant),
    pratiqueDetails: pratiqueSlotDetailsDepuisGel(s), emargements: s.emargements, completions: s.completions, heuresValidees: s.heures_validees,
  });
}

/**
 * Nouvelle version après un ajout ADMIN d'heures de pratique : volumes, poids,
 * durées et modules non pratiques repris TELS QUELS du calcul figé précédent ;
 * seuls la progression/contribution pratique et les totaux sont recalculés.
 */
export function recalculerPratiqueSeule(base: CalculJalons, gel: any): CalculJalons {
  const s = gel.sources ?? {};
  const { theorieHours, pratiqueMinutes: signee } = computePresentielHours(s.emargements ?? [], pratiqueSlotDetailsDepuisGel(s));
  const hv = normaliserHeuresValidees(s.heures_validees ?? []);
  const validees = Math.round(hv.reduce((t, r) => t + r.heures, 0) * 60);
  const theorie = Math.round(theorieHours * 60);
  const minutes = signee + theorie + validees;
  const completions = [...base.completions.filter((c: any) => Number(c.module_id) !== PRATIQUE_PHYSIQUE), completionPratique(minutes)];
  const resultat = calculerJalonsPonderes(base.filiere, base.parcours, completions, base.poids);
  // Garde : toute ligne non pratique doit rester identique au calcul figé précédent.
  const avant = new Map(base.resultat.lignes.map((l: any) => [l.moduleId, JSON.stringify(l)]));
  for (const l of resultat.lignes as any[]) {
    if (l.moduleId !== PRATIQUE_PHYSIQUE && avant.get(l.moduleId) !== JSON.stringify(l)) throw new Error(`Ligne ${l.moduleId} modifiée par l'ajout pratique : refus`);
  }
  const dates = [...hv.map((r) => r.datePresence).filter(Boolean), base.pratique.dernierePreuve].filter(Boolean).sort() as string[];
  return {
    ...base, gelId: gel.id, completions, resultat,
    pratique: { ...base.pratique, minutes, detail: { pratiqueSignee: signee, theorieSignee: theorie, valideesAdmin: validees },
      progression: Math.max(0, Math.min(100, minutes / 360 * 100)), dernierePreuve: dates.at(-1) ?? null },
  };
}
