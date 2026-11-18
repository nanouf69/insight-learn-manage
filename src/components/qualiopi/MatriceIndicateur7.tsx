import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FileDown, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { COUVERTURES, ENTETES_MATRICE, cellulesMatrice, filtrerMatrice, matriceCsv, type LigneMatrice } from './matrice';

export function MatriceIndicateur7() {
  const [rows, setRows] = useState<LigneMatrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [matiere, setMatiere] = useState('all');
  const [couverture, setCouverture] = useState('all');
  const [recherche, setRecherche] = useState('');
  const charger = async () => {
    setLoading(true); setError('');
    const { data, error } = await supabase.from('qualiopi_matrice_correspondance').select('*').order('ref_key');
    if (error) { setError(error.message); setRows([]); } else setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { void charger(); }, []);
  const visibles = useMemo(() => filtrerMatrice(rows, matiere, couverture, recherche), [rows, matiere, couverture, recherche]);
  const csv = () => {
    const url = URL.createObjectURL(new Blob([matriceCsv(visibles)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'qualiopi-7-matrice.csv'; a.click(); URL.revokeObjectURL(url);
  };
  const pdf = async () => {
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
      const doc = new jsPDF({ orientation: 'landscape', format: 'a3' });
      doc.setFontSize(12); doc.text('Qualiopi 7 — correspondance documentaire (non-certification)', 12, 12);
      autoTable(doc, { head: [ENTETES_MATRICE], body: visibles.map(cellulesMatrice), startY: 18, styles: { fontSize: 8, overflow: 'linebreak' }, margin: 12 });
      doc.save('qualiopi-7-matrice.pdf');
    } catch { toast.error('Export PDF impossible'); }
  };
  return <section className="space-y-4">
    <h2 className="text-lg font-semibold">Matrice croisée — indicateur 7</h2>
    <div className="flex flex-wrap gap-2">
      <Input aria-label="Rechercher dans la matrice" placeholder="Compétence, contenu, référence…" value={recherche} onChange={e => setRecherche(e.target.value)} className="max-w-sm" />
      <Select value={matiere} onValueChange={setMatiere}><SelectTrigger className="w-64" aria-label="Matière"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toutes les matières</SelectItem>{[...new Set(rows.map(r => r.matiere))].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
      <Select value={couverture} onValueChange={setCouverture}><SelectTrigger className="w-44" aria-label="Couverture"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toutes couvertures</SelectItem>{Object.entries(COUVERTURES).map(([k,v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
      <Button variant="outline" disabled={loading || !!error} onClick={csv}><FileSpreadsheet className="mr-2 h-4 w-4" />Excel / CSV</Button>
      <Button variant="outline" disabled={loading || !!error} onClick={pdf}><FileDown className="mr-2 h-4 w-4" />PDF</Button>
      <Button variant="ghost" size="icon" aria-label="Relire la matrice" onClick={() => void charger()}><RefreshCw className="h-4 w-4" /></Button>
    </div>
    <p className="text-sm text-muted-foreground">{loading ? 'Chargement…' : `${visibles.length} / ${rows.length} lignes`} · Statut : À compléter</p>
    {error && <p role="alert" className="text-destructive">Lecture impossible : {error}</p>}
    <div className="overflow-x-auto"><table className="w-full min-w-[1200px] text-sm"><thead><tr>{ENTETES_MATRICE.map(h => <th key={h} className="border-b p-3 text-left align-top">{h}</th>)}</tr></thead><tbody>{visibles.map(r => <tr key={r.ref_key}>{cellulesMatrice(r).map((c,i) => <td key={i} className="border-b p-3 align-top whitespace-pre-wrap break-words max-w-xs">{i === 7 && c ? <a className="text-primary underline" href={c} target="_blank" rel="noopener noreferrer">Source officielle</a> : c}</td>)}</tr>)}</tbody></table></div>
  </section>;
}