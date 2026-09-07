import { Slide } from "./t3p-partie1-data";
import nationalePartie2Raw from "./raw/nationale-partie2.md?raw";
import { createSlidesFromParsedMarkdown } from "./parsed-markdown-to-slides";

export const NATIONALE_PARTIE2_SLIDES: Slide[] = createSlidesFromParsedMarkdown(nationalePartie2Raw, {
  maxSlides: 17,
});
