import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function CapacitePratiqueSelect({ id, value, disabled, onChange }: {
  id: string;
  value: number;
  disabled?: boolean;
  onChange: (value: 3 | 4) => void;
}) {
  return <div className="space-y-2 w-full sm:max-w-xs">
    <Label htmlFor={id}>Candidats par jour</Label>
    <Select value={String(value)} disabled={disabled} onValueChange={v => { if (v === '3' || v === '4') onChange(Number(v) as 3 | 4); }}>
      <SelectTrigger id={id} aria-label="Candidats par jour"><SelectValue /></SelectTrigger>
      <SelectContent>
        {value !== 3 && value !== 4 && <SelectItem value={String(value)}>{value} candidats — réglage enregistré</SelectItem>}
        <SelectItem value="3">3 candidats par jour</SelectItem>
        <SelectItem value="4">4 candidats par jour</SelectItem>
      </SelectContent>
    </Select>
  </div>;
}