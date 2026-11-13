import type jsPDF from 'jspdf';
/** Identification only, never a signature. Reserve the bottom band before drawing any image. */
export function nomSousSignature(doc:jsPDF,apprenant:{nom?:string;prenom?:string},x:number,y:number,width:number,height=8) {
  const name=[apprenant.nom,apprenant.prenom].filter(Boolean).join(' ').trim();
  if(!name)return;
  const font=doc.getFont(),size=doc.getFontSize(),color=doc.getTextColor();
  doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.setTextColor(85,85,85);
  let lines:string[]=doc.splitTextToSize(name,width-4);
  let fs=6.5;
  while(lines.length*fs*0.3528*1.1>height-1&&fs>4){fs-=0.5;doc.setFontSize(fs);lines=doc.splitTextToSize(name,width-4);}
  doc.text(lines,x+width/2,y+1+fs*0.3528,{align:'center',lineHeightFactor:1.1});
  doc.setFont(font.fontName,font.fontStyle);doc.setFontSize(size);doc.setTextColor(color);
}