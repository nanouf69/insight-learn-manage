import { canonicalAppUrl } from '@/lib/canonicalOrigin';
import { Button } from '@/components/ui/button';
/** Manual transition only: storage and auth belong to the current origin. */
export function CanonicalOriginNotice() {
  const target = canonicalAppUrl(window.location.href);
  if (!target) return null;
  return <aside role="alert" className="border border-destructive bg-background p-3 text-foreground">
    <p>Cette adresse possède un point final. Vos réponses restent conservées ici. Attendez leur confirmation avant de changer d’adresse ; une reconnexion pourra être nécessaire.</p>
    <Button variant="outline" onClick={() => window.open(target, '_blank', 'noopener')}>Ouvrir l’adresse habituelle sans fermer cette page</Button>
  </aside>;
}