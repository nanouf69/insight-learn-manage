import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const AUDIT_QUALIOPI_ISO = "2026-11-10";
const DEBUT_ISO = "2026-11-03";

/** Date calendaire à Paris (YYYY-MM-DD). */
export function dateParis(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Jours restants avant l'audit (0 = aujourd'hui), ou null hors période 03/11 → 10/11 inclus (Paris). */
export function joursAvantAuditQualiopi(now: Date): number | null {
  const j = dateParis(now);
  if (j < DEBUT_ISO || j > AUDIT_QUALIOPI_ISO) return null;
  return Math.round((Date.parse(`${AUDIT_QUALIOPI_ISO}T00:00:00Z`) - Date.parse(`${j}T00:00:00Z`)) / 86400000);
}

export const libelleCompteRebours = (n: number) => (n === 0 ? "Aujourd'hui" : n === 1 ? "Dans 1 jour" : `Dans ${n} jours`);

// Une fois par ouverture de l'application (rechargement = nouvelle ouverture), pas à chaque navigation.
let fenetreFermee = false;

export function RappelAuditQualiopi() {
  const [jours, setJours] = useState(() => joursAvantAuditQualiopi(new Date()));
  const [ouvert, setOuvert] = useState(() => !fenetreFermee && jours != null);

  useEffect(() => {
    const maj = () => {
      const n = joursAvantAuditQualiopi(new Date());
      setJours(n);
      if (n != null && !fenetreFermee) setOuvert(true);
      if (n == null) setOuvert(false);
    };
    const id = window.setInterval(maj, 60_000);
    document.addEventListener("visibilitychange", maj);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", maj); };
  }, []);

  if (jours == null) return null;
  const fermer = () => { fenetreFermee = true; setOuvert(false); };
  return (
    <>
      <div role="alert" className="mx-3 sm:mx-6 mt-3 rounded-lg border-2 border-destructive bg-destructive/10 px-4 py-3 flex items-center gap-3">
        <CalendarClock className="w-8 h-8 shrink-0 text-destructive" aria-hidden />
        <div className="min-w-0">
          <p className="text-lg sm:text-2xl font-extrabold text-destructive leading-tight">AUDIT QUALIOPI — 10 NOVEMBRE 2026</p>
          <p className="text-sm sm:text-base font-semibold text-foreground">Pensez à préparer votre audit Qualiopi · {libelleCompteRebours(jours)}</p>
        </div>
      </div>
      <Dialog open={ouvert} onOpenChange={(o) => { if (!o) fermer(); }}>
        <DialogContent className="border-2 border-destructive">
          <DialogHeader>
            <DialogTitle className="text-2xl sm:text-3xl font-extrabold text-destructive">AUDIT QUALIOPI — 10 NOVEMBRE 2026</DialogTitle>
            <DialogDescription className="text-lg font-semibold text-foreground">
              Pensez à préparer votre audit Qualiopi
            </DialogDescription>
          </DialogHeader>
          <p className="text-3xl font-black text-center text-destructive">{libelleCompteRebours(jours)}</p>
          <DialogFooter>
            <Button size="lg" variant="destructive" className="w-full" onClick={fermer}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
