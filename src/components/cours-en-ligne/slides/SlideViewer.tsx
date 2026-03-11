import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, Eye, Plus, Trash2 } from "lucide-react";
import type { Slide, SlideBlock } from "./t3p-partie1-data";

const SLIDE_BG = "bg-gradient-to-br from-[#0a1628] via-[#0f1d36] to-[#081224]";

interface SlideViewerProps {
  slides: Slide[];
  titre: string;
  brand?: string;
  onBack: () => void;
  editable?: boolean;
  onSlidesChange?: (slides: Slide[]) => void;
  onLastSlideReached?: () => void;
}

// ---- Editable text helpers ----
function EditableText({ value, onChange, className, tag, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  tag?: "h1" | "h2" | "h3" | "p" | "span";
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`bg-transparent border-b border-dashed border-primary/40 focus:border-primary outline-none w-full ${className || ""}`}
      placeholder={placeholder || "..."}
    />
  );
}

function EditableMultiline({ value, onChange, className, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`bg-transparent border border-dashed border-primary/40 focus:border-primary outline-none w-full rounded p-1 resize-y min-h-[40px] ${className || ""}`}
      placeholder={placeholder || "..."}
      rows={2}
    />
  );
}

// ---- Slide renderers (read-only and editable) ----

function SlideTitle({ slide, editing, onChange }: { slide: Slide & { type: "title" }; editing: boolean; onChange?: (s: Slide) => void }) {
  if (!editing) {
    const hasImage = !!slide.image;
    return (
      <div className={`flex ${hasImage ? 'flex-row' : 'flex-col'} items-center justify-center min-h-full ${SLIDE_BG} text-white p-8 rounded-xl`}>
        <div className={`flex flex-col items-center ${hasImage ? 'flex-1' : ''}`}>
          <h1 className="text-2xl md:text-3xl font-bold text-white text-center leading-tight mb-4">{slide.title}</h1>
          {slide.subtitle && <p className="text-base md:text-lg text-blue-200 text-center mb-6">{slide.subtitle}</p>}
          <div className="w-20 h-1 bg-white rounded mb-6" />
          {slide.footer && <p className="text-sm text-slate-400 text-center">{slide.footer}</p>}
          {slide.brand && <p className="text-xs text-slate-500 mt-4">{slide.brand}</p>}
        </div>
        {hasImage && (
          <div className="w-[40%] flex-shrink-0 ml-6">
            <img src={slide.image} alt={slide.title} className="w-full h-auto rounded-xl object-cover shadow-2xl" />
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={`flex flex-col items-center justify-center min-h-full ${SLIDE_BG} text-white p-8 rounded-xl space-y-3`}>
      <EditableText value={slide.title} onChange={v => onChange?.({ ...slide, title: v })} className="text-2xl font-bold text-white text-center" placeholder="Titre" />
      <EditableText value={slide.subtitle || ""} onChange={v => onChange?.({ ...slide, subtitle: v })} className="text-lg text-blue-200 text-center" placeholder="Sous-titre" />
      <div className="w-20 h-1 bg-white rounded" />
      <EditableText value={slide.footer || ""} onChange={v => onChange?.({ ...slide, footer: v })} className="text-sm text-slate-400 text-center" placeholder="Pied de page" />
      <EditableText value={slide.brand || ""} onChange={v => onChange?.({ ...slide, brand: v })} className="text-xs text-slate-500" placeholder="Marque" />
    </div>
  );
}

function SlideSommaire({ slide, editing, onChange }: { slide: Slide & { type: "sommaire" }; editing: boolean; onChange?: (s: Slide) => void }) {
  const updateItem = (idx: number, field: "n" | "label", val: string) => {
    const items = [...slide.items];
    items[idx] = { ...items[idx], [field]: val };
    onChange?.({ ...slide, items });
  };
  const addItem = () => onChange?.({ ...slide, items: [...slide.items, { n: String(slide.items.length + 1), label: "Nouveau chapitre", page: 0 }] });
  const removeItem = (idx: number) => onChange?.({ ...slide, items: slide.items.filter((_, i) => i !== idx) });

  return (
    <div className={`p-6 ${SLIDE_BG} min-h-full text-white`}>
      {editing ? <EditableText value={slide.title} onChange={v => onChange?.({ ...slide, title: v })} className="text-2xl font-bold text-white mb-6" /> : <h2 className="text-2xl font-bold text-white mb-6">{slide.title}</h2>}
      <div className="space-y-2">
        {slide.items.map((it, i) => (
          <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${it.page === 0 ? 'bg-blue-950/60 mt-4' : 'hover:bg-blue-900/40'}`}>
            {editing ? (
              <>
                <EditableText value={it.n} onChange={v => updateItem(i, "n", v)} className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm bg-white/15 text-white text-center" />
                <EditableText value={it.label} onChange={v => updateItem(i, "label", v)} className="text-sm font-medium flex-1 text-white" />
                <button onClick={() => removeItem(i)} className="text-red-300 hover:text-red-200 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
              </>
            ) : (
              <>
                <span className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${it.page === 0 ? 'bg-blue-950 text-white' : 'bg-white/15 text-white'}`}>{it.n}</span>
                <span className={`text-sm font-medium flex-1 ${it.page === 0 ? 'text-white font-bold' : 'text-blue-200'}`}>{it.label}</span>
              </>
            )}
          </div>
        ))}
        {editing && <Button variant="outline" size="sm" className="mt-2 gap-1 border-white/30 text-white hover:bg-white/10" onClick={addItem}><Plus className="w-3 h-3" /> Ajouter</Button>}
      </div>
    </div>
  );
}

