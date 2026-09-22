/**
 * MANIFEST DE MIGRATION — CONTRAT FIGÉ (pré-audit du 22/09/2026, 100 % lecture seule)
 * ────────────────────────────────────────────────────────────────────────────
 * Ce fichier est le CONTRAT de l'étape 2. Il ne modifie rien : il décrit l'état
 * exact de la source (module_editor_state) au moment du pré-audit.
 *
 * Empreinte de migration (`empreinte_source`) = md5 calculé EN BASE, en lecture
 * seule, sur la projection normalisée suivante, dans l'ordre de stockage :
 *
 *   par question :  id | TYPE | énoncé | choix(lettre~texte~correct séparés par #) | reponseQRC | points
 *   par matière  :  md5( questions jointes par un retour à la ligne )
 *   normalisation:  btrim + regexp_replace('\s+',' ') sur les textes, type en majuscules
 *
 * L'étape 2 recalcule STRICTEMENT la même expression sur la source puis sur le
 * nouveau noyau. Règle : empreinte source = empreinte manifest = empreinte noyau.
 * Toute différence ⇒ ROLLBACK de cette copie + ALERTE. Jamais de réparation.
 *
 * Exclusions volontaires : modules 90014–90017 (bilans d'examen) — ils ne sont
 * PAS des Examens Blancs et ne doivent jamais leur être rattachés.
 * Aucune donnée apprenant (réponse, QRC, note, tentative, progression) n'entre
 * dans ce manifest ni dans l'étape 2.
 */

export type StatutAudit = "VALIDE" | "A_CONTROLER" | "ANOMALIE";

export interface ManifestEntry {
  filiere: "VTC" | "TAXI" | "VA" | "TA";
  numero: number;
  exam_id: string;
  module_id: number;
  subject_id: string;
  nombre_questions: number;
  empreinte_source: string;
  derniere_modification: string;
  statut: StatutAudit;
  motif?: string;
}

export const MANIFEST_AUDIT_DATE = "2026-09-22T09:46:00Z";

export const EXAM_MODULE_IDS: Readonly<Record<string, number>> = {
  EB1: 90000, EB2: 90001, EB3: 90002, EB4: 90003, EB5: 90004, EB6: 90005,
  "EB1-TAXI": 90006, "EB2-TAXI": 90007, "EB3-TAXI": 90008, "EB4-TAXI": 90009,
  "EB5-TAXI": 90010, "EB6-TAXI": 90011,
  "eb1-ta": 90012, "eb2-ta": 90018, "eb3-ta": 90019, "eb4-ta": 90020,
  "eb5-ta": 90021, "eb6-ta": 90022,
  "eb1-va": 90013, "eb2-va": 90023, "eb3-va": 90024, "eb4-va": 90025,
  "eb5-va": 90026, "eb6-va": 90027,
};

/** Nombre de questions attendu par matière (référence de cohérence du pré-audit). */
export const NB_QUESTIONS_ATTENDU: Readonly<Record<string, number>> = {
  t3p: 15, gestion: 18, securite: 20, francais: 10, anglais: 20,
  reglementation_vtc: 16, reglementation_vtc2: 8,
  reglementation_taxi: 16, reglementation_taxi2: 8,
};

/**
 * Contenus dont l'exactitude a DÉJÀ été établie par audit (EB VTC N°2 F(V)/G(V)
 * après l'incident EB1 servi dans EB2, et leur équivalent VA N°2, même numéro).
 * Ce sont les seuls contenus éligibles à une copie automatique en étape 2.
 */
const VALIDES: Readonly<Record<string, string>> = {
  "EB2/reglementation_vtc": "Référence F(V) EB2 validée par l'audit du 22/09 (versions contaminées EB1 écartées).",
  "EB2/reglementation_vtc2": "Référence G(V) EB2 validée par l'audit du 22/09 (versions contaminées EB1 écartées).",
  "eb2-va/reglementation_vtc": "Identique à la référence F(V) EB2 validée — partage VTC/VA de même numéro.",
  "eb2-va/reglementation_vtc2": "Identique à la référence G(V) EB2 validée — partage VTC/VA de même numéro.",
};

