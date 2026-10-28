import { useEffect, useState } from "react";
import { CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ecouterDemandeJeu } from "@/lib/demandeJeuRegistre";
import { useActivitesModule } from "@/components/cours-en-ligne/ActivitesModuleStatut";
import { COURS_EQUIPEMENTS } from "./donnees";
import { ID_QUIZ_SANCTIONS, VERSION_QUIZ_SANCTIONS, QUESTIONS_SANCTIONS } from "./donneesSanctions";
import { useQuizEquipements, SERIE_COMPLEMENT, serieComplete, type SerieEquipements, type TransportEquipements } from "./useQuizEquipements";

export const SERIE_SANCTIONS: SerieEquipements = { id: ID_QUIZ_SANCTIONS, version: VERSION_QUIZ_SANCTIONS, questions: QUESTIONS_SANCTIONS };

export function QuizEquipements({ compteId, transport, serie = SERIE_COMPLEMENT }: { compteId?: string | null; transport?: TransportEquipements; serie?: SerieEquipements }) {
  const QUESTIONS_EQUIPEMENTS = serie.questions;
  const s = useQuizEquipements(compteId, transport, serie);
  const [corriges, setCorriges] = useState<Record<string, boolean>>({});
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Badge variant="outline">{QUESTIONS_EQUIPEMENTS.length} questions</Badge>
      <p role="status" className="text-sm font-medium">{s.statut}</p>
    </div>
    {!s.charge && compteId && <Button variant="outline" onClick={() => void s.relire()}>Réessayer la lecture</Button>}
    {s.confirme && (() => {
      const exactes = QUESTIONS_EQUIPEMENTS.filter((q) => (s.valeurs[q.id] ?? "") === String(q.correct)).length;
      return <div role="region" aria-label="Résultats" data-testid="equipements-resultats" className="rounded-lg border-2 border-primary bg-background p-4 space-y-1">
        <p className="text-lg font-bold">✅ Quiz terminé — {exactes} / {QUESTIONS_EQUIPEMENTS.length} réponses exactes</p>
        <p className="text-sm text-muted-foreground">Série non notée. Le corrigé de chaque question est affiché ci-dessous ; aucune réponse ne sera réécrite.</p>
      </div>;
    })()}
    {QUESTIONS_EQUIPEMENTS.map((q, index) => {
      const rep = s.valeurs[q.id] ?? "";
      const corrige = s.confirme || !!corriges[q.id];
      return <div key={q.id} className="space-y-3 border-b pb-5" data-testid={`equipements-question-${index + 1}`}>
        <fieldset disabled={s.confirme || s.busy || !s.charge} className="space-y-4 min-w-0">
          <h3 className="text-lg font-bold leading-relaxed"><span className="text-primary mr-2">Q{index + 1}</span>{q.enonce}</h3>
          <div className="space-y-3">{q.choix.map((texte, i) => <Label key={texte} className="flex items-start gap-3 border rounded-lg p-4 cursor-pointer leading-relaxed">
            <Checkbox checked={rep === String(i)} onCheckedChange={(c) => s.modifier(q.id, c ? String(i) : "")} aria-label={texte} /><span>{texte}</span>
          </Label>)}</div>
        </fieldset>
        {!s.confirme && <Button variant="outline" size="sm" disabled={!rep} onClick={() => setCorriges((v) => ({ ...v, [q.id]: !v[q.id] }))}>{corrige ? "Masquer le corrigé" : "Voir le corrigé"}</Button>}
        {corrige && <div className="border-l-4 border-primary bg-muted p-4 space-y-2" role="region" aria-label="Corrigé">
          <p className="font-bold">{rep === String(q.correct) ? "✅ Exact" : rep === "" ? "Réponse à retenir" : "❌ Votre réponse : " + (q.choix[Number(rep)] ?? "") + " — Bonne réponse"} : {q.choix[q.correct]}</p>
          <p className="leading-relaxed">{q.justification}</p>
          <p className="text-xs text-muted-foreground">Diapositive {q.diapositive} du cours.</p>
        </div>}
      </div>;
    })}
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button variant="outline" disabled={!compteId || !s.charge || s.busy || s.confirme} onClick={() => void s.enregistrer(false)}><Save className="h-4 w-4 mr-2" />Enregistrer mes réponses</Button>
      <Button disabled={!serieComplete(serie, s.valeurs) || !compteId || !s.charge || s.busy || s.confirme} onClick={() => void s.enregistrer(true)}><CheckCircle2 className="h-4 w-4 mr-2" />Terminer le quiz</Button>
    </div>
  </div>;
}

