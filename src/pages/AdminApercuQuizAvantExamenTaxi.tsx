import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { construireInventaire, eligible, versCsv, joursFeries, SOURCES, THEMES, type Theme, type ItemInventaire } from "@/lib/quizAvantExamenTaxi/inventaire";

const PAR_PAGE = 25;
const MODULES = [...new Set(SOURCES.map((s) => s.module))];

/** Aperçu ADMIN non publié, lecture seule : aucune écriture, aucun accès apprenant. */
export default function AdminApercuQuizAvantExamenTaxi() {
  const [theme, setTheme] = useState<Theme | "tous">("tous");
  const [filtre, setFiltre] = useState<"tous" | "eligibles" | "qrc" | "sans_corrige" | "doublons">("tous");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["apercu-quiz-avant-examen-taxi"],
    queryFn: async () => {
      const { data, error } = await supabase.from("module_editor_state").select("module_id, module_data").in("module_id", MODULES);
      if (error) throw error;
      return construireInventaire((data ?? []) as { module_id: number; module_data: unknown }[]);
    },
    refetchOnWindowFocus: true,
  });

  const items = data ?? [];
  const liste = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return items.filter((it) =>
      (theme === "tous" || it.theme === theme) &&
      (filtre === "tous" || (filtre === "eligibles" && eligible(it)) || (filtre === "qrc" && it.type === "QRC") ||
        (filtre === "sans_corrige" && it.sansCorrige) || (filtre === "doublons" && !!it.doublonDe)) &&
      (!q || `${it.enonce} ${it.choix.map((c) => c.texte).join(" ")} ${it.cle} ${it.questionId}`.toLowerCase().includes(q)));
  }, [items, theme, filtre, recherche]);
  const pages = Math.max(1, Math.ceil(liste.length / PAR_PAGE));
  const visibles = liste.slice(page * PAR_PAGE, (page + 1) * PAR_PAGE);

  const stats = (Object.keys(THEMES) as Theme[]).map((t) => {
    const l = items.filter((i) => i.theme === t);
    return { t, total: l.length, qcm: l.filter(eligible).length, qrc: l.filter((i) => i.type === "QRC").length,
      sans: l.filter((i) => i.sansCorrige).length, dbl: l.filter((i) => i.doublonDe).length };
  });

  const exporter = () => {
    const url = URL.createObjectURL(new Blob([versCsv(liste)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "quiz-avant-examen-taxi-inventaire.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="space-y-2">
        <Badge variant="destructive">APERÇU ADMIN — NON PUBLIÉ, INVISIBLE AUX APPRENANTS</Badge>
        <h1 className="text-2xl font-bold">Quiz avant examen TAXI — inventaire des questions</h1>
        <p className="text-sm text-muted-foreground">Lecture seule des questions enregistrées (identités d'origine). Aucune question n'est copiée, convertie ou modifiée.
          {dataUpdatedAt ? ` Lu le ${new Date(dataUpdatedAt).toLocaleString("fr-FR")}.` : ""}</p>
      </header>

      {error && <p className="text-destructive">Lecture impossible : {(error as Error).message}</p>}
      {isLoading && <p>Lecture des questions…</p>}

      <section className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left"><th className="p-2">Thème</th><th>Total</th><th>QCM retenus</th><th>QRC (à convertir ?)</th><th>QCM sans corrigé</th><th>Doublons</th></tr></thead>
          <tbody>{stats.map((s) => (
            <tr key={s.t} className="border-b"><td className="p-2">{THEMES[s.t]}</td><td>{s.total}</td><td>{s.qcm}</td><td>{s.qrc}</td><td>{s.sans}</td><td>{s.dbl}</td></tr>
          ))}</tbody>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">Arrondissements : aucune question existante (support de cours uniquement). Jours fériés : quiz défini dans le code (module 12), dates calculées ci-dessous pour contrôle.</p>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3">
          <select aria-label="Thème" className="h-10 w-full rounded-md border bg-background px-3" value={theme} onChange={(e) => { setTheme(e.target.value as Theme | "tous"); setPage(0); }}>
            <option value="tous">Tous les thèmes</option>
            {(Object.keys(THEMES) as Theme[]).map((t) => <option key={t} value={t}>{THEMES[t]}</option>)}
          </select>
          <select aria-label="Filtre" className="h-10 w-full rounded-md border bg-background px-3" value={filtre} onChange={(e) => { setFiltre(e.target.value as typeof filtre); setPage(0); }}>
            <option value="tous">Toutes les questions</option><option value="eligibles">QCM retenus pour le quiz</option>
            <option value="qrc">QRC / cas à convertir</option><option value="sans_corrige">QCM sans bonne réponse</option><option value="doublons">Doublons</option>
          </select>
          <Input aria-label="Recherche" placeholder="Rechercher (énoncé, proposition, identifiant)…" value={recherche} onChange={(e) => { setRecherche(e.target.value); setPage(0); }} />
          <div className="flex gap-2"><Button onClick={exporter} disabled={!liste.length}>Exporter CSV ({liste.length})</Button><Button variant="outline" onClick={() => refetch()}>Relire</Button></div>
        </div>

        {visibles.map((it) => <Carte key={`${it.module}-${it.exercice}-${it.questionId}`} it={it} />)}

        <div className="flex items-center justify-between">
          <Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Précédent</Button>
          <span className="text-sm">Page {page + 1} / {pages} — {liste.length} questions</span>
          <Button variant="outline" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Suivant</Button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Jours fériés calculés (contrôle)</h2>
        {[2026, 2027].map((y) => <p key={y} className="text-sm"><strong>{y}</strong> : {joursFeries(y).map((j) => `${j.nom} ${j.date.split("-").reverse().join("/")}`).join(" · ")}</p>)}
      </section>
    </div>
  );
}

function Carte({ it }: { it: ItemInventaire }) {
  return (
    <article className="space-y-2 rounded-lg border p-4">
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="secondary">{THEMES[it.theme]}</Badge>
        <Badge variant={it.type === "QRC" ? "destructive" : "outline"}>{it.type}</Badge>
        {it.sansCorrige && <Badge variant="destructive">Sans corrigé</Badge>}
        {it.doublonDe && <Badge variant="outline">Doublon de {it.doublonDe}</Badge>}
        {!it.exerciceActif && <Badge variant="outline">Exercice inactif</Badge>}
        <span className="text-muted-foreground">Module {it.module} · exo {it.exercice} « {it.exerciceTitre} » · Q {it.questionId} · {it.canonique ? `ID ${it.cle}` : "sans ID canonique"}</span>
      </div>
      <p className="whitespace-pre-line font-medium">{it.enonce}</p>
      <ul className="space-y-1 text-sm">{it.choix.map((c) => (
        <li key={c.lettre} className={c.correct ? "font-bold text-primary" : ""}>{c.lettre}) {c.texte}{c.correct ? " ✓" : ""}</li>
      ))}</ul>
    </article>
  );
}