/** Lignes brutes du pré-audit : filiere;numero;exam_id;subject_id;nb;empreinte;derniere_modif */
const LIGNES_AUDIT: readonly string[] = [
  "VTC;1;EB1;t3p;15;6270b449aa0ec5de7e64a3d096a79b0b;2026-09-21 16:56",
  "VTC;1;EB1;gestion;18;b56a2748f7342d020abb54b8f233d77c;2026-09-21 16:56",
  "VTC;1;EB1;securite;20;689996244ee3392cb80e192ccb45ed77;2026-09-21 16:56",
  "VTC;1;EB1;francais;10;3afc0ad1335eca24598b379bd3904daf;2026-09-21 16:56",
  "VTC;1;EB1;anglais;20;e36fce92578485e28c430303fb4902fa;2026-09-21 16:56",
  "VTC;1;EB1;reglementation_vtc;16;0edc8a6ddabfa35ed7b459020ec71a1c;2026-09-21 16:56",
  "VTC;1;EB1;reglementation_vtc2;8;4bbafdd4ba8fbabbb01ee951e05c2eee;2026-09-21 16:56",
  "VTC;2;EB2;t3p;15;4096ab15de4a5a18753426397c71c122;2026-09-22 08:16",
  "VTC;2;EB2;gestion;18;57e12d04009d1b17d1486727b8e356c6;2026-09-22 08:16",
  "VTC;2;EB2;securite;20;c9cdae51b198f8025d6092b0ac13e345;2026-09-22 08:16",
  "VTC;2;EB2;francais;10;4bb7079330c97dfaf5f7f31f6b14e43f;2026-09-22 08:16",
  "VTC;2;EB2;anglais;20;e1492e5d16f3b9b7e75ae51553d774cd;2026-09-22 08:16",
  "VTC;2;EB2;reglementation_vtc;16;dab880e474772ee996451b922caeca93;2026-09-22 08:16",
  "VTC;2;EB2;reglementation_vtc2;8;bda7fe99431976f0fe7c210fbbad6dee;2026-09-22 08:16",
  "VTC;3;EB3;t3p;15;19e503584c476322bc9ac2cd19634b2d;2026-09-21 09:28",
  "VTC;3;EB3;gestion;18;2e1eea39e4db4f4f2bb07c14a827564e;2026-09-21 09:28",
  "VTC;3;EB3;securite;20;8a128e0daae2cf015d33ae42f8d84f44;2026-09-21 09:28",
  "VTC;3;EB3;francais;10;279cd51b7ad1d4dbee0e9db0d6d3e931;2026-09-21 09:28",
  "VTC;3;EB3;anglais;20;3704e0b2789712a2525cb6e201f7c9de;2026-09-21 09:28",
  "VTC;3;EB3;reglementation_vtc;16;90bc9252168a0ad0e0d2db469d9e3825;2026-09-21 09:28",
  "VTC;3;EB3;reglementation_vtc2;8;4d136d870d17c7e149f79be41c478408;2026-09-21 09:28",
  "VTC;4;EB4;t3p;15;ca2fc2d5d0a737d124375b9ca2d26f39;2026-09-21 09:28",
  "VTC;4;EB4;gestion;18;267401464d3158c67498d699f36a5206;2026-09-21 09:28",
  "VTC;4;EB4;securite;20;7b9e506075598b7d655c909c6e2330e2;2026-09-21 09:28",
  "VTC;4;EB4;francais;10;c0ad72aac2d56c1baac2eb7b8bb323a0;2026-09-21 09:28",
  "VTC;4;EB4;anglais;20;dc2fdb8869c4891878f9c3d9637baf8e;2026-09-21 09:28",
  "VTC;4;EB4;reglementation_vtc;16;e0b8e03833bb1b08364bc6d27663dc3a;2026-09-21 09:28",
  "VTC;4;EB4;reglementation_vtc2;8;f3dd248d2c40608cc8d3bf245ec4b3e5;2026-09-21 09:28",
  "VTC;5;EB5;t3p;15;1bf26379d76281f127a7c69936956503;2026-09-21 09:28",
  "VTC;5;EB5;gestion;17;f3ee3fcab6b7f445bd7c8796ef72df57;2026-09-21 09:28",
  "VTC;5;EB5;securite;20;2fc000c76f746b5b096a6ddd03f5eb69;2026-09-21 09:28",
  "VTC;5;EB5;francais;9;d6a4bd48c66b5d20530ad6259d3a71ea;2026-09-21 09:28",
  "VTC;5;EB5;anglais;20;49b46c1301bbb7817faeb029d42f4042;2026-09-21 09:28",
  "VTC;5;EB5;reglementation_vtc;16;685310016e0315f7327b6404b85eac16;2026-09-21 09:28",
  "VTC;5;EB5;reglementation_vtc2;8;678c6cd73eb382d1a3da3f0d8c2161c2;2026-09-21 09:28",
  "VTC;6;EB6;t3p;14;1ec3ede4f1943c832b88b34141557586;2026-09-21 09:44",
  "VTC;6;EB6;gestion;17;26dfbcdec8d260ddb84483132cfe89e2;2026-09-21 09:44",
  "VTC;6;EB6;securite;20;49b1b4bede6356c2018688f1c0a27ffa;2026-09-21 09:44",
  "VTC;6;EB6;francais;10;e1565f09260f43e96200f67e5ee195af;2026-09-21 09:44",
  "VTC;6;EB6;anglais;20;ba7f12aa22282b1d18e32a7ed375ce49;2026-09-21 09:44",
  "VTC;6;EB6;reglementation_vtc;16;73826de1c8b179889ea4adf254a8263d;2026-09-21 09:44",
  "VTC;6;EB6;reglementation_vtc2;8;426a371f43d493a42f2b9f66f5c7e2a4;2026-09-21 09:44",
  "TAXI;1;EB1-TAXI;t3p;15;6270b449aa0ec5de7e64a3d096a79b0b;2026-09-21 16:53",
  "TAXI;1;EB1-TAXI;gestion;18;b56a2748f7342d020abb54b8f233d77c;2026-09-21 16:53",
  "TAXI;1;EB1-TAXI;securite;20;689996244ee3392cb80e192ccb45ed77;2026-09-21 16:53",
  "TAXI;1;EB1-TAXI;francais;10;3afc0ad1335eca24598b379bd3904daf;2026-09-21 16:53",
  "TAXI;1;EB1-TAXI;anglais;20;e36fce92578485e28c430303fb4902fa;2026-09-21 16:53",
  "TAXI;1;EB1-TAXI;reglementation_taxi;16;e62d62de06d37665842d39a4d68fe4c4;2026-09-21 16:53",
  "TAXI;1;EB1-TAXI;reglementation_taxi2;8;843a65f33dc7aa0bd1d424a4ba685867;2026-09-21 16:53",
  "TAXI;2;EB2-TAXI;t3p;15;4096ab15de4a5a18753426397c71c122;2026-09-22 08:16",
  "TAXI;2;EB2-TAXI;gestion;18;57e12d04009d1b17d1486727b8e356c6;2026-09-22 08:16",
  "TAXI;2;EB2-TAXI;securite;20;c9cdae51b198f8025d6092b0ac13e345;2026-09-22 08:16",
  "TAXI;2;EB2-TAXI;francais;10;4bb7079330c97dfaf5f7f31f6b14e43f;2026-09-22 08:16",
  "TAXI;2;EB2-TAXI;anglais;20;e1492e5d16f3b9b7e75ae51553d774cd;2026-09-22 08:16",
  "TAXI;2;EB2-TAXI;reglementation_taxi;16;4df20de2691fd8c98441d574fa629d16;2026-09-22 08:16",
  "TAXI;2;EB2-TAXI;reglementation_taxi2;8;bef1c97808425f38746d2a2423ba63a9;2026-09-22 08:16",
  "TAXI;3;EB3-TAXI;t3p;15;19e503584c476322bc9ac2cd19634b2d;2026-09-21 09:28",
  "TAXI;3;EB3-TAXI;gestion;18;2e1eea39e4db4f4f2bb07c14a827564e;2026-09-21 09:28",
  "TAXI;3;EB3-TAXI;securite;20;8a128e0daae2cf015d33ae42f8d84f44;2026-09-21 09:28",
  "TAXI;3;EB3-TAXI;francais;10;279cd51b7ad1d4dbee0e9db0d6d3e931;2026-09-21 09:28",
  "TAXI;3;EB3-TAXI;anglais;20;3704e0b2789712a2525cb6e201f7c9de;2026-09-21 09:28",
  "TAXI;3;EB3-TAXI;reglementation_taxi;16;f16c83c6f804b46d5db6bb8621cfa75a;2026-09-21 09:28",
  "TAXI;3;EB3-TAXI;reglementation_taxi2;8;87972a20a7122eba16948f7865d28e12;2026-09-21 09:28",
  "TAXI;4;EB4-TAXI;t3p;15;ca2fc2d5d0a737d124375b9ca2d26f39;2026-09-21 09:28",
  "TAXI;4;EB4-TAXI;gestion;18;267401464d3158c67498d699f36a5206;2026-09-21 09:28",
  "TAXI;4;EB4-TAXI;securite;20;7b9e506075598b7d655c909c6e2330e2;2026-09-21 09:28",
  "TAXI;4;EB4-TAXI;francais;10;c0ad72aac2d56c1baac2eb7b8bb323a0;2026-09-21 09:28",
  "TAXI;4;EB4-TAXI;anglais;20;dc2fdb8869c4891878f9c3d9637baf8e;2026-09-21 09:28",
  "TAXI;4;EB4-TAXI;reglementation_taxi;16;ef8ea9f35096909e8bbc28c54d73d407;2026-09-21 09:28",
  "TAXI;4;EB4-TAXI;reglementation_taxi2;7;9bcec14c78400f104b314cf7761ad2a6;2026-09-21 09:28",
  "TAXI;5;EB5-TAXI;t3p;15;1bf26379d76281f127a7c69936956503;2026-09-21 09:28",
  "TAXI;5;EB5-TAXI;gestion;17;f3ee3fcab6b7f445bd7c8796ef72df57;2026-09-21 09:28",
  "TAXI;5;EB5-TAXI;securite;20;2fc000c76f746b5b096a6ddd03f5eb69;2026-09-21 09:28",
  "TAXI;5;EB5-TAXI;francais;9;d6a4bd48c66b5d20530ad6259d3a71ea;2026-09-21 09:28",
  "TAXI;5;EB5-TAXI;anglais;20;49b46c1301bbb7817faeb029d42f4042;2026-09-21 09:28",
  "TAXI;5;EB5-TAXI;reglementation_taxi;15;af7604968c847cd78d86d13f95767688;2026-09-21 09:28",
  "TAXI;5;EB5-TAXI;reglementation_taxi2;8;a5ae014b86f62a074ede6050ee5c5d74;2026-09-21 09:28",
  "TAXI;6;EB6-TAXI;t3p;14;1ec3ede4f1943c832b88b34141557586;2026-09-21 09:28",
  "TAXI;6;EB6-TAXI;gestion;17;26dfbcdec8d260ddb84483132cfe89e2;2026-09-21 09:28",
  "TAXI;6;EB6-TAXI;securite;20;49b1b4bede6356c2018688f1c0a27ffa;2026-09-21 09:28",
  "TAXI;6;EB6-TAXI;francais;10;e1565f09260f43e96200f67e5ee195af;2026-09-21 09:28",
  "TAXI;6;EB6-TAXI;anglais;20;ba7f12aa22282b1d18e32a7ed375ce49;2026-09-21 09:28",
  "TAXI;6;EB6-TAXI;reglementation_taxi;16;9a7eb3a05f4eae0e35e8733486c70d0a;2026-09-21 09:28",
  "TAXI;6;EB6-TAXI;reglementation_taxi2;8;a3ac8ed5af8557c4730e155b764ce0a4;2026-09-21 09:28",
  "VA;1;eb1-va;reglementation_vtc;16;0edc8a6ddabfa35ed7b459020ec71a1c;2026-09-21 16:56",
  "VA;1;eb1-va;reglementation_vtc2;8;4bbafdd4ba8fbabbb01ee951e05c2eee;2026-09-21 16:56",
  "VA;2;eb2-va;reglementation_vtc;16;dab880e474772ee996451b922caeca93;2026-09-22 07:31",
  "VA;2;eb2-va;reglementation_vtc2;8;bda7fe99431976f0fe7c210fbbad6dee;2026-09-22 07:31",
  "VA;3;eb3-va;reglementation_vtc;16;90bc9252168a0ad0e0d2db469d9e3825;2026-09-18 15:03",
  "VA;3;eb3-va;reglementation_vtc2;8;4d136d870d17c7e149f79be41c478408;2026-09-18 15:03",
  "VA;4;eb4-va;reglementation_vtc;16;e0b8e03833bb1b08364bc6d27663dc3a;2026-09-18 15:12",
  "VA;4;eb4-va;reglementation_vtc2;8;f3dd248d2c40608cc8d3bf245ec4b3e5;2026-09-18 15:12",
  "VA;5;eb5-va;reglementation_vtc;16;685310016e0315f7327b6404b85eac16;2026-09-18 15:03",
  "VA;5;eb5-va;reglementation_vtc2;8;678c6cd73eb382d1a3da3f0d8c2161c2;2026-09-18 15:03",
  "VA;6;eb6-va;reglementation_vtc;16;73826de1c8b179889ea4adf254a8263d;2026-09-21 09:44",
  "VA;6;eb6-va;reglementation_vtc2;8;426a371f43d493a42f2b9f66f5c7e2a4;2026-09-21 09:44",
  "TA;1;eb1-ta;reglementation_taxi;16;e62d62de06d37665842d39a4d68fe4c4;2026-09-18 15:03",
  "TA;1;eb1-ta;reglementation_taxi2;8;843a65f33dc7aa0bd1d424a4ba685867;2026-09-18 15:03",
  "TA;2;eb2-ta;reglementation_taxi;16;4df20de2691fd8c98441d574fa629d16;2026-09-22 07:43",
  "TA;2;eb2-ta;reglementation_taxi2;8;bef1c97808425f38746d2a2423ba63a9;2026-09-22 07:43",
  "TA;3;eb3-ta;reglementation_taxi;16;f16c83c6f804b46d5db6bb8621cfa75a;2026-09-18 15:03",
  "TA;3;eb3-ta;reglementation_taxi2;8;87972a20a7122eba16948f7865d28e12;2026-09-18 15:03",
  "TA;4;eb4-ta;reglementation_taxi;16;ef8ea9f35096909e8bbc28c54d73d407;2026-09-18 15:03",
  "TA;4;eb4-ta;reglementation_taxi2;7;9bcec14c78400f104b314cf7761ad2a6;2026-09-18 15:03",
  "TA;5;eb5-ta;reglementation_taxi;15;af7604968c847cd78d86d13f95767688;2026-09-18 15:03",
  "TA;5;eb5-ta;reglementation_taxi2;8;a5ae014b86f62a074ede6050ee5c5d74;2026-09-18 15:03",
  "TA;6;eb6-ta;reglementation_taxi;16;9a7eb3a05f4eae0e35e8733486c70d0a;2026-09-18 15:03",
  "TA;6;eb6-ta;reglementation_taxi2;8;a3ac8ed5af8557c4730e155b764ce0a4;2026-09-18 15:03",
];

