import { objectifsJalons, TITRE_OBJECTIFS_JALONS } from "@/lib/objectifsJalons";

export function ObjectifsJalonsSection({ parcours, moduleIds }: { parcours: string; moduleIds: readonly number[] }) {
  const objectifs = objectifsJalons(parcours, moduleIds);
  if (!objectifs.length) return null;
  return <section className="mt-4 border-t pt-4" aria-label={TITRE_OBJECTIFS_JALONS}>
    <h3 className="text-sm font-semibold text-foreground">{TITRE_OBJECTIFS_JALONS}</h3>
    <dl className="mt-3 space-y-3 text-sm">
      {objectifs.map(({ moduleId, intitule, objectif }) => <div key={moduleId}>
        <dt className="font-medium text-foreground">{intitule}</dt>
        <dd className="mt-1 leading-relaxed text-muted-foreground">{objectif}</dd>
      </div>)}
    </dl>
  </section>;
}