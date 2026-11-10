import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { enregistrerMotCleQrc, lireMotsClesQrc, MOTS_CLES_QUERY, type MotCleQrc } from "./motsClesPersonnalises";

export function MotsClesPersonnalises({ disabled, onAjouter }: {
  disabled: boolean; onAjouter: (texte: string) => void;
}) {
  const client = useQueryClient();
  const liste = useQuery({ queryKey: MOTS_CLES_QUERY, queryFn: lireMotsClesQrc,
    staleTime: 0, refetchOnWindowFocus: "always", retry: false });
  const [edition, setEdition] = useState<{ id: string; version?: number } | null>(null);
  const [texte, setTexte] = useState("");
  const [retrait, setRetrait] = useState<MotCleQrc | null>(null);
  const [confirmationEdition, setConfirmationEdition] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const ouvrir = (mot?: MotCleQrc) => {
    setErreur(null); setTexte(mot?.texte ?? "");
    setEdition({ id: mot?.id ?? crypto.randomUUID(), version: mot?.version });
  };
  const enregistrer = async (supprimer = false) => {
    const cible = supprimer ? retrait : edition;
    if (!cible || enCours) return;
    setEnCours(true); setErreur(null);
    try {
      await enregistrerMotCleQrc({ id: cible.id, version: cible.version,
        texte: supprimer && retrait ? retrait.texte : texte, archive: supprimer });
      await client.invalidateQueries({ queryKey: MOTS_CLES_QUERY });
      setEdition(null); setRetrait(null); setConfirmationEdition(false);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));
      await client.invalidateQueries({ queryKey: MOTS_CLES_QUERY });
    } finally { setEnCours(false); }
  };
  return (
    <div className="space-y-2 border-t pt-2" aria-label="Mots-clés personnalisés">
      <div className="flex flex-wrap gap-2">
        {(liste.data ?? []).map(mot => (
          <div key={mot.id} className="flex min-w-0 max-w-full items-center gap-1">
            <Button type="button" variant="outline" size="sm" className="h-auto min-w-0 whitespace-normal break-words text-left"
              disabled={disabled} onClick={() => onAjouter(mot.texte)}>{mot.texte}</Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Modifier : ${mot.texte}`}
              title="Modifier le mot-clé" disabled={disabled || enCours} onClick={() => ouvrir(mot)}><Pencil className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Supprimer : ${mot.texte}`}
              title="Supprimer de la liste" disabled={disabled || enCours} onClick={() => { setErreur(null); setRetrait(mot); }}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" disabled={disabled || enCours || liste.isPending || Boolean(liste.error)}
        onClick={() => ouvrir()}><Plus className="mr-2 h-4 w-4" />Ajouter un mot-clé</Button>
      {liste.error && <div role="alert" className="text-sm text-destructive">Liste indisponible.
        <Button type="button" variant="link" size="sm" onClick={() => void liste.refetch()}>Réessayer</Button></div>}
      <Dialog open={Boolean(edition)} onOpenChange={ouvert => { if (!ouvert && !enCours) { setEdition(null); setConfirmationEdition(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{edition?.version ? "Modifier le mot-clé" : "Ajouter un mot-clé"}</DialogTitle></DialogHeader>
          <Textarea autoFocus aria-label="Texte du mot-clé" value={texte} disabled={enCours} onChange={e => setTexte(e.target.value)} rows={4} className="break-words" />
          {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={enCours} onClick={() => setEdition(null)}>Annuler</Button>
            <Button type="button" disabled={enCours || !texte.trim()} onClick={() => {
              if (edition?.version) setConfirmationEdition(true); else void enregistrer();
            }}>{enCours ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={Boolean(retrait) || confirmationEdition} onOpenChange={ouvert => { if (!ouvert && !enCours) { setRetrait(null); setConfirmationEdition(false); } }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{retrait ? "Supprimer ce mot-clé de la liste partagée ?" : "Modifier ce mot-clé pour tous les administrateurs ?"}</AlertDialogTitle>
            <AlertDialogDescription>Les commentaires déjà enregistrés pour les candidats restent inchangés.</AlertDialogDescription></AlertDialogHeader>
          {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
          <AlertDialogFooter><AlertDialogCancel disabled={enCours}>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={enCours} onClick={e => { e.preventDefault(); void enregistrer(Boolean(retrait)); }}>
              {enCours ? "Enregistrement…" : retrait ? "Supprimer de la liste" : "Confirmer la modification"}
            </AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}