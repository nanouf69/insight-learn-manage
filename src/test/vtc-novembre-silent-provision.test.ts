import { describe,it,expect,vi } from 'vitest';
import {verifierPreparationSilencieuse,lierCompteConfirme,SESSIONS_VTC_NOVEMBRE} from '../../supabase/functions/create-apprenant-account/silentProvision';
function client(results:any[]) {
  const writes=vi.fn(); const c:any={from:vi.fn(()=>{const result=results.shift();const q:any={select:()=>q,eq:()=>q,is:()=>q,update:(v:any)=>{writes(v);return q},single:async()=>result,maybeSingle:async()=>result,then:(resolve:any)=>Promise.resolve(result).then(resolve)};return q;})};return {c,writes};
}
const learner={id:'target',email:'eleve@example.test',type_apprenant:'vtc'};
const row={session_id:SESSIONS_VTC_NOVEMBRE[0],sessions:{date_debut:'2026-11-02',date_fin:'2026-11-13',statut:'planifiee'}};
describe('Préparation VTC novembre strictement silencieuse',()=>{
  it('accepte inscription autorisée sans écriture ni envoi',async()=>{const {c,writes}=client([{data:learner},{data:[row]}]);await verifierPreparationSilencieuse(c,'target','ELEVE@example.test');expect(writes).not.toHaveBeenCalled();});
  it.each(['taxi','ta','va','continue-vtc'])('refuse autre parcours %s',async(type)=>{const {c}=client([{data:{...learner,type_apprenant:type}}]);await expect(verifierPreparationSilencieuse(c,'target',learner.email)).rejects.toThrow();});
  it('refuse email différent',async()=>{const {c}=client([{data:learner}]);await expect(verifierPreparationSilencieuse(c,'target','autre@example.test')).rejects.toThrow();});
  it.each(['liste_attente','emargements_exclus'])('refuse %s',async(flag)=>{const {c}=client([{data:learner},{data:[{...row,[flag]:true}]}]);await expect(verifierPreparationSilencieuse(c,'target',learner.email)).rejects.toThrow();});
  it('rattachement écrit uniquement auth_user_id et confirme propriétaire unique',async()=>{const {c,writes}=client([{data:{id:'target',auth_user_id:'user'}},{data:[{id:'target',auth_user_id:'user'}]}]);await lierCompteConfirme(c,'target','user');expect(writes.mock.calls).toEqual([[{auth_user_id:'user'}]]);});
  it('refuse concurrence sans faux succès',async()=>{const {c}=client([{data:null}]);await expect(lierCompteConfirme(c,'target','user')).rejects.toThrow('concurrent');});
});