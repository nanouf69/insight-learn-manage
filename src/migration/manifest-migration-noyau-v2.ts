/**
 * MANIFEST DE MIGRATION v2 — CONTRAT FIGÉ DE L'ÉTAPE 2 (22/09/2026)
 * ─────────────────────────────────────────────────────────────────
 * Pourquoi une v2 : l'expression d'empreinte utilisée lors du pré-audit du
 * 22/09 au matin n'était pas consignée et n'a PAS pu être reproduite à
 * l'identique (ni ses comptages de questions, qui divergeaient de 12 matières).
 * Un contrat de migration doit être reproductible : la v2 fige donc une
 * expression d'empreinte écrite noir sur blanc ci-dessous, recalculée en
 * lecture seule sur la source de production (module_editor_state), sans
 * aucune écriture.
 *
 * EXPRESSION D'EMPREINTE (identique côté source et côté nouveau noyau) :
 *   par question : id | TYPE | énoncé | choix | reponseQRC | points | image
 *     choix       : lettre~texte~true|false, séparés par « # », dans l'ordre
 *     normalisation : btrim + regexp_replace('\s+',' ') ; type en majuscules
 *   par matière   : md5( questions jointes par un retour à la ligne, ordre de stockage )
 *
 * Règle de l'étape 2 : empreinte source = empreinte manifest = empreinte noyau.
 * Toute différence ⇒ ROLLBACK de cette copie + ALERTE. Jamais de réparation.
 * Exclusions : modules 90014–90017 (bilans d'examen, jamais des Examens Blancs).
 * Aucune donnée apprenant n'entre dans ce manifest ni dans l'étape 2.
 */

import { EXAM_MODULE_IDS, NB_QUESTIONS_ATTENDU, type StatutAudit } from "./manifest-migration-noyau";

export const MANIFEST_V2_DATE = "2026-09-22T12:50:00Z";

export interface ManifestV2Entry {
  filiere: "VTC" | "TAXI" | "VA" | "TA";
  numero: number;
  exam_id: string;
  module_id: number;
  subject_id: string;
  nombre_questions: number;
  empreinte: string;
  statut: StatutAudit;
  motif: string;
}

/**
 * Contenus dont l'exactitude a été établie par l'audit de contamination EB1→EB2
 * et revérifiée question par question le 22/09 (F(V) commence par « DÉFINISSEZ LA
 * NOTION DE MARGE DE GESTION ? », G(V) par la signalétique VTC ; aucune trace de
 * « marché de niche » ni de « définition de l'activité de VTC »).
 */
export const VALIDES_V2: Readonly<Record<string, string>> = {
  "EB2/reglementation_vtc": "F(V) EB2 — référence validée par l'audit, recontrôlée question par question.",
  "EB2/reglementation_vtc2": "G(V) EB2 — référence validée par l'audit, recontrôlée question par question.",
  "eb2-va/reglementation_vtc": "Identique à F(V) EB2 — partage VTC/VA du MÊME numéro, à déclarer explicitement.",
  "eb2-va/reglementation_vtc2": "Identique à G(V) EB2 — partage VTC/VA du MÊME numéro, à déclarer explicitement.",
};

