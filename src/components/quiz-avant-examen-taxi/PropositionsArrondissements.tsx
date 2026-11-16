import { Badge } from "@/components/ui/badge";
import type { ItemInventaire } from "@/lib/quizAvantExamenTaxi/inventaire";
import { CATEGORIES, construirePropositions } from "@/lib/quizAvantExamenTaxi/propositionsArrondissements";

export function PropositionsArrondissements({ items }: { items: ItemInventaire[] }) {
  const { propositions, lacunes, ecartes } = construirePropositions(items);
  return (
    <section className="space-y-4">
      <Badge variant="destructive">NOUVELLES FORMULATIONS — PROPOSITIONS À VALIDER, NON ENREGISTRÉES, HORS NOTE</Badge>
      <p className="text-sm text-muted-foreground">Rattachements issus uniquement des corrigés existants (avenues 7010, boulevards 7011, places 7013). {propositions.length} propositions, {lacunes.length} lacunes.</p>
      {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
        <div key={n} className="rounded-md border p-3 space-y-3">
          <h3 className="font-semibold">{n === 1 ? "1er" : `${n}e`} arrondissement</h3>
          {(Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[]).map((cat) => {
            const p = propositions.find((x) => x.arrondissement === n && x.categorie === cat);
            const l = lacunes.find((x) => x.arrondissement === n && x.categorie === cat);
            return (
              <div key={cat} className="text-sm">
                <p className="font-medium">{CATEGORIES[cat].libelle}</p>
                {p ? <>
                  <p>{p.enonce}</p>
                  <ul className="ml-4 list-disc">{p.choix.map((c) => (
                    <li key={c.texte} className={c.correct ? "font-semibold text-primary" : ""}>
                      {c.correct ? "✔ " : "✘ "}{c.texte} <span className="text-xs text-muted-foreground">({c.arrondissement === 1 ? "1er" : `${c.arrondissement}e`} — source {c.source})</span>
                    </li>))}</ul>
                </> : <p className="text-destructive">Lacune : {l?.raison}</p>}
              </div>);
          })}
        </div>))}
      {ecartes.length > 0 && <div className="text-sm"><p className="font-medium">Questions sources écartées ({ecartes.length})</p><ul className="ml-4 list-disc">{ecartes.map((e) => <li key={e}>{e}</li>)}</ul></div>}
    </section>
  );
}
