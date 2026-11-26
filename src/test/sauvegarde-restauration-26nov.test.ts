// @vitest-environment node
import { it, expect } from 'vitest';
import { mkdtempSync, chownSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { harness, jeuFictif } from './sauvegarde-cle-reprise-07nov.test';
import { EXPORT_TABLES } from '../../supabase/functions/sauvegarde-quotidienne-eleves/manifest';

it('exports all registered synthetic tables and restores exact rows into a separate disposable PostgreSQL database',async()=>{
  const d=mkdtempSync('/tmp/backup-restore-');
  const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('PG')&&!['DATABASE_URL','SUPABASE_SERVICE_ROLE_KEY'].includes(k)));
  const as=process.getuid?.()===0?['setpriv','--reuid=1000','--regid=1000','--clear-groups']:[];
  if(as.length)chownSync(d,1000,1000);
  const pg=(args:string[])=>as.length?execFileSync(as[0],[...as.slice(1),...args],{env}):execFileSync(args[0],args.slice(1),{env});
  const sql=(db:string,query:string)=>execFileSync('psql',['-X','-At','-h',d,'-p','55527','-U','postgres','-d',db,'-v','ON_ERROR_STOP=1'],{env,input:query}).toString().trim();
  pg(['initdb','-D',`${d}/data`,'-U','postgres','-A','trust','--no-locale']);
  pg(['pg_ctl','-D',`${d}/data`,'-l',`${d}/log`,'-o',`-k ${d} -p 55527 -h ""`,'-w','start']);
  try{
    sql('postgres','CREATE DATABASE source_fictive;');sql('postgres','CREATE DATABASE restauration_fictive;');
    const rows=jeuFictif(4501);
    rows.bilan_future_drafts=Array.from({length:2501},(_,i)=>({receipt_id:'00000000-0000-4000-8000-000000000001',question_id:'Q1',revision:i+1}));
    const literal=(value:unknown)=>`'${JSON.stringify(value).replace(/'/g,"''")}'::jsonb`;
    for(const [t,pk] of EXPORT_TABLES){
      const keys=pk.split(',');
      const columns=[...new Set([...keys,...rows[t].flatMap(r=>Object.keys(r))])];
      const schema=`CREATE TABLE ${t}(${columns.map(c=>`${c} ${['revision','module_id','exercise_id'].includes(c)?'integer':'text'}`).join(',')},PRIMARY KEY(${pk}));`;
      sql('source_fictive',schema+`INSERT INTO ${t} SELECT * FROM jsonb_populate_recordset(null::${t},${literal(rows[t])});`);
      sql('restauration_fictive',schema);
      // Source reads come from a real, isolated DB; transport/storage are synthetic.
      rows[t]=JSON.parse(sql('source_fictive',`SELECT jsonb_agg(to_jsonb(r) ORDER BY ${pk}) FROM ${t} r;`));
    }
    const h=harness({rows});const fin=await h.run();expect(fin.ok).toBe(true);
    const manifest=h.objects.get('2026-11-07/_export_termine.json');
    expect(manifest.table_names).toHaveLength(EXPORT_TABLES.length);
    for(const [t,pk] of EXPORT_TABLES){
      const parts=h.parts(`2026-11-07/${t}/`);
      expect(parts).toHaveLength(rows[t].length);
      sql('restauration_fictive',`INSERT INTO ${t} SELECT * FROM jsonb_populate_recordset(null::${t},${literal(parts)});`);
      const original=sql('source_fictive',`SELECT md5(jsonb_agg(to_jsonb(r) ORDER BY ${pk})::text) FROM ${t} r;`);
      const restored=sql('restauration_fictive',`SELECT md5(jsonb_agg(to_jsonb(r) ORDER BY ${pk})::text) FROM ${t} r;`);
      expect(restored).toBe(original);
    }
    expect(fin.restauration).toBe('non_prouvee'); // production export must never claim this fixture validation.
  }finally{pg(['pg_ctl','-D',`${d}/data`,'-m','immediate','stop']);}
},60000);