import React from "react";

// Simple BBCode-like color markup: [c=#ff0000]text[/c]
// Backward compatible: plain text without markers renders normally.

const COLOR_RE = /\[c=(#?[0-9a-zA-Z]{3,12})\]([\s\S]*?)\[\/c\]/g;

export function renderRichText(input: string | null | undefined): React.ReactNode {
  const text = String(input ?? "");
  if (!text) return text;
  if (!text.includes("[c=")) return text;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  COLOR_RE.lastIndex = 0;
  while ((m = COLOR_RE.exec(text)) !== null) {
    if (m.index > lastIndex) nodes.push(text.slice(lastIndex, m.index));
    const color = m[1].startsWith("#") ? m[1] : `#${m[1]}`;
    nodes.push(
      <span key={`c-${m.index}`} style={{ color }}>
        {m[2]}
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

/** Wrap the current selection of a textarea/input with a color tag, returns the new value + new caret. */
export function wrapSelectionWithColor(
  el: HTMLTextAreaElement | HTMLInputElement,
  color: string
): { value: string; selectionStart: number; selectionEnd: number } {
  const value = el.value;
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const selected = value.slice(start, end) || "texte";
  const open = `[c=${color}]`;
  const close = `[/c]`;
  const newValue = value.slice(0, start) + open + selected + close + value.slice(end);
  const newStart = start + open.length;
  const newEnd = newStart + selected.length;
  return { value: newValue, selectionStart: newStart, selectionEnd: newEnd };
}
