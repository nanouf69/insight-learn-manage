import type { Slide } from "./t3p-partie1-data";

interface ParseOptions {
  maxSlides?: number;
}

const FOOTER_PATTERN = /FTRANSPORT\s*-\s*SERVICES\s*PRO/i;

const decodeEntities = (text: string) =>
  text
    .replace(/&#x26;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const cleanLine = (line: string) =>
  decodeEntities(line)
    .replace(/^#+\s*/, "")
    .replace(/^[-•]\s*/, "")
    .replace(/`/g, "")
    .trim();

export function createSlidesFromParsedMarkdown(markdown: string, options?: ParseOptions): Slide[] {
  const pageRegex = /^## Page\s+(\d+)\s*$([\s\S]*?)(?=^## Page\s+\d+\s*$|$)/gm;
  const slides: Slide[] = [];
  let match: RegExpExecArray | null;

  while ((match = pageRegex.exec(markdown)) !== null) {
    const pageNumber = Number(match[1]);
    const rawPage = match[2]
      .replace(/^### Images from page[\s\S]*$/gm, "")
      .replace(/^-\s*`?parsed-documents:\/\/.+$/gm, "")
      .trim();

    const lines = rawPage
      .split("\n")
      .map(cleanLine)
      .filter(
        (line) =>
          line.length > 0 &&
          !FOOTER_PATTERN.test(line) &&
          !/^\d+\s*\/\s*\d+$/.test(line) &&
          !/^\d+$/.test(line) &&
          !line.startsWith("parsed-documents://")
      );

    if (lines.length === 0) {
      slides.push({
        type: "section",
        title: `Slide ${pageNumber}`,
        subtitle: "Contenu de la diapositive"
      });
      continue;
    }

    const title = lines[0] || `Slide ${pageNumber}`;
    const body = lines
      .slice(1)
      .map((line) => line.replace(/^\|\s*/, "").replace(/\s*\|$/g, "").trim())
      .filter(Boolean)
      .slice(0, 12);

    if (pageNumber === 1) {
      slides.push({
        type: "title",
        title,
        subtitle: body[0],
        brand: "FTRANSPORT - SERVICES PRO"
      });
      continue;
    }

    if (body.length <= 1) {
      slides.push({
        type: "section",
        title,
        subtitle: body[0]
      });
      continue;
    }

    slides.push({
      type: "content",
      title,
      intro: body[0],
      blocks: [
        {
          heading: `Slide ${pageNumber}`,
          color: "#3498db",
          points: body.slice(1)
        }
      ]
    });
  }

  if (options?.maxSlides) {
    return slides.slice(0, options.maxSlides);
  }

  return slides;
}
