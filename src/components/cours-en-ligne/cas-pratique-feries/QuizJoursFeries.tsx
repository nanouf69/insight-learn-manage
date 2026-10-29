import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuizEquipements } from "../equipements-taxi-locale/CoursQuizEquipementsTaxi";
import { useQuizEquipements } from "../equipements-taxi-locale/useQuizEquipements";
import { SERIE_FERIES_CAS_PRATIQUE } from "./donnees";

/** Supplementary quiz: independent answers, no module-completion callback or milestone obligation. */
export default function QuizJoursFeries({ compteId }: { compteId?: string | null }) {
  const [ouvert, setOuvert] = useState(false);
  const suivi = useQuizEquipements(compteId, undefined, SERIE_FERIES_CAS_PRATIQUE);
  const nonFait = suivi.charge && !suivi.confirme;
  return <section className={`border-2 rounded-lg p-4 space-y-3 ${nonFait ? "border-destructive bg-destructive/5" : "border-border"}`} aria-label="Quiz jours fériés 2026">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <h3 className="text-xl font-bold">Quiz — Les 11 jours fériés de 2026</h3>
      <Badge variant={suivi.confirme ? "default" : nonFait ? "destructive" : "outline"}>{!suivi.charge ? "Statut à vérifier" : suivi.confirme ? "Terminé" : "Non réalisé — facultatif"}</Badge>
    </div>
    <p className="text-sm text-muted-foreground">Quiz complémentaire — sans effet sur vos jalons et validations déjà acquis.</p>
    <Button variant="outline" onClick={() => { if (ouvert) void suivi.relire(); setOuvert(v => !v); }}>{ouvert ? "Masquer le quiz" : suivi.confirme ? "Revoir le quiz des jours fériés" : "Commencer le quiz des jours fériés"}</Button>
    {ouvert && <QuizEquipements compteId={compteId} serie={SERIE_FERIES_CAS_PRATIQUE} />}
  </section>;
}