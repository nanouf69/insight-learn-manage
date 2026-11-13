import { AlertTriangle } from "lucide-react";

/** Retired personal link: never mounts a signature pad or calls a write API. */
export default function EmargementsRegularisation() {
  return <main className="mx-auto max-w-xl space-y-4 p-4">
    <h1 className="text-xl font-bold">Émargements</h1>
    <div className="flex items-start gap-3 border-l-4 border-destructive pl-4">
      <AlertTriangle className="h-6 w-6 shrink-0 text-destructive" />
      <div className="space-y-2">
        <p className="font-semibold">Les dates passées ne peuvent plus être signées.</p>
        <p>Contactez le centre pour une gestion administrative justifiée de présence ou d’absence, distincte de votre signature.</p>
        <p className="text-sm text-muted-foreground">Vos signatures déjà enregistrées restent conservées.</p>
      </div>
    </div>
  </main>;
}
