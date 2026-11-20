import { useRef, useState } from 'react';
import { GraduationCap, Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ALL_MODULES } from '@/components/cours-en-ligne/modules-config';
import { MODULES_DATA } from '@/components/cours-en-ligne/formations-data';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { assignModules, assignmentTargets, type AssignmentRecord, type ModuleRecipient } from './moduleAssignment';

interface Props {
  sessionId: string;
  recipients: ModuleRecipient[];
  selected: Set<string>;
  onSaved: () => void;
}

const moduleChoices = ALL_MODULES.map(module => ({
  ...module,
  nom: MODULES_DATA.find(display => display.id === module.id)?.nom ?? module.nom,
}));

export function SessionModuleAssignment({ sessionId, recipients, selected, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState('all');
  const [people, setPeople] = useState<Set<string>>(new Set());
  const [modules, setModules] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const [results, setResults] = useState<Awaited<ReturnType<typeof assignModules>> | null>(null);
  const targets = assignmentTargets(recipients, scope, people);
  const toggle = <T,>(values: Set<T>, value: T) => {
    const next = new Set(values);
    if (next.has(value)) next.delete(value); else next.add(value);
    return next;
  };

  const save = async () => {
    if (lock.current || !confirm || !targets.length || !modules.size) return;
    lock.current = true;
    setSaving(true);
    try {
      const result = await assignModules({
        read: async id => {
          const membership = await supabase.from('session_apprenants').select('id').eq('session_id', sessionId).eq('apprenant_id', id);
          if (membership.error || !membership.data?.length) throw new Error('Inscription dans cette session non confirmée.');
          const { data, error } = await supabase.from('apprenants')
            .select('id,auth_user_id,modules_autorises,type_apprenant,formation_choisie,updated_at,deleted_at,compte_cours_archive_at')
            .eq('id', id).single();
          if (error || !data) throw new Error('Lecture du dossier impossible.');
          return data as AssignmentRecord;
        },
        isProtected: async id => {
          const { data, error } = await supabase.from('edof_fin_formation').select('mis_fin_formation').eq('apprenant_id', id);
          if (error) throw new Error('État EDOF non vérifiable : attribution refusée.');
          return data.some(row => row.mis_fin_formation === true);
        },
        write: async (before, next) => {
          if (!before.auth_user_id || !before.updated_at) throw new Error('Référence du dossier non vérifiée.');
          // Account-linked predicate prevents the automatic credential trigger from sending mail.
          // CAS refuses any concurrent dossier edit rather than overwriting its module list.
          let query = supabase.from('apprenants').update({ modules_autorises: next })
            .eq('id', before.id).eq('auth_user_id', before.auth_user_id).eq('updated_at', before.updated_at)
            .is('deleted_at', null).is('compte_cours_archive_at', null);
          query = before.modules_autorises === null ? query.is('modules_autorises', null) : query.eq('modules_autorises', before.modules_autorises);
          const { data, error } = await query.select('id,modules_autorises');
          if (error) throw new Error(error.message);
          if (data?.length !== 1) throw new Error('Dossier modifié simultanément : aucun remplacement effectué.');
        },
      }, targets, [...modules]);
      setResults(result);
      onSaved();
    } finally {
      setSaving(false);
      lock.current = false;
    }
  };

  return <>
    <Button variant="outline" size="sm" className="gap-2 shrink-0" disabled={!recipients.length} onClick={() => {
      setScope(selected.size ? 'selected' : 'all'); setPeople(new Set(selected)); setModules(new Set());
      setSearch(''); setConfirm(false); setResults(null); setOpen(true);
    }}><GraduationCap className="h-4 w-4" />Ajouter des modules</Button>
    <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value); }}>
      <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Ajouter des modules</DialogTitle></DialogHeader>
        {results ? <div className="space-y-3">
          <p className="font-medium">{results.filter(r => r.status === 'added').length} attribution(s) confirmée(s) · {results.filter(r => r.status === 'unchanged').length} déjà attribuée(s) · {results.filter(r => r.status === 'refused').length} non effectuée(s)</p>
          <ul className="space-y-2 text-sm">{results.map(r => <li key={r.recipient.id} className={r.status === 'refused' ? 'text-destructive' : 'text-foreground'}>
            <strong>{r.recipient.prenom} {r.recipient.nom}</strong> — {r.status === 'added' ? 'Modules enregistrés' : r.status === 'unchanged' ? 'Modules déjà présents' : r.reason}
          </li>)}</ul>
        </div> : <div className="space-y-4">
          <div className="space-y-2"><label htmlFor="module-recipients" className="text-sm font-medium">Participants concernés</label>
            <Select value={scope} disabled={saving} onValueChange={value => { setScope(value); setConfirm(false); }}>
              <SelectTrigger id="module-recipients"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Toute la session ({assignmentTargets(recipients, 'all', people).length})</SelectItem><SelectItem value="selected">Certaines personnes</SelectItem></SelectContent>
            </Select>
          </div>
          {scope === 'selected' && <div className="max-h-40 overflow-auto border rounded-md p-2 space-y-2">{assignmentTargets(recipients, 'all', people).map(r => <label key={r.id} className="flex items-center gap-3 text-sm p-1">
            <Checkbox checked={people.has(r.id)} disabled={saving} onCheckedChange={() => { setPeople(toggle(people, r.id)); setConfirm(false); }} /><span>{r.prenom} {r.nom}</span>
          </label>)}</div>}
          <div className="space-y-2"><label htmlFor="module-search" className="text-sm font-medium">Modules à ajouter ({modules.size})</label>
            <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="module-search" placeholder="Rechercher un module" className="pl-9" value={search} disabled={saving} onChange={e => setSearch(e.target.value)} /></div>
            <div className="max-h-56 overflow-auto border rounded-md p-2 space-y-2">{moduleChoices.filter(m => m.nom.toLocaleLowerCase('fr').includes(search.toLocaleLowerCase('fr'))).map(m => <label key={m.id} className="flex items-start gap-3 text-sm p-1">
              <Checkbox className="mt-0.5" checked={modules.has(m.id)} disabled={saving} onCheckedChange={() => { setModules(toggle(modules, m.id)); setConfirm(false); }} /><span className="min-w-0 break-words">{m.nom}</span>
            </label>)}</div>
          </div>
          <div className="border-t pt-3 space-y-2 text-sm">
            <p><strong>{modules.size} module(s) pour {targets.length} personne(s)</strong></p>
            <p className="text-muted-foreground">Les modules actuels et les acquis sont conservés. Ajouter des modules peut modifier le taux de jalons. Aucun mail ni création de compte ; les comptes non créés et les fins validées EDOF ne seront pas modifiés.</p>
            <label className="flex items-start gap-3"><Checkbox checked={confirm} disabled={saving} onCheckedChange={value => setConfirm(value === true)} /><span>Je confirme les personnes et les modules à ajouter.</span></label>
          </div>
        </div>}
        <DialogFooter className="gap-2"><Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>{results ? 'Fermer' : 'Annuler'}</Button>
          {!results && <Button onClick={save} disabled={saving || !confirm || !targets.length || !modules.size} className="gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}{saving ? 'Enregistrement…' : 'Confirmer l’ajout'}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}