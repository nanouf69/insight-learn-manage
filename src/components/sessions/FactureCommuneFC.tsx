import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateDraftPDF, factureToDraftShape } from '@/lib/pdf/draft-facture';
import { lignesFactureCommune, totalFactureCommune, verifierFactureCommune } from '@/lib/comptabilite/factureCommune';
import { adresseDestinataireFacture } from '@/lib/comptabilite/adresseFacture';

interface Inscription {
  montant_total?: number | null;
  apprenant?: { id: string; nom?: string; prenom?: string; adresse?: string | null; code_postal?: string | null; ville?: string | null };
}
interface Financeur { type_financeur?: string; raison_sociale?: string; siret?: string; siren?: string; adresse?: string | null; code_postal?: string | null; ville?: string | null }
interface Props {
  sessionId: string;
  inscriptions: Inscription[];
  selection: Set<string>;
  financeurs: Record<string, Financeur>;
  facturesExistantes: Record<string, { numero?: string }>;
}

export function FactureCommuneFC({ sessionId, inscriptions, selection, financeurs, facturesExistantes }: Props) {
  const [open, setOpen] = useState(false);
  const [montants, setMontants] = useState<Record<string, string>>({});
  const [ids, setIds] = useState<string[]>([]);
  const [payeur, setPayeur] = useState('');
  const [confirme, setConfirme] = useState(false);
  const [confirmeExistantes, setConfirmeExistantes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const operation = useRef<{ id: string; payeur: string; lignes: { apprenant_id: string; montant_ht: number }[]; confirmeExistantes: boolean } | null>(null);
  const { data: communes = [], refetch, isError } = useQuery({
    queryKey: ['session-factures-communes', sessionId],
    queryFn: async () => {
      const rows = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase.from('factures').select('*').eq('session_id', sessionId)
          .neq('lignes_apprenants', '[]').order('created_at').order('id').range(from, from + 999);
        if (error) throw error;
        rows.push(...(data ?? []));
        if ((data ?? []).length < 1000) break;
      }
      return rows;
    },
  });
  const inscrits = ids.map(id => inscriptions.find(sa => sa.apprenant?.id === id)).filter(sa => sa !== undefined);
  const lignes = ids.map(id => ({ apprenant_id: id, montant_ht: Number((montants[id] ?? '').replace(',', '.')) }));
  const erreur = verifierFactureCommune(lignes);
  const existantes = ids.filter(id => facturesExistantes[id] || communes.some(f => lignesFactureCommune(f).some(l => l.apprenant_id === id)));
  const nomPayeur = (id: string) => {
    const a = inscriptions.find(sa => sa.apprenant?.id === id)?.apprenant;
    const fin = financeurs[id];
    return fin?.type_financeur === 'professionnel'
      ? `${fin.raison_sociale || 'Raison sociale manquante'}${fin.siret || fin.siren ? ` — ${fin.siret || fin.siren}` : ''}`
      : `${a?.prenom ?? ''} ${a?.nom ?? ''}`.trim();
  };
  const ouvrir = () => {
    if (!pending) {
      const nouveauxIds = inscriptions.flatMap(sa => sa.apprenant && selection.has(sa.apprenant.id) ? [sa.apprenant.id] : []);
      setIds(nouveauxIds);
      setMontants(Object.fromEntries(inscriptions.filter(sa => sa.apprenant && selection.has(sa.apprenant.id))
        .map(sa => [sa.apprenant?.id, String(sa.montant_total && sa.montant_total > 0 ? sa.montant_total : 200)])));
      setPayeur(''); setConfirme(false); setConfirmeExistantes(false);
    }
    setOpen(true);
  };
  const creer = async () => {
    if (busy || (!operation.current && (erreur || !payeur || !confirme || (existantes.length > 0 && !confirmeExistantes)))) return;
    if (!operation.current) operation.current = { id: crypto.randomUUID(), payeur, lignes, confirmeExistantes };
    const demande = operation.current;
    setBusy(true); setPending(true);
    try {
      const { error } = await supabase.rpc('creer_facture_commune_fc', {
        _id: demande.id, _session_id: sessionId, _payeur_apprenant_id: demande.payeur,
        _lignes: demande.lignes, _confirmer_factures_existantes: demande.confirmeExistantes,
      });
      if (error) {
        // A definitive SQL rejection is not an unknown delivery: allow correction.
        if (['22023', '23514', '42501', '23505'].includes(error.code)) { operation.current = null; setPending(false); }
        throw error;
      }
      const { data: preuve, error: readError } = await supabase.from('factures').select('*').eq('id', demande.id).single();
      if (readError) throw readError;
      const retour = lignesFactureCommune(preuve);
      if (retour.length !== demande.lignes.length || demande.lignes.some((l, i) => retour[i]?.apprenant_id !== l.apprenant_id || Number(retour[i]?.montant_ht) !== l.montant_ht)) {
        throw new Error('La facture enregistrée ne correspond pas à la demande. Vérifiez dans Comptabilité.');
      }
      operation.current = null; setPending(false); setOpen(false);
      await refetch();
      toast.success(`Facture commune ${preuve.numero} enregistrée en brouillon.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (e as { message?: string })?.message || 'Sauvegarde non confirmée. Réessayez avec la même demande.');
    } finally { setBusy(false); }
  };

  return <>
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <Button variant="outline" onClick={ouvrir} disabled={!pending && selection.size < 2} className="gap-2">
        <Users className="h-4 w-4" />{pending ? 'Vérifier la facture commune' : 'Créer une facture commune'}
      </Button>
      {isError && <p role="alert" className="text-sm text-destructive">Impossible de charger les factures communes.</p>}
    </div>
    {communes.map(f => <div key={f.id} className="mb-3 flex flex-wrap items-center gap-3 border-b pb-3">
      <FileText className="h-4 w-4 text-primary" />
      <Button asChild variant="link" className="h-auto p-0"><Link to={`/?section=comptabilite&facture=${encodeURIComponent(f.id)}`}>N° {f.numero}</Link></Button>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">{f.client_nom} — {Number(f.montant_ttc).toFixed(2)} € — {f.statut === 'brouillon' ? 'Brouillon' : f.statut === 'payee' ? 'Payée' : f.statut === 'annulee' ? 'Annulée' : 'Validée'}</p>
        <p className="text-muted-foreground">{lignesFactureCommune(f).map(l => l.stagiaire).join(' · ')}</p>
      </div>
      <Button variant="outline" size="sm" onClick={() => void generateDraftPDF(factureToDraftShape(f), { final: f.statut !== 'brouillon' }).catch(() => toast.error('Impossible de générer le PDF.'))}><FileText className="mr-2 h-4 w-4" />PDF</Button>
    </div>)}
    <Dialog open={open} onOpenChange={v => { if (!busy) setOpen(v); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>Nouvelle facture commune</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label htmlFor="facture-commune-payeur">Destinataire de la facture</Label>
            <Select value={payeur} onValueChange={setPayeur} disabled={pending}><SelectTrigger id="facture-commune-payeur"><SelectValue placeholder="Choisir le destinataire" /></SelectTrigger>
              <SelectContent>{ids.map(id => <SelectItem key={id} value={id}>{nomPayeur(id)}</SelectItem>)}</SelectContent>
            </Select>
            {payeur && <p className="break-words text-sm text-muted-foreground">{nomPayeur(payeur)}</p>}
            {payeur && <p className="break-words text-sm text-muted-foreground">{adresseDestinataireFacture(financeurs[payeur], inscriptions.find(sa => sa.apprenant?.id === payeur)?.apprenant) || 'Adresse du destinataire non renseignée'}</p>}
          </div>
          {inscrits.map(sa => <div key={sa.apprenant?.id} className="space-y-1">
            <Label htmlFor={`montant-commun-${sa.apprenant?.id}`}>{sa.apprenant?.prenom} {sa.apprenant?.nom} — montant TTC (€)</Label>
            <Input id={`montant-commun-${sa.apprenant?.id}`} inputMode="decimal" value={montants[sa.apprenant?.id ?? ''] ?? ''} disabled={pending}
              onChange={e => { const id = sa.apprenant?.id; if (id) setMontants(m => ({ ...m, [id]: e.target.value })); }} />
          </div>)}
          <p className="text-lg font-semibold">Total TTC : {Number.isFinite(totalFactureCommune(lignes)) ? totalFactureCommune(lignes).toFixed(2) : '—'} €</p>
          <div className="flex items-start gap-2"><Checkbox className="shrink-0" id="facture-commune-confirme" checked={confirme} disabled={pending} onCheckedChange={v => setConfirme(v === true)} />
            <Label htmlFor="facture-commune-confirme">Je confirme que le destinataire choisi prend en charge tous ces apprenants.</Label></div>
          {existantes.length > 0 && <div className="space-y-2 border-l-2 border-destructive pl-3">
            <p role="alert" className="text-sm text-destructive">Des factures existent déjà pour {existantes.length} apprenant(s). La nouvelle facture s’ajoute aux précédentes : leurs montants et paiements restent inchangés.</p>
            <div className="flex items-start gap-2"><Checkbox className="shrink-0" id="facture-commune-existantes" checked={confirmeExistantes} disabled={pending} onCheckedChange={v => setConfirmeExistantes(v === true)} />
              <Label htmlFor="facture-commune-existantes">Je confirme cette facturation supplémentaire, sans remplacement.</Label></div>
          </div>}
          {pending && <p role="status" className="text-sm text-muted-foreground">Sauvegarde à confirmer : le réessai vérifie la même facture, sans en créer une autre.</p>}
          {erreur && <p role="alert" className="text-sm text-destructive">{erreur}</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Fermer</Button>
          <Button onClick={() => void creer()} disabled={busy || (!pending && (!!erreur || !payeur || !confirme || (existantes.length > 0 && !confirmeExistantes)))}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{pending ? 'Vérifier / réessayer' : 'Créer le brouillon commun'}
          </Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}