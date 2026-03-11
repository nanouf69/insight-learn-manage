// Données des slides T3P Partie 1 — Réglementation du Transport Public Particulier de Personnes
// Source : vrai_cours_t3P_partie_1-5.pptx (50 slides)

import t3pPartie1Raw from "./raw/t3p-partie1.md?raw";
import { createSlidesFromParsedMarkdown } from "./parsed-markdown-to-slides";

export interface SlideBlock {
  heading: string;
  color: string;
  points: string[];
}

export interface SlideBase {
  type: string;
  title: string;
  image?: string;
}

export interface SlideTitleType extends SlideBase {
  type: "title";
  subtitle?: string;
  footer?: string;
  brand?: string;
}

export interface SlideSommaireType extends SlideBase {
  type: "sommaire";
  items: { n: string; label: string; page: number }[];
}

export interface SlideSectionType extends SlideBase {
  type: "section";
  subtitle?: string;
}

export interface SlideContentType extends SlideBase {
  type: "content";
  ref?: string;
  intro?: string;
  blocks?: SlideBlock[];
  keyRule?: string;
  examples?: string[];
}

export interface SlideTableType extends SlideBase {
  type: "table";
  ref?: string;
  intro?: string;
  headers: string[];
  rows: string[][];
  keyRule?: string;
  extraSections?: { heading: string; items: string[] }[];
}

export interface SlideChiffresType extends SlideBase {
  type: "chiffres";
  items: { val: string; desc: string }[];
}

export interface SlideSchemaType extends SlideBase {
  type: "schema";
  intro?: string;
  tables?: { headers: string[]; rows: string[][] }[];
  keyRule?: string;
  lists?: { heading: string; items: string[] }[];
}

export interface SlideSynthesisType extends SlideBase {
  type: "synthesis";
  intro?: string;
  sections: { heading: string; color: string; points: string[] }[];
  keyRule?: string;
}

export type Slide =
  | SlideTitleType
  | SlideSommaireType
  | SlideSectionType
  | SlideContentType
  | SlideTableType
  | SlideChiffresType
  | SlideSchemaType
  | SlideSynthesisType;


export const T3P_PARTIE1_SLIDES: Slide[] = createSlidesFromParsedMarkdown(t3pPartie1Raw, {
  maxSlides: 50,
});