function SlideSection({ slide, editing, onChange }: { slide: Slide & { type: "section" }; editing: boolean; onChange?: (s: Slide) => void }) {
  if (!editing) {
    return (
      <div className={`flex flex-col items-start justify-center min-h-full ${SLIDE_BG} text-white p-8 rounded-xl`}>
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-3">{slide.title}</h1>
        {slide.subtitle && <p className="text-base text-blue-200">{slide.subtitle}</p>}
        <div className="w-16 h-1 bg-white rounded mt-4" />
      </div>
    );
  }
  return (
    <div className={`flex flex-col items-start justify-center min-h-full ${SLIDE_BG} text-white p-8 rounded-xl space-y-3`}>
      <EditableText value={slide.title} onChange={v => onChange?.({ ...slide, title: v })} className="text-2xl font-bold text-white" placeholder="Titre section" />
      <EditableText value={slide.subtitle || ""} onChange={v => onChange?.({ ...slide, subtitle: v })} className="text-base text-blue-200" placeholder="Sous-titre" />
      <div className="w-16 h-1 bg-white rounded mt-4" />
    </div>
  );
}

function EditableBlock({ block, onChange, onRemove }: { block: SlideBlock; onChange: (b: SlideBlock) => void; onRemove: () => void }) {
  const updatePoint = (idx: number, val: string) => {
    const points = [...block.points];
    points[idx] = val;
    onChange({ ...block, points });
  };
  const addPoint = () => onChange({ ...block, points: [...block.points, "Nouveau point"] });
  const removePoint = (idx: number) => onChange({ ...block, points: block.points.filter((_, i) => i !== idx) });

  return (
    <div className="rounded-lg border-l-4 bg-white/8 p-3 space-y-2" style={{ borderColor: block.color }}>
      <div className="flex items-center gap-2">
        <EditableText value={block.heading} onChange={v => onChange({ ...block, heading: v })} className="font-bold text-sm flex-1 text-white" placeholder="Titre du bloc" />
        <input type="color" value={block.color} onChange={e => onChange({ ...block, color: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0 p-0" title="Couleur" />
        <button onClick={onRemove} className="text-red-300 hover:text-red-200 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      {block.points.map((p, j) => (
        <div key={j} className="flex items-start gap-1">
           <span className="text-blue-300 text-xs mt-1">▸</span>
          <EditableText value={p} onChange={v => updatePoint(j, v)} className="text-xs text-blue-200 flex-1" />
          <button onClick={() => removePoint(j)} className="text-red-300/60 hover:text-red-200 p-0.5"><Trash2 className="w-3 h-3" /></button>
        </div>
      ))}
      <button onClick={addPoint} className="text-xs text-blue-300 hover:underline">+ Point</button>
    </div>
  );
}

