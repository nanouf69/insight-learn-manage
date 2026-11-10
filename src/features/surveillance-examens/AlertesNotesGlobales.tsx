import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAlertesNotesGlobales } from "./useAlertesNotesGlobales";

export function AlertesNotesGlobales({ modeSepare = false }: { modeSepare?: boolean } = {}) {
  const { alertes, erreur, verification } = useAlertesNotesGlobales();
  const carte = (a: (typeof alertes)[number]) => (
        <div key={a.cle} data-testid="alerte-note-globale" className="space-y-2 border-t border-destructive/20 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <a href={`/?section=crm&apprenant=${encodeURIComponent(a.apprenantId)}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2">{a.nom}</a>
            <Badge variant="outline">{a.filiere}</Badge><Badge variant="outline">{a.examen} · tentative {a.tentative}</Badge>
            <time className="text-xs text-muted-foreground" dateTime={a.heure}>{new Date(a.heure).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</time>
          </div>
          <p className="font-medium text-destructive">7 matières terminées et QRC validées — note globale non disponible</p>
          <p className="text-sm">{a.cause || "Cause non déterminée"}</p>
          <ul className="grid gap-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
            {a.matieres.map(m => <li key={m.id}>{m.nom} : terminée · QRC validées · {m.publication === "publiee" ? "note publiée" : "note non publiée"}</li>)}
          </ul>
        </div>
  );
  if (!modeSepare && !alertes.length && !erreur && !verification) return null;
  return (
    <section aria-label="Alertes notes globales examens blancs" aria-live="polite" className="w-full space-y-3 border-y border-destructive/40 bg-destructive/5 px-3 py-3">
      <h2 className="flex items-center gap-2 font-semibold text-destructive"><AlertTriangle className="h-5 w-5 shrink-0" /> Notes globales non remontées — examens blancs</h2>
      {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
      {verification && <p className="text-sm text-muted-foreground">Publication en cours de vérification…</p>}
      {modeSepare ? (
        <div className="grid gap-4 md:grid-cols-2">
          {(["presentiel", "elearning"] as const).map(m => {
            const liste = alertes.filter(a => (a.mode ?? "presentiel") === m);
            return (
              <div key={m} className="min-w-0 space-y-2 rounded border p-2" data-testid={`notes-non-remontees-${m}`}>
                <h3 className="font-semibold">{m === "presentiel" ? "Formations présentielles" : "Formations e-learning"} ({liste.length})</h3>
                {liste.length === 0 ? <p className="text-sm text-muted-foreground">Aucun élève concerné.</p> : liste.map(carte)}
              </div>
            );
          })}
        </div>
      ) : alertes.map(carte)}
    </section>
  );
}