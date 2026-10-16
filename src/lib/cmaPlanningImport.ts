/**
 * Import du planning d'examen pratique CMA (PDF) — analyse et rapprochement purs.
 *
 * - Analyse déterministe des lignes de texte du PDF (aucune IA) : chaque ligne
 *   candidat détectée est conservée avec le nom/prénom INTÉGRAL du PDF.
 * - Rapprochement prudent avec les fiches : jamais la « première fiche homonyme ».
 *   exact unique / prénom complémentaire unique => « lie » ; plusieurs => « ambigu » ;
 *   proche (orthographe, nom composé partiel) => « a_verifier » ; rien => « inconnu ».
 * - Aucune ligne ne disparaît : chaque ligne reçoit un statut et une raison.
 */

export type Filiere = "VTC" | "TAXI";

export interface LignePlanningPdf {
  date: string; // YYYY-MM-DD
  jury: string | null;
  numero: number;
  heure: string; // HH:MM
  prenom: string; // tel qu'écrit dans le PDF
  nom: string; // tel qu'écrit dans le PDF
  filiere: Filiere;
  page?: number;
}

export interface FicheApprenant {
  id: string;
  nom: string | null;
  prenom: string | null;
  date_examen_pratique?: string | null;
  heure_examen_pratique?: string | null;
}

export interface LigneDejaImportee {
  apprenant_id: string;
  date_examen: string;
  heure: string;
  filiere: string;
}

export type StatutRapprochement = "lie" | "ambigu" | "a_verifier" | "inconnu";
export type StatutImport = "deja_present" | "a_ajouter" | "conflit" | "non_importable";

export interface ResultatLigne {
  ligne: LignePlanningPdf;
  statut: StatutRapprochement;
  apprenantId: string | null;
  candidats: FicheApprenant[];
  raison: string;
  import: StatutImport;
  raisonImport: string;
}

const MOIS: Record<string, number> = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7,
  aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
};

