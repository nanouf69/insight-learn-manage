import { Slide } from "./t3p-partie1-data";
import gestionPartie3Raw from "./raw/gestion-partie3.md?raw";
import { createSlidesFromParsedMarkdown } from "./parsed-markdown-to-slides";

export const GESTION_PARTIE3_SLIDES: Slide[] = createSlidesFromParsedMarkdown(gestionPartie3Raw, {
  maxSlides: 13,
});
