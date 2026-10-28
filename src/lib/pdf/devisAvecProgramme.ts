import type jsPDF from "jspdf";
import { PDFDocument } from "pdf-lib";
import { supabase } from "@/integrations/supabase/client";
import { formationProgramme, sessionsPourFormation, type SessionPublique } from "@/lib/programmeCalendrierDevis";
import { buildProgrammeCalendrierPDF } from "@/lib/pdf/programme-calendrier-devis";

/**
 * Ajoute le programme et le calendrier à la suite du devis (même PDF).
 * Le devis lui-même n'est jamais modifié ; en cas d'échec, le devis seul est rendu
 * et `programmeInclus` vaut false (jamais silencieux).
 */
export async function devisAvecProgramme(
  devis: jsPDF,
  formation: { id: string; label: string; designation: string; agrement: string },
  dateDebut: string | null,
  dateFin: string | null = null,
): Promise<{ blob: Blob; programmeInclus: boolean; pages?: number }> {
  const devisBlob = devis.output("blob");
  try {
    const programme = formationProgramme(formation.id);
    if (!programme) return { blob: devisBlob, programmeInclus: false };
    const { data, error } = await (supabase as any).rpc("sessions_publiques_devis");
    const sessions: SessionPublique[] = !error && Array.isArray(data) ? data : [];
    const candidates = sessionsPourFormation(sessions, programme);
    let session = (dateDebut && candidates.find((s) => s.date_debut === dateDebut)) || null;
    // Session choisie dans le catalogue publié (ftransport.fr) mais absente de la base :
    // agenda jour par jour calculé sur ses dates exactes (aucun jour inventé, fériés signalés).
    if (!session && dateDebut && dateFin && programme.mode === "presentiel" && dateFin >= dateDebut) {
      session = {
        id: `catalogue-${dateDebut}`, nom: `${formation.label}`, type_session: programme.soir ? "soir" : null,
        date_debut: dateDebut, date_fin: dateFin, heure_debut: null, heure_fin: null, heures_total: null,
        lieu: null, types_apprenant: [programme.filiere.toUpperCase()], jours: [],
      };
    }
    const { doc } = buildProgrammeCalendrierPDF({ formation, programme, session, sessions, erreurLecture: !!error });
    const fusion = await PDFDocument.create();
    for (const src of [devis.output("arraybuffer"), doc.output("arraybuffer")]) {
      const pdf = await PDFDocument.load(src);
      (await fusion.copyPages(pdf, pdf.getPageIndices())).forEach((p) => fusion.addPage(p));
    }
    const bytes = await fusion.save();
    return { blob: new Blob([bytes as BlobPart], { type: "application/pdf" }), programmeInclus: true, pages: fusion.getPageCount() };
  } catch (e) {
    console.error("[devisAvecProgramme]", e);
    return { blob: devisBlob, programmeInclus: false };
  }
}
