import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatDateFR } from '@/lib/safeDateParse';

export function FormationPratiqueDateSelect({ dates, value, nom, onConfirm }: {
  dates: string[]; value?: string; nom: string; onConfirm: (date: string) => Promise<void>;
}) {
  const [pending, setPending] = useState('');
  const [saving, setSaving] = useState(false);
  return <>
    <Select value={dates.includes(value ?? '') ? value : undefined} onValueChange={setPending} disabled={!dates.length || saving}>
      <SelectTrigger className="h-8 w-44 text-xs" aria-label={`Date de formation pratique pour ${nom}`}>
        <CalendarPlus className="mr-1 h-3.5 w-3.5 shrink-0" /><SelectValue placeholder={dates.length ? 'Date de formation' : 'Aucune date prévue'} />
      </SelectTrigger>
      <SelectContent>{dates.map(date => <SelectItem key={date} value={date}>{formatDateFR(date)}</SelectItem>)}</SelectContent>
    </Select>
    <Dialog open={!!pending} onOpenChange={open => { if (!open && !saving) setPending(''); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Formation pratique de {nom}</DialogTitle>
          <DialogDescription>Confirmer la formation du {pending ? formatDateFR(pending) : ''} ? Une notification sera envoyée au candidat. Les résultats d’examen ne sont pas modifiés.</DialogDescription>
        </DialogHeader>
        <DialogFooter><Button variant="outline" disabled={saving} onClick={() => setPending('')}>Annuler</Button>
          <Button disabled={saving} onClick={async () => { setSaving(true); try { await onConfirm(pending); setPending(''); } finally { setSaving(false); } }}>{saving ? 'Enregistrement…' : 'Confirmer'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}