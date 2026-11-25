import { supabase } from "@/integrations/supabase/client";
import { INDICATEURS, QualiopiStatut } from "./referentiel";
import { lirePagesQualiopi } from "./lectureComplete";
import { ouvrirPdfPriveUrl } from "@/lib/ouvrirPdfPrive";

export interface PreuveFichier {
  nom: string;
  path: string;
  taille?: number;
  type?: string;
}

export interface QualiopiPreuve {
  id: string;
  ref_key?: string | null;
  titre: string;
  description: string | null;
  ce_que_demontre: string | null;
  emplacement: string | null;
  remarque_interne: string | null;
  source_libelle: string | null;
  date_preuve: string | null;
  valide_du: string | null;
  valide_au: string | null;
  fichiers: PreuveFichier[];
  lien_url: string | null;
  source_type: string;
  source_table: string | null;
  source_id: string | null;
  archivee: boolean;
  archivee_le: string | null;
  created_at: string;
  indicateurs: number[];
}

export interface QualiopiEtat {
  indicateur: number;
  statut: QualiopiStatut;
  applicable: boolean;
  responsable: string | null;
  commentaire_auditeur: string | null;
  script_auditeur: string | null;
  points_vigilance: string | null;
  remarques: string | null;
  date_verification: string | null;
  maj_annuelle: boolean;
}

export const DEFAULT_ETAT = (n: number): QualiopiEtat => ({
  indicateur: n,
  statut: "preuve_manquante",
  applicable: true,
  responsable: null,
  commentaire_auditeur: null,
  script_auditeur: null,
  points_vigilance: null,
  remarques: null,
  date_verification: null,
  maj_annuelle: false,
});

export async function loadQualiopi(): Promise<{ etats: Record<number, QualiopiEtat>; preuves: QualiopiPreuve[] }> {
  const [etatRes, preuveRows, lienRows] = await Promise.all([
    supabase.from("qualiopi_indicateurs_etat").select("*"),
    lirePagesQualiopi((from, to) => supabase.from("qualiopi_preuves").select("*")
      .order("created_at", { ascending: false }).order("id").range(from, to)),
    lirePagesQualiopi((from, to) => supabase.from("qualiopi_preuve_liens").select("preuve_id, indicateur")
      .order("id").range(from, to)),
  ]);
  if (etatRes.error) throw etatRes.error;

  const etats: Record<number, QualiopiEtat> = {};
  for (const ind of INDICATEURS) etats[ind.numero] = DEFAULT_ETAT(ind.numero);
  for (const row of (etatRes.data as any[]) || []) {
    etats[row.indicateur] = {
      indicateur: row.indicateur,
      statut: row.statut as QualiopiStatut,
      applicable: row.applicable,
      responsable: row.responsable,
      commentaire_auditeur: row.commentaire_auditeur,
      script_auditeur: row.script_auditeur ?? null,
      points_vigilance: row.points_vigilance ?? null,
      remarques: row.remarques ?? null,
      date_verification: row.date_verification,
      maj_annuelle: row.maj_annuelle,
    };
  }

  const liensByPreuve = new Map<string, number[]>();
  for (const l of lienRows) {
    const arr = liensByPreuve.get(l.preuve_id) || [];
    arr.push(l.indicateur);
    liensByPreuve.set(l.preuve_id, arr);
  }

  const preuves: QualiopiPreuve[] = preuveRows.map((p) => ({
    ...p,
    fichiers: Array.isArray(p.fichiers) ? (p.fichiers as unknown as PreuveFichier[]) : [],
    indicateurs: (liensByPreuve.get(p.id) || []).sort((a, b) => a - b),
  }));

  return { etats, preuves };
}

export async function saveEtat(etat: QualiopiEtat) {
  const { error } = await supabase
    .from("qualiopi_indicateurs_etat")
    .upsert(
      {
        indicateur: etat.indicateur,
        statut: etat.statut,
        applicable: etat.applicable,
        responsable: etat.responsable,
        commentaire_auditeur: etat.commentaire_auditeur,
        script_auditeur: etat.script_auditeur,
        points_vigilance: etat.points_vigilance,
        remarques: etat.remarques,
        date_verification: etat.date_verification,
        maj_annuelle: etat.maj_annuelle,
      },
      { onConflict: "indicateur" },
    );
  if (error) throw error;
}

export async function linkPreuve(preuveId: string, indicateur: number) {
  const { error } = await supabase
    .from("qualiopi_preuve_liens")
    .upsert({ preuve_id: preuveId, indicateur }, { onConflict: "preuve_id,indicateur" });
  if (error) throw error;
}

