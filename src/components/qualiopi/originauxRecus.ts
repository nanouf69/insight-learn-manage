import { supabase } from "@/integrations/supabase/client";
import { uploadPreuveFichier, type PreuveFichier, type QualiopiPreuve } from "@/lib/qualiopi/data";
import { verifierDocx } from "./indicateur6";

export const REF_ORIGINAL_I32 = "i32-procedure-appreciations-reclamations-20261125";
export const REF_ORIGINAL_I22 = "i22-plan-developpement-competences-meryem-baissa-2026-2027";

export async function verifierPdfOriginal(file: File) {
  if (!/\.pdf$/i.test(file.name) || file.size === 0) throw new Error("Joignez un PDF original non vide.");
  const bytes = new Uint8Array(await file.arrayBuffer(), 0, 5);
  if (new TextDecoder().decode(bytes) !== "%PDF-") throw new Error("Ce fichier n’est pas un PDF valide.");
}

const CONFIGS = {
  [REF_ORIGINAL_I32]: {
    nom: "32.docx",
    accept: ".docx",
    verifier: verifierDocx,
  },
  [REF_ORIGINAL_I22]: {
    nom: "CCF_000546(1).pdf",
    accept: ".pdf,application/pdf",
    verifier: verifierPdfOriginal,
  },
} as const;

export function configOriginalRecu(refKey?: string | null) {
  return refKey && refKey in CONFIGS ? CONFIGS[refKey as keyof typeof CONFIGS] : null;
}

function metadataApresDepot(valeur: string | null, fichier: PreuveFichier) {
  let metadata: Record<string, unknown> = {};
  try {
    const parsed = valeur ? JSON.parse(valeur) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) metadata = parsed;
    else if (valeur) metadata.historique_remarque = valeur;
  } catch {
    if (valeur) metadata.historique_remarque = valeur;
  }
  return JSON.stringify({
    ...metadata,
    original_binaire_transfere: true,
    original_archive: true,
    dernier_original_depose: { nom: fichier.nom, path: fichier.path, taille: fichier.taille },
  });
}

export function fichiersAvecOriginal(valeur: unknown, nouveau: PreuveFichier) {
  const existants = Array.isArray(valeur) ? valeur as unknown as PreuveFichier[] : [];
  return [...existants, nouveau];
}

export async function joindreOriginalRecu(preuve: QualiopiPreuve, file: File) {
  const config = configOriginalRecu(preuve.ref_key);
  if (!config) throw new Error("Cette fiche n’accepte pas ce dépôt d’original.");
  await config.verifier(file);

  const avant = await supabase.from("qualiopi_preuves")
    .select("fichiers,updated_at,ref_key,remarque_interne")
    .eq("id", preuve.id).single();
  if (avant.error) throw avant.error;
  if (avant.data.ref_key !== preuve.ref_key || !configOriginalRecu(avant.data.ref_key)) {
    throw new Error("La référence de la preuve a changé ; dépôt refusé.");
  }

  const uploaded = await uploadPreuveFichier(file);
  const objet = await supabase.storage.from("qualiopi-preuves").download(uploaded.path);
  if (objet.error || objet.data?.size !== file.size) throw objet.error ?? new Error("Dépôt privé non confirmé.");

  const fichiers = fichiersAvecOriginal(avant.data.fichiers, uploaded);
  const updated = await supabase.from("qualiopi_preuves").update({
    fichiers: fichiers as any,
    emplacement: "Stockage privé — Qualiopi — original déposé ; historique des fichiers conservé",
    source_libelle: "Pièce reçue et inspectée dans ChatGPT le 25/11/2026 ; original binaire déposé par le centre dans le stockage privé Qualiopi.",
    remarque_interne: metadataApresDepot(avant.data.remarque_interne, uploaded),
  }).eq("id", preuve.id).eq("updated_at", avant.data.updated_at).select("id,fichiers").maybeSingle();
  if (updated.error) throw updated.error;
  if (!updated.data) {
    throw new Error("La fiche a changé entre-temps. Le fichier est conservé, mais son rattachement n’est pas confirmé ; rechargez avant de réessayer.");
  }

  const apres = await supabase.from("qualiopi_preuves").select("fichiers,remarque_interne").eq("id", preuve.id).single();
  if (apres.error) throw apres.error;
  const fichiersRelus = Array.isArray(apres.data.fichiers) ? apres.data.fichiers as unknown as PreuveFichier[] : [];
  if (!fichiersRelus.some((f) => f.path === uploaded.path)) throw new Error("Rattachement de l’original non confirmé.");
  const metadata = apres.data.remarque_interne ? JSON.parse(apres.data.remarque_interne) : null;
  if (metadata?.original_archive !== true) throw new Error("L’état d’archivage n’a pas été confirmé.");
}
