import type { Slide, SlideBlock } from "./t3p-partie1-data";

interface ParseOptions {
  maxSlides?: number;
}

interface ParsedPage {
  pageNumber: number;
  content: string;
}

interface PageSection {
  heading: string;
  bullets: string[];
  tableLines: string[];
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

const isGenericTitle = (title: string) => /^Slide\s+\d+$/i.test(title.trim());

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

  const headers = parseCells(tableLines[0]);
  const hasSeparator = tableLines[1] ? isSeparatorRow(tableLines[1]) : false;
  const dataRows = tableLines.slice(hasSeparator ? 2 : 1).filter((l) => !isSeparatorRow(l));
  const rows = dataRows.map(parseCells);

  return headers.length > 0 ? { headers, rows } : null;
}

function extractPages(markdown: string): ParsedPage[] {
  const pageHeaderRegex = /^##\s*Page\s+(\d+)\s*$/gim;
  const matches: { pageNumber: number; index: number; full: string }[] = [];

  let match: RegExpExecArray | null;
  while ((match = pageHeaderRegex.exec(markdown)) !== null) {
    matches.push({ pageNumber: Number(match[1]), index: match.index, full: match[0] });
  }

  if (matches.length === 0) return [];

  return matches.map((m, i) => {
    const start = m.index + m.full.length;
    const end = i < matches.length - 1 ? matches[i + 1].index : markdown.length;
    return {
      pageNumber: m.pageNumber,
      content: markdown.slice(start, end),
    };
  });
}

