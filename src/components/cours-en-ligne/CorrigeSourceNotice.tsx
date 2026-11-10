import { statutPedagogique, type CorrigeSource } from "@/lib/corrigesSources";
import { CORRIGES_TROIS_SURFACES_ACTIFS } from "@/lib/corrigesSourcesActivation";

export function CorrigeSourceNotice({source, answer}: {source: CorrigeSource | null; answer?: unknown}) {
  if (!CORRIGES_TROIS_SURFACES_ACTIFS) return null;
  if (!source) return <p className="text-sm text-muted-foreground">Corrigé officiel actuel non rapproché de cette copie.</p>;
  const q = source.actuelle;
  if (!q) return <p className="text-sm text-destructive">Corrigé actuel non rapproché : identité ou contenu de question à vérifier.</p>;
  const date = source.publiee_le ? new Date(source.publiee_le).toLocaleString("fr-FR", {timeZone: "Europe/Paris"}) : "date non prouvée";
  return <div data-testid="corrige-officiel-actuel" className="mt-2 rounded-md border-2 border-primary bg-primary/5 p-3 text-sm space-y-1 break-words">
    <p className="font-semibold">Corrigé officiel actuel — version {source.version} publiée le {date}</p>
    {q.type === "QCM" ? <p>{(q.choix ?? []).filter(c => c.correct).map(c => `${c.lettre}. ${c.texte}`).join(" · ")}</p> : <p className="whitespace-pre-wrap">{q.reponseQRC || (q.reponses_possibles ?? []).join(" / ") || "Réponse attendue non disponible"}</p>}
    {q.type === "QCM" && answer !== undefined && <p>Réponse pédagogique actuelle : <strong>{statutPedagogique(source, answer)}</strong> — toutes les bonnes cases, aucune autre.</p>}
    <p className="text-xs text-muted-foreground">La note d’examen conserve le corrigé figé lors du passage. Les réponses enregistrées restent inchangées.</p>
  </div>;
}