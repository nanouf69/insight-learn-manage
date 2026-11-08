/* Private test transport: intercepted by Playwright, never imported by the app. */
async function request(body: unknown) {
  const r = await fetch('/fixture-sql', { method: 'POST', body: JSON.stringify(body) });
  return r.json();
}
class Query {
  filters: Record<string, unknown> = {};
  constructor(private table: string) {}
  select() { return this; }
  eq(k: string, v: unknown) { this.filters[k] = v; return this; }
  in(k: string, v: unknown) { this.filters[k] = v; return this; }
  like() { return this; }
  order() { return this; }
  limit() { return this; }
  range() { return this; }
  maybeSingle() { return request({table:this.table,filters:this.filters,single:true}); }
  then(ok: any, fail: any) { return request({table:this.table,filters:this.filters}).then(ok,fail); }
}
const callbacks = new Set<()=>void>();
(window as any).__fixtureEvent = () => callbacks.forEach(cb=>cb());
export const supabase = {
  from:(table:string)=>new Query(table),
  rpc:(name:string,args:unknown)=>request({rpc:name,args}),
  channel:()=>{
    const owned = new Set<()=>void>();
    const c={on:(_e:unknown,_f:unknown,cb:()=>void)=>{callbacks.add(cb);owned.add(cb);return c;},subscribe:(cb?:any)=>{cb?.('SUBSCRIBED');return c;},owned};return c;
  },
  removeChannel:(c:any)=>{c.owned.forEach((cb:any)=>callbacks.delete(cb));},
  auth:{getSession:async()=>({data:{session:{user:{id:'22222222-2222-4222-8222-000000000002'},access_token:'fixture-only'}}}),getUser:async()=>({data:{user:{id:'22222222-2222-4222-8222-000000000002'}}})},
};