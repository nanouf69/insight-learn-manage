import { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Palette, Type } from "lucide-react";
import { wrapSelectionWithTag } from "@/lib/richText";

const COLOR_PRESETS = [
  { name: "Rouge", color: "#dc2626" },
  { name: "Vert", color: "#16a34a" },
  { name: "Bleu", color: "#2563eb" },
  { name: "Orange", color: "#ea580c" },
  { name: "Violet", color: "#7c3aed" },
  { name: "Noir", color: "#000000" },
];

const SIZE_PRESETS = [
  { label: "S", value: 12 },
  { label: "M", value: 16 },
  { label: "L", value: 20 },
  { label: "XL", value: 26 },
  { label: "XXL", value: 34 },
];

interface BaseProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  rows?: number;
  multiline?: boolean;
}

export function ColoredTextField({ value, onChange, className, placeholder, rows = 2, multiline = true }: BaseProps) {
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  const apply = (tag: "c" | "s", arg: string) => {
    const el = ref.current;
    if (!el) {
      onChange(`${value}[${tag}=${arg}]texte[/${tag}]`);
      return;
    }
    const { value: nv, selectionStart, selectionEnd } = wrapSelectionWithTag(el, tag, arg);
    onChange(nv);
    requestAnimationFrame(() => {
      el.focus();
      try { el.setSelectionRange(selectionStart, selectionEnd); } catch {}
    });
  };

  const applyCustomColor = () => {
    const c = window.prompt("Couleur (hex, ex: #ff0000)", "#ff0000");
    if (c && /^#?[0-9a-fA-F]{3,8}$/.test(c.trim())) {
      const v = c.trim().startsWith("#") ? c.trim() : `#${c.trim()}`;
      apply("c", v);
    }
  };

  const applyCustomSize = () => {
    const s = window.prompt("Taille en pixels (8 à 96)", "22");
    if (!s) return;
    const n = parseInt(s, 10);
    if (!isNaN(n) && n >= 8 && n <= 96) apply("s", String(n));
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
          <Palette className="w-3 h-3" /> Couleur :
        </span>
        {COLOR_PRESETS.map((p) => (
          <button
            type="button"
            key={p.color}
            title={p.name}
            onClick={() => apply("c", p.color)}
            className="w-5 h-5 rounded-full border border-border hover:scale-110 transition-transform"
            style={{ backgroundColor: p.color }}
          />
        ))}
        <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={applyCustomColor}>
          Autre…
        </Button>

        <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1 ml-2">
          <Type className="w-3 h-3" /> Taille :
        </span>
        {SIZE_PRESETS.map((p) => (
          <button
            type="button"
            key={p.value}
            title={`${p.value}px`}
            onClick={() => apply("s", String(p.value))}
            className="h-6 px-2 rounded border border-border bg-background hover:bg-muted text-[11px] font-semibold"
          >
            {p.label}
          </button>
        ))}
        <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={applyCustomSize}>
          Autre…
        </Button>
      </div>
      {multiline ? (
        <Textarea
          ref={ref as any}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className={className}
          placeholder={placeholder}
        />
      ) : (
        <Input
          ref={ref as any}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={className}
          placeholder={placeholder}
        />
      )}
      <p className="text-[10px] text-muted-foreground">
        Sélectionnez du texte puis cliquez sur une couleur ou une taille. Format : <code>[c=#ff0000]…[/c]</code>, <code>[s=20]…[/s]</code>
      </p>
    </div>
  );
}