/** filiere;numero;exam_id;subject_id;nb;empreinte */
const LIGNES_V2: readonly string[] = [
  "VTC;1;EB1;anglais;20;f60a8673bc5a56cf0cc2993bb0b299f4",
  "VTC;1;EB1;francais;10;4f8f55b5be2500233ddfe82660c2d5b5",
  "VTC;1;EB1;gestion;18;27756e683fa973340d86fca571853855",
  "VTC;1;EB1;reglementation_vtc;16;d3a2d84093083c83fbc0c3cb7644c516",
  "VTC;1;EB1;reglementation_vtc2;8;b4e5b86b61a32a4cdc0de07f2688882e",
  "VTC;1;EB1;securite;20;898d334d3e0af2e520004125b4685efd",
  "VTC;1;EB1;t3p;15;a822afb32bbbd2dd7856780b89be1dde",
  "VTC;2;EB2;anglais;20;692344bfbea39f85957b0decf964e2b2",
  "VTC;2;EB2;francais;10;a2e6c221793cdcc311b0ec415c4c7bf0",
  "VTC;2;EB2;gestion;18;4b68fe97cdab8b94d0ac69bea221cad2",
  "VTC;2;EB2;reglementation_vtc;16;1dad7692330e13684c27504e87acae5e",
  "VTC;2;EB2;reglementation_vtc2;8;7eb71582ab0e5b61bca6016efc77b8bd",
  "VTC;2;EB2;securite;20;09dcca45899c38dda5a6dd2890fab587",
  "VTC;2;EB2;t3p;15;9d4aa0526234f119790fe7ac72a50bd7",
  "VTC;3;EB3;anglais;20;5a68305b0d2f6949a65827e007042bca",
  "VTC;3;EB3;francais;10;43a6c5cd7a25ad62e141e383fecec255",
  "VTC;3;EB3;gestion;18;bf8b595c031f2cf2902ad3af5bcbb49f",
  "VTC;3;EB3;reglementation_vtc;16;592739fbd242d3dd631b57370e8841dc",
  "VTC;3;EB3;reglementation_vtc2;8;00d1f1c2ce3fe557f7b39f2d1433a988",
  "VTC;3;EB3;securite;20;1ee56b6cf3bcf11fa099ada0eca61c1e",
  "VTC;3;EB3;t3p;15;90f7547f28cfaa15d70e15a631c47ee3",
  "VTC;4;EB4;anglais;20;51e96a33eb120fcadc3020613e1500ed",
  "VTC;4;EB4;francais;10;af2221715ae2a20653be7949fa2c9751",
  "VTC;4;EB4;gestion;18;a9d91ed3ac968f0f2ea5f1b53b721233",
  "VTC;4;EB4;reglementation_vtc;16;2368c0fd7e2521b6d10ec90f10c5ef6f",
  "VTC;4;EB4;reglementation_vtc2;8;92a8d55279ad46211e28d1c178e85211",
  "VTC;4;EB4;securite;20;0d81d2b6164fa6f875045cdbe8592b48",
  "VTC;4;EB4;t3p;15;13e26f4bd049189014099fa1b22e4c62",
  "VTC;5;EB5;anglais;20;c548ab0e63364a7d4bf82b328031fd3b",
  "VTC;5;EB5;francais;10;89d15804bdbdccebd76c5cc40e1ae82e",
  "VTC;5;EB5;gestion;18;230ece547e36ac1d66d9067fd019951a",
  "VTC;5;EB5;reglementation_vtc;16;3d9dcf2a4bbb470f4d4c5be1587deb44",
  "VTC;5;EB5;reglementation_vtc2;8;3149457dc8453441f6b41f1346efafb3",
  "VTC;5;EB5;securite;20;25f5e93e6094f899720070c7c4d8e502",
  "VTC;5;EB5;t3p;15;fbbf9d474919b902de9fc0391b817bda",
  "VTC;6;EB6;anglais;20;0ace6f48b22554ecb05de6186c85c95b",
  "VTC;6;EB6;francais;10;5d39c13b74b4516031753ad4c56ec4af",
  "VTC;6;EB6;gestion;18;41c6d7bf32435b3ac1e385edd079939d",
  "VTC;6;EB6;reglementation_vtc;16;6e1aaefe71e33f2cdffa70d68afdb05c",
  "VTC;6;EB6;reglementation_vtc2;8;7c2772973110a42cecc1a0ba1e0cb259",
  "VTC;6;EB6;securite;20;e6bf89f19e3c05a87f948fa306ed7737",
  "VTC;6;EB6;t3p;15;733e0204d122291a9c78a240c39555bd",
  "TAXI;1;EB1-TAXI;anglais;20;f60a8673bc5a56cf0cc2993bb0b299f4",
  "TAXI;1;EB1-TAXI;francais;10;4f8f55b5be2500233ddfe82660c2d5b5",
  "TAXI;1;EB1-TAXI;gestion;18;27756e683fa973340d86fca571853855",
  "TAXI;1;EB1-TAXI;reglementation_taxi;16;f1d79e05cea4709987284a873c1d4154",
  "TAXI;1;EB1-TAXI;reglementation_taxi2;8;d93679d804fca51416f1fa22eac966d8",
  "TAXI;1;EB1-TAXI;securite;20;898d334d3e0af2e520004125b4685efd",
  "TAXI;1;EB1-TAXI;t3p;15;a822afb32bbbd2dd7856780b89be1dde",
  "TAXI;2;EB2-TAXI;anglais;20;692344bfbea39f85957b0decf964e2b2",
  "TAXI;2;EB2-TAXI;francais;10;a2e6c221793cdcc311b0ec415c4c7bf0",
  "TAXI;2;EB2-TAXI;gestion;18;4b68fe97cdab8b94d0ac69bea221cad2",
  "TAXI;2;EB2-TAXI;reglementation_taxi;16;f49ca1dbe6050f513121d8af70c3f74a",
  "TAXI;2;EB2-TAXI;reglementation_taxi2;8;04b2f9acb0fae01ef70c3fd3bc784a1f",
  "TAXI;2;EB2-TAXI;securite;20;09dcca45899c38dda5a6dd2890fab587",
  "TAXI;2;EB2-TAXI;t3p;15;9d4aa0526234f119790fe7ac72a50bd7",
  "TAXI;3;EB3-TAXI;anglais;20;5a68305b0d2f6949a65827e007042bca",
  "TAXI;3;EB3-TAXI;francais;10;43a6c5cd7a25ad62e141e383fecec255",
  "TAXI;3;EB3-TAXI;gestion;18;bf8b595c031f2cf2902ad3af5bcbb49f",
  "TAXI;3;EB3-TAXI;reglementation_taxi;16;8341f6d303e6492ed39ea58770cdc399",
  "TAXI;3;EB3-TAXI;reglementation_taxi2;8;ea9d0f9429334e2b41bb75c80b300b1e",
  "TAXI;3;EB3-TAXI;securite;20;1ee56b6cf3bcf11fa099ada0eca61c1e",
  "TAXI;3;EB3-TAXI;t3p;15;90f7547f28cfaa15d70e15a631c47ee3",
  "TAXI;4;EB4-TAXI;anglais;20;51e96a33eb120fcadc3020613e1500ed",
  "TAXI;4;EB4-TAXI;francais;10;af2221715ae2a20653be7949fa2c9751",
  "TAXI;4;EB4-TAXI;gestion;18;a9d91ed3ac968f0f2ea5f1b53b721233",
  "TAXI;4;EB4-TAXI;reglementation_taxi;16;f4199ad0af5b0c492e891f48cb3e8020",
  "TAXI;4;EB4-TAXI;reglementation_taxi2;8;bf925ba03f5813b9818613f68b7c7928",
  "TAXI;4;EB4-TAXI;securite;20;0d81d2b6164fa6f875045cdbe8592b48",
  "TAXI;4;EB4-TAXI;t3p;15;13e26f4bd049189014099fa1b22e4c62",
  "TAXI;5;EB5-TAXI;anglais;20;c548ab0e63364a7d4bf82b328031fd3b",
  "TAXI;5;EB5-TAXI;francais;10;89d15804bdbdccebd76c5cc40e1ae82e",
  "TAXI;5;EB5-TAXI;gestion;18;230ece547e36ac1d66d9067fd019951a",
  "TAXI;5;EB5-TAXI;reglementation_taxi;16;7aa129af8cf45f1cd3e3de797443c753",
  "TAXI;5;EB5-TAXI;reglementation_taxi2;8;776e86d619da6eb9134b051fd0b7b2a2",
  "TAXI;5;EB5-TAXI;securite;20;25f5e93e6094f899720070c7c4d8e502",
  "TAXI;5;EB5-TAXI;t3p;15;fbbf9d474919b902de9fc0391b817bda",
  "TAXI;6;EB6-TAXI;anglais;20;0ace6f48b22554ecb05de6186c85c95b",
  "TAXI;6;EB6-TAXI;francais;10;5d39c13b74b4516031753ad4c56ec4af",
  "TAXI;6;EB6-TAXI;gestion;18;41c6d7bf32435b3ac1e385edd079939d",
  "TAXI;6;EB6-TAXI;reglementation_taxi;16;b65f30c757de4b282814612b4daa49af",
  "TAXI;6;EB6-TAXI;reglementation_taxi2;8;f5523529d14cd76f6dccfe1ce2fa6bba",
  "TAXI;6;EB6-TAXI;securite;20;e6bf89f19e3c05a87f948fa306ed7737",
  "TAXI;6;EB6-TAXI;t3p;15;733e0204d122291a9c78a240c39555bd",
  "TA;1;eb1-ta;reglementation_taxi;16;f1d79e05cea4709987284a873c1d4154",
  "TA;1;eb1-ta;reglementation_taxi2;8;d93679d804fca51416f1fa22eac966d8",
  "VA;1;eb1-va;reglementation_vtc;16;d3a2d84093083c83fbc0c3cb7644c516",
  "VA;1;eb1-va;reglementation_vtc2;8;b4e5b86b61a32a4cdc0de07f2688882e",
  "TA;2;eb2-ta;reglementation_taxi;16;f49ca1dbe6050f513121d8af70c3f74a",
  "TA;2;eb2-ta;reglementation_taxi2;8;04b2f9acb0fae01ef70c3fd3bc784a1f",
  "TA;3;eb3-ta;reglementation_taxi;16;8341f6d303e6492ed39ea58770cdc399",
  "TA;3;eb3-ta;reglementation_taxi2;8;ea9d0f9429334e2b41bb75c80b300b1e",
  "TA;4;eb4-ta;reglementation_taxi;16;f4199ad0af5b0c492e891f48cb3e8020",
  "TA;4;eb4-ta;reglementation_taxi2;8;bf925ba03f5813b9818613f68b7c7928",
  "TA;5;eb5-ta;reglementation_taxi;16;7aa129af8cf45f1cd3e3de797443c753",
  "TA;5;eb5-ta;reglementation_taxi2;8;776e86d619da6eb9134b051fd0b7b2a2",
  "TA;6;eb6-ta;reglementation_taxi;16;b65f30c757de4b282814612b4daa49af",
  "TA;6;eb6-ta;reglementation_taxi2;8;f5523529d14cd76f6dccfe1ce2fa6bba",
  "VA;2;eb2-va;reglementation_vtc;16;1dad7692330e13684c27504e87acae5e",
  "VA;2;eb2-va;reglementation_vtc2;8;7eb71582ab0e5b61bca6016efc77b8bd",
  "VA;3;eb3-va;reglementation_vtc;16;592739fbd242d3dd631b57370e8841dc",
  "VA;3;eb3-va;reglementation_vtc2;8;00d1f1c2ce3fe557f7b39f2d1433a988",
  "VA;4;eb4-va;reglementation_vtc;16;2368c0fd7e2521b6d10ec90f10c5ef6f",
  "VA;4;eb4-va;reglementation_vtc2;8;92a8d55279ad46211e28d1c178e85211",
  "VA;5;eb5-va;reglementation_vtc;16;3d9dcf2a4bbb470f4d4c5be1587deb44",
  "VA;5;eb5-va;reglementation_vtc2;8;3149457dc8453441f6b41f1346efafb3",
  "VA;6;eb6-va;reglementation_vtc;16;6e1aaefe71e33f2cdffa70d68afdb05c",
  "VA;6;eb6-va;reglementation_vtc2;8;7c2772973110a42cecc1a0ba1e0cb259",
]; 

