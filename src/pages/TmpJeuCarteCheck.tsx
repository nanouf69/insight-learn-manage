// PAGE TEMPORAIRE de contrôle visuel (21/10) — à supprimer après vérification.
// Affiche les jeux de Lyon sans compte : aucune écriture serveur ni score local.
import JeuxCartesLyon from "@/components/cours-en-ligne/jeux-lyon/JeuxCartesLyon";

export default function TmpJeuCarteCheck() {
  return (
    <div className="min-h-screen bg-background p-4">
      <JeuxCartesLyon compteId={null} />
    </div>
  );
}
