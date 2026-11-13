// @vitest-environment node
import {it,expect} from 'vitest';
import {PDFDocument} from 'pdf-lib';
import {genererPdfRempli} from '@/lib/documentSigneDownload';
import type {ChampDocument} from '@/lib/documentsASigner';
it('ancien PDF signé conservé, nouvelles copies distinctes et signature autre zone présente',async()=>{
 const original=await PDFDocument.create();original.addPage([595,842]);const bytes=await original.save();const snapshot=Array.from(bytes);
 const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2i0AAAAASUVORK5CYII=';
 const zone=(id:string,x:number):ChampDocument=>({id,type:'signature',label:id,page:1,x,y:70,w:25,h:10,requis:true});
 const url=`data:application/pdf;base64,${Buffer.from(bytes).toString('base64')}`;
 const historic=await genererPdfRempli(url,[zone('eleve',10),zone('formateur',60)],{eleve:png,formateur:png});
 const frozen=Array.from(historic);
 const pending=await genererPdfRempli(url,[zone('eleve',10),zone('formateur',60)],{formateur:png});
 const current=await genererPdfRempli(url,[zone('eleve',10),zone('formateur',60)],{eleve:png,formateur:png});
 expect(Array.from(bytes)).toEqual(snapshot);expect(Array.from(historic)).toEqual(frozen);
 expect((await PDFDocument.load(pending)).getPageCount()).toBe(1);expect((await PDFDocument.load(current)).getPageCount()).toBe(1);
 const objects=(data:Uint8Array)=>Buffer.from(data).toString('latin1').match(/\/Subtype \/Image/g)?.length??0;
 expect(objects(pending)).toBeGreaterThan(0);expect(objects(historic)).toBeGreaterThan(objects(pending));
});