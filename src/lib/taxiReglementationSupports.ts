import l1x from "@/assets/cours-taxi/F_Locale_1_TAXI_20261027.pptx.asset.json";
import l1p from "@/assets/cours-taxi/F_Locale_1_TAXI_20261027.pdf.asset.json";
import l2x from "@/assets/cours-taxi/F_Locale_2_TAXI_20261027.pptx.asset.json";
import l2p from "@/assets/cours-taxi/F_Locale_2_TAXI_20261027.pdf.asset.json";
import l3x from "@/assets/cours-taxi/F_Locale_3_TAXI_20261027.pptx.asset.json";
import l3p from "@/assets/cours-taxi/F_Locale_3_TAXI_20261027.pdf.asset.json";
import n1x from "@/assets/cours-taxi/F_Nationale_1_TAXI_20261027.pptx.asset.json";
import n1p from "@/assets/cours-taxi/F_Nationale_1_TAXI_20261027.pdf.asset.json";
import n2x from "@/assets/cours-taxi/F_Nationale_2_TAXI_20261027.pptx.asset.json";
import n2p from "@/assets/cours-taxi/F_Nationale_2_TAXI_20261027.pdf.asset.json";

/**
 * Supports Réglementation du module 10 (Cours et exercices TAXI) remplacés le 27/10/2026.
 * Projection d'AFFICHAGE seule, limitée au module 10 et aux IDs de cours 10014–10018 :
 * identité de page, titre, quiz, données enregistrées et autres modules (TA, VTC, 24) inchangés.
 * PDF = conversion fidèle du PowerPoint (même nombre de pages que de diapositives).
 */
export const SUPPORTS_TAXI_REGLEMENTATION: Record<number, { partie: string; diapositives: number; pdf: string; pptx: string }> = {
  10014: { partie: "Nationale Partie 1", diapositives: 33, pdf: n1p.url, pptx: n1x.url },
  10015: { partie: "Nationale Partie 2", diapositives: 21, pdf: n2p.url, pptx: n2x.url },
  10016: { partie: "Locale Partie 1", diapositives: 17, pdf: l1p.url, pptx: l1x.url },
  10017: { partie: "Locale Partie 2", diapositives: 15, pdf: l2p.url, pptx: l2x.url },
  10018: { partie: "Locale Partie 3", diapositives: 17, pdf: l3p.url, pptx: l3x.url },
};
export const MODULE_TAXI_COURS = 10;

/** Module 64 « 4. Équipements TAXI », cours 64001 : PowerPoint du 27/10/2026 (13 diapositives) + PDF fidèle.
 * L'ancien PDF (/cours/vtc/…) reste conservé (portail fournisseur et historique). */
export const MODULE_EQUIPEMENTS_TAXI = 64;
export const SUPPORT_EQUIPEMENTS_TAXI = { coursId: 64001, partie: "Équipements et documents TAXI", diapositives: 13,
  pdf: "/cours/taxi/F_Locale_Equipements_documents_TAXI.pdf?v=20261027", pptx: "/cours/taxi/F_Locale_Equipements_documents_TAXI.pptx?v=20261027" };

export function projeterSupportTaxi<C extends { id: number | string; fichiers?: { nom: string; url: string }[]; slidesKey?: string }>(moduleId: number, cours: C): C {
  const s = Number(moduleId) === MODULE_TAXI_COURS ? SUPPORTS_TAXI_REGLEMENTATION[Number(cours.id)]
    : Number(moduleId) === MODULE_EQUIPEMENTS_TAXI && Number(cours.id) === SUPPORT_EQUIPEMENTS_TAXI.coursId ? SUPPORT_EQUIPEMENTS_TAXI : undefined;
  if (!s) return cours;
  // Ancien diaporama image (slidesKey) retiré de l'affichage : il correspond à l'ancien support.
  return { ...cours, slidesKey: undefined, fichiers: [
    { nom: `PDF HD ${s.partie}`, url: s.pdf },
    { nom: `PowerPoint ${s.partie}`, url: s.pptx },
  ] };
}
