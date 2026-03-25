/**
 * Mapping of PDF filenames used in fiches de révision (modules 70-73)
 * to pre-rendered image slides stored in Supabase Storage.
 */

const STORAGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/cours-fichiers/fiches-revision`;

function slides(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    `${STORAGE_BASE}/${prefix}_slide_${String(i + 1).padStart(2, "0")}.jpg`
  );
}

export const FICHE_IMAGE_SLIDES: Record<string, string[]> = {
  "Fiches_Revision_Matiere_Commune.pdf": slides("Fiches_Revision_Matiere_Commune", 16),
  "Fiche_Synthese_Specialites_VTC.pdf": slides("Fiche_Synthese_Specialites_VTC", 6),
  "Fiche_de_Révision_Taxi.pdf": slides("Fiche_de_Revision_Taxi", 12),
  "Fiche_Revision_Specialites_TAXI.pdf": slides("Fiche_Revision_Specialites_TAXI", 10),
};
