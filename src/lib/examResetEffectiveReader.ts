/** Candidate read adapter only; NOT connected to the live client before approval.
 * Tests can run existing readers against the exact effective projection mapping.
 * Writes are explicitly forbidden, including inserts into effective views.
 */
export const RESET_EFFECTIVE_READ_TABLES:Record<string,string>={
 core_exam_resets:'core_exam_resets_effective',
 core_tentatives_neutralisees:'core_exam_neutralisations_effective',
 exam_retake_authorizations:'exam_retake_authorizations_effective',
};
export function effectiveExamReadClient<T extends {from:(name:any)=>any}>(client:T):T {
 return new Proxy(client,{
  get(target,key){
   if(key!=='from')return Reflect.get(target,key);
   return (table:string)=>{
    const query=target.from(RESET_EFFECTIVE_READ_TABLES[table]??table);
    return new Proxy(query,{get(q,method){
     if(['insert','update','upsert','delete'].includes(String(method)))return ()=>{throw new Error('Lecture seule des examens restaurés.');};
     const value=Reflect.get(q,method);return typeof value==='function'?value.bind(q):value;
    }});
   };
  },
 });
}