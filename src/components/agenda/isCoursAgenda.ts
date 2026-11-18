interface BlocAgenda {
  discipline_id?: string | null;
  discipline_nom?: string | null;
  formation?: string | null;
}

// Only individual CMA appointments belong outside the course agenda.
// Course names can legitimately contain « examen » (bilans, corrections…).
export function isCoursAgenda(bloc: BlocAgenda): boolean {
  if (bloc.discipline_id === "exam-pratique") return false;
  const formation = (bloc.formation ?? "").trim();
  return !/^examen\s+(?:pratique|théorique|theorique)(?:\s|$)/i.test(formation);
}