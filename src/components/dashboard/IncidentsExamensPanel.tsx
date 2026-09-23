/**
 * 🚨 Incidents examens en cours — AFFICHAGE ET DIAGNOSTIC UNIQUEMENT.
 * Ce bloc ne modifie jamais une réponse, une note, une tentative ou un
 * résultat. Il complète les alertes e-mail / webhook, il ne les remplace pas.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, History, Loader2, User } from "lucide-react";
import { useIncidentsExamens, type IncidentExamen } from "@/features/surveillance-examens/useIncidentsExamens";

const heureFr = (iso: string) =>
  iso
    ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "—";

export function IncidentsExamensPanel({
  onNavigateToApprenant,
}: {
  onNavigateToApprenant?: (apprenantId: string) => void;
}) {
  const { incidents, historique, loading, marquerResolu } = useIncidentsExamens();
  const [detail, setDetail] = useState<IncidentExamen | null>(null);
  const [voirHistorique, setVoirHistorique] = useState(false);
  const [voirTout, setVoirTout] = useState(false);
  const visibles = incidents.slice(0, 3);

  const ligne = (i: IncidentExamen, resolu = false) => (
    <div
      key={i.cle}
      className={`flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between ${
        resolu ? "border-border bg-muted/40" : i.gravite === "critique" ? "border-destructive/40 bg-destructive/5" : "border-border"
      }`}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{i.apprenantNom}</span>
          <Badge variant="outline">{i.examen}</Badge>
          <Badge variant="outline">{i.matiere}</Badge>
          <span className="text-sm text-muted-foreground">{heureFr(i.heure)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
              resolu
                ? "bg-emerald-100 text-emerald-700"
                : i.gravite === "critique"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-amber-100 text-amber-800"
            }`}
          >
            {resolu ? "🟢 Résolu" : i.gravite === "critique" ? "🔴 Critique" : "🟠 À surveiller"}
          </span>
          <span className={`text-sm font-medium ${resolu ? "text-muted-foreground" : i.gravite === "critique" ? "text-destructive" : "text-amber-800"}`}>
            {i.libelle}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{i.explication}</p>
        <p className="text-xs text-muted-foreground">
          Réponses enregistrées sur nos serveurs : {i.reponsesServeur}/{i.reponsesAttendues} — {i.etat}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {i.apprenantId && onNavigateToApprenant && (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => onNavigateToApprenant(i.apprenantId!)}>
            <User className="h-3.5 w-3.5" /> Voir l'élève
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setDetail(i)}>
          Voir l'incident
        </Button>
      </div>
    </div>
  );

  return (
    <Card className={incidents.length > 0 ? "border-destructive/50" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          🚨 Incidents examens en cours
          {incidents.length > 0 && (
            <Badge variant="destructive">
              {incidents.length} incident{incidents.length > 1 ? "s" : ""}
            </Badge>
          )}
        </CardTitle>
        <Button size="sm" variant="ghost" className="gap-1" onClick={() => setVoirHistorique(true)}>
          <History className="h-4 w-4" /> Historique des incidents
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Analyse des passages en cours…
          </p>
        ) : incidents.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 🟢 Aucun incident examen en cours
          </p>
        ) : (
          incidents.map((i) => ligne(i))
        )}
      </CardContent>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Détail de l'incident
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <p><strong>Apprenant :</strong> {detail.apprenantNom}</p>
              <p><strong>Examen / matière :</strong> {detail.examen} — {detail.matiere}</p>
              <p><strong>Heure de début :</strong> {heureFr(detail.heure)}</p>
              <p><strong>Problème :</strong> {detail.libelle}</p>
              <p><strong>Ce que cela veut dire :</strong> {detail.explication}</p>
              <p><strong>Réponses confirmées côté serveur :</strong> {detail.reponsesServeur}/{detail.reponsesAttendues}</p>
              <p><strong>État :</strong> {detail.etat}</p>
              <p className="text-xs text-muted-foreground">
                Affichage de diagnostic : aucune réponse, note ou tentative n'est modifiée depuis cet écran.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await marquerResolu(detail);
                  setDetail(null);
                }}
              >
                Marquer comme résolu (affichage uniquement)
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={voirHistorique} onOpenChange={setVoirHistorique}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Historique des incidents résolus</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {historique.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun incident résolu sur les 2 derniers jours.</p>
            ) : (
              historique.map((i) => ligne(i, true))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
