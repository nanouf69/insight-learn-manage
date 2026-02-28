import { Slide } from "./t3p-partie1-data";
import gestionPartie1Raw from "./raw/gestion-partie1.md?raw";
import { createSlidesFromParsedMarkdown } from "./parsed-markdown-to-slides";

export const GESTION_PARTIE1_SLIDES: Slide[] = createSlidesFromParsedMarkdown(gestionPartie1Raw, {
  maxSlides: 26,
});
