import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchQrcInstances, loadQrcEngineQuizIds, validateQrcInstance, type QrcInstanceRow } from "@/lib/qrcInstances";

/**
 * FILE DE CORRECTION — NOUVEAU MOTEUR « 1 QRC = 1 IDENTIFIANT UNIQUE ».
 *
 * Aucune reconstruction, aucun rapprochement par texte, date ou position :
 * la liste est exactement l'ensemble des `qrc_instances` répondues dont l'état
 * est `en_attente`. La validation cible l'identifiant, jamais autre chose.
 * Ce panneau ne s'affiche que pour les examens explicitement branchés.
 */
export function QrcInstancesPanel() {
  const [rows, setRows] = useState<QrcInstanceRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [points, setPoints] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [showCorrected, setShowCorrected] = useState(false);
  const [enabledQuizIds, setEnabledQuizIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    const enabled = await loadQrcEngineQuizIds(true);
    setEnabledQuizIds(Array.from(enabled));
    if (enabled.size === 0) { setRows([]); setLoading(false); return; }
    const data = await fetchQrcInstances();
    setRows(data);
    const ids = [...new Set(data.map((r) => r.apprenant_id))];
    if (ids.length > 0) {
      const { data: apprenants } = await supabase.from("apprenants").select("id, nom, prenom").in("id", ids);
      const map: Record<string, string> = {};
      (apprenants || []).forEach((a: any) => { map[a.id] = `${a.nom ?? ""} ${a.prenom ?? ""}`.trim(); });
      setNames(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("qrc-instances-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "qrc_instances" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const pending = useMemo(() => rows.filter((r) => r.etat === "en_attente"), [rows]);
  const corrected = useMemo(() => rows.filter((r) => r.etat === "corrigee"), [rows]);
  const visible = showCorrected ? rows : pending;

  const handleValidate = async (row: QrcInstanceRow) => {
    const value = points[row.id] ?? row.points_obtenus ?? 0;
    const clamped = Math.min(Math.max(Math.round(value * 2) / 2, 0), row.points_max);
    setSavingId(row.id);
    try {
      const updated = await validateQrcInstance(row.id, clamped, comments[row.id] ?? row.commentaire ?? "");
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      toast.success(`Correction enregistrée : ${clamped} / ${row.points_max} pt`);
    } catch (e: any) {
      toast.error(`Correction refusée : ${e?.message ?? "erreur inconnue"}`);
    } finally {
      setSavingId(null);
    }
  };

  if (!loading && enabledQuizIds.length === 0) return null;

  return (
    <Card className="border-2 border-blue-400 bg-blue-50/40">
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          🧪 Correction QRC — examen(s) de test branché(s)
          <Badge variant="secondary">{enabledQuizIds.join(", ") || "—"}</Badge>
          <Badge className="bg-amber-500 text-white">{pending.length} à corriger</Badge>
          <Badge variant="outline">{corrected.length} corrigée(s)</Badge>
          <Button size="sm" variant="outline" onClick={() => load()} className="ml-auto">
            <RefreshCw className="w-3 h-3 mr-1" /> Réactualiser
          </Button>
          <Button size="sm" variant={showCorrected ? "default" : "outline"} onClick={() => setShowCorrected((v) => !v)}>
            {showCorrected ? "Masquer les corrigées" : "Afficher les corrigées"}
          </Button>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Source unique : un identifiant définitif par QRC. Une QRC corrigée ne revient jamais dans
          « à corriger » ; la note du passage reste bloquée tant qu'il reste une QRC en attente.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {!loading && visible.length === 0 && (
          <p className="text-sm text-green-700 font-medium">✅ Aucune QRC en attente sur les examens branchés.</p>
        )}
        {visible.map((row) => {
          const isDone = row.etat === "corrigee";
          const value = points[row.id] ?? row.points_obtenus ?? 0;
          return (
            <div key={row.id} className={`rounded-lg border p-3 space-y-2 bg-background ${isDone ? "border-green-400" : "border-amber-300"}`}>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold">{names[row.apprenant_id] || row.apprenant_id}</span>
                <Badge variant="outline">{row.quiz_id}</Badge>
                <Badge variant="outline">{row.matiere_id}</Badge>
                <Badge variant="outline">Q{row.question_id}</Badge>
                <span className="text-muted-foreground">passage {row.attempt_id.slice(0, 8)}</span>
                {isDone ? (
                  <Badge className="bg-green-600 text-white"><CheckCircle2 className="w-3 h-3 mr-1" />Déjà corrigée</Badge>
                ) : (
                  <Badge className="bg-amber-500 text-white"><Clock className="w-3 h-3 mr-1" />En attente</Badge>
                )}
              </div>
              <div className="text-sm whitespace-pre-wrap rounded bg-muted/50 p-2">{row.reponse_eleve || "—"}</div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number" step="0.5" min={0} max={row.points_max}
                  className="w-24"
                  value={value}
                  onChange={(e) => setPoints((p) => ({ ...p, [row.id]: Number(e.target.value) }))}
                />
                <span className="text-xs text-muted-foreground">/ {row.points_max} pt</span>
                <Input
                  placeholder="Commentaire (facultatif)"
                  className="flex-1 min-w-[180px]"
                  value={comments[row.id] ?? row.commentaire ?? ""}
                  onChange={(e) => setComments((c) => ({ ...c, [row.id]: e.target.value }))}
                />
                <Button size="sm" disabled={savingId === row.id} onClick={() => handleValidate(row)}>
                  {isDone ? "✓ Confirmer la nouvelle note" : "✓ Valider la correction"}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default QrcInstancesPanel;
