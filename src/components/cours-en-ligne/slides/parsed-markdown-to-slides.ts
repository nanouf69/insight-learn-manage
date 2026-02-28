import type { Slide, SlideBlock } from "./t3p-partie1-data";

interface ParseOptions {
  maxSlides?: number;
}

const FOOTER_PATTERN = /FTRANSPORT\s*[-–—]\s*SERVICES\s*PRO/i;
const PAGE_NUM_PATTERN = /^\d+\s*\/\s*\d+$/;
const IMAGE_REF_PATTERN = /^parsed-documents:\/\//;
const IMAGES_HEADER = /^###?\s*Images from page/i;

const decodeEntities = (text: string) =>
  text
    .replace(/&#x26;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.split("|").length >= 3;
}

function isSeparatorRow(line: string): boolean {
  return /^\|[\s\-:|]+\|$/.test(line.trim());
}

function parseTableBlock(lines: string[]): { headers: string[]; rows: string[][] } | null {
  if (lines.length < 2) return null;
  const parseCells = (line: string) =>
    line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => c.replace(/\*\*/g, "").trim());

  let headerLine = 0;
  let dataStart = 1;
  if (isSeparatorRow(lines[0])) return null;
  if (lines.length > 1 && isSeparatorRow(lines[1])) {
    dataStart = 2;
  }
  const headers = parseCells(lines[headerLine]);
  const rows = lines.slice(dataStart).filter(l => !isSeparatorRow(l)).map(parseCells);
  return { headers, rows };
}

interface PageSection {
  heading: string;
  bullets: string[];
  tableLines: string[];
}

const BLOCK_COLORS = [
  "#3498db", "#e67e22", "#2ecc71", "#9b59b6", "#e74c3c",
  "#1abc9c", "#f39c12", "#2980b9", "#8e44ad", "#27ae60",
];

