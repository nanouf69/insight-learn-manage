import { Slide } from "./t3p-partie1-data";
import t3pPartie2Raw from "./raw/t3p-partie2.md?raw";
import { createSlidesFromParsedMarkdown } from "./parsed-markdown-to-slides";

export const T3P_PARTIE2_SLIDES: Slide[] = createSlidesFromParsedMarkdown(t3pPartie2Raw, {
  maxSlides: 39,
});
