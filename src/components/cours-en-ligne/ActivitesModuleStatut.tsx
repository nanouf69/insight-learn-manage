import { createContext, useContext } from "react";
import { CheckCircle2, CircleDashed, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { libelleJeux, type EtatActivitesModuleEleve } from "@/lib/activitesModuleEleve";

/** État élève des jeux du module courant (source partagée accueil/module/bilan). null = chargement / aperçu. */
export const ActivitesModuleContext = createContext<EtatActivitesModuleEleve | null>(null);
export const useActivitesModule = () => useContext(ActivitesModuleContext);

/** Bandeau très visible en haut du module : statuts serveur et accès directs aux jeux. */
export function ActivitesModuleBandeau({ onOuvrir }: { onOuvrir: (activiteId: string) => void }) {
  const e = useActivitesModule();
  if (!e || e.etat === "aucune") return null;
  if (e.etat === "indisponible") {
    return (
      <div className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4 text-sm" role="status" data-testid="jeux-bandeau-indisponible">
        <AlertTriangle className="inline w-4 h-4 mr-1 text-destructive" /> Statut des jeux momentanément indisponible. Rien n'est perdu : réessayez dans un instant.
      </div>
    );
  }
  const reste = e.restantes.length > 0;
  const ligne = (a: { id: string; titre: string; termine: boolean }, facultatif: boolean) => (
    <li key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2">
      <span className="flex items-center gap-2 font-medium min-w-0">
        {a.termine ? <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" /> : <CircleDashed className="w-4 h-4 shrink-0 text-destructive" />}
        <span className="break-words">{a.titre}</span>
      </span>
      <span className="flex items-center gap-2 shrink-0">
        <Badge variant={a.termine ? "default" : facultatif ? "outline" : "destructive"}>
          {a.termine ? "Terminé (confirmé)" : facultatif ? "Facultatif" : "À faire"}
        </Badge>
        <Button type="button" size="sm" variant={a.termine || facultatif ? "outline" : "default"} onClick={() => onOuvrir(a.id)}>
          {a.termine ? "Rejouer" : "Jouer"}
        </Button>
      </span>
    </li>
  );
  return (
    <section className={`rounded-xl border-2 p-4 space-y-2 ${reste ? "border-destructive/50 bg-destructive/5" : "border-primary/30 bg-primary/5"}`} data-testid="jeux-bandeau" aria-label="Jeux du module">
      <p className="font-bold text-base">🗺️ {libelleJeux(e)}</p>
      {reste && <p className="text-sm">Le module sera terminé quand ces jeux seront confirmés par le serveur.</p>}
      {e.requises.length > 0 && <ul className="space-y-2">{e.requises.map((a) => ligne(a, false))}</ul>}
      {e.facultatives.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">Jeux facultatifs ajoutés après la validation de ce module : ils ne changent ni votre statut ni votre progression.</p>
          <ul className="space-y-2">{e.facultatives.map((a) => ligne(a, true))}</ul>
        </>
      )}
    </section>
  );
}

/** Libellé du bouton de fin : « Quiz terminé » quand des jeux requis restent. */
export function libelleFinQuiz(e: EtatActivitesModuleEleve | null): { bouton: string; toast: string } {
  if (e?.etat === "ok" && e.restantes.length > 0) {
    const n = e.restantes.length;
    return { bouton: `Quiz terminé — ${n} jeu${n > 1 ? "x" : ""} restant${n > 1 ? "s" : ""}`, toast: `✅ Quiz terminé. Il reste ${n} jeu${n > 1 ? "x" : ""} à faire : ${e.restantes.map((a) => a.titre).join(" · ")}` };
  }
  return { bouton: "Terminé", toast: "🎉 Module terminé !" };
}