export function createSlidesFromParsedMarkdown(markdown: string, options?: ParseOptions): Slide[] {
  const pageRegex = /^## Page\s+(\d+)\s*$([\s\S]*?)(?=^## Page\s+\d+\s*$|$)/gm;
  const slides: Slide[] = [];
  let match: RegExpExecArray | null;

  while ((match = pageRegex.exec(markdown)) !== null) {
    const pageNumber = Number(match[1]);
    const rawPage = match[2];

    // Remove image references section entirely
    const cleanedPage = rawPage
      .replace(/^###?\s*Images from page[\s\S]*?(?=^#|\Z)/gm, "")
      .replace(/^-\s*`?parsed-documents:\/\/[^\n]*/gm, "");

    // Split into lines, decode entities, filter junk
    const allLines = cleanedPage.split("\n").map(l => decodeEntities(l)).filter(line => {
      const t = line.trim();
      if (!t) return false;
      if (FOOTER_PATTERN.test(t)) return false;
      if (PAGE_NUM_PATTERN.test(t)) return false;
      if (/^\d+$/.test(t)) return false;
      if (IMAGE_REF_PATTERN.test(t)) return false;
      if (IMAGES_HEADER.test(t)) return false;
      if (t.startsWith("- `parsed-documents://")) return false;
      return true;
    });

    if (allLines.length === 0) {
      slides.push({ type: "section", title: `Slide ${pageNumber}`, subtitle: "" });
      continue;
    }

    // Parse sections: lines starting with # are headings, others are body
    const sections: PageSection[] = [];
    let currentSection: PageSection | null = null;

    for (const rawLine of allLines) {
      const trimmed = rawLine.trim();
      const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/);

      if (headingMatch) {
        const heading = headingMatch[1].replace(/\*\*/g, "").trim();
        currentSection = { heading, bullets: [], tableLines: [] };
        sections.push(currentSection);
      } else if (isTableRow(trimmed)) {
        if (!currentSection) {
          currentSection = { heading: "", bullets: [], tableLines: [] };
          sections.push(currentSection);
        }
        currentSection.tableLines.push(trimmed);
      } else {
        // Bullet or plain text
        let text = trimmed
          .replace(/^[-•▸]\s*/, "")
          .replace(/\*\*/g, "")
          .replace(/`/g, "")
          .trim();
        if (!text) continue;
        if (!currentSection) {
          currentSection = { heading: "", bullets: [], tableLines: [] };
          sections.push(currentSection);
        }
        currentSection.bullets.push(text);
      }
    }

    // Determine slide type
    const firstHeading = sections[0]?.heading || sections[0]?.bullets[0] || `Slide ${pageNumber}`;

    // Page 1 → title slide
    if (pageNumber === 1) {
      const subtitle = sections[0]?.bullets[0] || sections[1]?.heading || "";
      const footer = sections.flatMap(s => s.bullets).find(b => /Formation|Éligible|Qualiopi/i.test(b)) || "";
      slides.push({
        type: "title",
        title: firstHeading,
        subtitle,
        footer,
        brand: "FTRANSPORT - SERVICES PRO",
      });
      continue;
    }

    // Check if page has significant table content
    const allTableLines = sections.flatMap(s => s.tableLines);
    const hasTable = allTableLines.length >= 2;
    const totalBullets = sections.reduce((n, s) => n + s.bullets.length, 0);

    // Sommaire detection
    if (/sommaire|plan du cours/i.test(firstHeading)) {
      const items = sections
        .filter(s => s.heading && s.heading !== firstHeading)
        .map((s, i) => {
          const numMatch = s.heading.match(/^(\d+[a-z]?)\.\s*/);
          return {
            n: numMatch ? numMatch[1] : String(i + 1),
            label: numMatch ? s.heading.replace(numMatch[0], "").trim() : s.heading,
            page: 0,
          };
        });
      if (items.length > 0) {
        slides.push({ type: "sommaire", title: firstHeading, items });
        continue;
      }
    }

    // Section slide (few content, just a heading + maybe subtitle)
    if (sections.length <= 2 && totalBullets <= 1 && !hasTable) {
      slides.push({
        type: "section",
        title: firstHeading,
        subtitle: sections[0]?.bullets[0] || sections[1]?.heading || "",
      });
      continue;
    }

    // Detect key rule
    const allBullets = sections.flatMap(s => s.bullets);
    const keyRuleIdx = allBullets.findIndex(b => /^✔|^⚠|^Règle clé/i.test(b));
    const keyRule = keyRuleIdx >= 0 ? allBullets[keyRuleIdx] : undefined;

    // Table-heavy slide
    if (hasTable && totalBullets <= 4) {
      const table = parseTableBlock(allTableLines);
      if (table && table.headers.length > 0) {
        const intro = allBullets.filter(b => b !== keyRule).slice(0, 2).join(" ") || undefined;
        const extraSections = sections
          .filter(s => s.heading && s.heading !== firstHeading && s.bullets.length > 0)
          .map(s => ({ heading: s.heading, items: s.bullets.filter(b => b !== keyRule) }))
          .filter(s => s.items.length > 0);
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

    // Content slide with blocks
    const blocks: SlideBlock[] = [];
    let intro: string | undefined;
    let ref: string | undefined;

    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      // First section without heading → intro text
      if (i === 0 && !s.heading && s.bullets.length > 0) {
        intro = s.bullets.filter(b => b !== keyRule).join(" ");
        continue;
      }
      if (i === 0 && s.heading === firstHeading) {
        // Main title section — bullets become intro or first block
        const filteredBullets = s.bullets.filter(b => b !== keyRule);
        if (filteredBullets.length > 0 && !intro) {
          // Check if first bullet looks like a reference
          if (/^Art\.|^Loi |^Arrêté|^Décret|^Code /i.test(filteredBullets[0])) {
            ref = filteredBullets[0];
            intro = filteredBullets.slice(1).join(" ") || undefined;
          } else {
            intro = filteredBullets[0];
            if (filteredBullets.length > 1) {
              blocks.push({
                heading: firstHeading,
                color: BLOCK_COLORS[0],
                points: filteredBullets.slice(1),
              });
            }
          }
        }
        // Include table data as extra block
        if (s.tableLines.length >= 2) {
          const tbl = parseTableBlock(s.tableLines);
          if (tbl) {
            blocks.push({
              heading: "Tableau",
              color: BLOCK_COLORS[blocks.length % BLOCK_COLORS.length],
              points: tbl.rows.map(r => r.join(" — ")),
            });
          }
        }
        continue;
      }

      // Named section → block
      const filteredPoints = s.bullets.filter(b => b !== keyRule);
      // Include table rows as text points
      if (s.tableLines.length >= 2) {
        const tbl = parseTableBlock(s.tableLines);
        if (tbl) {
          tbl.rows.forEach(r => filteredPoints.push(r.join(" — ")));
        }
      }

      if (s.heading || filteredPoints.length > 0) {
        blocks.push({
          heading: s.heading || `Section ${i + 1}`,
          color: BLOCK_COLORS[blocks.length % BLOCK_COLORS.length],
          points: filteredPoints.length > 0 ? filteredPoints : ["—"],
        });
      }
    }

    slides.push({
      type: "content",
      title: firstHeading,
      ref,
      intro,
      blocks: blocks.length > 0 ? blocks : undefined,
      keyRule,
    });
  }

  if (options?.maxSlides) {
    return slides.slice(0, options.maxSlides);
  }

  return slides;
}
