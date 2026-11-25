import { useState } from 'react';
import { ContactRound, Download, Loader2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { genererContactsEleves, telechargerContacts, type DossierContactEleve } from '@/lib/contactsElevesVcf';

export function ExportContactsEleves({ charger }: { charger: () => Promise<DossierContactEleve[]> }) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirme, setConfirme] = useState(false);
  const [error, setError] = useState('');
  const [resultat, setResultat] = useState<ReturnType<typeof genererContactsEleves> | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [livraison, setLivraison] = useState('');
  if (profile?.role !== 'admin') return null;

  const ouvrir = () => {
    setOpen(true); setConfirme(false); setError(''); setLivraison(''); setFile(null); setResultat(null);
  };
  const generer = async () => {
    if (!confirme || busy) return;
    setBusy(true); setError('');
    try {
      const resultat = genererContactsEleves(await charger());
      setResultat(resultat);
      setFile(new File([resultat.vcf], 'contacts-eleves.vcf', { type: 'text/vcard;charset=utf-8' }));
    } catch { setError('Lecture des dossiers impossible. Aucun fichier exporté ; réessayez.'); }
    finally { setBusy(false); }
  };
  const partager = async () => {
    if (!file || !confirme) return;
    try {
      await navigator.share({ files: [file], title: 'Contacts élèves' });
      setLivraison('Fichier partagé. L’import dans Contacts reste à confirmer sur votre iPhone.');
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setError('Partage indisponible : utilisez Télécharger le fichier .vcf.');
    }
  };
  const partageDisponible = file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  return <>
    <Button variant="outline" className="gap-2 w-full sm:w-auto whitespace-normal" onClick={() => void ouvrir()}>
      <ContactRound className="h-4 w-4 shrink-0" />Exporter les contacts élèves
    </Button>
    <Dialog open={open} onOpenChange={value => { if (!busy) { setOpen(value); if (!value) { setFile(null); setResultat(null); setConfirme(false); } } }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Exporter les contacts élèves</DialogTitle>
          <DialogDescription>Fichier personnel .vcf : prénoms, noms et téléphones de tous les dossiers de la liste CRM, indépendamment des filtres affichés.</DialogDescription>
        </DialogHeader>
        <label className="flex items-start gap-3 text-sm"><Checkbox className="mt-0.5 shrink-0" disabled={busy || !!resultat} checked={confirme} onCheckedChange={v => setConfirme(v === true)} aria-label="Confirmer l’export des données personnelles" /><span>Je confirme l’export de ces données personnelles pour mon usage administratif et leur conservation sécurisée.</span></label>
        {!resultat && <Button className="gap-2" disabled={!confirme || busy} onClick={() => void generer()}><ContactRound className="h-4 w-4" />{error ? 'Réessayer la génération' : 'Générer le fichier .vcf'}</Button>}
        {busy && <p role="status" className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Lecture des dossiers…</p>}
        {error && <p role="alert" className="text-destructive">{error}</p>}
        {resultat && <div className="space-y-4">
          <p role="status"><strong>{resultat.nombre} contacts prêts à exporter</strong> · {resultat.ignores.length} dossiers ignorés sur {resultat.dossiers}.</p>
          {resultat.ignores.length > 0 && <details><summary className="cursor-pointer font-medium">Dossiers ignorés ({resultat.ignores.length})</summary>
            <ul className="mt-2 max-h-48 overflow-y-auto space-y-2 text-sm">{resultat.ignores.map((r, i) => <li key={`${r.id}-${i}`} className="break-words"><strong>{r.nom}</strong> — {r.motif}</li>)}</ul>
          </details>}
          {resultat.partages.length > 0 && <details><summary className="cursor-pointer font-medium">Numéros partagés conservés ({resultat.partages.length})</summary>
            <p className="mt-2 text-sm text-muted-foreground">Des personnes différentes peuvent partager un numéro : leurs contacts restent séparés faute d’identité commune prouvée.</p>
            <ul className="mt-2 max-h-40 overflow-y-auto text-sm">{resultat.partages.map((r, i) => <li key={i} className="break-words">{r.noms.join(' / ')}</li>)}</ul>
          </details>}
          <p className="text-sm text-muted-foreground">Sur iPhone, ouvrez le fichier puis confirmez son import dans Contacts. Aucun contact n’est enregistré directement par la plateforme.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="gap-2" disabled={!confirme || !file || !resultat.nombre} onClick={() => { if (!file || !confirme) return; telechargerContacts(file); setLivraison(`${resultat.nombre} contacts : téléchargement lancé. Import à confirmer dans Contacts.`); }}><Download className="h-4 w-4" />Télécharger le fichier .vcf</Button>
            {partageDisponible && <Button variant="outline" className="gap-2" disabled={!confirme || !resultat.nombre} onClick={() => void partager()}><Share2 className="h-4 w-4" />Partager</Button>}
          </div>
          {livraison && <p role="status" className="text-sm text-muted-foreground">{livraison}</p>}
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}