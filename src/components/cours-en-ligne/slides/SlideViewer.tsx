import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, Eye, Plus, Trash2 } from "lucide-react";
import type { Slide, SlideBlock } from "./t3p-partie1-data";

interface SlideViewerProps {
  slides: Slide[];
  titre: string;
  brand?: string;
  onBack: () => void;
  editable?: boolean;
  onSlidesChange?: (slides: Slide[]) => void;
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
    return (
      <div className="flex flex-col items-center justify-center min-h-full bg-gradient-to-br from-blue-800 via-blue-700 to-blue-900 text-white p-8 rounded-xl">
        <h1 className="text-2xl md:text-3xl font-bold text-white text-center leading-tight mb-4">{slide.title}</h1>
        {slide.subtitle && <p className="text-base md:text-lg text-blue-100 text-center mb-6">{slide.subtitle}</p>}
        <div className="w-20 h-1 bg-white rounded mb-6" />
        {slide.footer && <p className="text-sm text-slate-400 text-center">{slide.footer}</p>}
        {slide.brand && <p className="text-xs text-slate-500 mt-4">{slide.brand}</p>}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center min-h-full bg-gradient-to-br from-blue-800 via-blue-700 to-blue-900 text-white p-8 rounded-xl space-y-3">
      <EditableText value={slide.title} onChange={v => onChange?.({ ...slide, title: v })} className="text-2xl font-bold text-white text-center" placeholder="Titre" />
      <EditableText value={slide.subtitle || ""} onChange={v => onChange?.({ ...slide, subtitle: v })} className="text-lg text-blue-100 text-center" placeholder="Sous-titre" />
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
    <div className="p-6">
      {editing ? <EditableText value={slide.title} onChange={v => onChange?.({ ...slide, title: v })} className="text-2xl font-bold text-slate-800 mb-6" /> : <h2 className="text-2xl font-bold text-slate-800 mb-6">{slide.title}</h2>}
      <div className="space-y-2">
        {slide.items.map((it, i) => (
          <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${it.page === 0 ? 'bg-slate-100 mt-4' : 'hover:bg-slate-50'}`}>
            {editing ? (
              <>
                <EditableText value={it.n} onChange={v => updateItem(i, "n", v)} className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm bg-blue-600 text-white text-center" />
                <EditableText value={it.label} onChange={v => updateItem(i, "label", v)} className="text-sm font-medium flex-1 text-slate-700" />
                <button onClick={() => removeItem(i)} className="text-destructive hover:text-destructive/80 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
              </>
            ) : (
              <>
                <span className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${it.page === 0 ? 'bg-slate-700 text-white' : 'bg-blue-600 text-white'}`}>{it.n}</span>
                <span className={`text-sm font-medium flex-1 ${it.page === 0 ? 'text-slate-800 font-bold' : 'text-slate-700'}`}>{it.label}</span>
              </>
            )}
          </div>
        ))}
        {editing && <Button variant="outline" size="sm" className="mt-2 gap-1" onClick={addItem}><Plus className="w-3 h-3" /> Ajouter</Button>}
      </div>
    </div>
  );
}