export function normaliser(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normTexte(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

const tokens = (s: string | null | undefined) => normaliser(s).split(" ").filter(Boolean);

const HEURE_RE = /^(\d{1,2})\s*[hH:]\s*(\d{2})$/;
export function normaliserHeure(s: string): string | null {
  const m = s.trim().match(HEURE_RE);
  if (!m) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/** Découpe une ligne de texte « mise en page » en colonnes (2 espaces ou plus). */
export function segmentsDepuisTexte(ligne: string): string[] {
  return ligne.split(/\s{2,}|\t/).map((s) => s.trim()).filter(Boolean);
}

function filiereDepuis(seg: string): Filiere | null {
  const n = normaliser(seg);
  if (/\btaxi\b/.test(n) && !/\bvtc\b/.test(n)) return "TAXI";
  if (/\bvtc\b/.test(n) && !/\btaxi\b/.test(n)) return "VTC";
  return null;
}

const estOrganisme = (seg: string) => /f\s*t\s*ransport|ftransport/i.test(seg.replace(/\s+/g, " ")) || /^\(?(vtc|taxi)\)?$/i.test(seg.trim());

/** Sépare « Prénom NOM » quand les deux sont dans une même colonne. */
function separerPrenomNom(parts: string[]): { prenom: string; nom: string } {
  if (parts.length >= 2) return { prenom: parts[0], nom: parts.slice(1).join(" ") };
  const mots = (parts[0] ?? "").split(/\s+/).filter(Boolean);
  // Nom = mots finaux entièrement en majuscules
  let i = mots.length;
  while (i > 1 && /^[A-ZÀ-Ý'’\-]{2,}$/.test(mots[i - 1]) && mots[i - 1] !== mots[i - 1].toLowerCase()) i--;
  if (i === mots.length) i = mots.length - 1;
  return { prenom: mots.slice(0, i).join(" "), nom: mots.slice(i).join(" ") };
}

/**
 * Analyse les lignes (chaque ligne = colonnes) d'un planning CMA.
 * Retourne les lignes candidats et les lignes ignorées explicitement (avec raison).
 */
export function analyserPlanning(lignes: Array<{ segments: string[]; page?: number }>): {
  candidats: LignePlanningPdf[];
  ignorees: Array<{ texte: string; raison: string; page?: number }>;
  erreurs: Array<{ texte: string; raison: string; page?: number }>;
} {
  const candidats: LignePlanningPdf[] = [];
  const ignorees: Array<{ texte: string; raison: string; page?: number }> = [];
  const erreurs: Array<{ texte: string; raison: string; page?: number }> = [];
  let date: string | null = null;
  let jury: string | null = null;
  let filiereEntete: Filiere | null = null;
  let attenteDate: { jour: number; mois: number } | null = null;

  type Partiel = { numero: number; heure: string; noms: string[]; filiere: Filiere | null; page?: number; texte: string };
  let enCours: Partiel | null = null;

  const cloturer = () => {
    if (!enCours) return;
    const p = enCours;
    enCours = null;
    if (p.noms.length === 0 && !p.filiere) {
      ignorees.push({ texte: p.texte, raison: "créneau vide (aucun candidat)", page: p.page });
      return;
    }
    const { prenom, nom } = separerPrenomNom(p.noms);
    if (!date || !nom || !prenom) {
      erreurs.push({ texte: p.texte, raison: !date ? "date du planning introuvable" : "nom ou prénom illisible", page: p.page });
      return;
    }
    candidats.push({
      date, jury, numero: p.numero, heure: p.heure, prenom, nom,
      filiere: p.filiere ?? filiereEntete ?? "VTC", page: p.page,
    });
  };

  for (const { segments, page } of lignes) {
    const texte = segments.join("  ");
    const n = normTexte(texte);
    if (!n) continue;

    // Date : « DU 03 NOVEMBRE 2026 » (éventuellement sur plusieurs lignes)
    const md = n.match(/\b(\d{1,2}) (janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)(?: (\d{4}))?\b/);
    const lit = texte.match(/^\s*\d/) && segments.length >= 3;
    if (md && !lit) {
      cloturer();
      if (md[3]) {
        date = `${md[3]}-${String(MOIS[md[2]]).padStart(2, "0")}-${md[1].padStart(2, "0")}`;
        attenteDate = null;
      } else attenteDate = { jour: Number(md[1]), mois: MOIS[md[2]] };
      ignorees.push({ texte, raison: "en-tête (date)", page });
      continue;
    }
    if (attenteDate && /^\d{4}$/.test(n)) {
      date = `${n}-${String(attenteDate.mois).padStart(2, "0")}-${String(attenteDate.jour).padStart(2, "0")}`;
      attenteDate = null;
      continue;
    }
    if (/\bjury\b/.test(n)) {
      cloturer();
      const mj = n.match(/jury (\d+)/);
      jury = mj ? `JURY ${mj[1]}` : jury;
      filiereEntete = filiereDepuis(texte) ?? filiereEntete;
      ignorees.push({ texte, raison: "en-tête (jury)", page });
      continue;
    }
    if (/^(du|au|vtc|taxi|vtc taxi|taxi vtc)$/.test(n)) {
      ignorees.push({ texte, raison: "en-tête", page });
      continue;
    }
    if (/emargement/.test(n)) {
      cloturer();
      ignorees.push({ texte, raison: "horaire d'émargement (pas un candidat)", page });
      continue;
    }
    if (/planning examen|admission|n candidat|prenom et nom|organisme de formation/.test(n)) {
      cloturer();
      ignorees.push({ texte, raison: "en-tête de page", page });
      continue;
    }

    // Ligne candidat : N° + heure + ...
    const numero = segments[0]?.match(/^(\d{1,3})(?:\s+(\d{1,2}\s*[hH:]\s*\d{2}))?(?:\s+(.*))?$/);
    if (numero) {
      let reste = segments.slice(1);
      let heure = numero[2] ? normaliserHeure(numero[2]) : null;
      if (numero[3]) reste = [numero[3], ...reste];
      if (!heure && reste[0]) {
        const mh = reste[0].match(/^(\d{1,2}\s*[hH:]\s*\d{2})(?:\s+(.*))?$/);
        if (mh) {
          heure = normaliserHeure(mh[1]);
          reste = mh[2] ? [mh[2], ...reste.slice(1)] : reste.slice(1);
        }
      }
      if (heure) {
        cloturer();
        const p: Partiel = { numero: Number(numero[1]), heure, noms: [], filiere: null, page, texte };
        for (const seg of reste) {
          if (estOrganisme(seg)) p.filiere = filiereDepuis(seg) ?? p.filiere;
          else p.noms.push(seg);
        }
        enCours = p;
        if (p.filiere && p.noms.length >= 2) cloturer();
        continue;
      }
    }

    // Ligne de continuation (nom reporté sur la ligne suivante)
    if (enCours) {
      const p = enCours as Partiel;
      for (const seg of segments) {
        if (estOrganisme(seg)) p.filiere = filiereDepuis(seg) ?? p.filiere;
        else p.noms.push(seg);
      }
      p.texte += " / " + texte;
      if (p.filiere && p.noms.length >= 2) cloturer();
      continue;
    }
    ignorees.push({ texte, raison: "ligne non reconnue", page });
  }
  cloturer();
  return { candidats, ignorees, erreurs };
}

function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

const inclus = (petit: string[], grand: string[]) => petit.length > 0 && petit.every((t) => grand.includes(t));

type Niveau = "exact" | "compatible" | "proche" | null;

function comparer(l: LignePlanningPdf, f: FicheApprenant): Niveau {
  const ln = normaliser(l.nom), lp = normaliser(l.prenom);
  const fn = normaliser(f.nom), fp = normaliser(f.prenom);
  if (!fn || !fp) return null;
  const memes = (a: string, b: string, c: string, d: string) => a === c && b === d;
  if (memes(ln, lp, fn, fp) || memes(ln, lp, fp, fn)) return "exact";
  // Prénom complémentaire : NOM identique et prénoms l'un inclus dans l'autre
  const compat = (nomL: string, preL: string, nomF: string, preF: string) =>
    nomL === nomF && (inclus(tokens(preF), tokens(preL)) || inclus(tokens(preL), tokens(preF)));
  if (compat(ln, lp, fn, fp) || compat(ln, lp, fp, fn)) return "compatible";
  // Proche : orthographe voisine ou nom composé partiel => toujours à vérifier
  const prenomOk = lp === fp || inclus(tokens(fp), tokens(lp)) || inclus(tokens(lp), tokens(fp));
  const nomOk = ln === fn || inclus(tokens(fn), tokens(ln)) || inclus(tokens(ln), tokens(fn));
  if (nomOk && prenomOk) return "proche";
  if (ln === fn && distance(lp.replace(/ /g, ""), fp.replace(/ /g, "")) <= 2) return "proche";
  if (prenomOk && distance(ln.replace(/ /g, ""), fn.replace(/ /g, "")) <= 2) return "proche";
  return null;
}

export function rapprocher(l: LignePlanningPdf, fiches: FicheApprenant[]): Omit<ResultatLigne, "import" | "raisonImport"> {
  const parNiveau: Record<"exact" | "compatible" | "proche", FicheApprenant[]> = { exact: [], compatible: [], proche: [] };
  for (const f of fiches) {
    const n = comparer(l, f);
    if (n) parNiveau[n].push(f);
  }
  const autres = (garde: FicheApprenant) =>
    [...parNiveau.exact, ...parNiveau.compatible, ...parNiveau.proche].filter((f) => f.id !== garde.id);
  if (parNiveau.exact.length === 1) {
    const f = parNiveau.exact[0];
    const a = autres(f);
    return { ligne: l, statut: "lie", apprenantId: f.id, candidats: [f, ...a],
      raison: a.length ? `nom et prénom identiques (fiche unique) — ${a.length} autre(s) fiche(s) seulement partielle(s)` : "nom et prénom identiques" };
  }
  if (parNiveau.exact.length > 1)
    return { ligne: l, statut: "ambigu", apprenantId: null, candidats: [...parNiveau.exact, ...parNiveau.compatible],
      raison: `${parNiveau.exact.length} fiches avec le même nom et prénom — choix manuel` };
  if (parNiveau.compatible.length === 1) {
    const f = parNiveau.compatible[0];
    return { ligne: l, statut: "lie", apprenantId: f.id, candidats: [f, ...autres(f)],
      raison: "même NOM, prénom complémentaire compatible (fiche unique)" };
  }
  if (parNiveau.compatible.length > 1)
    return { ligne: l, statut: "ambigu", apprenantId: null, candidats: parNiveau.compatible,
      raison: `${parNiveau.compatible.length} fiches compatibles — choix manuel` };
  if (parNiveau.proche.length > 0)
    return { ligne: l, statut: "a_verifier", apprenantId: null, candidats: parNiveau.proche,
      raison: "orthographe ou nom composé différent — à vérifier manuellement" };
  return { ligne: l, statut: "inconnu", apprenantId: null, candidats: [], raison: "aucune fiche correspondante (aucun compte créé)" };
}

/** Statut d'import d'une ligne liée face au planning existant (fiche + imports antérieurs). */
export function statutImport(
  apprenantId: string | null,
  l: LignePlanningPdf,
  fiche: FicheApprenant | undefined,
  deja: LigneDejaImportee[],
): { import: StatutImport; raisonImport: string } {
  if (!apprenantId) return { import: "non_importable", raisonImport: "élève non identifié" };
  const siens = deja.filter((d) => d.apprenant_id === apprenantId && d.filiere === l.filiere);
  if (siens.some((d) => d.date_examen === l.date && d.heure === l.heure))
    return { import: "deja_present", raisonImport: "déjà importé (même date, heure, filière)" };
  if (fiche?.date_examen_pratique === l.date && (fiche.heure_examen_pratique ?? "") === l.heure)
    return { import: "deja_present", raisonImport: "déjà sur la fiche (même date et heure)" };
  if (siens.some((d) => d.date_examen === l.date))
    return { import: "conflit", raisonImport: "déjà importé à cette date avec une autre heure — en attente" };
  if (fiche?.date_examen_pratique === l.date && fiche.heure_examen_pratique && fiche.heure_examen_pratique !== l.heure)
    return { import: "conflit", raisonImport: `fiche à ${fiche.heure_examen_pratique} ce jour-là — en attente` };
  const autre = siens.find((d) => d.date_examen !== l.date && d.date_examen >= l.date.slice(0, 7));
  if (autre) return { import: "conflit", raisonImport: `déjà importé le ${autre.date_examen} — en attente` };
  return { import: "a_ajouter", raisonImport: "à ajouter au planning (fiche inchangée)" };
}

export function construireApercu(
  lignes: LignePlanningPdf[],
  fiches: FicheApprenant[],
  deja: LigneDejaImportee[],
  choixManuels: Record<number, string | null> = {},
): ResultatLigne[] {
  const parId = new Map(fiches.map((f) => [f.id, f]));
  return lignes.map((l, i) => {
    const r = rapprocher(l, fiches);
    let apprenantId = r.apprenantId;
    let raison = r.raison;
    if (i in choixManuels) {
      apprenantId = choixManuels[i];
      raison = apprenantId ? "choix manuel de l'administrateur" : "ignorée par l'administrateur";
    }
    const s = statutImport(apprenantId, l, apprenantId ? parId.get(apprenantId) : undefined, deja);
    return { ...r, apprenantId, raison, statut: i in choixManuels && apprenantId ? "lie" : r.statut, ...s };
  });
}

export interface TextItemPos { str: string; x: number; y: number; width: number }

/** Regroupe des morceaux de texte positionnés en lignes de colonnes. */
export function lignesDepuisItems(items: TextItemPos[], page: number): Array<{ segments: string[]; page: number }> {
  const rangees: Array<{ y: number; items: TextItemPos[] }> = [];
  for (const it of items) {
    if (!it.str.trim()) continue;
    const r = rangees.find((x) => Math.abs(x.y - it.y) <= 3);
    if (r) r.items.push(it);
    else rangees.push({ y: it.y, items: [it] });
  }
  rangees.sort((a, b) => b.y - a.y); // PDF : y croissant vers le haut
  return rangees.map((r) => {
    const tri = r.items.sort((a, b) => a.x - b.x);
    const segments: string[] = [];
    let fin = -Infinity;
    for (const it of tri) {
      if (segments.length && it.x - fin < 8) segments[segments.length - 1] += (it.x - fin > 1 ? " " : "") + it.str.trim();
      else segments.push(it.str.trim());
      fin = it.x + it.width;
    }
    return { segments: segments.map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean), page };
  });
}

