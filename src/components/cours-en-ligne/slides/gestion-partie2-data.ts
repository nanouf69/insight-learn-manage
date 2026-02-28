import { Slide } from "./t3p-partie1-data";
import gestionPartie2Raw from "./raw/gestion-partie2.md?raw";
import { createSlidesFromParsedMarkdown } from "./parsed-markdown-to-slides";

export const GESTION_PARTIE2_SLIDES: Slide[] = createSlidesFromParsedMarkdown(gestionPartie2Raw, {
  maxSlides: 17,
});
