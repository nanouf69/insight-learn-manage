import { describe, it, expect } from "vitest";
import { assemblerCalculJalons } from "@/lib/jalonsCalculCore";
import { activitesTermineesDepuisGel, recalculerPratiqueSeule } from "@/lib/releveCalculServeur";
import { modulesDuCalcul } from "@/lib/jalonsPedagogiques";
import { getInitialModuleContentForVolume } from "@/components/cours-en-ligne/ModuleDetailView";
import { IDS_JEUX_LYON, UNITES_JEUX_LYON } from "@/lib/jeuxPedagogiques";
import { PRATIQUE_PHYSIQUE } from "@/lib/jalonsPonderes";

// Données 100 % fictives : aucun élève réel.
const { filiere, parcoursInitial, parcours } = modulesDuCalcul("vtc-e");
const completions = [{ module_id: 8, status: "completed", progress: 100, completed_at: "2026-10-01T10:00:00Z" }];
const base = (jeux: string[] | undefined, date: string, heures: any[] = []) => assemblerCalculJalons({
  key: "vtc-e", filiere, parcours, parcoursInitial, editorRows: [], examens: [],
  initialDe: (id) => getInitialModuleContentForVolume(id, "vtc-e"), pratiqueDetails: [], emargements: [], completions,
  heuresValidees: heures, jeuxTermines: jeux, dateActivites: date,
});
const reponses = [{ exercice_id: IDS_JEUX_LYON[0], completed: true }, { exercice_id: IDS_JEUX_LYON[1], completed: false }, { exercice_id: "autre", completed: true }];

describe("parité UI / serveur au gel (activités du registre)", () => {
  it("réalisations lues depuis les réponses archivées seulement ; archive absente = null", () => {
    expect(activitesTermineesDepuisGel({ reponses })).toEqual([IDS_JEUX_LYON[0]]);
    expect(activitesTermineesDepuisGel({})).toBeNull();
  });
  it("futur gel : même résultat que le calcul dynamique, jeux inclus", () => {
    const d = "2026-10-20T00:00:00Z";
    const ui = base([IDS_JEUX_LYON[0]], d);
    const serveur = base(activitesTermineesDepuisGel({ reponses }) ?? undefined, d);
    expect(serveur.resultat).toEqual(ui.resultat);
    expect(serveur.volumes[8].jeux).toBe(UNITES_JEUX_LYON);
    expect(serveur.activites[0].versionAnterieureValidee).toBe(true);
  });
  it("gel antérieur à l'ajout des jeux : aucune activité, calcul identique à la méthode v3", () => {
    const avant = base(activitesTermineesDepuisGel({ reponses }) ?? undefined, "2026-10-01T00:00:00Z");
    const v3 = base(undefined, "2026-10-01T00:00:00Z");
    expect(avant.resultat).toEqual(v3.resultat);
    expect(avant.activites).toEqual([]);
  });
  it("ajout admin pratique après un futur gel : seule la ligne pratique change", () => {
    const g1 = base([IDS_JEUX_LYON[0]], "2026-10-20T00:00:00Z");
    const v2 = recalculerPratiqueSeule(g1 as any, { id: "g2", sources: { emargements: [], heures_validees: [{ id: "h", heures: 6, created_at: "2026-10-21T08:00:00Z", date_presence: "2026-10-21", categorie: "pratique", motif: "x" }], reservations_pratique: [], sessions: [], planning_configs: [] } });
    for (const l of v2.resultat.lignes as any[]) if (l.moduleId !== PRATIQUE_PHYSIQUE) expect(l).toEqual((g1.resultat.lignes as any[]).find((x) => x.moduleId === l.moduleId));
    expect(v2.volumes).toEqual(g1.volumes); expect(v2.poids).toEqual(g1.poids);
  });
});
