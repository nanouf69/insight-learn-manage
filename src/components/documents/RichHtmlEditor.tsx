import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold, Italic, Underline, List, ListOrdered, Highlighter,
  Link2, Undo2, Redo2, Code, Eye, RemoveFormatting,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  className?: string;
}

const COLORS = ["#000000", "#dc2626", "#16a34a", "#2563eb", "#ea580c", "#7c3aed"];

/**
 * Éditeur visuel (WYSIWYG) : l'utilisateur met en forme sans voir le HTML.
 * Un bouton permet de basculer vers le code HTML brut si besoin.
 */
export function RichHtmlEditor({ value, onChange, className }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [showSource, setShowSource] = useState(false);

  // Sync externe -> éditeur (sans casser le curseur pendant la frappe)
  useEffect(() => {
    if (showSource) return;
    const el = ref.current;
    if (el && el.innerHTML !== value) el.innerHTML = value || "";
  }, [value, showSource]);

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(cmd, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const insertVariable = (v: string) => exec("insertText", v);

  const addLink = () => {
    const url = window.prompt("URL du lien", "https://");
    if (url) exec("createLink", url);
  };

  const btn = "h-8 w-8 p-0";

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-1 rounded-t-md border border-border bg-muted/40 p-1.5">
        <Button type="button" variant="ghost" size="sm" className={btn} title="Gras" onClick={() => exec("bold")}><Bold className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btn} title="Italique" onClick={() => exec("italic")}><Italic className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btn} title="Souligné" onClick={() => exec("underline")}><Underline className="h-4 w-4" /></Button>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button type="button" variant="ghost" size="sm" className={btn} title="Liste à puces" onClick={() => exec("insertUnorderedList")}><List className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btn} title="Liste numérotée" onClick={() => exec("insertOrderedList")}><ListOrdered className="h-4 w-4" /></Button>
        <span className="mx-1 h-5 w-px bg-border" />
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={`Couleur ${c}`}
            onClick={() => exec("foreColor", c)}
            className="h-5 w-5 rounded-full border border-border transition-transform hover:scale-110"
            style={{ backgroundColor: c }}
          />
        ))}
        <Button type="button" variant="ghost" size="sm" className={btn} title="Surligner en jaune" onClick={() => exec("hiliteColor", "#fef08a")}><Highlighter className="h-4 w-4" /></Button>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button type="button" variant="ghost" size="sm" className={btn} title="Lien" onClick={addLink}><Link2 className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btn} title="Effacer la mise en forme" onClick={() => exec("removeFormat")}><RemoveFormatting className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btn} title="Annuler" onClick={() => exec("undo")}><Undo2 className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="sm" className={btn} title="Rétablir" onClick={() => exec("redo")}><Redo2 className="h-4 w-4" /></Button>
        <div className="ml-auto">
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setShowSource((s) => !s)}>
            {showSource ? <><Eye className="h-3.5 w-3.5" /> Mode visuel</> : <><Code className="h-3.5 w-3.5" /> Code HTML</>}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 border-x border-border bg-muted/20 p-1.5 text-[11px]">
        <span className="text-muted-foreground">Insérer :</span>
        {["{{civilite}}", "{{prenom}}", "{{nom}}", "{{formation}}", "{{date_debut}}", "{{date_fin}}", "{{date_jour}}", "{{onboarding_url}}"].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => insertVariable(v)}
            className="rounded border border-border bg-background px-1.5 py-0.5 font-mono hover:bg-muted"
          >
            {v}
          </button>
        ))}
      </div>

      {showSource ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[320px] w-full rounded-b-md border border-border bg-background p-3 font-mono text-xs outline-none"
        />
      ) : (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
          onBlur={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
          className="prose-sm min-h-[320px] max-w-none rounded-b-md border border-border bg-background p-4 text-sm outline-none focus:ring-2 focus:ring-ring/40 [&_a]:text-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
        />
      )}
    </div>
  );
}
