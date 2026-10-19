import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all-rows";
import { heuresSessionPourApprenant } from "@/lib/sessionHeures";
import { isPratiqueType } from "@/lib/sessionTypes";
import { daySlotsDepuisConfigs, resolvePratiqueSlotParts, normalizePratiqueType, normalizePratiqueCreneau } from "@/lib/pratiqueSlots";
import { planningCreneaux, marquerFiliereRows } from "@/lib/signaturesManquantes";

/** Heures représentées par une signature valide (horaires standards du centre). */
const HEURES_CRENEAU: Record<string, number> = { matin: 3, apres_midi: 3, soir_1: 1.5, soir_2: 2.5 };
const d10 = (v: unknown) => String(v ?? "").slice(0, 10);
const signatureValide = (e: any) =>
  e.masque !== true && e.absent !== true && /^data:image\/(png|jpe?g);base64,/i.test(String(e.signature_data_url ?? ""));

export interface TauxHeures { faites: number; prevues: number; derniere?: string }

/** Lecture seule : heures signées dans les dates de chaque session / total d'heures de la session. */
export function calculerTauxPresenceHeures(emargements: any[], inscriptions: any[], filiere?: string | null, reservations: any[] = [], configs: any[] = []) {
  const res: { session: TauxHeures; pratique: TauxHeures } = { session: { faites: 0, prevues: 0 }, pratique: { faites: 0, prevues: 0 } };
  if (String(filiere ?? "").toLowerCase() === "ta") inscriptions = marquerFiliereRows(inscriptions, "TA");
  const vus = new Set<string>();
  const { parDate } = planningCreneaux(inscriptions, reservations, configs);
  const daySlots = daySlotsDepuisConfigs([...parDate.keys()], configs);
  for (const row of inscriptions) {
    const s = row.sessions;
    if (!s || row.liste_attente === true || row.emargements_exclus === true || /annul/i.test(String(s.statut ?? ""))) continue;
    const pratique = isPratiqueType(s.type_session);
    if (!pratique && !/theorique/i.test(s.type_session ?? "")) continue;
    const cible = pratique ? res.pratique : res.session;
    cible.prevues += heuresSessionPourApprenant(s, filiere) ?? 0;
    const debut = [d10(s.date_debut), d10(row.date_debut)].filter(Boolean).sort().at(-1) ?? "";
    const fin = [d10(s.date_fin || s.date_debut), d10(row.date_fin_personnalisee || row.date_fin)].filter(Boolean).sort()[0] ?? "";
    // Seules les paires date + créneau réellement prévues par les horaires de la
    // session comptent : une signature sur un créneau non prévu est conservée
    // ailleurs (anomalie) mais jamais comptée ici.
    const sessionPlanning = planningCreneaux([row], reservations, configs).parDate;
    for (const e of emargements) {
      const date = d10(e.date_emargement);
      const creneau = String(e.demi_journee ?? "").trim().toLowerCase();
      const cle = `${date}|${creneau}`;
      if (!signatureValide(e) || date < debut || date > fin || vus.has(cle)) continue;
      if (!sessionPlanning.get(date)?.creneaux.has(creneau)) continue;
      const reservation = reservations.find(r => d10(r.date_choisie) === date);
      const parts = pratique && (daySlots.has(date) || reservation) ? resolvePratiqueSlotParts(daySlots.get(date), normalizePratiqueType(reservation?.type_formation ?? s.type_session), normalizePratiqueCreneau(reservation?.creneau)) : [];
      const h = parts.length ? (parts.find(p => p.creneau === creneau)?.minutes ?? 0) / 60 : HEURES_CRENEAU[creneau];
      if (!h) continue;
      vus.add(cle);
      cible.faites += h;
      if (!cible.derniere || date > cible.derniere) cible.derniere = date;
    }
  }
  return res;
}

export function useTauxPresenceHeures(apprenantId: string | null | undefined, actif = true, filiere?: string | null) {
  const [data, setData] = useState<ReturnType<typeof calculerTauxPresenceHeures> | null>(null);
  const [erreur, setErreur] = useState(false);
  useEffect(() => {
    setData(null);
    setErreur(false);
    if (!apprenantId || !actif) return;
    let annule = false;
    (async () => {
      try {
        const [em, ins, reservations, configs] = await Promise.all([
          fetchAllRows<any>((f, t) => supabase.from("emargements_fc").select("id,date_emargement,demi_journee,signature_data_url,absent,masque").eq("apprenant_id", apprenantId).order("id").range(f, t)),
          fetchAllRows<any>((f, t) => supabase.from("session_apprenants").select("id,liste_attente,emargements_exclus,date_debut,date_fin,date_fin_personnalisee,heure_debut_personnalisee,heure_fin_personnalisee,sessions:session_id(type_session,statut,date_debut,date_fin,heure_debut,heure_fin,nom,types_apprenant,heures_total)").eq("apprenant_id", apprenantId).order("id").range(f, t)),
          fetchAllRows<any>((f,t) => supabase.from("reservations_pratique").select("id,date_choisie,creneau,type_formation").eq("apprenant_id",apprenantId).order("id").range(f,t)),
          fetchAllRows<any>((f,t) => supabase.from("planning_pratique_config").select("id,day_time_slots,updated_at").order("id").range(f,t)),
        ]);
        if (!annule) setData(calculerTauxPresenceHeures(em, ins, filiere, reservations, configs));
      } catch {
        if (!annule) setErreur(true);
      }
    })();
    return () => { annule = true; };
  }, [apprenantId, actif, filiere]);
  return { data, erreur };
}

export function TauxPresenceSessionsCard({ apprenantId, filiere }: { apprenantId: string; filiere?: string | null }) {
  const { data, erreur } = useTauxPresenceHeures(apprenantId, true, filiere);

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
            {t && !erreur && t.prevues > 0 && (
              <div className="mt-0.5 text-xs text-muted-foreground">
                Dernière signature : <strong className="text-foreground">{t.derniere ? t.derniere.split("-").reverse().join("/") : "aucune"}</strong>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
