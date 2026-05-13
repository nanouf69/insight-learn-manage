import { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";
import { wrapSelectionWithColor } from "@/lib/richText";

const PRESETS = [
  { name: "Rouge", color: "#dc2626" },
  { name: "Vert", color: "#16a34a" },
  { name: "Bleu", color: "#2563eb" },
  { name: "Orange", color: "#ea580c" },
  { name: "Violet", color: "#7c3aed" },
  { name: "Noir", color: "#000000" },
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

  const apply = (color: string) => {
    const el = ref.current;
    if (!el) {
      onChange(`${value}[c=${color}]texte[/c]`);
      return;
    }
    const { value: nv, selectionStart, selectionEnd } = wrapSelectionWithColor(el, color);
    onChange(nv);
    requestAnimationFrame(() => {
      el.focus();
      try { el.setSelectionRange(selectionStart, selectionEnd); } catch {}
    });
  };

  const applyCustom = () => {
    const c = window.prompt("Couleur (hex, ex: #ff0000)", "#ff0000");
    if (c && /^#?[0-9a-fA-F]{3,8}$/.test(c.trim())) apply(c.trim().startsWith("#") ? c.trim() : `#${c.trim()}`);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[10px] text-muted-foreground mr-1 inline-flex items-center gap-1">
          <Palette className="w-3 h-3" /> Couleur :
        </span>
        {PRESETS.map((p) => (
          <button
            type="button"
            key={p.color}
            title={p.name}
            onClick={() => apply(p.color)}
            className="w-5 h-5 rounded-full border border-border hover:scale-110 transition-transform"
            style={{ backgroundColor: p.color }}
          />
        ))}
        <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={applyCustom}>
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
        Astuce : sélectionnez du texte puis cliquez sur une couleur. Format : <code>[c=#ff0000]…[/c]</code>
      </p>
    </div>
  );
}
