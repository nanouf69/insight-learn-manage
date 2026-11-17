import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { chargerInventaireServeur } from '@/lib/quizAvantExamenTaxi/sourcesServeur';
import { transportQuizServeur } from '@/lib/quizAvantExamenTaxi/serveur';
import { QuizEleveAutonome } from '@/components/quiz-avant-examen-taxi/QuizEleveAutonome';
import type { ItemInventaire } from '@/lib/quizAvantExamenTaxi/inventaire';

/** No course tracking, presence, module registry or pedagogical-session hook. */
export default function QuizAvantExamenTaxi() {
  const [owner,setOwner]=useState<string|null>(null);
  const [items,setItems]=useState<ItemInventaire[]>([]);
  const [error,setError]=useState('');
  const [ready,setReady]=useState(false);
  const transport=useMemo(()=>owner?transportQuizServeur(owner):null,[owner]);
  useEffect(()=>{let alive=true;void (async()=>{
    try {
      const {data,error}=await supabase.auth.getUser();
      if(error||!data.user) throw new Error('Connectez-vous à votre compte TAXI pour accéder au quiz.');
      const api=transportQuizServeur(data.user.id); await api.lire();
      const bank=await chargerInventaireServeur();
      if(alive){setOwner(data.user.id);setItems(bank);setReady(true);}
    } catch(e){if(alive)setError((e as Error).message);}
  })();return()=>{alive=false;};},[]);
  return <main className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div className="space-y-2"><Badge variant="secondary">Facultatif · hors jalons</Badge><h1 className="text-2xl font-bold">Quiz avant examen TAXI</h1></div>
      <Button variant="outline" onClick={()=>window.location.assign('/cours-public')}>Retour aux cours</Button></header>
    {error?<p role="alert" className="text-destructive">{error}</p>:!ready?<p>Chargement…</p>:owner&&transport?<QuizEleveAutonome owner={owner} items={items} transport={transport}/>:null}
  </main>;
}