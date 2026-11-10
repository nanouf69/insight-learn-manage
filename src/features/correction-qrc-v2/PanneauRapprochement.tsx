import { useEffect, useMemo, useState } from "react";
import type { GroupeSessionCrm } from "@/features/correction-qrc-v2/noyauReel";
import { lireRapprochement, type Rapprochement } from "@/features/correction-qrc-v2/lectureRapprochement";

/** Compteur copies attendues ↔ visibles et alerte nominative en cas d'absence. Lecture seule. */
export function PanneauRapprochement({ groupes }: { groupes: GroupeSessionCrm[] }) {
  const visibles = useMemo(() => {
    const s = new Set<string>();
    for (const g of groupes) for (const e of g.examens) for (const a of e.attemptIds) s.add(a);
    return s;
  }, [groupes]);
  const [r, setR] = useState<Rapprochement | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => {
    if (!groupes.length) return;
    let annule = false;
    lireRapprochement(visibles).then((x) => { if (!annule) { setR(x); setErreur(null); } })
      .catch((e) => { if (!annule) setErreur((e as Error).message); });
    return () => { annule = true; };
  }, [visibles, groupes.length]);

  if (erreur) return <p className="text-xs font-semibold text-destructive" data-testid="rapprochement-erreur">⚠️ Rapprochement des copies impossible ({erreur}) — l'exhaustivité n'est pas prouvée.</p>;
  if (!r) return <p className="text-xs text-muted-foreground" data-testid="rapprochement-chargement">Rapprochement des copies en cours…</p>;
  const ok = r.manquantes.length === 0;
  return (
    <div className={ok ? "text-xs text-muted-foreground" : "rounded border border-destructive p-2 text-xs text-destructive"} data-testid="rapprochement">
      <p className="font-semibold">
        {ok ? "✓ " : "⚠️ "}Copies terminées avec QRC : {r.attendues} attendues · {r.visibles} visibles · {r.manquantes.length} manquante(s)
      </p>
      {!ok && (
        <ul className="mt-1 max-h-48 space-y-0.5 overflow-auto" data-testid="rapprochement-liste">
          {r.manquantes.slice(0, 200).map((m) => (
            <li key={m.cle}>
              <a className="underline" href={`/?section=crm&apprenant=${encodeURIComponent(m.apprenant_id)}`} target="_blank" rel="noreferrer">{m.nom}</a>
              {" "}— {m.exam_id} — {m.qrc} QRC{m.date ? ` — ${new Date(m.date).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}` : ""} — {m.cause}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
