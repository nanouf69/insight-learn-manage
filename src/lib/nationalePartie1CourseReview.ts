import pptx from '@/assets/cours-taxi/Nationale_1SUR2_cours_enrichi_20261026.pptx.asset.json';
import pdf from '@/assets/cours-taxi/Nationale_1SUR2_cours_enrichi_20261026.pdf.asset.json';

/** Review media only: never enter moduleData, canonical hydration or page counters. */
export function nationalePartie1CourseReview(moduleId: number, courseId: number, studentOnly: boolean) {
  if (studentOnly || moduleId !== 10 || courseId !== 10014) return null;
  return { pptxUrl: pptx.url, pdfUrl: pdf.url, originalSlides: 16, additionalSlides: 14 };
}