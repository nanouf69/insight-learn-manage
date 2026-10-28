import { SectionSerie } from "./CoursQuizEquipementsTaxi";
import type { SerieEquipements } from "./useQuizEquipements";
import { ID_QUIZ_METROPOLE, VERSION_QUIZ_METROPOLE, QUESTIONS_METROPOLE, ID_QUIZ_ZUPC, VERSION_QUIZ_ZUPC, QUESTIONS_ZUPC } from "./donneesCommunes";

export const SERIE_METROPOLE: SerieEquipements = { id: ID_QUIZ_METROPOLE, version: VERSION_QUIZ_METROPOLE, questions: QUESTIONS_METROPOLE, notee: true };
export const SERIE_ZUPC: SerieEquipements = { id: ID_QUIZ_ZUPC, version: VERSION_QUIZ_ZUPC, questions: QUESTIONS_ZUPC, notee: true };

/** Module 7 : deux quiz additifs sur les communes (quiz existants 7020/7021 inchangés). */
export default function CoursQuizCommunes({ compteId, exerciceId }: { compteId?: string | null; exerciceId?: 7020 | 7021 }) {
  return <div className="space-y-4">
    {exerciceId !== 7021 && <SectionSerie compteId={compteId} serie={SERIE_METROPOLE} titre="🏙️ Les 58 communes de la Métropole de Lyon" intro="questions, une par commune de la Métropole, à faire pour terminer le module." />}
    {exerciceId !== 7020 && <SectionSerie compteId={compteId} serie={SERIE_ZUPC} titre="✈️ Les communes de la ZUPC (23 communes + aéroport)" intro="questions, une par commune de la ZUPC, à faire pour terminer le module." />}
  </div>;
}
