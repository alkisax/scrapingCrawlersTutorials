import playwright from "playwright";
import fs from "fs";

interface CurrentContext {
  book: string;
  chapter: number;
  chapterTitle: string;
  sectionTitle: string | null;
  subsectionTitle: string | null;
  subsubsectionTitle: string | null;
  subtitleD: string | null;
}

const CH1_URL =
  "https://www.marxists.org/archive/marx/works/1867-c1/ch01.htm";

const scrapeChapter1 = async (
  url: string,
  book: string,
  chapterNum: number
): Promise<void> => {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({ bypassCSP: true });
  const page = await context.newPage();
  await page.goto(url, { timeout: 30000 });
  await page.setViewportSize({ width: 1000, height: 800 });

  const paragraphs = await page.evaluate(
    ({ book, chapterNum }) => {
      const nodes = Array.from(
        document.body.querySelectorAll("h3, h4, h5, h6, p, blockquote, table")
      );
      const data: any[] = [];

      let current: CurrentContext = {
        book,
        chapter: chapterNum,
        chapterTitle: "",
        sectionTitle: null,
        subsectionTitle: null,
        subsubsectionTitle: null,
        subtitleD: null,
      };

      let paragraphCount = 0;

      for (const el of nodes) {
        const tag = el.tagName.toLowerCase();

        // Reset paragraph numbering for each <h3>
        if (tag === "h3") paragraphCount = 0;

        // --- TABLES ---
        if (tag === "table") {
          const rows: string[][] = [];
          el.querySelectorAll("tr").forEach((tr) => {
            const cells = Array.from(tr.querySelectorAll("td")).map(
              (td) => td.textContent?.replace(/\s+/g, " ").trim() || ""
            );
            if (cells.length > 0) rows.push(cells);
          });
          if (rows.length > 0) {
            data.push({
              ...current,
              type: "table",
              table: rows,
              hasFootnotes: [],
              paragraphNumber: null,
            });
          }
          continue;
        }

        // --- FOOTNOTES ---
        if (tag === "p" && el.classList.contains("information")) {
          const anchor = el.querySelector(".info a");
          const footnoteNum =
            anchor?.getAttribute("name")?.replace(/^n/i, "") || null;
          const text = el.textContent?.replace(/\s+/g, " ").trim() || "";
          if (text) {
            data.push({
              ...current,
              sectionTitle: null,
              subsectionTitle: null,
              subsubsectionTitle: null,
              subtitleD: null,
              type: "text-footnote",
              paragraphNumber: footnoteNum,
              text,
              hasFootnotes: [],
            });
          }
          continue;
        }

        // --- PARAGRAPHS ---
        if (
          tag === "p" &&
          !el.classList.contains("information") &&
          !el.classList.contains("footer")
        ) {
          const text = el.textContent?.replace(/\s+/g, " ").trim() || "";
          if (!text) continue;

          // ✅ Chapter 1–only fallback: detect <p><b>A.</b>...</p>
          const bold = el.querySelector("b");
          if (bold && /^[A-D]\./i.test(bold.textContent?.trim() || "")) {
            current.subsectionTitle = bold.textContent.trim();
            current.subsubsectionTitle = null;
            continue; // skip from normal paragraph count
          }

          // Footnotes inside paragraph
          const footnotes: string[] = [];
          el.querySelectorAll("sup").forEach((s) => {
            const match = s.textContent?.match(/\[(\d+[a-zA-Z]*)\]/);
            if (match) footnotes.push(match[1]);
          });

          // --- INDEX DETECTION ---
          const anchors = Array.from(el.querySelectorAll(":scope > a")).filter(
            (a) =>
              a.textContent?.trim() &&
              !/^\[?\d+[a-zA-Z]?\]?$/.test(a.textContent.trim()) &&
              !/^\[\w+\]$/.test(a.textContent.trim()) &&
              a.getAttribute("href") &&
              !a.closest("sup")
          );

          if (anchors.length > 0) {
            anchors.forEach((a) => {
              const text = a.textContent?.trim();
              if (text) {
                data.push({
                  ...current,
                  type: "index",
                  text,
                  hasFootnotes: [],
                  paragraphNumber: null,
                });
              }
            });
            continue;
          }

          // --- TEXT-TABLE DETECTION ---
          if (
            el.classList.contains("indentb") &&
            (el.innerHTML.includes("<br") ||
              /text-align|margin-left/i.test(el.getAttribute("style") || ""))
          ) {
            paragraphCount++;
            data.push({
              ...current,
              type: "text-table",
              paragraphNumber: paragraphCount,
              text,
              hasFootnotes: footnotes,
            });
            continue;
          }

          // --- TEXT-QUOTE DETECTION ---
          if (
            el.classList.contains("quote") ||
            el.classList.contains("quoteb") ||
            /^["“‘]/.test(text.trim())
          ) {
            paragraphCount++;
            data.push({
              ...current,
              type: "text-quote",
              paragraphNumber: paragraphCount,
              text,
              hasFootnotes: footnotes,
            });
            continue;
          }

          // --- REGULAR PARAGRAPH ---
          paragraphCount++;
          data.push({
            ...current,
            type: "text",
            paragraphNumber: paragraphCount,
            text,
            hasFootnotes: footnotes,
          });
          continue;
        }

        // --- HEADINGS ---
        if (tag === "h6") {
          current.subsubsectionTitle = el.textContent.trim();
          continue;
        }

        if (tag === "h5") {
          current.subsectionTitle = el.textContent.trim();
          current.subsubsectionTitle = current.subtitleD = null;
          continue;
        }

        if (tag === "h4") {
          current.sectionTitle = el.textContent.trim();
          current.subsectionTitle = current.subsubsectionTitle = null;
          continue;
        }

        if (tag === "h3" && /Chapter/i.test(el.textContent || "")) {
          current.chapterTitle = el.textContent.trim();
          continue;
        }

        if (tag === "h3" && /Footnotes/i.test(el.textContent || "")) {
          current.sectionTitle =
            current.subsectionTitle =
            current.subsubsectionTitle =
              null;
          continue;
        }

        // fallback if no chapterTitle found yet
        if (!current.chapterTitle) {
          const titleTag =
            document.querySelector("title")?.textContent?.trim();
          if (titleTag) current.chapterTitle = titleTag;
        }
      }

      return data;
    },
    { book, chapterNum }
  );

  // Save
  fs.mkdirSync("book1_ch1_test", { recursive: true });
  fs.writeFileSync(
    "book1_ch1_test/chapter1.json",
    JSON.stringify(paragraphs, null, 2),
    "utf-8"
  );

  await browser.close();
};

// Run
(async () => {
  console.log("⛏️ Scraping Book 1 – Chapter 1");
  await scrapeChapter1(CH1_URL, "Book 1", 1);
  console.log("✅ Done. Output in /book1_ch1_test/chapter1.json");
})();
