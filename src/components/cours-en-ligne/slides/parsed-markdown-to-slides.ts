import type { Slide, SlideBlock } from "./t3p-partie1-data";

interface ParseOptions {
  maxSlides?: number;
}

const FOOTER_PATTERN = /FTRANSPORT\s*[-–—]\s*SERVICES\s*PRO/i;
const PAGE_COUNTER_PATTERN = /^\d+\s*\/\s*\d+$/;

const BLOCK_COLORS = [
  "#3498db",
  "#e67e22",
  "#2ecc71",
  "#9b59b6",
  "#e74c3c",
  "#1abc9c",
  "#f39c12",
  "#2980b9",
  "#8e44ad",
  "#27ae60",
];

const decodeEntities = (text: string) =>
  text
    .replace(/&#x26;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const normalizeLine = (line: string) => decodeEntities(line).replace(/\r/g, "").trim();

const stripMdPrefix = (line: string) =>
  line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-•▸]\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .trim();

const isTableRow = (line: string) => {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|") && t.split("|").length >= 3;
};

const isSeparatorRow = (line: string) => /^\|[\s\-:|]+\|$/.test(line.trim());

function parseTableBlock(lines: string[]): { headers: string[]; rows: string[][] } | null {
  const tableLines = lines.filter(isTableRow);
  if (tableLines.length < 2) return null;

  const parseCells = (line: string) =>
    line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => stripMdPrefix(c));

  const headerLine = tableLines[0];
  const secondLine = tableLines[1];
  const hasSeparator = isSeparatorRow(secondLine);

  const headers = parseCells(headerLine);
  const dataRows = tableLines.slice(hasSeparator ? 2 : 1).filter((l) => !isSeparatorRow(l));
  const rows = dataRows.map(parseCells);

  return headers.length > 0 ? { headers, rows } : null;
}

interface PageSection {
  heading: string;
  bullets: string[];
  tableLines: string[];
}

