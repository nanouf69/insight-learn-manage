import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { History } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LIBELLES_STATUT_ADMIN, type ReponseStatut } from "@/components/cours-en-ligne/bilanReponsesVerrouillees";

interface Categorie { module_id: number; exercice_id: number; tentative: number; categorie: string; created_at: string }
interface Statut { module_id: number; exercice_id: number; tentative: number; cle: string; uid: string | null; statut: ReponseStatut; reponse: unknown }
interface Autorisation { module_id: number; exercice_id: number; tentative_source: number; tentative_autorisee: number; motif: string; created_at: string }

const VARIANTE: Record<ReponseStatut, "default" | "secondary" | "destructive" | "outline"> = {
  CERTAINE: "secondary",
  VERSION_NON_PROUVEE: "outline",
  ORPHELINE: "destructive",
  LITIGIEUSE: "destructive",
};
const filiere = (m: number) => (m === 5 ? "Bilan VTC" : m === 11 ? "Bilan TAXI" : `Module ${m}`);
const fmt = (v: unknown) => (Array.isArray(v) ? v.join(", ") : v == null ? "—" : String(v));

/**
 * Vue Admin des anciens passages Bilans migrés : catégorie, statut de chaque réponse
 * (lecture seule, aucune action de rattachement), et autorisation explicite d'une
 * nouvelle tentative pour les passages ROUGE.
 */
export function BilanPassagesStatutsPanel({ apprenantId }: { apprenantId: string }) {
  const [cats, setCats] = useState<Categorie[]>([]);
  const [statuts, setStatuts] = useState<Statut[]>([]);
  const [autos, setAutos] = useState<Autorisation[]>([]);
  const [cible, setCible] = useState<Categorie | null>(null);
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const envoiRef = useRef(false);

  const charger = useCallback(async () => {
    const [c, s, a] = await Promise.all([
      (supabase as any).from("bilan_passage_categories").select("module_id, exercice_id, tentative, categorie, created_at").eq("apprenant_id", apprenantId),
      (supabase as any).from("bilan_reponse_statuts").select("module_id, exercice_id, tentative, cle, uid, statut, reponse").eq("apprenant_id", apprenantId),
      (supabase as any).from("bilan_nouvelle_tentative_autorisations").select("module_id, exercice_id, tentative_source, tentative_autorisee, motif, created_at").eq("apprenant_id", apprenantId),
    ]);
    setCats(c.data ?? []); setStatuts(s.data ?? []); setAutos(a.data ?? []);
  }, [apprenantId]);

  useEffect(() => { void charger(); }, [charger]);

  if (cats.length === 0) return null;

  const autoriser = async () => {
    if (!cible || envoiRef.current) return; // double-clic : un seul envoi
    envoiRef.current = true; setEnvoi(true);
    const { error } = await (supabase as any).rpc("bilan_autoriser_nouvelle_tentative", {
      p_apprenant_id: apprenantId, p_module_id: cible.module_id, p_exercice_id: cible.exercice_id,
      p_motif: motif, p_confirmation: "AUTORISER",
    });
    envoiRef.current = false; setEnvoi(false);
    if (error) { toast.error("Autorisation refusée : " + error.message); return; }
    toast.success("Nouvelle tentative autorisée. L'ancien passage reste conservé.");
    setCible(null); setMotif("");
    void charger();
  };

  return (
    <Card data-testid="bilan-passages-statuts">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><History className="w-5 h-5 text-primary" />Anciens passages Bilans</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {cats.sort((x, y) => x.module_id - y.module_id || x.exercice_id - y.exercice_id || x.tentative - y.tentative).map((c) => {
          const rep = statuts.filter((s) => s.module_id === c.module_id && s.exercice_id === c.exercice_id && s.tentative === c.tentative);
          const auto = autos.filter((a) => a.module_id === c.module_id && a.exercice_id === c.exercice_id && a.tentative_source === c.tentative);
          return (
            <div key={`${c.module_id}-${c.exercice_id}-${c.tentative}`} className="rounded-lg border p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm">{filiere(c.module_id)} — matière {c.exercice_id} — tentative {c.tentative}</span>
                <Badge variant={c.categorie === "ROUGE" ? "destructive" : c.categorie === "ORANGE" ? "outline" : "secondary"}>{c.categorie}</Badge>
                {c.categorie === "ROUGE" && <span className="text-xs text-muted-foreground">Passage conservé en historique</span>}
              </div>
              {rep.length > 0 && (
                <ul className="space-y-1">
                  {rep.sort((a, b) => a.cle.localeCompare(b.cle, undefined, { numeric: true })).map((r) => (
                    <li key={r.cle} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-mono text-xs">{r.cle}</span>
                      <span>réponse : {fmt(r.reponse)}</span>
                      <Badge variant={VARIANTE[r.statut]}>{LIBELLES_STATUT_ADMIN[r.statut]}</Badge>
                      {(r.statut === "ORPHELINE" || r.statut === "LITIGIEUSE") && (
                        <span className="text-xs text-muted-foreground">Non rattachable à une question actuelle</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {c.categorie === "ROUGE" && (
                auto.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nouvelle tentative {auto[0].tentative_autorisee} autorisée le {new Date(auto[0].created_at).toLocaleString("fr-FR")} — motif : {auto[0].motif}
                  </p>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setCible(c)}>Autoriser une nouvelle tentative</Button>
                )
              )}
            </div>
          );
        })}
      </CardContent>
      <AlertDialog open={!!cible} onOpenChange={(o) => { if (!o) { setCible(null); setMotif(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Autoriser une nouvelle tentative ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'ancien passage reste conservé tel quel avec ses réponses et sa note. L'élève pourra commencer une nouvelle tentative propre. Cette action est journalisée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea aria-label="Motif" placeholder="Motif (obligatoire)" value={motif} onChange={(e) => setMotif(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={envoi || motif.trim() === ""} onClick={(e) => { e.preventDefault(); void autoriser(); }}>
              Confirmer l'autorisation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
