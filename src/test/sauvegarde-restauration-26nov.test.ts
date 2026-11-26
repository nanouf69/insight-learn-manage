// @vitest-environment node
import { it, expect } from 'vitest';
import { mkdtempSync, chownSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { harness } from './sauvegarde-cle-reprise-07nov.test';
import { EXPORT_TABLES } from '../../supabase/functions/sauvegarde-quotidienne-eleves/manifest';

it('restores all 39 registered tables with 478 captured real column types, nullability and primary keys into disposable PostgreSQL',async()=>{
  const d=mkdtempSync('/tmp/backup-restore-');
  const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('PG')&&!['DATABASE_URL','SUPABASE_SERVICE_ROLE_KEY'].includes(k)));
  const as=process.getuid?.()===0?['setpriv','--reuid=1000','--regid=1000','--clear-groups']:[];
  if(as.length)chownSync(d,1000,1000);
  const pg=(args:string[])=>as.length?execFileSync(as[0],[...as.slice(1),...args],{env}):execFileSync(args[0],args.slice(1),{env});
  const sql=(db:string,query:string)=>execFileSync('psql',['-X','-At','-h',d,'-p','55527','-U','postgres','-d',db,'-v','ON_ERROR_STOP=1'],{env,input:query,maxBuffer:32*1024*1024}).toString().trim();
  pg(['initdb','-D',`${d}/data`,'-U','postgres','-A','trust','--no-locale','--encoding=UTF8']);
  pg(['pg_ctl','-D',`${d}/data`,'-l',`${d}/log`,'-o',`-k ${d} -p 55527 -h ""`,'-w','start']);
  try{
    sql('postgres','CREATE DATABASE source_fictive;');sql('postgres','CREATE DATABASE restauration_fictive;');
    type Column={name:string;type:string;not_null:boolean};
    type Table={name:string;columns:Column[];primary_key:string};
    const catalogue=JSON.parse(readFileSync('src/test/fixtures/sauvegarde-catalogue-20261126.json','utf8')) as {tables:Table[]};
    const indexes=JSON.parse(readFileSync('src/test/fixtures/sauvegarde-cursor-index-20261126.json','utf8')) as {table:string;columns:string[];partial:boolean;definition:string}[];
    expect(catalogue.tables.map(t=>t.name).sort()).toEqual(EXPORT_TABLES.map(([t])=>t).sort());
    expect(catalogue.tables.reduce((sum,t)=>sum+t.columns.length,0)).toBe(478);
    const rows:Record<string,Record<string,unknown>[]>={};
    const value=(column:Column,n:number):unknown=>{
      if(!column.not_null)return null;
      switch(column.type){
        case 'uuid':return `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
        case 'text':return `FICTIF-${String(n).padStart(8,'0')} — été, « apostrophe ' »`;
        case 'jsonb':return {fictif:true,texte:"Été ' \n",choix:['A','C'],nul:null,zero:0};
        case 'timestamp with time zone':return '2026-11-26T09:05:00+00:00';
        case 'date':return '2026-11-26';
        case 'boolean':return false;
        case 'numeric':return 12.5;
        case 'bigint':case 'integer':case 'smallint':return n;
        case 'integer[]':return [1,2];
        case 'uuid[]':return ['00000000-0000-4000-8000-000000000001'];
        default:throw Error(`Uncovered real type ${column.type}`);
      }
    };
    const literal=(value:unknown)=>`'${JSON.stringify(value).replace(/'/g,"''")}'::jsonb`;
    for(const [t,pk] of EXPORT_TABLES){
      const table=catalogue.tables.find(table=>table.name===t);
      if(!table)throw Error(`Missing captured schema ${t}`);
      // module_editor_state uses its real NOT NULL UNIQUE module_id, not its UUID PK.
      const primaryMatches=table.primary_key===`PRIMARY KEY (${pk.split(',').join(', ')})`;
      const cursorIndex=indexes.find(index=>index.table===t&&!index.partial&&index.columns.join(',')===pk);
      expect(primaryMatches||Boolean(cursorIndex),`unique cursor for ${t}`).toBe(true);
      if(!primaryMatches)expect(table.columns.filter(c=>pk.split(',').includes(c.name)).every(c=>c.not_null)).toBe(true);
      const count=t==='reponses_apprenants_journal'?4501:t==='bilan_future_drafts'?2501:2;
      rows[t]=Array.from({length:count},(_,i)=>Object.fromEntries(table.columns.map(c=>[c.name,value(c,i+1)])));
      if(t==='bilan_future_drafts')rows[t]=rows[t].map(r=>({...r,receipt_id:'00000000-0000-4000-8000-000000000001',question_id:1}));
      const schema=`CREATE TABLE ${t}(${table.columns.map(c=>`"${c.name}" ${c.type}${c.not_null?' NOT NULL':''}`).join(',')},${table.primary_key});`;
      const indexSql=cursorIndex?cursorIndex.definition+';':'';
      sql('source_fictive',schema+indexSql+`INSERT INTO ${t} SELECT * FROM jsonb_populate_recordset(null::${t},${literal(rows[t])});`);
      sql('restauration_fictive',schema+indexSql);
      // Source reads come from a real, isolated DB; transport/storage are synthetic.
      rows[t]=JSON.parse(sql('source_fictive',`SELECT jsonb_agg(to_jsonb(r) ORDER BY ${pk}) FROM ${t} r;`));
    }
    let outages=2;
    const h=harness({rows,echec:({table,kind,gt})=>table==='reponses_apprenants_journal'&&kind==='read'&&gt===2000&&outages-->0?{code:'57014',message:'FICTIF timeout'}:null});
    const fin=await h.run();expect(fin.ok).toBe(true);
    const manifest=h.objects.get('2026-11-07/_export_termine.json');
    expect(manifest.table_names).toHaveLength(EXPORT_TABLES.length);
    // Every byte hash is checked before any restore, not just a kickoff/count.
    for(const [path,metadata] of Object.entries(manifest.lots) as [string,{sha256:string}][]){
      expect(createHash('sha256').update(JSON.stringify(h.objects.get(path))).digest('hex')).toBe(metadata.sha256);
    }
    for(const [t,pk] of EXPORT_TABLES){
      const parts=h.parts(`2026-11-07/${t}/`);
      expect(parts).toHaveLength(rows[t].length);
      sql('restauration_fictive',`INSERT INTO ${t} SELECT * FROM jsonb_populate_recordset(null::${t},${literal(parts)});`);
      const original=sql('source_fictive',`SELECT md5(jsonb_agg(to_jsonb(r) ORDER BY ${pk})::text) FROM ${t} r;`);
      const restored=sql('restauration_fictive',`SELECT md5(jsonb_agg(to_jsonb(r) ORDER BY ${pk})::text) FROM ${t} r;`);
      expect(restored).toBe(original);
      expect(sql('source_fictive',`SELECT count(*) FROM ${t}`)).toBe(sql('restauration_fictive',`SELECT count(*) FROM ${t}`));
    }
    expect(fin.restauration).toBe('non_prouvee'); // production export must never claim this fixture validation.
  }finally{pg(['pg_ctl','-D',`${d}/data`,'-m','immediate','stop']);}
},60000);