export async function unlinkPreuve(preuveId: string, indicateur: number) {
  const { error } = await supabase
    .from("qualiopi_preuve_liens")
    .delete()
    .eq("preuve_id", preuveId)
    .eq("indicateur", indicateur);
  if (error) throw error;
}

export async function archivePreuve(preuveId: string, archivee: boolean) {
  const { error } = await supabase
    .from("qualiopi_preuves")
    .update({ archivee, archivee_le: archivee ? new Date().toISOString() : null })
    .eq("id", preuveId);
  if (error) throw error;
}

export async function createPreuve(input: {
  titre: string;
  description?: string | null;
  ce_que_demontre?: string | null;
  emplacement?: string | null;
  remarque_interne?: string | null;
  source_libelle?: string | null;
  date_preuve?: string | null;
  valide_du?: string | null;
  valide_au?: string | null;
  fichiers?: PreuveFichier[];
  lien_url?: string | null;
  source_type?: string;
  source_table?: string | null;
  source_id?: string | null;
  remplace_preuve_id?: string | null;
}): Promise<string> {
  const { data, error } = await supabase
    .from("qualiopi_preuves")
    .insert({
      titre: input.titre,
      description: input.description ?? null,
      ce_que_demontre: input.ce_que_demontre ?? null,
      emplacement: input.emplacement ?? null,
      remarque_interne: input.remarque_interne ?? null,
      source_libelle: input.source_libelle ?? null,
      date_preuve: input.date_preuve ?? null,
      valide_du: input.valide_du ?? null,
      valide_au: input.valide_au ?? null,
      fichiers: (input.fichiers ?? []) as any,
      lien_url: input.lien_url ?? null,
      source_type: input.source_type ?? "upload",
      source_table: input.source_table ?? null,
      source_id: input.source_id ?? null,
      remplace_preuve_id: input.remplace_preuve_id ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as any).id as string;
}

export async function uploadPreuveFichier(file: File): Promise<PreuveFichier> {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${new Date().getFullYear()}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}`;
  const { error } = await supabase.storage.from("qualiopi-preuves").upload(path, file, { upsert: false });
  if (error) throw error;
  return { nom: file.name, path, taille: file.size, type: file.type };
}

export async function openPreuveFichier(fichier: PreuveFichier) {
  const { data, error } = await supabase.storage.from("qualiopi-preuves").createSignedUrl(fichier.path, 3600);
  if (error || !data?.signedUrl) throw error || new Error("URL indisponible");
  if (fichier.type === "application/pdf" || /\.pdf$/i.test(fichier.path)) await ouvrirPdfPriveUrl(data.signedUrl);
  else window.open(data.signedUrl, "_blank");
}

// ===== Alertes =====
export type AlerteType =
  | "aucune_preuve"
  | "preuves_anciennes"
  | "preuve_expiree"
  | "preuve_expiration_proche"
  | "maj_annuelle"
  | "preuve_archivee"
  | "a_completer";

export const ALERTE_LABELS: Record<AlerteType, string> = {
  aucune_preuve: "Aucune preuve",
  preuves_anciennes: "Preuves anciennes (> 12 mois)",
  preuve_expiree: "Document expiré",
  preuve_expiration_proche: "Expiration dans moins de 90 jours",
  maj_annuelle: "Mise à jour annuelle requise",
  preuve_archivee: "Contient une preuve archivée",
  a_completer: "Marqué « À compléter »",
};

export function alertesPourIndicateur(etat: QualiopiEtat, preuves: QualiopiPreuve[]): AlerteType[] {
  if (!etat.applicable) return [];
  const actives = preuves.filter((p) => !p.archivee);
  const out: AlerteType[] = [];
  const today = new Date();
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

  if (actives.length === 0) out.push("aucune_preuve");
  else {
    const dates = actives.map((p) => new Date(p.date_preuve || p.created_at));
    if (dates.every((d) => d < oneYearAgo)) out.push("preuves_anciennes");
    if (actives.some((p) => p.valide_au && new Date(p.valide_au) < today)) out.push("preuve_expiree");
    if (actives.some((p) => {
      if (!p.valide_au) return false;
      const delai = new Date(p.valide_au).getTime() - today.getTime();
      return delai >= 0 && delai <= 90 * 24 * 60 * 60 * 1000;
    })) out.push("preuve_expiration_proche");
  }
  if (etat.maj_annuelle) {
    const last = etat.date_verification ? new Date(etat.date_verification) : null;
    if (!last || last < oneYearAgo) out.push("maj_annuelle");
  }
  if (preuves.some((p) => p.archivee)) out.push("preuve_archivee");
  if (etat.statut === "a_completer") out.push("a_completer");
  return out;
}
