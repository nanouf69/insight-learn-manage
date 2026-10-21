import { activitesDuModule, activitesRequisesModule } from "@/lib/jeuxPedagogiques";
import { exceptionModulesEleve, activitesDispenseesPourParcours } from "@/lib/exceptionsModulesEleve";
import type { CompletionLite } from "@/lib/moduleUnlockLogic";

/**
 * Source UNIQUE de présentation élève des activités du registre (jeux) d'un module.
 * Mêmes règles que progressionModulesEleve (requises = registre borné à la validation
 * serveur du module, moins dispenses individuelles et historiques). Lecture seule :
 * ne change ni statut, ni pourcentage, ni gel.
 */
export interface ActiviteEleve { id: string; titre: string; termine: boolean }
export type EtatActivitesModuleEleve =
  | { etat: "aucune" }
  | { etat: "indisponible"; requises: Omit<ActiviteEleve, "termine">[] }
  | { etat: "ok"; requises: ActiviteEleve[]; facultatives: ActiviteEleve[]; restantes: ActiviteEleve[] };

export function activitesModuleEleve(
  moduleId: number,
  parcours: readonly { id: number }[],
  completions: readonly CompletionLite[],
  terminees: Set<string> | null,
  apprenantId?: string | null,
  date?: string,
): EtatActivitesModuleEleve {
  const toutes = activitesDuModule(moduleId, date);
  if (!toutes.length) return { etat: "aucune" };
  const exception = exceptionModulesEleve(apprenantId);
  const dispenses = activitesDispenseesPourParcours(parcours, completions, apprenantId);
  const ligne = completions.find((c) => Number(c.module_id) === Number(moduleId) && c.status === "completed");
  const idsRequis = new Set(activitesRequisesModule(moduleId, ligne, date)
    .filter((a) => !exception?.activitesDispensees.includes(a.id) && !dispenses.has(a.id)).map((a) => a.id));
  if (!terminees) return { etat: "indisponible", requises: toutes.filter((a) => idsRequis.has(a.id)).map(({ id, titre }) => ({ id, titre })) };
  const vers = (a: { id: string; titre: string }): ActiviteEleve => ({ id: a.id, titre: a.titre, termine: terminees.has(a.id) });
  const requises = toutes.filter((a) => idsRequis.has(a.id)).map(vers);
  const facultatives = toutes.filter((a) => !idsRequis.has(a.id)).map(vers);
  return { etat: "ok", requises, facultatives, restantes: requises.filter((a) => !a.termine) };
}

/** Libellés partagés accueil / module / bilan. */
export function libelleJeux(e: EtatActivitesModuleEleve): string | null {
  if (e.etat === "aucune") return null;
  if (e.etat === "indisponible") return "Jeux : statut momentanément indisponible";
  if (!e.requises.length) return e.facultatives.length ? "Jeux facultatifs — sans effet sur votre progression" : null;
  const faits = e.requises.length - e.restantes.length;
  const base = `Jeux : ${faits}/${e.requises.length} terminé${faits > 1 ? "s" : ""}`;
  return e.restantes.length ? `${base} — ${e.restantes.length} jeu${e.restantes.length > 1 ? "x" : ""} à faire` : base;
}
export const jeuxRestants = (e: EtatActivitesModuleEleve | null | undefined) => (e?.etat === "ok" ? e.restantes.length : 0);
export const jeuxStatutIndisponible = (e: EtatActivitesModuleEleve | null | undefined) => e?.etat === "indisponible" && e.requises.length > 0;
