import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const LIBELLES: Record<string, string> = {
  ajout: "Ajout", suppression: "Suppression", retrait: "Retrait", remise_en_ligne: "Remise en ligne",
  deplacement: "Déplacement", modification_texte: "Texte modifié", modification_reponses: "Réponses modifiées",
};
const AUTEURS: Record<string, string> = { humain: "Humain", agent_ou_fonction: "Agent / fonction", automatique: "Automatique" };

export default function AdminHistoriqueQuestions() {
  const { profile, loading } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [moduleId, setModuleId] = useState("");
  const [du, setDu] = useState("");
  const [au, setAu] = useState("");
  const [ouvert, setOuvert] = useState<string | null>(null);

  const charger = async () => {
    setFetching(true);
    let q = supabase.from("question_change_log").select("*").order("created_at", { ascending: false }).limit(500);
    if (moduleId.trim()) q = q.eq("module_id", Number(moduleId));
    if (du) q = q.gte("created_at", new Date(du + "T00:00:00").toISOString());
    if (au) q = q.lte("created_at", new Date(au + "T23:59:59").toISOString());
    const { data } = await q;
    setRows(data ?? []);
    setFetching(false);
  };

  useEffect(() => { if (profile?.role === "admin") charger(); }, [profile?.role]);

  if (loading) return null;
  if (profile?.role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold">Historique des questions</h1>
      <div className="flex flex-col gap-3 max-w-md">
        <Input placeholder="N° de module (vide = tous)" value={moduleId} onChange={(e) => setModuleId(e.target.value)} />
        <Input type="date" value={du} onChange={(e) => setDu(e.target.value)} aria-label="Du" />
        <Input type="date" value={au} onChange={(e) => setAu(e.target.value)} aria-label="Au" />
        <Button onClick={charger}>Filtrer</Button>
      </div>
      {fetching ? <Loader2 className="h-5 w-5 animate-spin" /> : rows.length === 0 ? (
        <p className="text-muted-foreground">0 changement pour ces filtres.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="border border-border rounded-md p-3 text-sm">
              <button className="w-full text-left flex flex-wrap gap-2 items-center" onClick={() => setOuvert(ouvert === r.id ? null : r.id)}>
                <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR")}</span>
                <Badge variant="outline">{LIBELLES[r.type_changement] ?? r.type_changement}</Badge>
                <span>Module {r.module_id} {r.module_nom ?? ""}</span>
                <span>· Exercice {r.exercice_id} {r.exercice_titre ?? ""}</span>
                <span>· Question {r.question_id}</span>
                <Badge variant="secondary">{AUTEURS[r.auteur_type] ?? r.auteur_type}{r.auteur_email ? ` — ${r.auteur_email}` : ""}</Badge>
                {r.notifie_at && <span className="text-xs text-muted-foreground">e-mail envoyé</span>}
              </button>
              {ouvert === r.id && (
                <div className="grid md:grid-cols-2 gap-2 mt-2">
                  <div><div className="font-semibold">Avant</div><pre className="bg-muted p-2 rounded text-xs whitespace-pre-wrap">{JSON.stringify(r.avant, null, 2)}</pre></div>
                  <div><div className="font-semibold">Après</div><pre className="bg-muted p-2 rounded text-xs whitespace-pre-wrap">{JSON.stringify(r.apres, null, 2)}</pre></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