function parse(l: string): ManifestV2Entry {
  const [filiere, numero, exam_id, subject_id, nb, empreinte] = l.split(";");
  const nombre_questions = Number(nb);
  const attendu = NB_QUESTIONS_ATTENDU[subject_id];
  const cle = `${exam_id}/${subject_id}`;
  let statut: StatutAudit = "A_CONTROLER";
  let motif = "Contenu actuel sans preuve suffisante : aucune copie sans contrôle explicite.";
  if (attendu !== undefined && nombre_questions !== attendu) {
    statut = "ANOMALIE";
    motif = `Nombre de questions incohérent : ${nombre_questions} au lieu de ${attendu}.`;
  } else if (VALIDES_V2[cle]) {
    statut = "VALIDE";
    motif = VALIDES_V2[cle];
  }
  return {
    filiere: filiere as ManifestV2Entry["filiere"],
    numero: Number(numero),
    exam_id,
    module_id: EXAM_MODULE_IDS[exam_id],
    subject_id,
    nombre_questions,
    empreinte,
    statut,
    motif,
  };
}

export const MANIFEST_V2: readonly ManifestV2Entry[] = LIGNES_V2.map(parse);

/** Seules ces entrées sont copiables vers le nouveau noyau. */
export function copiablesV2(): ManifestV2Entry[] {
  return MANIFEST_V2.filter((e) => e.statut === "VALIDE");
}