function cleanPageLines(rawPage: string): string[] {
  const cleaned: string[] = [];

  for (const raw of rawPage.split("\n")) {
    const line = normalizeLine(raw);
    if (!line) continue;
    if (/^###?\s*Images from page/i.test(line)) continue;
    if (line.includes("parsed-documents://")) continue;
    if (FOOTER_PATTERN.test(line)) continue;
    if (PAGE_COUNTER_PATTERN.test(line)) continue;
    cleaned.push(line);
  }

  return cleaned;
}

function toRichSlide(pageNumber: number, pageLines: string[]): Slide {
  const meaningfulLines = pageLines.map(stripMdPrefix).filter(Boolean);

  if (meaningfulLines.length === 0) {
    return { type: "section", title: `Slide ${pageNumber}`, subtitle: "" };
  }

  const sections: PageSection[] = [];
  let currentSection: PageSection | null = null;

  for (const rawLine of pageLines) {
    if (isTableRow(rawLine)) {
      if (!currentSection) {
        currentSection = { heading: "", bullets: [], tableLines: [] };
        sections.push(currentSection);
      }
      currentSection.tableLines.push(rawLine);
      continue;
    }

    if (/^#{1,6}\s+/.test(rawLine)) {
      currentSection = { heading: stripMdPrefix(rawLine), bullets: [], tableLines: [] };
      sections.push(currentSection);
      continue;
    }

    const text = stripMdPrefix(rawLine);
    if (!text) continue;

    if (!currentSection) {
      currentSection = { heading: "", bullets: [], tableLines: [] };
      sections.push(currentSection);
    }

    currentSection.bullets.push(text);
  }

  if (sections.length === 0) {
    return {
      type: "section",
      title: meaningfulLines[0] || `Slide ${pageNumber}`,
      subtitle: meaningfulLines[1],
    };
  }

  const firstHeading = sections[0].heading || sections[0].bullets[0] || meaningfulLines[0] || `Slide ${pageNumber}`;

  if (pageNumber === 1) {
    const subtitle = meaningfulLines[1] || "";
    const footer = meaningfulLines.find((l) => /Formation|Qualiopi|CPF|Lyon/i.test(l));
    return {
      type: "title",
      title: firstHeading,
      subtitle,
      footer,
      brand: "FTRANSPORT - SERVICES PRO",
    };
  }

  if (/sommaire|plan du cours/i.test(firstHeading)) {
    const headingCandidates = sections
      .map((s) => s.heading)
      .filter(Boolean)
      .filter((h) => h !== firstHeading)
      .filter((h) => !/^—\s*PARTIE/i.test(h));

    const items = headingCandidates.map((h, i) => {
      const matchNum = h.match(/^(\d+[a-z]?)\.\s*/i);
      return {
        n: matchNum ? matchNum[1] : String(i + 1),
        label: matchNum ? h.replace(matchNum[0], "").trim() : h,
        page: 0,
      };
    });

    if (items.length > 0) {
      return { type: "sommaire", title: firstHeading, items };
    }
  }

  const allBullets = sections.flatMap((s) => s.bullets);
  const allTableLines = sections.flatMap((s) => s.tableLines);
  const hasTable = allTableLines.length >= 2;
  const totalBullets = allBullets.length;

  if (!hasTable && sections.length <= 2 && totalBullets <= 1) {
    const subtitle = sections[0].bullets[0] || sections[1]?.heading || meaningfulLines[1] || "";
    return { type: "section", title: firstHeading, subtitle };
  }

  const keyRule = allBullets.find((b) => /^✔|^⚠|^Règle clé/i.test(b));

  if (hasTable && totalBullets <= 6) {
    const table = parseTableBlock(allTableLines);
    if (table) {
      const intro = allBullets.filter((b) => b !== keyRule).slice(0, 2).join(" ") || undefined;
      const extraSections = sections
        .filter((s) => s.heading && s.heading !== firstHeading)
        .map((s) => ({ heading: s.heading, items: s.bullets.filter((b) => b !== keyRule) }))
        .filter((s) => s.items.length > 0);

      return {
        type: "table",
        title: firstHeading,
        intro,
        headers: table.headers,
        rows: table.rows,
        keyRule,
        extraSections: extraSections.length > 0 ? extraSections : undefined,
      };
    }
  }

  const blocks: SlideBlock[] = [];
  let intro: string | undefined;
  let ref: string | undefined;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const points = section.bullets.filter((b) => b !== keyRule);

    if (i === 0 && section.heading === firstHeading) {
      if (points.length > 0) {
        if (/^Art\.|^Loi\b|^Arrêté\b|^Décret\b|^Code\b/i.test(points[0])) {
          ref = points[0];
          intro = points.slice(1).join(" ") || undefined;
        } else {
          intro = points[0];
          if (points.length > 1) {
            blocks.push({
              heading: section.heading || firstHeading,
              color: BLOCK_COLORS[blocks.length % BLOCK_COLORS.length],
              points: points.slice(1),
            });
          }
        }
      }
      continue;
    }

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

  const safeTitle = isGenericTitle(firstHeading) && meaningfulLines[0] ? meaningfulLines[0] : firstHeading;

  return {
    type: "content",
    title: safeTitle,
    ref,
    intro,
    blocks: blocks.length > 0 ? blocks : [{ heading: "Contenu", color: BLOCK_COLORS[0], points: meaningfulLines.slice(1) }],
    keyRule,
  };
}

function toFallbackSlide(pageNumber: number, pageLines: string[]): Slide {
  const meaningful = pageLines.map(stripMdPrefix).filter(Boolean);

  if (meaningful.length === 0) {
    return { type: "section", title: `Slide ${pageNumber}`, subtitle: "" };
  }

  if (pageNumber === 1) {
    return {
      type: "title",
      title: meaningful[0],
      subtitle: meaningful[1] || "",
      footer: meaningful.find((l) => /Formation|Qualiopi|CPF|Lyon/i.test(l)),
      brand: "FTRANSPORT - SERVICES PRO",
    };
  }

  if (meaningful.length <= 2) {
    return {
      type: "section",
      title: meaningful[0],
      subtitle: meaningful[1] || "",
    };
  }

  return {
    type: "content",
    title: meaningful[0],
    intro: meaningful[1],
    blocks: [
      {
        heading: `Slide ${pageNumber}`,
        color: BLOCK_COLORS[pageNumber % BLOCK_COLORS.length],
        points: meaningful.slice(2),
      },
    ],
  };
}

export function createSlidesFromParsedMarkdown(markdown: string, options?: ParseOptions): Slide[] {
  const pages = extractPages(markdown);
  if (pages.length === 0) return [];

  const richSlides = pages.map((page) => toRichSlide(page.pageNumber, cleanPageLines(page.content)));
  const genericCount = richSlides.filter((s) => isGenericTitle(s.title)).length;
  const shouldUseFallback = genericCount > Math.floor(richSlides.length * 0.4);

  const slides = shouldUseFallback
    ? pages.map((page) => toFallbackSlide(page.pageNumber, cleanPageLines(page.content)))
    : richSlides;

  return options?.maxSlides ? slides.slice(0, options.maxSlides) : slides;
}
