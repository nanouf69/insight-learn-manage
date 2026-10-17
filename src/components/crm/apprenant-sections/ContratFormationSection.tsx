import { useEffect, useState } from 'react';
import { Download, Eye, FileText, Plus, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { CONTRACT_FIELD_GROUPS, type Funding, type TrainingContract, validateContract, contractAccess } from '@/lib/contratFormation/model';
import { newTrainingContract, contractProgramme, type ContractLearner } from '@/lib/contratFormation/prefill';
import { contractSections } from '@/lib/contratFormation/text';
import { buildTrainingContractPdf } from '@/lib/contratFormation/pdf';
import { FORMATIONS } from '@/components/cours-en-ligne/formations-data';
import { toast } from 'sonner';

interface SessionChoice { id: string; nom: string; date_debut: string | null; date_fin: string | null; lieu: string | null; heure_debut: string | null; heure_fin: string | null; trainers: string }
export function ContratFormationSection({ apprenant }: { apprenant: ContractLearner }) {
  const [draft, setDraft] = useState(() => newTrainingContract(apprenant));
  const [access, setAccess] = useState<'loading'|'admin'|'denied'>('loading');
  const [sessions, setSessions] = useState<SessionChoice[]>([]);
  const [sourceError, setSourceError] = useState('');
  const [preview, setPreview] = useState(false);
  const [previewNow, setPreviewNow] = useState(new Date());
  useEffect(() => {
    let active = true;
    setAccess('loading'); setDraft(newTrainingContract(apprenant)); setPreview(false); setSessions([]); setSourceError('');
    async function load() {
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user) { if (active) setAccess('denied'); return; }
        const { data: admin, error } = await supabase.rpc('has_role', { _user_id: auth.user.id, _role: 'admin' });
        if (error || admin !== true) { if (active) setAccess('denied'); return; }
        if (!active) return;
        setAccess('admin');
        const all: SessionChoice[] = [];
        for (let offset=0;;offset+=200) {
          const { data, error: readError } = await supabase.from('session_apprenants')
            .select('session_id, sessions(id, nom, date_debut, date_fin, lieu, heure_debut, heure_fin, session_formateurs(formateurs(nom, prenom, specialites)))')
            .eq('apprenant_id', apprenant.id).order('id').range(offset, offset+199);
          if (readError) throw readError;
          for (const row of data ?? []) {
            const s = row.sessions;
            if (!s) continue;
            const trainers = (s.session_formateurs ?? []).map(r => r.formateurs).filter(Boolean)
              .map(t => `${t?.prenom ?? ''} ${t?.nom ?? ''} — spécialités : ${t?.specialites ?? 'à compléter'} ; modules et diplômes/références à vérifier`).join('\n');
            all.push({ ...s, trainers });
          }
          if (!data || data.length < 200) break;
        }
        if (active) setSessions(all);
      } catch { if (active) setSourceError('Lecture des sessions impossible : aucune date ni référence n’a été remplacée.'); }
    }
    void load(); return () => { active = false; };
  }, [apprenant.id]);
  const now = new Date();
  const validation = validateContract(draft, apprenant.id, now);
  const allowed = contractAccess(access === 'admin', apprenant.id, draft.learnerId);
  const field = (key: string, value: string) => { setPreview(false); setDraft(d => ({ ...d, sessionId: key === 'start' || key === 'end' ? '' : d.sessionId, verified: false, fields: { ...d.fields, [key]: value } })); };
  const chooseSession = (id: string) => {
    const s = sessions.find(x => x.id === id); if (!s) return;
    setPreview(false); setDraft(d => ({ ...d, sessionId: id, verified: false, fields: { ...d.fields,
      start: s.date_debut ?? '', end: s.date_fin ?? '', locations: s.lieu ?? '', trainers: s.trainers,
      planning: `${s.nom} (${s.id}) : ${s.date_debut ?? '?'} — ${s.date_fin ?? '?'} ; ${s.heure_debut ?? '?'} — ${s.heure_fin ?? '?'} ; ${s.lieu ?? '?'}. Planning détaillé daté à compléter.`,
    } }));
  };
  const download = async (definitive: boolean) => {
    if (!allowed) return;
    try {
      // Revalidate the server role and current date at the actual click, not preview time.
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Connexion administrateur requise');
      const { data: admin, error } = await supabase.rpc('has_role', { _user_id: auth.user.id, _role: 'admin' });
      if (error || !contractAccess(admin === true, apprenant.id, draft.learnerId)) throw new Error('Accès administrateur requis');
      if (sourceError && definitive) throw new Error('Lecture des sources non confirmée');
      buildTrainingContractPdf(draft, new Date(), definitive).save(`${draft.reference}_${definitive ? 'non-signe' : 'brouillon'}.pdf`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Génération impossible'); }
  };
  if (access === 'loading') return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Vérification de l’accès administrateur…</div>;
  if (!allowed) return <p role="alert" className="text-destructive">Contrat de formation : accès administrateur requis.</p>;
  return <section className="space-y-6 min-w-0">
    <header className="space-y-2"><h2 className="text-xl font-semibold flex items-center gap-2"><FileText className="h-5 w-5" />Contrat de formation</h2>
      <p className="text-sm text-muted-foreground">{draft.reference} · {draft.fields.learnerName} · Génération : {validation.today} (Europe/Paris)</p>
      <p className="text-sm">Conclusion non établie · Signature réelle non recueillie</p>
    </header>
    {sourceError && <p role="alert" className="text-destructive">{sourceError}</p>}
    <div className="space-y-2"><Label>Financement de ce contrat</Label><Select value={draft.funding} onValueChange={v => { setPreview(false); setDraft(d => ({ ...d, funding: v as Funding, verified: false })); }}><SelectTrigger><SelectValue placeholder="Choisir le financement" /></SelectTrigger><SelectContent>{[['personnel','Personnel — payé par le stagiaire'],['cpf','CPF'],['opco','OPCO'],['entreprise','Entreprise'],['autre','Autre financeur']].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
    {draft.funding !== 'personnel' && <p role="alert" className="text-destructive">Ce modèle individuel et son échéancier ne s’appliquent pas automatiquement à ce financement.</p>}
    <div className="space-y-2"><Label>Parcours effectivement vendu</Label><Select value={draft.pathway} onValueChange={v => { setPreview(false); setDraft(d => ({ ...d, pathway: v, verified: false, activities: contractProgramme(apprenant, v) })); }}><SelectTrigger><SelectValue placeholder="Choisir le parcours" /></SelectTrigger><SelectContent>{FORMATIONS.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}<SelectItem value="pratique-taxi">Pratique seule TAXI</SelectItem><SelectItem value="pratique-vtc">Pratique seule VTC</SelectItem></SelectContent></Select></div>
    <div className="space-y-2"><Label>Session rattachée à cet apprenant</Label><Select value={draft.sessionId} onValueChange={chooseSession}><SelectTrigger><SelectValue placeholder={sessions.length ? 'Choisir la session' : 'Aucune session disponible — compléter les dates ci-dessous'} /></SelectTrigger><SelectContent>{sessions.map(s => <SelectItem key={s.id} value={s.id}>{s.nom} · {s.date_debut ?? 'date absente'} → {s.date_fin ?? 'date absente'}</SelectItem>)}</SelectContent></Select></div>
    {CONTRACT_FIELD_GROUPS.map(group => <div key={group.title} className="space-y-4 border-t pt-5"><h3 className="font-semibold">{group.title}</h3>{group.fields.map(([key,label,type]) => <div key={key} className="space-y-2"><Label htmlFor={`cf-${key}`}>{label}</Label>{type ? <Input id={`cf-${key}`} type={type} min={type === 'number' ? '0' : undefined} step={type === 'number' ? '0.01' : undefined} value={draft.fields[key] ?? ''} onChange={e => field(key,e.target.value)} /> : <Textarea id={`cf-${key}`} value={draft.fields[key] ?? ''} onChange={e => field(key,e.target.value)} placeholder="À compléter / sans objet si justifié" />}</div>)}</div>)}
    <div className="space-y-4 border-t pt-5"><h3 className="font-semibold">Annexe 1 · Modules et activités vendus</h3>
      {draft.activities.map((a,i) => <div key={a.id} className="border rounded-md p-4 space-y-3">
        {([['title','Module'],['activities','Thèmes et activités'],['modality','Modalité'],['hours','Durée moyenne (h)'],['evaluation','Évaluation et suivi'],['value','Valeur (€ TTC ou nette)']] as const).map(([key,label]) => <div key={key} className="space-y-2"><Label htmlFor={`cf-activity-${i}-${key}`}>{label}</Label><Input id={`cf-activity-${i}-${key}`} type={key === 'hours' || key === 'value' ? 'number' : 'text'} min="0" step="0.01" value={a[key]} onChange={e => { setPreview(false); setDraft(d => ({...d, verified:false, activities: d.activities.map(x => x.id === a.id ? {...x,[key]:e.target.value} : x)})); }} /></div>)}
        <Button variant="ghost" aria-label={`Retirer la ligne ${i+1} du brouillon`} onClick={() => setDraft(d => ({...d, verified:false, activities:d.activities.filter(x => x.id !== a.id)}))}><Trash2 className="h-4 w-4" /></Button>
      </div>)}
      <Button variant="outline" onClick={() => setDraft(d => ({...d, verified:false, activities:[...d.activities,{id:crypto.randomUUID(),title:'',activities:'',modality:'',hours:'',evaluation:'',value:''}]}))}><Plus className="h-4 w-4 mr-2" />Ajouter une prestation au contrat</Button>
    </div>
    <div className="space-y-4 border-t pt-5"><h3 className="font-semibold">Échéancier personnel — 14 jours sans paiement, premier versement ≤ 30 %</h3>
      {draft.payments.map((p,i) => <div key={i} className="space-y-2"><h4 className="font-medium">{['Premier versement','Deuxième versement','Troisième versement','Solde'][i]}</h4>{(['amount','date','milestone'] as const).map(key => <div key={key} className="space-y-1"><Label htmlFor={`cf-pay-${i}-${key}`}>{key === 'amount' ? 'Montant (€)' : key === 'date' ? 'Date' : 'Étape pédagogique'}</Label><Input id={`cf-pay-${i}-${key}`} type={key === 'date' ? 'date' : key === 'amount' ? 'number' : 'text'} min="0" step="0.01" value={p[key]} onChange={e => {setPreview(false);setDraft(d => ({...d,verified:false,payments:d.payments.map((x,j) => j===i ? {...x,[key]:e.target.value} : x)}));}} /></div>)}</div>)}
    </div>
    <label className="flex items-start gap-3 text-sm"><Checkbox checked={draft.verified} onCheckedChange={v => setDraft(d => ({...d,verified:v === true}))} /><span>Je confirme les informations vérifiées du centre et du stagiaire, le bon parcours, les durées, prix, formateurs, planning et pièces réellement remis.</span></label>
    <div role="status" className="border-t pt-4 space-y-2"><h3 className="font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{validation.ready && !sourceError ? 'Document complet non signé' : validation.status}</h3>
      {validation.issues.length > 0 && <ul className="list-disc pl-5 space-y-1 text-sm text-destructive">{validation.issues.map((s,i) => <li key={i}>{s}</li>)}</ul>}
      {draft.fields.start && draft.fields.start < validation.earliestStart && <p className="text-sm font-medium">Report proposé : {validation.earliestStart} au plus tôt si conclusion aujourd’hui. À valider hors de ce document ; aucune session modifiée.</p>}
      <p className="text-sm text-muted-foreground">Aucune signature en ligne ni ouverture pédagogique n’est déclenchée par ce document. La date réelle de conclusion devra être contrôlée à la signature.</p>
    </div>
    <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => {setPreviewNow(new Date());setPreview(v=>!v);}}><Eye className="h-4 w-4 mr-2" />Aperçu du contrat</Button><Button variant="outline" onClick={() => void download(false)}><Download className="h-4 w-4 mr-2" />Télécharger le brouillon PDF</Button><Button disabled={!validation.ready || !!sourceError} onClick={() => void download(true)}><Download className="h-4 w-4 mr-2" />PDF complet non signé</Button></div>
    {preview && <article aria-label="Aperçu du contrat de formation" className="border-t pt-6 space-y-5">{contractSections(draft,previewNow).map(s => <section key={s.title} className="space-y-2"><h3 className="font-semibold">{s.title}</h3><p className="whitespace-pre-wrap text-sm leading-relaxed break-words">{s.text}</p>{s.title === 'Annexe 1 Programme et valorisation' && <div className="overflow-x-auto"><table className="w-full text-sm border-collapse"><thead><tr>{['Module / activités','Modalité','Durée (h)','Évaluation / suivi','Valeur (€)'].map(h=><th key={h} className="border p-2 text-left">{h}</th>)}</tr></thead><tbody>{draft.activities.map(a=><tr key={a.id}>{[`${a.title} — ${a.activities}`,a.modality,a.hours,a.evaluation,a.value].map((v,i)=><td key={i} className="border p-2">{v||'À compléter'}</td>)}</tr>)}</tbody></table></div>}</section>)}</article>}
  </section>;
}