import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Copie = { id: string; apprenant_id: string; exercice_id: string; statut: string; qcm_bons: number; qcm_total: number; qrc_total: number; note_points: number | null; note_total: number | null; created_at: string };
type Item = { copie_id: string; question_id: string; enonce: string; reponse: string; statut: string; est_correct: boolean | null; commentaire: string | null; motif: string | null };

const LIBELLE: Record<string, string> = { en_cours: "Correction en cours", corrigee: "Corrigé", a_verifier: "À vérifier", en_attente: "En attente", corrigee_item: "Corrigée" };

/** Lecture seule : corrections QRC du Contrôle de connaissances + budget IA du mois. */
export default function AdminControleQrc() {
  const [copies, setCopies] = useState<Copie[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [noms, setNoms] = useState<Record<string, string>>({});
  const [budget, setBudget] = useState<{ engage_eur: number; plafond_eur: number; mois: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ouverte, setOuverte] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: c, error: ce }, { data: b, error: be }] = await Promise.all([
        supabase.from("controle_qrc_copies").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.rpc("qrc_ia_budget_etat"),
      ]);
      if (ce || be) { setErreur("Lecture impossible (accès administrateur requis)."); return; }
      setCopies((c ?? []) as Copie[]);
      setBudget(b as any);
      const ids = [...new Set((c ?? []).map((x: any) => x.id))];
      if (ids.length) {
        const { data: it } = await supabase.from("controle_qrc_items").select("copie_id, question_id, enonce, reponse, statut, est_correct, commentaire, motif").in("copie_id", ids);
        setItems((it ?? []) as Item[]);
        const apps = [...new Set((c ?? []).map((x: any) => x.apprenant_id))];
        const { data: a } = await supabase.from("apprenants").select("id, nom, prenom").in("id", apps);
        setNoms(Object.fromEntries((a ?? []).map((x: any) => [x.id, `${x.prenom ?? ""} ${x.nom ?? ""}`.trim()])));
      }
    })();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Contrôle de connaissances : correction des QRC</h1>
      {budget && (
        <p className="text-sm text-muted-foreground">Budget IA {budget.mois} (examens blancs + contrôle) : {Number(budget.engage_eur).toFixed(2)} € engagés sur {Number(budget.plafond_eur).toFixed(0)} €.</p>
      )}
      {erreur && <p className="text-destructive">{erreur}</p>}
      {copies.map((c) => {
        const its = items.filter((i) => i.copie_id === c.id);
        return (
          <Card key={c.id}>
            <CardHeader className="cursor-pointer" onClick={() => setOuverte(ouverte === c.id ? null : c.id)}>
              <CardTitle className="text-base flex flex-wrap items-center gap-2">
                {noms[c.apprenant_id] || c.apprenant_id}
                <Badge variant={c.statut === "corrigee" ? "default" : c.statut === "a_verifier" ? "destructive" : "secondary"}>{LIBELLE[c.statut] ?? c.statut}</Badge>
                <span className="text-sm font-normal text-muted-foreground">
                  {c.exercice_id.includes("revision") ? "Révision" : "Passage"} du {new Date(c.created_at).toLocaleString("fr-FR")} ·{" "}
                  {c.statut === "corrigee" ? `Note ${c.note_points} / ${c.note_total}` : `QCM ${c.qcm_bons}/${c.qcm_total}, QRC : ${its.filter((i) => i.statut === "corrigee").length}/${its.length} corrigées`}
                </span>
              </CardTitle>
            </CardHeader>
            {ouverte === c.id && (
              <CardContent className="space-y-3">
                {its.map((i) => (
                  <div key={i.question_id} className="border rounded p-3 text-sm space-y-1">
                    <p className="font-medium">Q{i.question_id} — {i.enonce}</p>
                    <p><span className="text-muted-foreground">Réponse :</span> {i.reponse}</p>
                    <p>
                      <Badge variant="outline">{i.statut === "corrigee" ? (i.est_correct ? "Juste (1 pt)" : "Faux (0 pt)") : LIBELLE[i.statut] ?? i.statut}</Badge>{" "}
                      {i.commentaire ?? (i.motif ? `Motif : ${i.motif}` : "")}
                    </p>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
