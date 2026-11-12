import { AlertTriangle } from 'lucide-react';
import type { ExamenNoteOfficielle } from '@/lib/notesOfficiellesEleve';
import { matieresBilanARevoir } from '@/lib/notesBilansEleve';
export function BilansARevoir({bilans}:{bilans:ExamenNoteOfficielle[]}){
 const faibles=matieresBilanARevoir(bilans);
 return <section aria-label="Bilan examen à revoir" className="mt-6 space-y-3">
  <h3 className="font-bold text-lg text-destructive flex items-center gap-2"><AlertTriangle className="size-5 shrink-0"/>Bilan examen à revoir</h3>
  {faibles.length?faibles.map(m=><div key={`${m.bilanId}:${m.id}`} className="border border-destructive/40 bg-destructive/5 rounded-lg p-4 flex flex-wrap justify-between gap-3">
   <div><p className="text-sm text-muted-foreground">{m.bilan}</p><p className="font-bold text-foreground">{m.nom}</p></div>
   <p className="font-bold text-destructive">{m.pourcentage.toLocaleString('fr-FR',{maximumFractionDigits:1})} % <span className="text-sm">· {m.note?.toFixed(1)} /20</span></p>
  </div>):<p className="text-muted-foreground text-sm">Aucune matière avec un résultat confirmé inférieur à 80 %.</p>}
 </section>;
}