import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { NotesParSession } from './NotesParSession';
import { lectureNotesBornee, type SuiviChargementNotes } from './chargementNotesSession';
import type { ReleveSession } from './notesSession';
import type { GroupeSessionCrm } from './noyauReel';
afterEach(()=>{cleanup();vi.useRealTimers();});
const sessions=['jour','soir'].map(id=>({cle:`crm:${id}`,libelle:id,type:'crm',debut:'2026-01-01',fin:'2027-12-31',examens:[]})) as unknown as GroupeSessionCrm[];
const result:ReleveSession={inscrits:[{id:'a',nom:'FICTIF',prenom:'Test',type_apprenant:'vtc'}],examens:[{id:'EB1',numero:1,filiere:'VTC',matieres:[]}],notes:{a:{1:{etat:'definitif',note:13}}},erreur:null};
const select=(id:string)=>fireEvent.change(screen.getByLabelText('Session du relevé'),{target:{value:`crm:${id}`}});
it('étapes réelles, compteur seulement mesurable, résultats partiels et disparition au succès',async()=>{
 let suivi:SuiviChargementNotes|undefined;let finish:(r:ReleveSession)=>void=()=>{};
 const charger=vi.fn((_id:string,s?:SuiviChargementNotes)=>{suivi=s;return new Promise<ReleveSession>(r=>finish=r);});
 render(<NotesParSession sessions={sessions} charger={charger} souscrire={()=>()=>{}}/>);select('jour');
 await screen.findByRole('progressbar',{name:'Chargement des candidats'});
 expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
 act(()=>{suivi?.partiel?.({...result,notes:{},examens:[]});suivi?.progression?.({etape:'Récupération des notes'});});
 expect(screen.getByText('FICTIF Test')).toBeInTheDocument();
 expect(screen.getByText(/Temps restant indisponible/)).toBeInTheDocument();
 act(()=>suivi?.progression?.({etape:'Préparation du tableau',charges:1,total:2}));
 expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow','50');
 await act(async()=>finish(result));expect(screen.queryByRole('progressbar')).toBeNull();expect(screen.getByText('13 /20')).toBeInTheDocument();
});
it('session soirée : ancienne session annulée, réponse tardive ignorée sans attente',async()=>{
 let old:SuiviChargementNotes|undefined;let finish:(r:ReleveSession)=>void=()=>{};
 const charger=vi.fn((id:string,s?:SuiviChargementNotes)=>{if(id==='jour'){old=s;return new Promise<ReleveSession>(r=>finish=r);}return Promise.resolve({...result,inscrits:[],notes:{}});});
 render(<NotesParSession sessions={sessions} charger={charger} souscrire={()=>()=>{}}/>);select('jour');await screen.findByRole('progressbar');select('soir');
 await screen.findByText('Aucun inscrit — Aucune note définitive (0/0).');expect(old?.signal?.aborted).toBe(true);
 await act(async()=>{old?.partiel?.(result);finish(result);});expect(screen.queryByText('FICTIF Test')).toBeNull();
});
it('échec et Réessayer : garde les notes confirmées et ne recrée pas un relevé vide',async()=>{
 const charger=vi.fn().mockResolvedValueOnce(result).mockRejectedValueOnce(new Error('Réseau indisponible')).mockResolvedValue(result);
 render(<NotesParSession sessions={sessions} charger={charger} souscrire={()=>()=>{}}/>);select('jour');await screen.findByText('13 /20');
 fireEvent.click(screen.getByRole('button',{name:'Actualiser'}));await screen.findByRole('alert');expect(screen.getByText('13 /20')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Réessayer'}));await waitFor(()=>expect(screen.queryByRole('alert')).toBeNull());expect(charger).toHaveBeenCalledTimes(3);
});
it('timeout borné ne laisse pas un chargement infini',async()=>{
 vi.useFakeTimers();const task=lectureNotesBornee(new Promise(()=>{}),new AbortController().signal);
 const refused=expect(task).rejects.toThrow('60 secondes');await vi.advanceTimersByTimeAsync(60_000);await refused;
});