function parseLigne(ligne: string): ManifestEntry {
  const [filiere, numero, exam_id, subject_id, nb, empreinte_source, derniere_modification] = ligne.split(";");
  const nombre_questions = Number(nb);
  const attendu = NB_QUESTIONS_ATTENDU[subject_id];
  const cle = `${exam_id}/${subject_id}`;

  let statut: StatutAudit = "A_CONTROLER";
  let motif: string | undefined =
    "Contenu actuel sans preuve suffisante : à contrôler avant toute copie.";

  if (attendu !== undefined && nombre_questions !== attendu) {
    statut = "ANOMALIE";
    motif = `Nombre de questions incohérent : ${nombre_questions} au lieu de ${attendu} attendues.`;
  } else if (VALIDES[cle]) {
    statut = "VALIDE";
    motif = VALIDES[cle];
  }

  return {
    filiere: filiere as ManifestEntry["filiere"],
    numero: Number(numero),
    exam_id,
    module_id: EXAM_MODULE_IDS[exam_id],
    subject_id,
    nombre_questions,
    empreinte_source,
    derniere_modification,
    statut,
    motif,
  };
}

/** Manifest figé : une entrée par examen × matière. */
export const MANIFEST_MIGRATION: readonly ManifestEntry[] = LIGNES_AUDIT.map(parseLigne);

