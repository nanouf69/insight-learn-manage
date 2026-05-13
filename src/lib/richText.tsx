import React from "react";

// Simple BBCode-like markup:
//   color: [c=#ff0000]text[/c]
//   size:  [s=18]text[/s]   (size in px, 8..96)
// Backward compatible: plain text without markers renders normally.

const makeTokenRe = () => /\[(c|s)=([^\]]+)\]([\s\S]*?)\[\/\1\]/g;

export function renderRichText(input: string | null | undefined): React.ReactNode {
  const text = String(input ?? "");
  if (!text) return text;
  if (!text.includes("[c=") && !text.includes("[s=")) return text;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  const re = makeTokenRe();
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) nodes.push(text.slice(lastIndex, m.index));
    const tag = m[1];
    const arg = m[2];
    const inner = renderRichText(m[3]); // recursive parse
    const style: React.CSSProperties = {};
    if (tag === "c") {
      style.color = arg.startsWith("#") ? arg : `#${arg}`;
    } else if (tag === "s") {
      const n = parseInt(arg, 10);
      if (!isNaN(n)) style.fontSize = `${Math.min(96, Math.max(8, n))}px`;
    }
    nodes.push(
      <span key={`t-${m.index}`} style={style}>
        {inner}
      </span>
    );
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return <>{nodes}</>;
}

export function RichText({ value, className }: { value: string | null | undefined; className?: string }) {
  return <span className={className}>{renderRichText(value)}</span>;
}

/** Wrap the current selection of a textarea/input with a tag, returns the new value + new caret. */
export function wrapSelectionWithTag(
  el: HTMLTextAreaElement | HTMLInputElement,
  tag: "c" | "s",
  arg: string
): { value: string; selectionStart: number; selectionEnd: number } {
  const value = el.value;
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const selected = value.slice(start, end) || "texte";
  const open = `[${tag}=${arg}]`;
  const close = `[/${tag}]`;
  const newValue = value.slice(0, start) + open + selected + close + value.slice(end);
  const newStart = start + open.length;
  const newEnd = newStart + selected.length;
  return { value: newValue, selectionStart: newStart, selectionEnd: newEnd };
}

// Backward compat alias
export function wrapSelectionWithColor(
  el: HTMLTextAreaElement | HTMLInputElement,
  color: string
) {
  return wrapSelectionWithTag(el, "c", color);
}
