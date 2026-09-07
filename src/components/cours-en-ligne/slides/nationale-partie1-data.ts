import { Slide } from "./t3p-partie1-data";
import nationalePartie1Raw from "./raw/nationale-partie1.md?raw";
import { createSlidesFromParsedMarkdown } from "./parsed-markdown-to-slides";

export const NATIONALE_PARTIE1_SLIDES: Slide[] = createSlidesFromParsedMarkdown(nationalePartie1Raw, {
  maxSlides: 16,
});
