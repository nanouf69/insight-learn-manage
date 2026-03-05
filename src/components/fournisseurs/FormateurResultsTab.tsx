import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap, Loader2 } from "lucide-react";

interface Props {
  token: string;
}

export function FormateurResultsTab({ token }: Props) {
  const [loading, setLoading] = useState(true);
  const [completions, setCompletions] = useState<any[]>([]);
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [apprenants, setApprenants] = useState<any[]>([]);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("get-formateur-results", {
          body: { token },
        });
        if (error) throw error;
        setCompletions(data.completions || []);
        setQuizResults(data.quizResults || []);
        setApprenants(data.apprenants || []);
      } catch (err) {
        console.error("Erreur chargement résultats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [token]);

  const getApprenantName = (id: string) => {
    const a = apprenants.find((a: any) => a.id === id);
    return a ? `${a.prenom} ${a.nom}` : "Inconnu";
  };

  const getApprenantType = (id: string) => {
    const a = apprenants.find((a: any) => a.id === id);
    return a?.type_apprenant || a?.formation_choisie || "-";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Chargement des résultats...</span>
      </div>
    );
  }

  // Group completions by apprenant
  const completionsByApprenant: Record<string, any[]> = {};
  completions.forEach((c: any) => {
    if (!completionsByApprenant[c.apprenant_id]) completionsByApprenant[c.apprenant_id] = [];
    completionsByApprenant[c.apprenant_id].push(c);
  });

  // Group quiz results by apprenant
  const quizByApprenant: Record<string, any[]> = {};
  quizResults.forEach((q: any) => {
    if (!quizByApprenant[q.apprenant_id]) quizByApprenant[q.apprenant_id] = [];
    quizByApprenant[q.apprenant_id].push(q);
  });

  const allApprenantIds = new Set([
    ...Object.keys(completionsByApprenant),
    ...Object.keys(quizByApprenant),
  ]);

  const moduleLabels: Record<number, string> = {
    18: "F. Réglementation (VTC)",
    24: "F. Réglementation (TAXI)",
    27: "Bilan Exercices TA (Nationale/Locale)",
    28: "Bilan Examen TA (Nationale/Locale)",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-2 border-b">
        <GraduationCap className="w-5 h-5 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">Résultats — Réglementation Nationale & Locale (TAXI / TA)</h2>
          <p className="text-sm text-muted-foreground">{allApprenantIds.size} candidat(s) avec des résultats</p>
        </div>
      </div>

      {allApprenantIds.size === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Aucun résultat enregistré pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Tableau résumé des modules */}
          <Card>
            <CardHeader>
              <CardTitle>Scores par module</CardTitle>
              <CardDescription>Résultats des exercices de réglementation nationale et locale</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs">
                      <th className="text-left pb-2 pr-3 font-medium">Candidat</th>
                      <th className="text-left pb-2 pr-3 font-medium">Formation</th>
                      <th className="text-left pb-2 pr-3 font-medium">Module</th>
                      <th className="text-center pb-2 pr-3 font-medium">Score</th>
                      <th className="text-center pb-2 pr-3 font-medium">%</th>
                      <th className="text-left pb-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-muted-foreground">
                          Aucun score de module enregistré.
                        </td>
                      </tr>
                    ) : (
                      completions.map((c: any, i: number) => {
                        const pct = c.score_max > 0 ? Math.round((c.score_obtenu / c.score_max) * 100) : 0;
                        return (
                          <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="py-2 pr-3 font-medium">{getApprenantName(c.apprenant_id)}</td>
                            <td className="py-2 pr-3 text-xs text-muted-foreground">{getApprenantType(c.apprenant_id)}</td>
                            <td className="py-2 pr-3 text-xs">{moduleLabels[c.module_id] || `Module ${c.module_id}`}</td>
                            <td className="py-2 pr-3 text-center font-semibold">{c.score_obtenu}/{c.score_max}</td>
                            <td className="py-2 pr-3 text-center">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${pct >= 70 ? 'bg-green-100 text-green-700' : pct >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                {pct}%
                              </span>
                            </td>
                            <td className="py-2 text-xs text-muted-foreground">
                              {new Date(c.completed_at).toLocaleDateString('fr-FR')}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Quiz / Examens blancs */}
          {quizResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Résultats Quiz & Examens</CardTitle>
                <CardDescription>Résultats des quiz et examens blancs liés à la réglementation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-xs">
                        <th className="text-left pb-2 pr-3 font-medium">Candidat</th>
                        <th className="text-left pb-2 pr-3 font-medium">Quiz</th>
                        <th className="text-left pb-2 pr-3 font-medium">Type</th>
                        <th className="text-center pb-2 pr-3 font-medium">Score</th>
                        <th className="text-center pb-2 pr-3 font-medium">Note /20</th>
                        <th className="text-center pb-2 pr-3 font-medium">Réussi</th>
                        <th className="text-left pb-2 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quizResults.map((q: any, i: number) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="py-2 pr-3 font-medium">{getApprenantName(q.apprenant_id)}</td>
                          <td className="py-2 pr-3 text-xs max-w-[200px] truncate">{q.quiz_titre}</td>
                          <td className="py-2 pr-3">
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted">
                              {q.quiz_type === 'examen_blanc' ? 'Examen blanc' : 'Exercice'}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-center font-semibold">{q.score_obtenu}/{q.score_max}</td>
                          <td className="py-2 pr-3 text-center">{q.note_sur_20 != null ? `${Number(q.note_sur_20).toFixed(1)}` : '-'}</td>
                          <td className="py-2 pr-3 text-center">
                            {q.reussi != null ? (
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${q.reussi ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {q.reussi ? '✅ Oui' : '❌ Non'}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="py-2 text-xs text-muted-foreground">
                            {new Date(q.completed_at).toLocaleDateString('fr-FR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
