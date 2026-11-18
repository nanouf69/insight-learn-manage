import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { contexteDocument, lignesContexte, verifierContexte, type ContextePedagogique } from '@/lib/formulairePedagogique';
import { lireInscriptionsPedagogiques } from '@/lib/formulairePedagogiqueTransport';
import { toast } from 'sonner';

export function ContexteFormulaire({ apprenantId, donnees, contexte, onPreview }: { apprenantId: string; donnees: Record<string, unknown>; contexte?: ContextePedagogique; onPreview: (c: ContextePedagogique) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => contexteDocument(donnees, contexte));
  const [preuve, setPreuve] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const { data: inscriptions = [], isError, isLoading } = useQuery({ queryKey: ['inscriptions-formulaires', apprenantId], queryFn: () => lireInscriptionsPedagogiques(apprenantId) });
  const current = contexteDocument(donnees, contexte);
  const changer = (patch: Partial<ContextePedagogique>) => { setDraft(d => ({ ...d, ...patch })); setConfirmed(false); };
  return <div className="space-y-3 mt-3 text-sm">
    <dl className="space-y-1">{lignesContexte(current).map(([label, value]) => <div key={label}><dt className="inline font-medium">{label} : </dt><dd className="inline">{value}</dd></div>)}</dl>
    {contexte && <p className="text-muted-foreground">Aperçu local — non enregistré</p>}
    <Button variant="outline" size="sm" onClick={() => { setDraft(current); setEditing(v => !v); }}>Formation, session et décision</Button>
    {editing && <div className="space-y-4 border-t pt-3">
      {isError && <p role="alert" className="text-destructive">Lecture des inscriptions impossible. Aucun rattachement autorisé.</p>}
      <div className="space-y-2"><Label>Inscription / session</Label><Select value={draft.inscription_id ?? 'unlinked'} onValueChange={id => {
        const inscription = inscriptions.find(i => i.id === id);
        changer(inscription ? { inscription_id: inscription.id, session_id: inscription.session_id, session_libelle: `${inscription.session.nom} — ${inscription.session.date_debut} au ${inscription.session.date_fin}` } : { inscription_id: null, session_id: null, session_libelle: null });
      }}><SelectTrigger disabled={isError || isLoading}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unlinked">À rattacher — aucune session attribuée</SelectItem>{inscriptions.map(i => <SelectItem value={i.id} key={i.id}>{i.session.nom} — {i.session.date_debut} au {i.session.date_fin}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor={`formation-${apprenantId}`}>Formation réellement concernée</Label><Input id={`formation-${apprenantId}`} value={draft.formation} onChange={e => changer({ formation: e.target.value })} /></div>
      {(['rempli_le', 'valide_le', 'decision_le'] as const).map((key, index) => <div key={key} className="space-y-2"><Label>{['Date réelle de remplissage', 'Date réelle de validation', 'Date réelle de décision'][index]}</Label><Input type="date" aria-label={['Date réelle de remplissage', 'Date réelle de validation', 'Date réelle de décision'][index]} value={draft[key]?.slice(0, 10) ?? ''} onChange={e => changer({ [key]: e.target.value || null })} /></div>)}
      <div className="space-y-2"><Label>Décision pédagogique réelle</Label><Select value={draft.decision ?? 'none'} onValueChange={v => changer({ decision: v === 'none' ? null : v as ContextePedagogique['decision'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">À valider humainement</SelectItem><SelectItem value="admis">Admis</SelectItem><SelectItem value="refuse">Refusé</SelectItem><SelectItem value="en_attente">En attente</SelectItem><SelectItem value="non_evalue">Non évalué</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><Label>Référence justifiant le rattachement, les dates et la décision</Label><Input value={preuve} onChange={e => { setPreuve(e.target.value); setConfirmed(false); }} /></div>
      <label className="flex items-start gap-2"><Checkbox checked={confirmed} onCheckedChange={v => setConfirmed(v === true)} /><span>Je confirme les éléments réels vérifiés, sans déduire une admission du questionnaire rempli.</span></label>
      <Button disabled={!confirmed || !preuve.trim() || isError || isLoading} onClick={() => { try { verifierContexte(draft, inscriptions, new Date().toISOString()); onPreview({ ...draft }); setEditing(false); toast.info('Aperçu appliqué à ce document uniquement — aucun enregistrement effectué.'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Contexte invalide'); } }}>Appliquer à l’aperçu uniquement</Button>
    </div>}
  </div>;
}