function SlideSection({ slide, editing, onChange }: { slide: Slide & { type: "section" }; editing: boolean; onChange?: (s: Slide) => void }) {
  if (!editing) {
    return (
      <div className="flex flex-col items-start justify-center min-h-full bg-gradient-to-br from-blue-800 to-blue-900 text-white p-8 rounded-xl">
        <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-3">{slide.title}</h1>
        {slide.subtitle && <p className="text-base text-blue-100">{slide.subtitle}</p>}
        <div className="w-16 h-1 bg-white rounded mt-4" />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start justify-center min-h-full bg-gradient-to-br from-blue-800 to-blue-900 text-white p-8 rounded-xl space-y-3">
      <EditableText value={slide.title} onChange={v => onChange?.({ ...slide, title: v })} className="text-2xl font-bold text-white" placeholder="Titre section" />
      <EditableText value={slide.subtitle || ""} onChange={v => onChange?.({ ...slide, subtitle: v })} className="text-base text-blue-100" placeholder="Sous-titre" />
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
    <div className="rounded-lg border-l-4 bg-white shadow-sm p-3 space-y-2" style={{ borderColor: block.color }}>
      <div className="flex items-center gap-2">
        <EditableText value={block.heading} onChange={v => onChange({ ...block, heading: v })} className="font-bold text-sm flex-1" placeholder="Titre du bloc" />
        <input type="color" value={block.color} onChange={e => onChange({ ...block, color: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-0 p-0" title="Couleur" />
        <button onClick={onRemove} className="text-destructive hover:text-destructive/80 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      {block.points.map((p, j) => (
        <div key={j} className="flex items-start gap-1">
           <span className="text-blue-500 text-xs mt-1">▸</span>
          <EditableText value={p} onChange={v => updatePoint(j, v)} className="text-xs text-slate-700 flex-1" />
          <button onClick={() => removePoint(j)} className="text-destructive/60 hover:text-destructive p-0.5"><Trash2 className="w-3 h-3" /></button>
        </div>
      ))}
      <button onClick={addPoint} className="text-xs text-primary hover:underline">+ Point</button>
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
    return (
      <div className="p-5 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{slide.title}</h2>
          {slide.ref && <p className="text-xs text-slate-500 italic mt-1">{slide.ref}</p>}
        </div>
        {slide.intro && <p className="text-sm text-slate-600 leading-relaxed">{slide.intro}</p>}
        <div className="space-y-3">
          {slide.blocks?.map((b, i) => (
            <div key={i} className="rounded-lg border-l-4 bg-white shadow-sm p-3" style={{ borderColor: b.color }}>
              <h3 className="font-bold text-sm mb-2" style={{ color: b.color }}>{b.heading}</h3>
              <ul className="space-y-1">
                {b.points.map((p, j) => (
                   <li key={j} className="text-xs text-slate-700 leading-relaxed pl-3 relative before:content-['▸'] before:absolute before:left-0 before:text-blue-500">{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
         {slide.keyRule && (
           <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
             <p className="text-xs font-semibold text-blue-800">✔ {slide.keyRule}</p>
           </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      <EditableText value={slide.title} onChange={v => onChange?.({ ...slide, title: v })} className="text-xl font-bold text-slate-800" placeholder="Titre" />
      <EditableText value={slide.ref || ""} onChange={v => onChange?.({ ...slide, ref: v })} className="text-xs text-slate-500 italic" placeholder="Référence" />
      <EditableMultiline value={slide.intro || ""} onChange={v => onChange?.({ ...slide, intro: v })} className="text-sm text-slate-600" placeholder="Introduction" />
      <div className="space-y-3">
        {(slide.blocks || []).map((b, i) => (
          <EditableBlock key={i} block={b} onChange={block => updateBlock(i, block)} onRemove={() => removeBlock(i)} />
        ))}
        <Button variant="outline" size="sm" className="gap-1" onClick={addBlock}><Plus className="w-3 h-3" /> Ajouter un bloc</Button>
      </div>
      <EditableText value={slide.keyRule || ""} onChange={v => onChange?.({ ...slide, keyRule: v })} className="text-xs text-blue-800 bg-blue-50 p-2 rounded" placeholder="Règle clé (optionnel)" />
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
      <div className="p-5 space-y-4">
        <h2 className="text-xl font-bold text-slate-800">{slide.title}</h2>
        {slide.intro && <p className="text-sm text-slate-600 mb-2">{slide.intro}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead><tr>{slide.headers.map((h, i) => <th key={i} className="bg-slate-800 text-white p-2 text-left font-semibold">{h}</th>)}</tr></thead>
            <tbody>{slide.rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                {row.map((cell, j) => <td key={j} className={`p-2 border-b border-slate-200 ${j === 0 ? "font-semibold text-slate-700" : "text-slate-600"}`}>{cell}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
        {slide.keyRule && <div className="bg-blue-50 border border-blue-200 rounded-lg p-3"><p className="text-xs font-semibold text-blue-800">✔ {slide.keyRule}</p></div>}
        {slide.extraSections?.map((section, i) => (
          <div key={i} className="mt-3">
            <h3 className="text-sm font-bold text-slate-700 mb-2">{section.heading}</h3>
            <ul className="space-y-1">{section.items.map((item, j) => <li key={j} className="text-xs text-slate-600 pl-3 relative before:content-['▸'] before:absolute before:left-0 before:text-blue-500">{item}</li>)}</ul>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      <EditableText value={slide.title} onChange={v => onChange?.({ ...slide, title: v })} className="text-xl font-bold text-slate-800" />
      <EditableMultiline value={slide.intro || ""} onChange={v => onChange?.({ ...slide, intro: v })} className="text-sm text-slate-600" placeholder="Introduction" />
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead><tr>
            {slide.headers.map((h, i) => <th key={i} className="bg-slate-800 p-1"><EditableText value={h} onChange={v => updateHeader(i, v)} className="text-white font-semibold text-xs" /></th>)}
            <th className="bg-slate-800 p-1"><button onClick={addCol} className="text-blue-300 text-xs">+Col</button></th>
          </tr></thead>
          <tbody>{slide.rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-slate-50" : "bg-white"}>
              {row.map((cell, j) => <td key={j} className="p-1 border-b border-slate-200"><EditableText value={cell} onChange={v => updateCell(i, j, v)} className="text-xs text-slate-700" /></td>)}
              <td className="p-1"><button onClick={() => removeRow(i)} className="text-destructive/60 hover:text-destructive"><Trash2 className="w-3 h-3" /></button></td>
            </tr>
          ))}</tbody>
        </table>
        <Button variant="outline" size="sm" className="mt-2 gap-1" onClick={addRow}><Plus className="w-3 h-3" /> Ligne</Button>
      </div>
      <EditableText value={slide.keyRule || ""} onChange={v => onChange?.({ ...slide, keyRule: v })} className="text-xs text-blue-800 bg-blue-50 p-2 rounded" placeholder="Règle clé" />
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
      <div className="p-5">
        <h2 className="text-xl font-bold text-slate-800 mb-4">{slide.title}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {slide.items.map((it, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border p-3 text-center">
              <div className="text-lg font-bold text-blue-600">{it.val}</div>
              <div className="text-xs text-slate-600 mt-1">{it.desc}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      <EditableText value={slide.title} onChange={v => onChange?.({ ...slide, title: v })} className="text-xl font-bold text-slate-800" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {slide.items.map((it, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border p-3 text-center space-y-1 relative">
            <EditableText value={it.val} onChange={v => updateItem(i, "val", v)} className="text-lg font-bold text-blue-600 text-center" />
            <EditableText value={it.desc} onChange={v => updateItem(i, "desc", v)} className="text-xs text-slate-600 text-center" />
            <button onClick={() => removeItem(i)} className="absolute top-1 right-1 text-destructive/60 hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" className="gap-1" onClick={addItem}><Plus className="w-3 h-3" /> Ajouter</Button>
    </div>
  );
}

function SlideSchema({ slide, editing, onChange }: { slide: Slide & { type: "schema" }; editing: boolean; onChange?: (s: Slide) => void }) {
  if (!editing) {
    return (
      <div className="p-5 space-y-4">
        <h2 className="text-xl font-bold text-slate-800">{slide.title}</h2>
        {slide.intro && <p className="text-sm text-slate-600 mb-2">{slide.intro}</p>}
        {slide.tables?.map((table, i) => (
          <div key={i} className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead><tr>{table.headers.map((h, j) => <th key={j} className="bg-blue-700 text-white p-2 text-left font-semibold">{h}</th>)}</tr></thead>
              <tbody>{table.rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                  {row.map((cell, ci) => <td key={ci} className="p-2 border-b border-slate-200 text-slate-700 text-xs">{cell}</td>)}
                </tr>
              ))}</tbody>
            </table>
          </div>
        ))}
        {slide.lists?.map((list, i) => (
           <div key={i} className="rounded-lg border-l-4 border-blue-400 bg-white shadow-sm p-3">
            <h3 className="font-bold text-sm text-slate-800 mb-2">{list.heading}</h3>
            <ul className="space-y-1">{list.items.map((item, j) => <li key={j} className="text-xs text-slate-700 pl-3 relative before:content-['▸'] before:absolute before:left-0 before:text-blue-500">{item}</li>)}</ul>
          </div>
        ))}
        {slide.keyRule && <div className="bg-blue-50 border border-blue-200 rounded-lg p-3"><p className="text-xs font-semibold text-blue-800">✔ {slide.keyRule}</p></div>}
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      <EditableText value={slide.title} onChange={v => onChange?.({ ...slide, title: v })} className="text-xl font-bold text-slate-800" />
      <EditableMultiline value={slide.intro || ""} onChange={v => onChange?.({ ...slide, intro: v })} className="text-sm text-slate-600" placeholder="Introduction" />
      <p className="text-xs text-muted-foreground italic">Tableaux et listes (édition simplifiée)</p>
      {slide.lists?.map((list, i) => (
        <div key={i} className="rounded-lg border-l-4 border-blue-400 bg-white shadow-sm p-3 space-y-1">
          <EditableText value={list.heading} onChange={v => {
            const lists = [...(slide.lists || [])];
            lists[i] = { ...lists[i], heading: v };
            onChange?.({ ...slide, lists });
          }} className="font-bold text-sm text-slate-800" />
          {list.items.map((item, j) => (
            <div key={j} className="flex items-center gap-1">
              <span className="text-blue-500 text-xs">▸</span>
              <EditableText value={item} onChange={v => {
                const lists = [...(slide.lists || [])];
                const items = [...lists[i].items];
                items[j] = v;
                lists[i] = { ...lists[i], items };
                onChange?.({ ...slide, lists });
              }} className="text-xs text-slate-700 flex-1" />
            </div>
          ))}
        </div>
      ))}
      <EditableText value={slide.keyRule || ""} onChange={v => onChange?.({ ...slide, keyRule: v })} className="text-xs text-blue-800 bg-blue-50 p-2 rounded" placeholder="Règle clé" />
    </div>
  );
}

function SlideSynthesis({ slide, editing, onChange }: { slide: Slide & { type: "synthesis" }; editing: boolean; onChange?: (s: Slide) => void }) {
  if (!editing) {
    return (
      <div className="p-5 space-y-4">
        <h2 className="text-xl font-bold text-slate-800">{slide.title}</h2>
        {slide.intro && <p className="text-sm text-slate-600 mb-2">{slide.intro}</p>}
        <div className="space-y-3">
          {slide.sections.map((s, i) => (
            <div key={i} className="rounded-lg border-l-4 bg-white shadow-sm p-3" style={{ borderColor: s.color }}>
              <h3 className="font-bold text-sm mb-2" style={{ color: s.color }}>{s.heading}</h3>
              <ul className="space-y-1">{s.points.map((p, j) => <li key={j} className="text-xs text-slate-700 leading-relaxed pl-3 relative before:content-['▸'] before:absolute before:left-0 before:text-blue-500">{p}</li>)}</ul>
            </div>
          ))}
        </div>
        {slide.keyRule && <div className="bg-blue-50 border border-blue-200 rounded-lg p-3"><p className="text-xs font-semibold text-blue-800">✔ {slide.keyRule}</p></div>}
      </div>
    );
  }

  const updateSection = (idx: number, field: string, val: any) => {
    const sections = [...slide.sections];
    sections[idx] = { ...sections[idx], [field]: val };
    onChange?.({ ...slide, sections });
  };

  return (
    <div className="p-5 space-y-4">
      <EditableText value={slide.title} onChange={v => onChange?.({ ...slide, title: v })} className="text-xl font-bold text-slate-800" />
      <EditableMultiline value={slide.intro || ""} onChange={v => onChange?.({ ...slide, intro: v })} className="text-sm text-slate-600" placeholder="Introduction" />
      <div className="space-y-3">
        {slide.sections.map((s, i) => (
          <div key={i} className="rounded-lg border-l-4 bg-white shadow-sm p-3 space-y-2" style={{ borderColor: s.color }}>
            <div className="flex items-center gap-2">
              <EditableText value={s.heading} onChange={v => updateSection(i, "heading", v)} className="font-bold text-sm flex-1" />
              <input type="color" value={s.color} onChange={e => updateSection(i, "color", e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
            </div>
            {s.points.map((p, j) => (
              <div key={j} className="flex items-start gap-1">
                <span className="text-blue-500 text-xs mt-1">▸</span>
                <EditableText value={p} onChange={v => {
                  const points = [...s.points];
                  points[j] = v;
                  updateSection(i, "points", points);
                }} className="text-xs text-slate-700 flex-1" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <EditableText value={slide.keyRule || ""} onChange={v => onChange?.({ ...slide, keyRule: v })} className="text-xs text-blue-800 bg-blue-50 p-2 rounded" placeholder="Règle clé" />
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

export default function SlideViewer({ slides, titre, brand, onBack, editable, onSlidesChange }: SlideViewerProps) {
  const [idx, setIdx] = useState(0);
  const [editing, setEditing] = useState(false);
  const total = slides.length;
  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(total - 1, i + 1));

  const handleSlideChange = (updatedSlide: Slide) => {
    const newSlides = [...slides];
    newSlides[idx] = updatedSlide;
    onSlidesChange?.(newSlides);
  };

  const brandText = brand || "FTRANSPORT - SERVICES PRO • Qualiopi • CPF • Lyon";

  return (
    <div className="flex flex-col h-full min-h-[600px]">
      {/* Header */}
      <div className="bg-blue-800 text-white px-4 py-2.5 flex items-center justify-between rounded-t-xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-blue-700" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="font-bold text-white text-sm">{titre}</span>
        </div>
        <div className="flex items-center gap-2">
          {editable && (
            <Button
              variant={editing ? "default" : "ghost"}
              size="sm"
              className={`gap-1.5 text-xs ${editing ? "bg-white hover:bg-blue-50 text-blue-800" : "text-white hover:bg-blue-700"}`}
              onClick={() => setEditing(!editing)}
            >
              {editing ? <><Eye className="w-3.5 h-3.5" /> Aperçu</> : <><Pencil className="w-3.5 h-3.5" /> Modifier</>}
            </Button>
          )}
          <span className="text-slate-400 text-xs hidden sm:block">{brandText}</span>
        </div>
      </div>

      {/* Slide content */}
      <div className="flex-1 bg-white overflow-y-auto" style={{ minHeight: 420 }}>
        {renderSlide(slides[idx], editing, handleSlideChange)}
      </div>

      {/* Navigation */}
      <div className="bg-white border-t px-4 py-3 flex items-center justify-between rounded-b-xl">
        <Button variant="outline" size="sm" onClick={prev} disabled={idx === 0} className="gap-1">
          <ChevronLeft className="w-4 h-4" /> Précédent
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-700">{idx + 1}</span>
          <span className="text-xs text-slate-400">/ {total}</span>
          <input
            type="range"
            min={0}
            max={total - 1}
            value={idx}
            onChange={e => setIdx(+e.target.value)}
            className="w-24 sm:w-32 accent-blue-600"
          />
        </div>
        <Button size="sm" onClick={next} disabled={idx === total - 1} className="gap-1 bg-blue-600 hover:bg-blue-700 text-white">
          Suivant <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
