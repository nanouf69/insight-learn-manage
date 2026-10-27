import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ecouterDemandeJeu } from "@/lib/demandeJeuRegistre";
import { useActivitesModule } from "@/components/cours-en-ligne/ActivitesModuleStatut";
import { COURS_EQUIPEMENTS, ID_QUIZ_EQUIPEMENTS, QUESTIONS_EQUIPEMENTS, quizEquipementsComplet } from "./donnees";
import { useQuizEquipements, type TransportEquipements } from "./useQuizEquipements";

export function QuizEquipements({ compteId, transport }: { compteId?: string | null; transport?: TransportEquipements }) {
  const s = useQuizEquipements(compteId, transport);
  const [index, setIndex] = useState(0);
  const [corrige, setCorrige] = useState(false);
  const q = QUESTIONS_EQUIPEMENTS[index];
  const rep = s.valeurs[q.id] ?? "";
  const aller = (n: number) => { setIndex(n); setCorrige(false); };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Badge variant="outline">Question {index + 1} / {QUESTIONS_EQUIPEMENTS.length}</Badge>
      <p role="status" className="text-sm font-medium">{s.statut}</p>
    </div>
    {!s.charge && compteId && <Button variant="outline" onClick={() => void s.relire()}>Réessayer la lecture</Button>}
    {s.confirme && <p className="text-sm text-muted-foreground">Réalisation confirmée conservée : consultation du corrigé, aucune réponse ne sera réécrite.</p>}
    <fieldset disabled={s.confirme || s.busy || !s.charge} className="space-y-4 min-w-0">
      <h3 className="text-lg font-bold leading-relaxed">{q.enonce}</h3>
      <div className="space-y-3">{q.choix.map((texte, i) => <Label key={texte} className="flex items-start gap-3 border rounded-lg p-4 cursor-pointer leading-relaxed">
        <Checkbox checked={rep === String(i)} onCheckedChange={(c) => s.modifier(q.id, c ? String(i) : "")} aria-label={texte} /><span>{texte}</span>
      </Label>)}</div>
    </fieldset>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={!rep} onClick={() => setCorrige((v) => !v)}>{corrige ? "Masquer le corrigé" : "Voir le corrigé"}</Button>
      <Button variant="outline" disabled={!compteId || !s.charge || s.busy || s.confirme} onClick={() => void s.enregistrer(false)}><Save className="h-4 w-4 mr-2" />Enregistrer mes réponses</Button>
    </div>
    {corrige && <div className="border-l-4 border-primary bg-muted p-4 space-y-2" role="region" aria-label="Corrigé">
      <p className="font-bold">{rep === String(q.correct) ? "✅ Exact" : "Réponse à retenir"} : {q.choix[q.correct]}</p>
      <p className="leading-relaxed">{q.justification}</p>
      <p className="text-xs text-muted-foreground">Diapositive {q.diapositive} du cours.</p>
    </div>}
    <div className="flex items-center justify-between gap-2 border-t pt-4">
      <Button variant="outline" disabled={index === 0} onClick={() => aller(index - 1)}><ChevronLeft className="h-4 w-4 mr-1" />Précédent</Button>
      {index < QUESTIONS_EQUIPEMENTS.length - 1
        ? <Button onClick={() => aller(index + 1)}>Suivant<ChevronRight className="h-4 w-4 ml-1" /></Button>
        : <Button disabled={!quizEquipementsComplet(s.valeurs) || !compteId || !s.charge || s.busy || s.confirme} onClick={() => void s.enregistrer(true)}><CheckCircle2 className="h-4 w-4 mr-2" />Terminer le quiz</Button>}
    </div>
  </div>;
}

/** Module 64 : questions complémentaires (support remplacé directement dans la page de cours). */
export default function CoursQuizEquipementsTaxi({ compteId, transport }: { compteId?: string | null; transport?: TransportEquipements }) {
  const [ouvert, setOuvert] = useState(false);
  const etat = useActivitesModule();
  useEffect(() => ecouterDemandeJeu((id) => { if (id === ID_QUIZ_EQUIPEMENTS) setOuvert(true); }), []);
  const ok = etat?.etat === "ok" ? etat : null;
  const requis = !!ok?.requises.some((a) => a.id === ID_QUIZ_EQUIPEMENTS);
  const termine = !!ok && [...ok.requises, ...ok.facultatives].some((a) => a.id === ID_QUIZ_EQUIPEMENTS && a.termine);
  const statut = !ok ? "Statut à vérifier" : termine ? "Terminé" : requis ? "À faire" : "Facultatif";
  const nb = QUESTIONS_EQUIPEMENTS.length;
  return <section className="space-y-4 rounded-xl border-2 border-primary/40 bg-primary/5 p-4 sm:p-5" data-testid="equipements-taxi-section" aria-labelledby="equipements-taxi-titre">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <h3 id="equipements-taxi-titre" className="text-xl font-bold">🚕 Questions complémentaires — {COURS_EQUIPEMENTS.titre}</h3>
      <Badge variant={termine ? "default" : requis ? "destructive" : "outline"} data-testid="equipements-taxi-statut">{statut}</Badge>
    </div>
    <p className="text-sm">{etat?.etat === "indisponible" ? "Statut momentanément indisponible. Rien n'est perdu : réessayez dans un instant."
      : ok && !requis ? `Votre module est déjà validé : ces ${nb} questions sont accessibles en révision, sans effet sur votre progression.`
      : ok ? `${nb} nouvelles questions sur le nouveau support, à faire en plus du quiz de 10 questions pour terminer le module.`
      : "Chargement du statut…"}</p>
    <Button onClick={() => setOuvert(true)} data-testid="equipements-taxi-ouvrir">{termine ? "Revoir les questions" : "Commencer / reprendre"}</Button>
    <Dialog open={ouvert} onOpenChange={setOuvert}><DialogContent className="max-w-3xl w-[96vw] max-h-[94dvh] overflow-y-auto p-4 sm:p-6">
      <DialogHeader><DialogTitle>Questions complémentaires — Équipements et documents TAXI</DialogTitle><DialogDescription>{nb} questions · réalisation non notée, corrigé après chaque réponse.</DialogDescription></DialogHeader>
      {ouvert && <QuizEquipements key={compteId ?? "apercu"} compteId={compteId} transport={transport} />}
    </DialogContent></Dialog>
  </section>;
}
