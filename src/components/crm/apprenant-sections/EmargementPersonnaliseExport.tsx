import { useState } from 'react';
import { FileDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { calculEmargementPerso, formatHeures, generateEmargementPersoPdf, type CreneauPerso } from '@/lib/pdf/emargement-personnalise-pdf';
import { chargerElementAdmin } from '@/lib/documentAdminElements';
import { FORMATEUR_EMARGEMENT } from '@/lib/pdf/signatures-manquantes-pdf';

const JOURS = [{ v: 1, l: 'Lun' }, { v: 2, l: 'Mar' }, { v: 3, l: 'Mer' }, { v: 4, l: 'Jeu' }, { v: 5, l: 'Ven' }, { v: 6, l: 'Sam' }, { v: 0, l: 'Dim' }];

export function EmargementPersonnaliseExport({ apprenant }: { apprenant: any }) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [debut, setDebut] = useState(today);
  const [fin, setFin] = useState(today);
  const [jours, setJours] = useState<number[]>([1, 2, 3, 4, 5]);
  const [creneaux, setCreneaux] = useState<CreneauPerso[]>([{ debut: '09:00', fin: '12:00' }, { debut: '13:00', fin: '16:00' }]);
  const [formateur, setFormateur] = useState(FORMATEUR_EMARGEMENT);
  const [formation, setFormation] = useState<string>(String(apprenant?.formation_choisie ?? apprenant?.type_apprenant ?? '').toUpperCase());

  const opts = { dateDebut: debut, dateFin: fin, joursSemaine: jours, creneaux, formateur: formateur.trim(), formation: formation.trim() };
  let resume: string | null = null, erreur: string | null = null;
  try { const c = calculEmargementPerso(opts); resume = `${c.dates.length} jour(s) — ${formatHeures(c.parJour)} par jour — total ${formatHeures(c.total)}`; }
  catch (e: any) { erreur = e?.message === 'Aucune date' ? 'Aucune date dans la période choisie.' : 'Horaires invalides (la fin doit être après le début).'; }
  if (!erreur && (!opts.formateur || !opts.formation)) erreur = 'Indiquez le formateur et la formation.';

  const [avecSignature, setAvecSignature] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errSig, setErrSig] = useState<string | null>(null);
  const download = async () => {
    setBusy(true); setErrSig(null);
    let sig: string | null = null;
    if (avecSignature) { try { sig = await chargerElementAdmin('signature'); } catch { setBusy(false); setErrSig('Signature du formateur introuvable dans Documents : aucun PDF produit.'); return; } }
    setBusy(false);
    const r = generateEmargementPersoPdf(apprenant, opts, sig);
    const url = URL.createObjectURL(r.blob);
    const a = document.createElement('a'); a.href = url; a.download = r.fileName;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  const setC = (i: number, k: keyof CreneauPerso, v: string) => setCreneaux(cs => cs.map((c, j) => j === i ? { ...c, [k]: v } : c));

  if (!open) return <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}><FileDown className="h-4 w-4" />Feuille d’émargement personnalisée (PDF)</Button>;
  return <div className="w-full space-y-3 rounded-md border p-3">
    <p className="text-sm font-semibold">Feuille d’émargement personnalisée — rien n’est enregistré</p>
    <div className="space-y-1"><Label>Formation</Label><Input value={formation} onChange={e => setFormation(e.target.value)} /></div>
    <div className="space-y-1"><Label>Formateur</Label><Input value={formateur} onChange={e => setFormateur(e.target.value)} /></div>
    <div className="space-y-1"><Label>Du</Label><Input type="date" value={debut} onChange={e => setDebut(e.target.value)} /></div>
    <div className="space-y-1"><Label>Au</Label><Input type="date" value={fin} onChange={e => setFin(e.target.value)} /></div>
    <div className="space-y-1"><Label>Jours</Label>
      <div className="flex flex-wrap gap-3">{JOURS.map(j => <label key={j.v} className="flex items-center gap-1 text-sm">
        <Checkbox checked={jours.includes(j.v)} onCheckedChange={c => setJours(js => c ? [...js, j.v] : js.filter(x => x !== j.v))} />{j.l}</label>)}</div>
    </div>
    <div className="space-y-2"><Label>Horaires de chaque jour</Label>
      {creneaux.map((c, i) => <div key={i} className="flex items-center gap-2">
        <Input type="time" value={c.debut} onChange={e => setC(i, 'debut', e.target.value)} />
        <span>–</span>
        <Input type="time" value={c.fin} onChange={e => setC(i, 'fin', e.target.value)} />
        <Button variant="ghost" size="icon" disabled={creneaux.length === 1} onClick={() => setCreneaux(cs => cs.filter((_, j) => j !== i))} aria-label="Retirer le créneau"><Trash2 className="h-4 w-4" /></Button>
      </div>)}
      <Button variant="ghost" size="sm" className="gap-1" onClick={() => setCreneaux(cs => [...cs, { debut: '17:00', fin: '21:00' }])}><Plus className="h-4 w-4" />Ajouter un créneau</Button>
    </div>
    <label className="flex items-center gap-2 text-sm"><Checkbox checked={avecSignature} onCheckedChange={c => setAvecSignature(!!c)} />Mettre la signature du formateur</label>
    {errSig && <p role="alert" className="text-xs text-destructive">{errSig}</p>}
    {erreur ? <p role="alert" className="text-xs text-destructive">{erreur}</p> : <p className="text-xs font-semibold">{resume}</p>}
    <div className="flex gap-2">
      <Button size="sm" className="gap-2" disabled={!!erreur || busy} onClick={() => void download()}><FileDown className="h-4 w-4" />Télécharger le PDF</Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Fermer</Button>
    </div>
  </div>;
}
