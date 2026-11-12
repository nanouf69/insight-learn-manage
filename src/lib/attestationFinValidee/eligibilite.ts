/**
 * Attestation de fin de formation VALIDÉE — contrôle d'éligibilité (lecture seule, pur).
 * Chaque preuve absente ou illisible BLOQUE : aucun pourcentage affiché (jalons, gel) n'est utilisé.
 */
export interface ModulePreuve {
  id: number;
  nom: string;
  /** Verdict serveur `etat_completion_modules` ; null = lecture absente. */
  statutEffectif: string | null;
  preuveComplete: boolean | null;
}
export interface HeuresPreuve { faites: number | null; minimum: number | null }
export interface EntreeEligibilite {
  modulesAttribues: number[] | null;
  modules: ModulePreuve[] | null;
  elearning: HeuresPreuve | null; // null = hors périmètre e-learning
  presentiel: { signees: number | null; attendues: number | null } | null; // null = hors périmètre présentiel
  lectureErreur?: string | null;
}
export type MotifBlocage =
  | { code: "lecture"; detail: string }
  | { code: "modules_absents" }
  | { code: "module_non_valide"; id: number; nom: string }
  | { code: "module_sans_verdict"; id: number }
  | { code: "heures_indisponibles"; volet: "elearning" | "presentiel" }
  | { code: "heures_insuffisantes"; faites: number; minimum: number }
  | { code: "signatures_manquantes"; signees: number; attendues: number };

export interface Eligibilite { eligible: boolean; motifs: MotifBlocage[] }

const fini = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

export function eligibiliteAttestation(e: EntreeEligibilite): Eligibilite {
  const motifs: MotifBlocage[] = [];
  if (e.lectureErreur) return { eligible: false, motifs: [{ code: "lecture", detail: e.lectureErreur }] };
  const ids = [...new Set((e.modulesAttribues ?? []).map(Number).filter(Number.isFinite))];
  if (!ids.length || !e.modules) motifs.push({ code: "modules_absents" });
  else for (const id of ids) {
    const m = e.modules.find(x => Number(x.id) === id);
    if (!m || m.statutEffectif == null || m.preuveComplete == null) motifs.push({ code: "module_sans_verdict", id });
    else if (m.statutEffectif !== "completed" || m.preuveComplete !== true) motifs.push({ code: "module_non_valide", id, nom: m.nom });
  }
  if (e.elearning) {
    const { faites, minimum } = e.elearning;
    if (!fini(faites) || !fini(minimum) || minimum <= 0) motifs.push({ code: "heures_indisponibles", volet: "elearning" });
    else if (faites < minimum) motifs.push({ code: "heures_insuffisantes", faites, minimum });
  }
  if (e.presentiel) {
    const { signees, attendues } = e.presentiel;
    if (!fini(signees) || !fini(attendues) || attendues <= 0) motifs.push({ code: "heures_indisponibles", volet: "presentiel" });
    else if (signees < attendues) motifs.push({ code: "signatures_manquantes", signees, attendues });
  }
  return { eligible: motifs.length === 0, motifs };
}

const h = (n: number) => `${Math.floor(n)}h${String(Math.round((n % 1) * 60)).padStart(2, "0")}`;
export function libelleMotif(m: MotifBlocage): string {
  switch (m.code) {
    case "lecture": return `Lecture impossible : ${m.detail}`;
    case "modules_absents": return "Aucun module attribué lisible";
    case "module_non_valide": return `Module ${m.id} ${m.nom} non validé`;
    case "module_sans_verdict": return `Module ${m.id} : verdict serveur absent`;
    case "heures_indisponibles": return `Heures ${m.volet === "elearning" ? "e-learning" : "présentiel"} indisponibles`;
    case "heures_insuffisantes": return `Heures e-learning insuffisantes : ${h(m.faites)} / ${h(m.minimum)}`;
    case "signatures_manquantes": return `Signatures manquantes : ${m.signees} / ${m.attendues}`;
  }
}
