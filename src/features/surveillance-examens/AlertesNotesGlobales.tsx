import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAlertesNotesGlobales } from "./useAlertesNotesGlobales";

export function AlertesNotesGlobales() {
  const { alertes, erreur, verification } = useAlertesNotesGlobales();
  if (!alertes.length && !erreur && !verification) return null;
  return (
    <section aria-label="Alertes notes globales examens blancs" aria-live="polite" className="w-full space-y-3 border-y border-destructive/40 bg-destructive/5 px-3 py-3">
      <h2 className="flex items-center gap-2 font-semibold text-destructive"><AlertTriangle className="h-5 w-5 shrink-0" /> Notes globales — examens blancs présentiel</h2>
      {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
      {verification && <p className="text-sm text-muted-foreground">Publication en cours de vérification…</p>}
      {alertes.map(a => (
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
      ))}
    </section>
  );
}