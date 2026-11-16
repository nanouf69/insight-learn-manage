import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { THEMES, eligible, type ItemInventaire } from "@/lib/quizAvantExamenTaxi/inventaire";
import { bilan, creer, ecrire, juste, lire, ordonner, repondre, cleStockage, type Tentative } from "@/lib/quizAvantExamenTaxi/tentatives";

/** Quiz complet en aperçu ADMIN : tentatives locales cloisonnées, aucune écriture serveur. */
export function QuizApercuInteractif({ items }: { items: ItemInventaire[] }) {
  const [compte, setCompte] = useState<string | null>(null);
  const [tentatives, setTentatives] = useState<Tentative[]>([]);
  const [courante, setCourante] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [voirCorrige, setVoirCorrige] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setCompte(data.user?.id ?? null)); }, []);
  useEffect(() => {
    if (!compte) return;
    const recharger = () => {
      const l = lire(localStorage, compte); setTentatives(l);
      setCourante((c) => c ?? l.filter((t) => !t.termineeLe).at(-1)?.id ?? null);
    };
    recharger();
    const onStorage = (e: StorageEvent) => { if (e.key === cleStockage(compte)) recharger(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [compte]);

  const quiz = useMemo(() => ordonner(items.filter(eligible)), [items]);
  const parCle = useMemo(() => new Map(items.map((i) => [i.cle, i])), [items]);
  const t = tentatives.find((x) => x.id === courante) ?? null;
  const b = t ? bilan(t, parCle, eligible) : null;
  const q = t ? parCle.get(t.cles[index]) : undefined;

  const sauver = (n: Tentative) => {
    if (!compte) return;
    try { setTentatives(ecrire(localStorage, compte, n)); setErreur(null); }
    catch (e) { setErreur((e as Error).message + " — réponse NON enregistrée."); }
  };
  const demarrer = (mode: Tentative["mode"], cles: string[], parent: string | null) => {
    const n = creer(tentatives, cles, mode, parent); sauver(n); setCourante(n.id); setIndex(0); setVoirCorrige(false);
  };

  if (!compte) return <p className="text-sm text-muted-foreground">Connexion admin requise.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => demarrer("toutes", quiz.map((i) => i.cle), null)}>Nouvelle tentative complète ({quiz.length} questions)</Button>
        {t && b && b.fausses.length + b.modifiees.length > 0 && (
          <Button variant="outline" onClick={() => demarrer("erreurs", t.cles.filter((c) => b.fausses.includes(c) || b.modifiees.includes(c)), t.id)}>
            Refaire seulement les fausses ({b.fausses.length + b.modifiees.length})
          </Button>)}
        {t && <Button variant="outline" onClick={() => demarrer("toutes", quiz.map((i) => i.cle), t.id)}>Refaire toutes les questions</Button>}
      </div>
      {erreur && <p className="text-destructive">{erreur}</p>}

      {tentatives.length > 0 && (
        <table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-1">Tentative</th><th>Mode</th><th>Début</th><th>Statut</th><th>Note /20 (recalculée)</th><th /></tr></thead>
          <tbody>{tentatives.map((x) => { const bx = bilan(x, parCle, eligible); return (
            <tr key={x.id} className={`border-b ${x.id === courante ? "font-semibold" : ""}`}>
              <td className="p-1">n°{x.numero}</td><td>{x.mode === "erreurs" ? "Fausses seulement" : "Toutes"}</td>
              <td>{new Date(x.creeLe).toLocaleString("fr-FR")}</td><td>{x.termineeLe ? "Terminée" : `En cours ${bx.repondues}/${bx.total}`}</td>
              <td>{bx.note20.toFixed(2)} ({bx.justes}/{bx.notees})</td>
              <td><Button size="sm" variant="ghost" onClick={() => { setCourante(x.id); setIndex(0); }}>{x.termineeLe ? "Revoir" : "Reprendre"}</Button></td>
            </tr>); })}</tbody></table>)}

      {t && b && (
        <section className="space-y-4 rounded-lg border p-4" aria-label="Tentative en cours">
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span>Tentative n°{t.numero} — {b.repondues}/{b.total} répondues</span><span>Note actuelle : <strong>{b.note20.toFixed(2)} / 20</strong></span></div>
            <Progress value={b.total ? (b.repondues / b.total) * 100 : 0} />
            <div className="grid gap-1 text-xs">{b.parTheme.map((p) => (
              <div key={p.theme} className="flex justify-between"><span>{THEMES[p.theme]}</span><span>{p.repondues}/{p.total} répondues · {p.justes} justes</span></div>))}</div>
            {(b.modifiees.length > 0 || b.introuvables.length > 0 || b.nonNotees.length > 0) && (
              <p className="text-xs text-destructive">
                {b.modifiees.length > 0 && `${b.modifiees.length} question(s) modifiée(s) depuis la réponse (à refaire, non notées). `}
                {b.introuvables.length > 0 && `${b.introuvables.length} question(s) retirée(s) de la source (non notées). `}
                {b.nonNotees.length > 0 && `${b.nonNotees.length} question(s) devenue(s) non éligible(s) (conflit ou sans corrigé, non notées).`}
              </p>)}
          </div>

          {q ? (
            <article className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">{THEMES[q.theme]}</Badge>
                <span className="text-muted-foreground">Question {index + 1}/{t.cles.length} · Module {q.module} · exo {q.exercice} · {q.canonique ? `ID ${q.cle}` : `ID de repli ${q.cle}`}</span>
                {q.ferieFige && <Badge variant="destructive">Jour férié : date figée</Badge>}
                {q.sourcesFusionnees.length > 0 && <Badge variant="outline">Aussi dans {q.sourcesFusionnees.length} autre(s) source(s)</Badge>}
              </div>
              <p className="whitespace-pre-line text-lg font-medium">{q.enonce}</p>
              <ul className="space-y-2">{q.choix.map((c) => {
                const r = t.reponses[q.cle]; const coche = r?.lettres.includes(c.lettre) ?? false;
                return (
                  <li key={c.lettre}>
                    <label className={`flex items-start gap-3 rounded-md border p-3 ${voirCorrige && c.correct ? "border-primary bg-primary/10" : ""}`}>
                      <Checkbox checked={coche} disabled={!!t.termineeLe} aria-label={`Réponse ${c.lettre}`}
                        onCheckedChange={(v) => {
                          const base = (r?.lettres ?? []).filter((x) => x !== c.lettre);
                          sauver(repondre(t, q, v ? [...base, c.lettre] : base));
                        }} />
                      <span>{c.lettre}) {c.texte}{voirCorrige && c.correct ? " ✓" : ""}</span>
                    </label>
                  </li>);
              })}</ul>
              {voirCorrige && <p className={juste(q, t.reponses[q.cle]) ? "text-primary" : "text-destructive"}>
                {t.reponses[q.cle] ? (juste(q, t.reponses[q.cle]) ? "Juste" : "Faux") : "Sans réponse"} — bonne(s) réponse(s) : {q.bonnes.join(" + ")}</p>}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>Précédente</Button>
                <Button variant="outline" onClick={() => setVoirCorrige(!voirCorrige)}>{voirCorrige ? "Masquer le corrigé" : "Voir le corrigé"}</Button>
                <Button variant="outline" disabled={index >= t.cles.length - 1} onClick={() => setIndex(index + 1)}>Suivante</Button>
                {!t.termineeLe && <Button onClick={() => sauver({ ...t, termineeLe: new Date().toISOString() })}>Terminer la tentative</Button>}
              </div>
            </article>
          ) : <p className="text-sm text-destructive">Question {t.cles[index]} introuvable dans la source actuelle.</p>}
        </section>)}
    </div>
  );
}
