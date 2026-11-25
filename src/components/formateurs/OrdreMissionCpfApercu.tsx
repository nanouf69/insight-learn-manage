import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { CLAUSES_ORDRE, TARIF_HORAIRE_TTC, blocagesOrdre, creneauxMission, montantTtc } from "@/lib/ordreMissionCpf";

const ETAT = { realise_emarge: "Réalisé (émargé)", prevu_futur: "Prévu", prevu_non_prouve: "Prévu — réalisation non prouvée" } as const;

export function OrdreMissionCpfApercu({ formateurId, contratPrestataireSigne, contratCentreSigne, ndaPrestataire = null }: { formateurId: string; contratPrestataireSigne: boolean; contratCentreSigne: boolean; ndaPrestataire?: string | null }) {
  const q = useQuery({ queryKey: ["ordre-mission-cpf", formateurId], queryFn: async () => {
    const [b, e] = await Promise.all([
      supabase.from("agenda_blocs").select("semaine_debut, jour, heure_debut, heure_fin, formation, discipline_nom").eq("formateur_id", formateurId),
      supabase.from("formateur_emargements").select("date_jour, signed_at").eq("formateur_id", formateurId),
    ]);
    if (b.error || e.error) throw new Error("Planning ou émargements illisibles");
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
    return creneauxMission(b.data as any, (e.data ?? []).filter((x: any) => x.signed_at).map((x: any) => String(x.date_jour)), today);
  } });
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Lecture du planning…</p>;
  if (q.isError) return <p className="text-sm text-destructive">Planning illisible : aucun ordre préparé.</p>;
  const c = q.data ?? [];
  const realises = c.filter((x) => x.etat === "realise_emarge");
  const futurs = c.filter((x) => x.etat === "prevu_futur");
  const blocages = blocagesOrdre({ contratPrestataireSigne, contratCentreSigne, financementCpfConfirme: false, referenceDossierCpf: null, ndaPrestataire, habilitationRequise: false, creneaux: futurs });
  return <div className="space-y-3 rounded-md border p-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Ordre de mission CPF — modèle (aperçu, aucun envoi)</h3><Badge variant="outline">Non signé</Badge></div>
    <p className="text-sm">Tarif : {TARIF_HORAIRE_TTC} € TTC/h. Réalisé émargé : {realises.length} créneau(x), {montantTtc(realises.reduce((s, x) => s + x.minutes, 0))} € TTC. Prévu à venir : {futurs.length}.</p>
    <ul className="max-h-48 divide-y overflow-y-auto rounded border text-sm">
      {c.map((x, i) => <li key={i} className="flex flex-wrap justify-between gap-2 p-2"><span>{x.date.split("-").reverse().join("/")} {x.debut}–{x.fin} · {x.formation}</span><span className={x.etat === "realise_emarge" ? "text-success" : "text-muted-foreground"}>{ETAT[x.etat]}</span></li>)}
    </ul>
    <p className="text-xs text-muted-foreground">Les créneaux passés servent de trace ; un ordre de mission ne couvre que des missions futures, signé avant leur début, sans antidatage.</p>
    <details><summary className="cursor-pointer text-sm font-medium">Clauses du modèle</summary><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{CLAUSES_ORDRE.map((t) => <li key={t}>{t}</li>)}</ul></details>
    {blocages.length > 0 && <div className="text-sm text-destructive"><strong>Préparation bloquée :</strong><ul className="list-disc pl-5">{blocages.map((b) => <li key={b}>{b}</li>)}</ul></div>}
  </div>;
}