/** Seules les entrées 🟢 VALIDÉ sont copiables en étape 2. */
export function entreesCopiables(): ManifestEntry[] {
  return MANIFEST_MIGRATION.filter((e) => e.statut === "VALIDE");
}

export function resumeManifest(): Record<StatutAudit | "examens" | "matieres", number> {
  const examens = new Set(MANIFEST_MIGRATION.map((e) => e.exam_id)).size;
  return {
    examens,
    matieres: MANIFEST_MIGRATION.length,
    VALIDE: MANIFEST_MIGRATION.filter((e) => e.statut === "VALIDE").length,
    A_CONTROLER: MANIFEST_MIGRATION.filter((e) => e.statut === "A_CONTROLER").length,
    ANOMALIE: MANIFEST_MIGRATION.filter((e) => e.statut === "ANOMALIE").length,
  };
}

/**
 * Détecte une même empreinte partagée entre DEUX NUMÉROS d'examen différents.
 * Un partage entre filières du MÊME numéro (VTC/TAXI N°1, VTC/VA N°2, TAXI/TA N°2)
 * est légitime ; entre numéros différents, c'est une anomalie bloquante.
 */
export function empreintesPartageesEntreNumeros(): Array<{ empreinte: string; entrees: ManifestEntry[] }> {
  const parEmpreinte = new Map<string, ManifestEntry[]>();
  for (const e of MANIFEST_MIGRATION) {
    parEmpreinte.set(e.empreinte_source, [...(parEmpreinte.get(e.empreinte_source) ?? []), e]);
  }
  const resultat: Array<{ empreinte: string; entrees: ManifestEntry[] }> = [];
  for (const [empreinte, entrees] of parEmpreinte) {
    if (new Set(entrees.map((e) => e.numero)).size > 1) resultat.push({ empreinte, entrees });
  }
  return resultat;
}