function SlideContent({ slide, editing, onChange }: { slide: Slide & { type: "content" }; editing: boolean; onChange?: (s: Slide) => void }) {
  const updateBlock = (idx: number, block: SlideBlock) => {
    const blocks = [...(slide.blocks || [])];
    blocks[idx] = block;
    onChange?.({ ...slide, blocks });
  };
  const addBlock = () => onChange?.({ ...slide, blocks: [...(slide.blocks || []), { heading: "Nouveau bloc", color: "#3b82f6", points: ["Point 1"] }] });
  const removeBlock = (idx: number) => onChange?.({ ...slide, blocks: (slide.blocks || []).filter((_, i) => i !== idx) });

  if (!editing) {
    const hasImage = !!(slide as any).image;
    return (
      <div className={`p-5 ${SLIDE_BG} min-h-full text-white ${hasImage ? 'flex gap-4' : 'space-y-4'}`}>
        <div className={`${hasImage ? 'flex-1 space-y-3' : 'space-y-4'}`}>
          <div>
            <h2 className="text-xl font-bold text-white">{slide.title}</h2>
            {slide.ref && <p className="text-xs text-blue-300 italic mt-1">{slide.ref}</p>}
          </div>
          {slide.intro && <p className="text-sm text-blue-200 leading-relaxed">{slide.intro}</p>}
          <div className="space-y-3">
            {slide.blocks?.map((b, i) => (
              <div key={i} className="rounded-lg border-l-4 bg-white/8 p-3" style={{ borderColor: b.color }}>
                <h3 className="font-bold text-sm mb-2" style={{ color: b.color }}>{b.heading}</h3>
                <ul className="space-y-1">
                  {b.points.map((p, j) => (
                     <li key={j} className="text-xs text-blue-200 leading-relaxed pl-3 relative before:content-['▸'] before:absolute before:left-0 before:text-blue-400">{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
           {slide.keyRule && (
             <div className="bg-white/8 border border-white/15 rounded-lg p-3">
                <p className="text-xs font-semibold text-white">✔ {slide.keyRule}</p>
             </div>
          )}
        </div>
        {hasImage && (
          <div className="w-[35%] flex-shrink-0 flex items-center">
            <img src={(slide as any).image} alt={slide.title} className="w-full h-auto rounded-xl object-cover shadow-lg max-h-[80%]" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`p-5 space-y-4 ${SLIDE_BG} min-h-full text-white`}>
      <EditableText value={slide.title} onChange={v => onChange?.({ ...slide, title: v })} className="text-xl font-bold text-white" placeholder="Titre" />
      <EditableText value={slide.ref || ""} onChange={v => onChange?.({ ...slide, ref: v })} className="text-xs text-blue-300 italic" placeholder="Référence" />
      <EditableMultiline value={slide.intro || ""} onChange={v => onChange?.({ ...slide, intro: v })} className="text-sm text-blue-200" placeholder="Introduction" />
      <div className="space-y-3">
        {(slide.blocks || []).map((b, i) => (
          <EditableBlock key={i} block={b} onChange={block => updateBlock(i, block)} onRemove={() => removeBlock(i)} />
        ))}
        <Button variant="outline" size="sm" className="gap-1 border-white/30 text-white hover:bg-white/10" onClick={addBlock}><Plus className="w-3 h-3" /> Ajouter un bloc</Button>
      </div>
      <EditableText value={slide.keyRule || ""} onChange={v => onChange?.({ ...slide, keyRule: v })} className="text-xs text-white bg-white/8 p-2 rounded" placeholder="Règle clé (optionnel)" />
    </div>
  );
}

function SlideTable({ slide, editing, onChange }: { slide: Slide & { type: "table" }; editing: boolean; onChange?: (s: Slide) => void }) {
  const updateHeader = (idx: number, val: string) => {
    const headers = [...slide.headers];
    headers[idx] = val;
    onChange?.({ ...slide, headers });
  };
  const updateCell = (ri: number, ci: number, val: string) => {
    const rows = slide.rows.map(r => [...r]);
    rows[ri][ci] = val;
    onChange?.({ ...slide, rows });
  };
  const addRow = () => onChange?.({ ...slide, rows: [...slide.rows, slide.headers.map(() => "")] });
  const removeRow = (idx: number) => onChange?.({ ...slide, rows: slide.rows.filter((_, i) => i !== idx) });
  const addCol = () => onChange?.({ ...slide, headers: [...slide.headers, "Col"], rows: slide.rows.map(r => [...r, ""]) });

  if (!editing) {
    return (
      <div className={`p-5 space-y-4 ${SLIDE_BG} min-h-full text-white`}>
        <h2 className="text-xl font-bold text-white">{slide.title}</h2>
        {slide.intro && <p className="text-sm text-blue-200 mb-2">{slide.intro}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead><tr>{slide.headers.map((h, i) => <th key={i} className="bg-blue-950 text-white p-2 text-left font-semibold">{h}</th>)}</tr></thead>
            <tbody>{slide.rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white/8" : "bg-white/4"}>
                {row.map((cell, j) => <td key={j} className={`p-2 border-b border-white/10 ${j === 0 ? "font-semibold text-white" : "text-blue-200"}`}>{cell}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
        {slide.keyRule && <div className="bg-white/8 border border-white/15 rounded-lg p-3"><p className="text-xs font-semibold text-white">✔ {slide.keyRule}</p></div>}
        {slide.extraSections?.map((section, i) => (
          <div key={i} className="mt-3">
            <h3 className="text-sm font-bold text-white mb-2">{section.heading}</h3>
            <ul className="space-y-1">{section.items.map((item, j) => <li key={j} className="text-xs text-blue-200 pl-3 relative before:content-['▸'] before:absolute before:left-0 before:text-blue-400">{item}</li>)}</ul>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`p-5 space-y-4 ${SLIDE_BG} min-h-full text-white`}>
      <EditableText value={slide.title} onChange={v => onChange?.({ ...slide, title: v })} className="text-xl font-bold text-white" />
      <EditableMultiline value={slide.intro || ""} onChange={v => onChange?.({ ...slide, intro: v })} className="text-sm text-blue-200" placeholder="Introduction" />
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead><tr>
            {slide.headers.map((h, i) => <th key={i} className="bg-blue-950 p-1"><EditableText value={h} onChange={v => updateHeader(i, v)} className="text-white font-semibold text-xs" /></th>)}
            <th className="bg-blue-950 p-1"><button onClick={addCol} className="text-blue-300 text-xs">+Col</button></th>
          </tr></thead>
          <tbody>{slide.rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white/8" : "bg-white/4"}>
              {row.map((cell, j) => <td key={j} className="p-1 border-b border-white/10"><EditableText value={cell} onChange={v => updateCell(i, j, v)} className="text-xs text-blue-200" /></td>)}
              <td className="p-1"><button onClick={() => removeRow(i)} className="text-red-300/60 hover:text-red-200"><Trash2 className="w-3 h-3" /></button></td>
            </tr>
          ))}</tbody>
        </table>
        <Button variant="outline" size="sm" className="mt-2 gap-1 border-white/30 text-white hover:bg-white/10" onClick={addRow}><Plus className="w-3 h-3" /> Ligne</Button>
      </div>
      <EditableText value={slide.keyRule || ""} onChange={v => onChange?.({ ...slide, keyRule: v })} className="text-xs text-white bg-white/8 p-2 rounded" placeholder="Règle clé" />
    </div>
  );
}

function SlideChiffres({ slide, editing, onChange }: { slide: Slide & { type: "chiffres" }; editing: boolean; onChange?: (s: Slide) => void }) {
  const updateItem = (idx: number, field: "val" | "desc", val: string) => {
    const items = [...slide.items];
    items[idx] = { ...items[idx], [field]: val };
    onChange?.({ ...slide, items });
  };
  const addItem = () => onChange?.({ ...slide, items: [...slide.items, { val: "0", desc: "Description" }] });
  const removeItem = (idx: number) => onChange?.({ ...slide, items: slide.items.filter((_, i) => i !== idx) });

  if (!editing) {
    return (
      <div className={`p-5 ${SLIDE_BG} min-h-full text-white`}>
        <h2 className="text-xl font-bold text-white mb-4">{slide.title}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {slide.items.map((it, i) => (
            <div key={i} className="bg-white/8 rounded-lg border border-white/15 p-3 text-center">
              <div className="text-lg font-bold text-white">{it.val}</div>
              <div className="text-xs text-blue-300 mt-1">{it.desc}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-5 space-y-4 ${SLIDE_BG} min-h-full text-white`}>
      <EditableText value={slide.title} onChange={v => onChange?.({ ...slide, title: v })} className="text-xl font-bold text-white" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {slide.items.map((it, i) => (
          <div key={i} className="bg-white/8 rounded-lg border border-white/15 p-3 text-center space-y-1 relative">
            <EditableText value={it.val} onChange={v => updateItem(i, "val", v)} className="text-lg font-bold text-white text-center" />
            <EditableText value={it.desc} onChange={v => updateItem(i, "desc", v)} className="text-xs text-blue-300 text-center" />
            <button onClick={() => removeItem(i)} className="absolute top-1 right-1 text-red-300/60 hover:text-red-200"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" className="gap-1 border-white/30 text-white hover:bg-white/10" onClick={addItem}><Plus className="w-3 h-3" /> Ajouter</Button>
    </div>
  );
}

function SlideSchema({ slide, editing, onChange }: { slide: Slide & { type: "schema" }; editing: boolean; onChange?: (s: Slide) => void }) {
  if (!editing) {
    return (
      <div className={`p-5 space-y-4 ${SLIDE_BG} min-h-full text-white`}>
        <h2 className="text-xl font-bold text-white">{slide.title}</h2>
        {slide.intro && <p className="text-sm text-blue-200 mb-2">{slide.intro}</p>}
        {slide.tables?.map((table, i) => (
          <div key={i} className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead><tr>{table.headers.map((h, j) => <th key={j} className="bg-blue-950 text-white p-2 text-left font-semibold">{h}</th>)}</tr></thead>
              <tbody>{table.rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-white/8" : "bg-white/4"}>
                  {row.map((cell, ci) => <td key={ci} className="p-2 border-b border-white/10 text-blue-200 text-xs">{cell}</td>)}
                </tr>
              ))}</tbody>
            </table>
          </div>
        ))}
        {slide.lists?.map((list, i) => (
           <div key={i} className="rounded-lg border-l-4 border-blue-500 bg-white/8 p-3">
            <h3 className="font-bold text-sm text-white mb-2">{list.heading}</h3>
            <ul className="space-y-1">{list.items.map((item, j) => <li key={j} className="text-xs text-blue-200 pl-3 relative before:content-['▸'] before:absolute before:left-0 before:text-blue-400">{item}</li>)}</ul>
          </div>
        ))}
        {slide.keyRule && <div className="bg-white/8 border border-white/15 rounded-lg p-3"><p className="text-xs font-semibold text-white">✔ {slide.keyRule}</p></div>}
      </div>
    );
  }

  return (
    <div className={`p-5 space-y-4 ${SLIDE_BG} min-h-full text-white`}>
      <EditableText value={slide.title} onChange={v => onChange?.({ ...slide, title: v })} className="text-xl font-bold text-white" />
      <EditableMultiline value={slide.intro || ""} onChange={v => onChange?.({ ...slide, intro: v })} className="text-sm text-blue-200" placeholder="Introduction" />
      <p className="text-xs text-blue-300 italic">Tableaux et listes (édition simplifiée)</p>
      {slide.lists?.map((list, i) => (
        <div key={i} className="rounded-lg border-l-4 border-blue-500 bg-white/8 p-3 space-y-1">
          <EditableText value={list.heading} onChange={v => {
            const lists = [...(slide.lists || [])];
            lists[i] = { ...lists[i], heading: v };
            onChange?.({ ...slide, lists });
          }} className="font-bold text-sm text-white" />
          {list.items.map((item, j) => (
            <div key={j} className="flex items-center gap-1">
              <span className="text-blue-400 text-xs">▸</span>
              <EditableText value={item} onChange={v => {
                const lists = [...(slide.lists || [])];
                const items = [...lists[i].items];
                items[j] = v;
                lists[i] = { ...lists[i], items };
                onChange?.({ ...slide, lists });
              }} className="text-xs text-blue-200 flex-1" />
            </div>
          ))}
        </div>
      ))}
      <EditableText value={slide.keyRule || ""} onChange={v => onChange?.({ ...slide, keyRule: v })} className="text-xs text-white bg-white/8 p-2 rounded" placeholder="Règle clé" />
    </div>
  );
}

function SlideSynthesis({ slide, editing, onChange }: { slide: Slide & { type: "synthesis" }; editing: boolean; onChange?: (s: Slide) => void }) {
  if (!editing) {
    return (
      <div className={`p-5 space-y-4 ${SLIDE_BG} min-h-full text-white`}>
        <h2 className="text-xl font-bold text-white">{slide.title}</h2>
        {slide.intro && <p className="text-sm text-blue-200 mb-2">{slide.intro}</p>}
        <div className="space-y-3">
          {slide.sections.map((s, i) => (
            <div key={i} className="rounded-lg border-l-4 bg-white/8 p-3" style={{ borderColor: s.color }}>
              <h3 className="font-bold text-sm mb-2" style={{ color: s.color }}>{s.heading}</h3>
              <ul className="space-y-1">{s.points.map((p, j) => <li key={j} className="text-xs text-blue-200 leading-relaxed pl-3 relative before:content-['▸'] before:absolute before:left-0 before:text-blue-400">{p}</li>)}</ul>
            </div>
          ))}
        </div>
        {slide.keyRule && <div className="bg-white/8 border border-white/15 rounded-lg p-3"><p className="text-xs font-semibold text-white">✔ {slide.keyRule}</p></div>}
      </div>
    );
  }

  const updateSection = (idx: number, field: string, val: any) => {
    const sections = [...slide.sections];
    sections[idx] = { ...sections[idx], [field]: val };
    onChange?.({ ...slide, sections });
  };

  return (
    <div className={`p-5 space-y-4 ${SLIDE_BG} min-h-full text-white`}>
      <EditableText value={slide.title} onChange={v => onChange?.({ ...slide, title: v })} className="text-xl font-bold text-white" />
      <EditableMultiline value={slide.intro || ""} onChange={v => onChange?.({ ...slide, intro: v })} className="text-sm text-blue-200" placeholder="Introduction" />
      <div className="space-y-3">
        {slide.sections.map((s, i) => (
          <div key={i} className="rounded-lg border-l-4 bg-white/8 p-3 space-y-2" style={{ borderColor: s.color }}>
            <div className="flex items-center gap-2">
              <EditableText value={s.heading} onChange={v => updateSection(i, "heading", v)} className="font-bold text-sm flex-1 text-white" />
              <input type="color" value={s.color} onChange={e => updateSection(i, "color", e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
            </div>
            {s.points.map((p, j) => (
              <div key={j} className="flex items-start gap-1">
                <span className="text-blue-400 text-xs mt-1">▸</span>
                <EditableText value={p} onChange={v => {
                  const points = [...s.points];
                  points[j] = v;
                  updateSection(i, "points", points);
                }} className="text-xs text-blue-200 flex-1" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <EditableText value={slide.keyRule || ""} onChange={v => onChange?.({ ...slide, keyRule: v })} className="text-xs text-white bg-white/8 p-2 rounded" placeholder="Règle clé" />
    </div>
  );
}

function renderSlide(slide: Slide, editing: boolean, onChange?: (s: Slide) => void) {
  switch (slide.type) {
    case "title": return <SlideTitle slide={slide} editing={editing} onChange={onChange} />;
    case "sommaire": return <SlideSommaire slide={slide} editing={editing} onChange={onChange} />;
    case "section": return <SlideSection slide={slide} editing={editing} onChange={onChange} />;
    case "content": return <SlideContent slide={slide} editing={editing} onChange={onChange} />;
    case "table": return <SlideTable slide={slide} editing={editing} onChange={onChange} />;
    case "chiffres": return <SlideChiffres slide={slide} editing={editing} onChange={onChange} />;
    case "schema": return <SlideSchema slide={slide} editing={editing} onChange={onChange} />;
    case "synthesis": return <SlideSynthesis slide={slide} editing={editing} onChange={onChange} />;
    default: return null;
  }
}

export default function SlideViewer({ slides, titre, brand, onBack, editable, onSlidesChange, onLastSlideReached }: SlideViewerProps) {
  const [idx, setIdx] = useState(0);
  const [editing, setEditing] = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 960, h: 540 });
  const containerRef = useRef<HTMLDivElement>(null);
  const total = slides.length;
  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(total - 1, i + 1));

  // Swipe support for mobile
  const touchStartRef = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.changedTouches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartRef.current;
    const endX = e.changedTouches[0]?.clientX;
    touchStartRef.current = null;
    if (startX == null || endX == null) return;
    const delta = endX - startX;
    if (Math.abs(delta) < 50) return;
    if (delta > 0) prev();
    else next();
  };

  const handleSlideChange = (updatedSlide: Slide) => {
    const newSlides = [...slides];
    newSlides[idx] = updatedSlide;
    onSlidesChange?.(newSlides);
  };

  useEffect(() => {
    if (total > 0 && idx === total - 1) {
      onLastSlideReached?.();
    }
  }, [idx, total, onLastSlideReached]);

  // Measure container and compute scale
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    };
    update();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Scale slide (1920x1080) to fit container
  const SLIDE_W = 1920;
  const SLIDE_H = 1080;
  const scale = Math.min(containerSize.w / SLIDE_W, containerSize.h / SLIDE_H);

  const brandText = brand || "FTRANSPORT - SERVICES PRO • Qualiopi • CPF • Lyon";

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 320 }}>
      {/* Header */}
      <div className="bg-[#081224] text-white px-4 py-2 flex items-center justify-between rounded-t-xl border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/10" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="font-bold text-white text-sm truncate">{titre}</span>
        </div>
        <div className="flex items-center gap-2">
          {editable && (
            <Button
              variant={editing ? "default" : "ghost"}
              size="sm"
              className={`gap-1.5 text-xs ${editing ? "bg-white hover:bg-blue-50 text-blue-900" : "text-white hover:bg-white/10"}`}
              onClick={() => setEditing(!editing)}
            >
              {editing ? <><Eye className="w-3.5 h-3.5" /> Aperçu</> : <><Pencil className="w-3.5 h-3.5" /> Modifier</>}
            </Button>
          )}
          <span className="text-blue-400/60 text-xs hidden sm:block">{brandText}</span>
        </div>
      </div>

      {/* Slide content — scaled 16:9 */}
      <div
        ref={containerRef}
        className="flex-1 bg-[#0a1628] overflow-hidden relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="absolute"
          style={{
            width: SLIDE_W,
            height: SLIDE_H,
            left: "50%",
            top: "50%",
            marginLeft: -(SLIDE_W / 2),
            marginTop: -(SLIDE_H / 2),
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          <div className="w-full h-full overflow-y-auto slide-content">
            {renderSlide(slides[idx], editing, handleSlideChange)}
          </div>
        </div>
      </div>

      {/* Navigation — always visible */}
      <div className="bg-[#060e1c] px-4 py-2.5 flex items-center justify-between rounded-b-xl border-t border-white/10 flex-shrink-0">
        <Button variant="outline" size="sm" onClick={prev} disabled={idx === 0} className="gap-1 border-white/20 text-white hover:bg-white/10">
          <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Précédent</span>
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white">{idx + 1}</span>
          <span className="text-xs text-blue-400">/ {total}</span>
          <input
            type="range"
            min={0}
            max={total - 1}
            value={idx}
            onChange={e => setIdx(+e.target.value)}
            className="w-20 sm:w-32 accent-white"
          />
        </div>
        <Button size="sm" onClick={next} disabled={idx === total - 1} className="gap-1 bg-white text-[#0a1628] hover:bg-blue-100">
          Suivant <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
