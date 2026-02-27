import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import type { Slide } from "./t3p-partie1-data";

interface SlideViewerProps {
  slides: Slide[];
  titre: string;
  brand?: string;
  onBack: () => void;
}

function SlideTitle({ slide }: { slide: Slide & { type: "title" } }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8 rounded-xl">
      <h1 className="text-2xl md:text-3xl font-bold text-amber-400 text-center leading-tight mb-4">{slide.title}</h1>
      {slide.subtitle && <p className="text-base md:text-lg text-slate-300 text-center mb-6">{slide.subtitle}</p>}
      <div className="w-20 h-1 bg-amber-400 rounded mb-6" />
      {slide.footer && <p className="text-sm text-slate-400 text-center">{slide.footer}</p>}
      {slide.brand && <p className="text-xs text-slate-500 mt-4">{slide.brand}</p>}
    </div>
  );
}

function SlideSommaire({ slide }: { slide: Slide & { type: "sommaire" } }) {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">{slide.title}</h2>
      <div className="space-y-2">
        {slide.items.map((it, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
            <span className="flex-shrink-0 w-10 h-10 bg-amber-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">{it.n}</span>
            <span className="text-sm font-medium text-slate-700 flex-1">{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideSection({ slide }: { slide: Slide & { type: "section" } }) {
  return (
    <div className="flex flex-col items-start justify-center min-h-full bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 rounded-xl">
      <h1 className="text-2xl md:text-3xl font-bold text-amber-400 leading-tight mb-3">{slide.title}</h1>
      {slide.subtitle && <p className="text-base text-slate-300">{slide.subtitle}</p>}
      <div className="w-16 h-1 bg-amber-400 rounded mt-4" />
    </div>
  );
}

function SlideContent({ slide }: { slide: Slide & { type: "content" } }) {
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
                <li key={j} className="text-xs text-slate-700 leading-relaxed pl-3 relative before:content-['▸'] before:absolute before:left-0 before:text-amber-500">{p}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {slide.keyRule && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-800">✔ {slide.keyRule}</p>
        </div>
      )}
    </div>
  );
}

function SlideTable({ slide }: { slide: Slide & { type: "table" } }) {
  return (
    <div className="p-5">
      <h2 className="text-xl font-bold text-slate-800 mb-4">{slide.title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>{slide.headers.map((h, i) => <th key={i} className="bg-slate-800 text-white p-2 text-left font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {slide.rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                {row.map((cell, j) => <td key={j} className={`p-2 border-b border-slate-200 ${j === 0 ? "font-semibold text-slate-700" : "text-slate-600"}`}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SlideChiffres({ slide }: { slide: Slide & { type: "chiffres" } }) {
  return (
    <div className="p-5">
      <h2 className="text-xl font-bold text-slate-800 mb-4">{slide.title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {slide.items.map((it, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border p-3 text-center">
            <div className="text-lg font-bold text-amber-600">{it.val}</div>
            <div className="text-xs text-slate-600 mt-1">{it.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderSlide(slide: Slide) {
  switch (slide.type) {
    case "title": return <SlideTitle slide={slide} />;
    case "sommaire": return <SlideSommaire slide={slide} />;
    case "section": return <SlideSection slide={slide} />;
    case "content": return <SlideContent slide={slide} />;
    case "table": return <SlideTable slide={slide} />;
    case "chiffres": return <SlideChiffres slide={slide} />;
    default: return null;
  }
}

export default function SlideViewer({ slides, titre, brand, onBack }: SlideViewerProps) {
  const [idx, setIdx] = useState(0);
  const total = slides.length;
  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(total - 1, i + 1));

  const brandText = brand || "FTRANSPORT - SERVICES PRO • Qualiopi • CPF • Lyon";

  return (
    <div className="flex flex-col h-full min-h-[600px]">
      {/* Header */}
      <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between rounded-t-xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-slate-700" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="font-bold text-amber-400 text-sm">{titre}</span>
        </div>
        <span className="text-slate-400 text-xs hidden sm:block">{brandText}</span>
      </div>

      {/* Slide content */}
      <div className="flex-1 bg-white overflow-y-auto" style={{ minHeight: 420 }}>
        {renderSlide(slides[idx])}
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
            className="w-24 sm:w-32 accent-amber-500"
          />
        </div>
        <Button size="sm" onClick={next} disabled={idx === total - 1} className="gap-1 bg-amber-500 hover:bg-amber-600 text-white">
          Suivant <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
