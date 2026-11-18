import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { type QualiopiPreuve, uploadPreuveFichier } from "@/lib/qualiopi/data";

export const EMPLOIS_DU_TEMPS = [
  { key: "i6-edt-vtc-journee", theorie: 60, conduite: 6, total: 66, semaines: 2, horaires: "9h-12h / 13h-16h" },
  { key: "i6-edt-vtc-soir", theorie: 40, conduite: 6, total: 46, semaines: 2, horaires: "17h-21h" },
  { key: "i6-edt-taxi", theorie: 90, conduite: 6, total: 96, semaines: 3, horaires: "9h-12h / 13h-16h" },
] as const;

export function estEmploiDuTemps(p: QualiopiPreuve) {
  return EMPLOIS_DU_TEMPS.some((e) => e.key === p.ref_key);
}

export async function verifierDocx(file: File) {
  if (!/\.docx$/i.test(file.name) || file.size === 0) throw new Error("Joignez un DOCX original non vide.");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  if (!zip.file("word/document.xml") || !zip.file("[Content_Types].xml")) throw new Error("Ce fichier n’est pas un document DOCX valide.");
}

export async function joindreOriginal(preuve: QualiopiPreuve, file: File) {
  await verifierDocx(file);
  const avant = await supabase.from("qualiopi_preuves").select("fichiers,updated_at,ref_key").eq("id", preuve.id).single();
  if (avant.error) throw avant.error;
  if (!EMPLOIS_DU_TEMPS.some((e) => e.key === avant.data.ref_key)) throw new Error("Fiche d’emploi du temps introuvable.");
  const fichiers = Array.isArray(avant.data.fichiers) ? avant.data.fichiers : [];
  const uploaded = await uploadPreuveFichier(file);
  // Acknowledge the actual private object before declaring it attached.
  const objet = await supabase.storage.from("qualiopi-preuves").download(uploaded.path);
  if (objet.error || objet.data?.size !== file.size) throw objet.error ?? new Error("Dépôt non confirmé.");
  const updated = await supabase.from("qualiopi_preuves").update({
    fichiers: [...fichiers, { nom: uploaded.nom, path: uploaded.path, taille: file.size, type: file.type }], emplacement: "Stockage privé — Qualiopi — originaux DOCX",
    source_libelle: "DOCX original déposé par le centre",
    remarque_interne: "Original déposé ; contenu à vérifier par le centre, sans conformité automatique.",
  }).eq("id", preuve.id).eq("updated_at", avant.data.updated_at).select("id,fichiers").maybeSingle();
  if (updated.error) throw updated.error;
  if (!updated.data) throw new Error("La fiche a changé entre-temps. Le fichier est conservé, mais son rattachement n’est pas confirmé ; rechargez avant de réessayer.");
  const apres = await supabase.from("qualiopi_preuves").select("fichiers").eq("id", preuve.id).single();
  if (apres.error) throw apres.error;
  if (!Array.isArray(apres.data.fichiers) || !apres.data.fichiers.some((f) => typeof f === "object" && f !== null && "path" in f && f.path === uploaded.path)) throw new Error("Rattachement non confirmé.");
}

export const CHAMPS_ADAPTATION = [
  ["stagiaire_reference", "Stagiaire / référence"], ["session_reference", "Session"],
  ["date_decision", "Date de décision"], ["besoin", "Besoin exprimé — sans diagnostic médical"],
  ["adaptation", "Adaptation décidée"], ["responsable", "Responsable"],
  ["date_mise_en_place", "Date de mise en place"], ["preuve_application", "Preuve d’application — référence ou constat vérifiable"],
  ["verification_efficacite", "Vérification de l’efficacité"], ["suite", "Suite / ajustements"], ["validation", "Signature / validation — nom et qualité du validateur"],
] as const;
export type AdaptationInput = Record<typeof CHAMPS_ADAPTATION[number][0], string> & { mise_en_oeuvre_confirmee: boolean };
export function adaptationVide(): AdaptationInput {
  return { stagiaire_reference: "", session_reference: "", date_decision: "", besoin: "", adaptation: "", responsable: "", date_mise_en_place: "", preuve_application: "", verification_efficacite: "", suite: "", validation: "", mise_en_oeuvre_confirmee: false };
}
export function verifierAdaptation(value: AdaptationInput, today: string) {
  if (!value.mise_en_oeuvre_confirmee) throw new Error("Confirmez que l’adaptation est réellement mise en œuvre.");
  if (CHAMPS_ADAPTATION.some(([k]) => !value[k].trim())) throw new Error("Complétez tous les champs de traçabilité.");
  if (value.date_mise_en_place < value.date_decision || value.date_decision > today || value.date_mise_en_place > today) throw new Error("Les dates doivent être cohérentes et non futures.");
}