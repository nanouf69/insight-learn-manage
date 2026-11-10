import { Button } from "@/components/ui/button";
import { COMMENTAIRES_QRC } from "./commentairesPredefinis";

export function CommentairesPredefinis({ disabled, onAjouter }: {
  disabled: boolean;
  onAjouter: (texte: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Commentaires prédéfinis">
      {COMMENTAIRES_QRC.map((texte) => (
        <Button key={texte} type="button" variant="outline" size="sm"
          className="h-auto max-w-full whitespace-normal text-left"
          disabled={disabled} onClick={() => onAjouter(texte)}>
          {texte}
        </Button>
      ))}
    </div>
  );
}