export function createSlidesFromParsedMarkdown(markdown: string, options?: ParseOptions): Slide[] {
  const pageRegex = /^## Page\s+(\d+)\s*$([\s\S]*?)(?=^## Page\s+\d+\s*$|$)/gm;
  const slides: Slide[] = [];
  let match: RegExpExecArray | null;

  while ((match = pageRegex.exec(markdown)) !== null) {
    const pageNumber = Number(match[1]);
    const rawPage = match[2] ?? "";

    // Nettoyage robuste sans regex destructive
    const pageLines = rawPage
      .split("\n")
      .map(normalizeLine)
      .filter(Boolean)
      .filter((line) => !line.startsWith("### Images from page"))
      .filter((line) => !line.includes("parsed-documents://"))
      .filter((line) => !FOOTER_PATTERN.test(line))
      .filter((line) => !PAGE_COUNTER_PATTERN.test(line));

    const meaningfulLines = pageLines.map(stripMdPrefix).filter(Boolean);

    if (meaningfulLines.length === 0) {
      slides.push({ type: "section", title: `Slide ${pageNumber}`, subtitle: "" });
      continue;
    }

    const sections: PageSection[] = [];
    let currentSection: PageSection | null = null;

    for (const rawLine of pageLines) {
      const line = rawLine.trim();

      if (isTableRow(line)) {
        if (!currentSection) {
          currentSection = { heading: "", bullets: [], tableLines: [] };
          sections.push(currentSection);
        }
        currentSection.tableLines.push(line);
        continue;
      }

      if (/^#{1,6}\s+/.test(line)) {
        const heading = stripMdPrefix(line);
        currentSection = { heading, bullets: [], tableLines: [] };
        sections.push(currentSection);
        continue;
      }

      const bullet = stripMdPrefix(line);
      if (!bullet) continue;

      if (!currentSection) {
        currentSection = { heading: "", bullets: [], tableLines: [] };
        sections.push(currentSection);
      }

      currentSection.bullets.push(bullet);
    }

    if (sections.length === 0) {
      slides.push({
        type: "section",
        title: meaningfulLines[0] || `Slide ${pageNumber}`,
        subtitle: meaningfulLines[1],
      });
      continue;
    }

    const firstHeading = sections[0].heading || sections[0].bullets[0] || meaningfulLines[0] || `Slide ${pageNumber}`;
    const totalBullets = sections.reduce((acc, s) => acc + s.bullets.length, 0);
    const allBullets = sections.flatMap((s) => s.bullets);
    const allTableLines = sections.flatMap((s) => s.tableLines);

    // Page 1 = couverture
    if (pageNumber === 1) {
      const subtitle = meaningfulLines[1] || "";
      const footer = meaningfulLines.find((l) => /Formation|Qualiopi|CPF|Lyon/i.test(l));
      slides.push({
        type: "title",
        title: firstHeading,
        subtitle,
        footer,
        brand: "FTRANSPORT - SERVICES PRO",
      });
      continue;
    }

    // Sommaire
    if (/sommaire|plan du cours/i.test(firstHeading)) {
      const headingCandidates = sections
        .map((s) => s.heading)
        .filter(Boolean)
        .filter((h) => h !== firstHeading)
        .filter((h) => !/^—\s*PARTIE/i.test(h));

      const items = headingCandidates.slice(0, 20).map((h, i) => {
        const matchNum = h.match(/^(\d+[a-z]?)\.\s*/i);
        return {
          n: matchNum ? matchNum[1] : String(i + 1),
          label: matchNum ? h.replace(matchNum[0], "").trim() : h,
          page: 0,
        };
      });

      if (items.length > 0) {
        slides.push({ type: "sommaire", title: firstHeading, items });
        continue;
      }
    }

    // Slide de section (intro de chapitre)
    const hasTable = allTableLines.length >= 2;
    if (!hasTable && sections.length <= 2 && totalBullets <= 1) {
      const subtitle = sections[0].bullets[0] || sections[1]?.heading || meaningfulLines[1] || "";
      slides.push({ type: "section", title: firstHeading, subtitle });
      continue;
    }

    const keyRule = allBullets.find((b) => /^✔|^⚠|^Règle clé/i.test(b));

    // Slides à dominante tableau
    if (hasTable && totalBullets <= 6) {
      const table = parseTableBlock(allTableLines);
      if (table) {
        const intro = allBullets.filter((b) => b !== keyRule).slice(0, 2).join(" ") || undefined;
        const extraSections = sections
          .filter((s) => s.heading && s.heading !== firstHeading)
          .map((s) => ({ heading: s.heading, items: s.bullets.filter((b) => b !== keyRule) }))
          .filter((s) => s.items.length > 0);

        slides.push({
          type: "table",
          title: firstHeading,
          intro,
          headers: table.headers,
          rows: table.rows,
          keyRule,
          extraSections: extraSections.length > 0 ? extraSections : undefined,
        });
        continue;
      }
    }

    // Slide de contenu riche
    const blocks: SlideBlock[] = [];
    let intro: string | undefined;
    let ref: string | undefined;

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const cleanBullets = section.bullets.filter((b) => b !== keyRule);

      if (i === 0 && section.heading === firstHeading) {
        if (cleanBullets.length > 0) {
          const maybeRef = cleanBullets[0];
          if (/^Art\.|^Loi\b|^Arrêté\b|^Décret\b|^Code\b/i.test(maybeRef)) {
            ref = maybeRef;
            intro = cleanBullets.slice(1).join(" ") || undefined;
          } else {
            intro = cleanBullets[0];
            if (cleanBullets.length > 1) {
              blocks.push({
                heading: section.heading || firstHeading,
                color: BLOCK_COLORS[blocks.length % BLOCK_COLORS.length],
                points: cleanBullets.slice(1),
              });
            }
          }
        }
      } else {
        const points = [...cleanBullets];

        if (section.tableLines.length >= 2) {
          const sectionTable = parseTableBlock(section.tableLines);
          if (sectionTable) {
            sectionTable.rows.forEach((row) => points.push(row.join(" — ")));
          }
        }

        if (section.heading || points.length > 0) {
          blocks.push({
            heading: section.heading || `Section ${i + 1}`,
            color: BLOCK_COLORS[blocks.length % BLOCK_COLORS.length],
            points: points.length > 0 ? points : ["—"],
          });
        }
      }
    }

    // Garde-fou anti-slides vides
    const safeTitle = /^Slide\s+\d+$/i.test(firstHeading) && meaningfulLines[0] ? meaningfulLines[0] : firstHeading;

    slides.push({
      type: "content",
      title: safeTitle,
      ref,
      intro,
      blocks: blocks.length > 0 ? blocks : [{ heading: "Contenu", color: BLOCK_COLORS[0], points: meaningfulLines.slice(1) }],
      keyRule,
    });
  }

  const result = options?.maxSlides ? slides.slice(0, options.maxSlides) : slides;
  return result;
}