export function resumeV2(): Record<StatutAudit | "examens" | "matieres" | "questions", number> {
  return {
    examens: new Set(MANIFEST_V2.map((e) => e.exam_id)).size,
    matieres: MANIFEST_V2.length,
    questions: MANIFEST_V2.reduce((s, e) => s + e.nombre_questions, 0),
    VALIDE: MANIFEST_V2.filter((e) => e.statut === "VALIDE").length,
    A_CONTROLER: MANIFEST_V2.filter((e) => e.statut === "A_CONTROLER").length,
    ANOMALIE: MANIFEST_V2.filter((e) => e.statut === "ANOMALIE").length,
  };
}

/** Même empreinte sur DEUX numéros différents = contamination potentielle (signalement, jamais de correction). */
export function doublonsEntreNumeros(): Array<{ empreinte: string; entrees: ManifestV2Entry[] }> {
  const par = new Map<string, ManifestV2Entry[]>();
  for (const e of MANIFEST_V2) par.set(e.empreinte, [...(par.get(e.empreinte) ?? []), e]);
  return [...par]
    .filter(([, v]) => new Set(v.map((e) => e.numero)).size > 1)
    .map(([empreinte, entrees]) => ({ empreinte, entrees }));
}

/** Même empreinte, même numéro, filières différentes = partage légitime À DÉCLARER explicitement. */
export function partagesMemeNumero(): Array<{ empreinte: string; entrees: ManifestV2Entry[] }> {
  const par = new Map<string, ManifestV2Entry[]>();
  for (const e of MANIFEST_V2) par.set(e.empreinte, [...(par.get(e.empreinte) ?? []), e]);
  return [...par]
    .filter(([, v]) => v.length > 1 && new Set(v.map((e) => e.numero)).size === 1)
    .map(([empreinte, entrees]) => ({ empreinte, entrees }));
}
