import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { heuresSessionAffichees } from "@/lib/sessionHeures";
import { isPratiqueType } from "@/lib/sessionTypes";

/** Heures représentées par une signature valide (horaires standards du centre). */
const HEURES_CRENEAU: Record<string, number> = { matin: 3, apres_midi: 3, soir_1: 1.5, soir_2: 2.5 };
const d10 = (v: unknown) => String(v ?? "").slice(0, 10);
const signatureValide = (e: any) =>
  e.masque !== true && e.absent !== true && /^data:image\/(png|jpe?g);base64,/i.test(String(e.signature_data_url ?? ""));

export interface TauxHeures { faites: number; prevues: number }

/** Lecture seule : heures signées dans les dates de chaque session / total d'heures de la session. */
export function calculerTauxPresenceHeures(emargements: any[], inscriptions: any[]) {
  const res = { session: { faites: 0, prevues: 0 }, pratique: { faites: 0, prevues: 0 } };
  const vus = new Set<string>();
  for (const row of inscriptions) {
    const s = row.sessions;
    if (!s || row.liste_attente === true || /annul/i.test(String(s.statut ?? ""))) continue;
    const pratique = isPratiqueType(s.type_session);
    if (!pratique && !/theorique/i.test(s.type_session ?? "")) continue;
    const cible = pratique ? res.pratique : res.session;
    cible.prevues += heuresSessionAffichees(s) ?? 0;
    const debut = d10(s.date_debut), fin = d10(s.date_fin || s.date_debut);
    for (const e of emargements) {
      const date = d10(e.date_emargement);
      const creneau = String(e.demi_journee ?? "").trim().toLowerCase();
      const cle = `${date}|${creneau}`;
      if (!signatureValide(e) || date < debut || date > fin || vus.has(cle)) continue;
      const h = HEURES_CRENEAU[creneau];
      if (!h) continue;
      vus.add(cle);
      cible.faites += h;
    }
  }
  return res;
}

export function TauxPresenceSessionsCard({ apprenantId }: { apprenantId: string }) {
  const [data, setData] = useState<ReturnType<typeof calculerTauxPresenceHeures> | null>(null);
  const [erreur, setErreur] = useState(false);
  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const [em, ins] = await Promise.all([
          fetchAllRows<any>((f, t) => supabase.from("emargements_fc").select("id,date_emargement,demi_journee,signature_data_url,absent,masque").eq("apprenant_id", apprenantId).order("id").range(f, t)),
          fetchAllRows<any>((f, t) => supabase.from("session_apprenants").select("id,liste_attente,sessions:session_id(type_session,statut,date_debut,date_fin,heure_debut,nom,types_apprenant,heures_total)").eq("apprenant_id", apprenantId).order("id").range(f, t)),
        ]);
        if (!annule) setData(calculerTauxPresenceHeures(em, ins));
      } catch {
        if (!annule) setErreur(true);
      }
    })();
    return () => { annule = true; };
  }, [apprenantId]);

  const fmt = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h`;
  const tuiles: [string, TauxHeures | undefined][] = [
    ["Taux présence session", data?.session],
    ["Taux présence pratique", data?.pratique],
  ];
  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {tuiles.map(([label, t]) => {
        const pct = t && t.prevues > 0 ? (t.faites / t.prevues) * 100 : null;
        return (
          <div key={label} className="rounded-md px-3 py-2 bg-muted/50" data-indicateur={label}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
              <span className="text-lg font-bold text-foreground">{pct == null ? "—" : `${Math.round(pct)}%`}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-border overflow-hidden">
              <div className="h-full rounded-full bg-foreground/60" style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {erreur ? "Indisponible (lecture impossible)" : !t ? "Chargement…" : t.prevues > 0 ? `${fmt(t.faites)} signées / ${fmt(t.prevues)} de session` : "Aucune session inscrite"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