/** Module 64 : questions complémentaires (support remplacé directement dans la page de cours). */
function SectionSerie({ compteId, transport, serie, titre, intro, inline = false }: { compteId?: string | null; transport?: TransportEquipements; serie: SerieEquipements; titre: string; intro: string; inline?: boolean }) {
  const ID_QUIZ_EQUIPEMENTS = serie.id;
  const [ouvert, setOuvert] = useState(false);
  const etat = useActivitesModule();
  useEffect(() => ecouterDemandeJeu((id) => { if (id === ID_QUIZ_EQUIPEMENTS) setOuvert(true); }), []);
  const ok = etat?.etat === "ok" ? etat : null;
  const requis = !!ok?.requises.some((a) => a.id === ID_QUIZ_EQUIPEMENTS);
  const termine = !!ok && [...ok.requises, ...ok.facultatives].some((a) => a.id === ID_QUIZ_EQUIPEMENTS && a.termine);
  const statut = !ok ? "Statut à vérifier" : termine ? "Terminé" : requis ? "À faire" : "Facultatif";
  const nb = serie.questions.length;
  return <section className="space-y-4 rounded-xl border-2 border-primary/40 bg-primary/5 p-4 sm:p-5" data-testid={`equipements-taxi-section-${serie.id}`} aria-labelledby={`titre-${serie.id}`}>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <h3 id={`titre-${serie.id}`} className="text-xl font-bold">🚕 {titre}</h3>
      <Badge variant={termine ? "default" : requis ? "destructive" : "outline"} data-testid="equipements-taxi-statut">{statut}</Badge>
    </div>
    <p className="text-sm">{etat?.etat === "indisponible" ? "Statut momentanément indisponible. Rien n'est perdu : réessayez dans un instant."
      : ok && !requis ? `Votre module est déjà validé : ces ${nb} questions sont accessibles en révision, sans effet sur votre progression.`
      : ok ? `${nb} ${intro}`
      : "Chargement du statut…"}</p>
    {inline ? <div className="rounded-lg border bg-background p-4" data-testid="equipements-taxi-inline"><QuizEquipements key={compteId ?? "apercu"} compteId={compteId} transport={transport} serie={serie} /></div> : <>
    <Button onClick={() => setOuvert(true)} data-testid="equipements-taxi-ouvrir">{termine ? "Revoir les questions" : "Commencer / reprendre"}</Button>
    <Dialog open={ouvert} onOpenChange={setOuvert}><DialogContent className="max-w-3xl w-[96vw] max-h-[94dvh] overflow-y-auto p-4 sm:p-6">
      <DialogHeader><DialogTitle>{titre}</DialogTitle><DialogDescription>{nb} questions · réalisation non notée, corrigé après chaque réponse.</DialogDescription></DialogHeader>
      {ouvert && <QuizEquipements key={compteId ?? "apercu"} compteId={compteId} transport={transport} serie={serie} />}
    </DialogContent></Dialog></>}
  </section>;
}

/** Module 64 : séries complémentaires (support remplacé directement dans la page de cours). */
export default function CoursQuizEquipementsTaxi({ compteId, transport }: { compteId?: string | null; transport?: TransportEquipements }) {
  return <div className="space-y-4">
    <SectionSerie compteId={compteId} transport={transport} serie={SERIE_COMPLEMENT} titre={`Questions complémentaires — ${COURS_EQUIPEMENTS.titre}`} intro="nouvelles questions sur le nouveau support, à faire en plus du quiz de 10 questions pour terminer le module." />
    <SectionSerie compteId={compteId} transport={transport} serie={SERIE_SANCTIONS} titre="À quoi ça sert, où ça se place, quelle sanction ?" intro="questions sur l'usage, l'emplacement et les sanctions de chaque équipement, à faire pour terminer le module." inline />
  </div>;
}
