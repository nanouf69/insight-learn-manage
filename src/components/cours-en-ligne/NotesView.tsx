import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Trophy, TrendingUp, Clock, Target, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface QuizResult {
  id: string;
  quiz_type: string;
  quiz_id: string;
  quiz_titre: string;
  matiere_id: string | null;
  matiere_nom: string | null;
  score_obtenu: number;
  score_max: number;
  note_sur_20: number | null;
  reussi: boolean;
  duree_secondes: number | null;
  completed_at: string;
}

interface NotesViewProps {
  apprenantId: string;
  studentName: string;
}

const NotesView = ({ apprenantId, studentName }: NotesViewProps) => {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedExam, setExpandedExam] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      const { data } = await supabase
        .from("apprenant_quiz_results" as any)
        .select("*")
        .eq("apprenant_id", apprenantId)
        .order("completed_at", { ascending: true });

      if (data) setResults(data as any);
      setLoading(false);
    };
    fetchResults();
  }, [apprenantId]);

  // Stats calculations
  const stats = useMemo(() => {
    if (results.length === 0) return null;

    const notes = results.filter(r => r.note_sur_20 != null).map(r => r.note_sur_20!);
    const moyenne = notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : 0;
    const meilleure = notes.length > 0 ? Math.max(...notes) : 0;
    const nbReussi = results.filter(r => r.reussi).length;
    const totalDuree = results.reduce((acc, r) => acc + (r.duree_secondes || 0), 0);

    return { moyenne, meilleure, nbReussi, total: results.length, totalDuree };
  }, [results]);

  // Evolution chart data (chronological notes)
  const evolutionData = useMemo(() => {
    return results
      .filter(r => r.note_sur_20 != null)
      .map((r, i) => ({
        index: i + 1,
        date: format(new Date(r.completed_at), "dd/MM", { locale: fr }),
        note: Number(r.note_sur_20!.toFixed(1)),
        titre: r.quiz_titre,
      }));
  }, [results]);

  // Average per matière for radar chart
  const matiereData = useMemo(() => {
    const grouped: Record<string, { total: number; count: number; nom: string }> = {};
    results.forEach(r => {
      if (!r.matiere_id || r.note_sur_20 == null) return;
      if (!grouped[r.matiere_id]) grouped[r.matiere_id] = { total: 0, count: 0, nom: r.matiere_nom || r.matiere_id };
      grouped[r.matiere_id].total += r.note_sur_20;
      grouped[r.matiere_id].count += 1;
    });
    return Object.entries(grouped).map(([id, d]) => ({
      matiere: d.nom.replace(/^[A-G] - /, "").substring(0, 15),
      moyenne: Number((d.total / d.count).toFixed(1)),
      fullMark: 20,
    }));
  }, [results]);

  // Group results by quiz for detailed view
  const groupedByQuiz = useMemo(() => {
    const map: Record<string, QuizResult[]> = {};
    results.forEach(r => {
      const key = `${r.quiz_id}_${r.completed_at}`;
      if (!map[r.quiz_id]) map[r.quiz_id] = [];
      map[r.quiz_id].push(r);
    });
    return map;
  }, [results]);

  // Bar chart: score distribution
  const distributionData = useMemo(() => {
    const buckets = [
      { range: "0-5", min: 0, max: 5, count: 0 },
      { range: "5-8", min: 5, max: 8, count: 0 },
      { range: "8-10", min: 8, max: 10, count: 0 },
      { range: "10-12", min: 10, max: 12, count: 0 },
      { range: "12-15", min: 12, max: 15, count: 0 },
      { range: "15-20", min: 15, max: 20, count: 0 },
    ];
    results.forEach(r => {
      if (r.note_sur_20 == null) return;
      const b = buckets.find(b => r.note_sur_20! >= b.min && r.note_sur_20! < b.max) || buckets[buckets.length - 1];
      b.count++;
    });
    return buckets;
  }, [results]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-20">
        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-700 mb-2">Aucun résultat pour le moment</h2>
        <p className="text-slate-500">Tes notes apparaîtront ici après avoir complété des examens blancs ou des quiz.</p>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 text-center">
            <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{stats.moyenne.toFixed(1)}/20</p>
            <p className="text-xs text-slate-500 mt-1">Moyenne générale</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 text-center">
            <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{stats.meilleure.toFixed(1)}/20</p>
            <p className="text-xs text-slate-500 mt-1">Meilleure note</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 text-center">
            <Target className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{stats.nbReussi}/{stats.total}</p>
            <p className="text-xs text-slate-500 mt-1">Réussis</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 text-center">
            <Clock className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{formatDuration(stats.totalDuree)}</p>
            <p className="text-xs text-slate-500 mt-1">Temps total</p>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Evolution line chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-4">📈 Évolution des notes</h3>
          {evolutionData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border rounded-lg shadow-lg p-3 text-xs">
                        <p className="font-semibold">{d.titre}</p>
                        <p className="text-slate-500">{d.date}</p>
                        <p className="text-lg font-bold text-primary">{d.note}/20</p>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="note"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  activeDot={{ r: 6 }}
                />
                {/* Reference line at 10/20 */}
                <Line
                  type="monotone"
                  dataKey={() => 10}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  strokeWidth={1}
                  dot={false}
                  name="Seuil"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-slate-400 text-sm">
              Au moins 2 résultats nécessaires pour le graphique
            </div>
          )}
        </div>

        {/* Radar chart by matière */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-4">🎯 Moyenne par matière</h3>
          {matiereData.length >= 3 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={matiereData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="matiere" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 20]} tick={{ fontSize: 9 }} />
                <Radar name="Moyenne" dataKey="moyenne" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-slate-400 text-sm">
              Au moins 3 matières nécessaires pour le radar
            </div>
          )}
        </div>
      </div>

      {/* Distribution chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-bold text-slate-800 mb-4">📊 Répartition des notes</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={distributionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="range" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" name="Nombre" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed results table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-bold text-slate-800">📝 Détail des résultats</h3>
        </div>
        <div className="hidden md:grid grid-cols-12 gap-2 px-6 py-3 bg-slate-50 border-b text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <div className="col-span-3">Quiz / Examen</div>
          <div className="col-span-2">Matière</div>
          <div className="col-span-2 text-center">Note</div>
          <div className="col-span-2 text-center">Résultat</div>
          <div className="col-span-1 text-center">Durée</div>
          <div className="col-span-2 text-center">Date</div>
        </div>
        {results.slice().reverse().map((r) => (
          <div key={r.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 px-6 py-3 border-b last:border-b-0 hover:bg-slate-50/50 transition-colors items-center text-sm">
            <div className="md:col-span-3 font-medium text-slate-800">{r.quiz_titre}</div>
            <div className="md:col-span-2 text-slate-500 text-xs">{r.matiere_nom || "—"}</div>
            <div className="md:col-span-2 text-center">
              <span className={`font-bold ${(r.note_sur_20 ?? 0) >= 10 ? "text-emerald-600" : "text-red-500"}`}>
                {r.note_sur_20?.toFixed(1) ?? "—"}/20
              </span>
            </div>
            <div className="md:col-span-2 text-center">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${r.reussi ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                {r.reussi ? "✅ Réussi" : "❌ Échoué"}
              </span>
            </div>
            <div className="md:col-span-1 text-center text-xs text-slate-500">
              {r.duree_secondes ? formatDuration(r.duree_secondes) : "—"}
            </div>
            <div className="md:col-span-2 text-center text-xs text-slate-500">
              {format(new Date(r.completed_at), "dd/MM/yyyy HH:mm", { locale: fr })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotesView;
