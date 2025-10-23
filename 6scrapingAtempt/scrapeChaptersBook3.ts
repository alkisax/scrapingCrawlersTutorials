import playwright from 'playwright'
import fs from 'fs'

interface CurrentContext {
  book: string
  chapter: number
  chapterTitle: string
  sectionTitle: string | null
  subsectionTitle: string | null
  subsubsectionTitle: string | null
  subtitleD: string | null
}

const scrapeChapter = async (url: string, book: string, chapterNum: number): Promise<void> => {
  try {
    const browser = await playwright.chromium.launch({ headless: true })
    const context = await browser.newContext({ bypassCSP: true })
    const page = await context.newPage()

    await page.setDefaultNavigationTimeout(30000)
    await page.setViewportSize({ width: 1000, height: 800 })
    await page.goto(url)

    const paragraphs = await page.evaluate(
      ({ book, chapterNum }: { book: string; chapterNum: number }) => {
        const nodes = Array.from(document.body.querySelectorAll('h1, h3, h4, h5, h6, p, blockquote, table'))
        const data: any[] = []

        let current: CurrentContext = {
          book,
          chapter: chapterNum,
          chapterTitle: '',
          sectionTitle: null,
          subsectionTitle: null,
          subsubsectionTitle: null,
          subtitleD: null
        }

        let paragraphCount = 0

        for (const el of nodes) {
          const tag = el.tagName.toLowerCase()
          const text = el.textContent?.replace(/\s+/g, ' ').trim() || ''
          if (!text) continue

          // Reset paragraph numbering when new major title
          if (tag === 'h1' || tag === 'h3' || tag === 'h4') paragraphCount = 0

          /* --- TABLE DETECTION --- */
          if (tag === 'table') {
            const rows: string[][] = []
            el.querySelectorAll('tr').forEach(tr => {
              const cells = Array.from(tr.querySelectorAll('td')).map(
                td => td.textContent?.replace(/\s+/g, ' ').trim() || ''
              )
              if (cells.length > 0) rows.push(cells)
            })
            if (rows.length > 0) {
              data.push({
                ...current,
                type: 'table',
                table: rows,
                paragraphNumber: null,
                hasFootnotes: []
              })
            }
            continue
          }

          /* --- FOOTNOTES (IGNORE information/footer) --- */
          if (tag === 'p' && el.classList.contains('information')) {
            const anchor = el.querySelector('.info a')
            const footnoteNum = anchor?.getAttribute('name')?.replace(/^n/i, '') || null
            const footnoteText = text
            data.push({
              ...current,
              type: 'text-footnote',
              paragraphNumber: footnoteNum,
              text: footnoteText,
              hasFootnotes: []
            })
            continue
          }

          /* --- NORMAL PARAGRAPHS --- */
          if (tag === 'p' && !el.classList.contains('information') && !el.classList.contains('footer')) {
            const footnotes: string[] = []
            el.querySelectorAll('sup').forEach(s => {
              const match = s.textContent?.match(/\[(\d+[a-zA-Z]*)\]/)
              if (match) footnotes.push(match[1])
            })

            const anchors = Array.from(el.querySelectorAll(':scope > a')).filter(a =>
              a.textContent?.trim() &&
              !/^\[?\d+[a-zA-Z]?\]?$/.test(a.textContent.trim()) &&
              !/^\[\w+\]$/.test(a.textContent.trim()) &&
              a.getAttribute('href') &&
              !a.closest('sup')
            )

            if (anchors.length > 0) {
              anchors.forEach(a => {
                const aText = a.textContent?.trim()
                if (aText) {
                  data.push({
                    ...current,
                    type: 'index',
                    text: aText,
                    paragraphNumber: null,
                    hasFootnotes: []
                  })
                }
              })
              continue
            }

            // paragraph-tables (indented or styled)
            if (
              el.classList.contains('indentb') ||
              /text-align|margin-left/i.test(el.getAttribute('style') || '')
            ) {
              paragraphCount++
              data.push({
                ...current,
                type: 'text-table',
                paragraphNumber: paragraphCount,
                text,
                hasFootnotes: footnotes
              })
              continue
            }

            // quotes
            if (
              el.classList.contains('quote') ||
              el.classList.contains('quoteb') ||
              /^["“‘]/.test(text.trim())
            ) {
              paragraphCount++
              data.push({
                ...current,
                type: 'text-quote',
                paragraphNumber: paragraphCount,
                text,
                hasFootnotes: footnotes
              })
              continue
            }

            // regular paragraph
            paragraphCount++
            data.push({
              ...current,
              type: 'text',
              paragraphNumber: paragraphCount,
              text,
              hasFootnotes: footnotes
            })
            continue
          }

          /* --- HEADINGS --- */

          // h1 → main chapter title
          if (tag === 'h1') {
            current.chapterTitle = text
            current.sectionTitle = current.subsectionTitle = current.subsubsectionTitle = current.subtitleD = null
            continue
          }

          // h6 → smallest (like 1., a.)
          if (tag === 'h6') {
            current.subsubsectionTitle = el.textContent.trim()
            continue
          }

          // h5 → subsection (A., B., C.)
          if (tag === 'h5') {
            current.subsectionTitle = el.textContent.trim()
            current.subsubsectionTitle = current.subtitleD = null
            continue
          }

          // h4 → section (Part ...)
          if (tag === 'h4') {
            current.sectionTitle = el.textContent.trim()
            current.subsectionTitle = current.subsubsectionTitle = current.subtitleD = null
            continue
          }

          // h3 → sometimes used for chapters in older files
          if (tag === 'h3' && /Chapter/i.test(text)) {
            current.chapterTitle = text
            current.sectionTitle = current.subsectionTitle = current.subsubsectionTitle = current.subtitleD = null
            continue
          }

          // fallback title detection
          if (!current.chapterTitle) {
            const titleEl =
              document.querySelector('p.title') ||
              document.querySelector('title')
            if (titleEl) current.chapterTitle = titleEl.textContent?.replace(/\s+/g, ' ').trim() || ''
          }
        }

        return data
      },
      { book, chapterNum }
    )

    fs.mkdirSync('book3', { recursive: true })
    fs.writeFileSync(`book3/chapter${chapterNum}.json`, JSON.stringify(paragraphs, null, 2), 'utf-8')

    await browser.close()
  } catch (error: unknown) {
    if (error instanceof Error)
      console.error(`❌ Error in chapter ${chapterNum}: ${error.message}`)
  }
}

/* --- READ LINKS FROM INDEX FILE --- */
interface Chapter {
  chNum: number
  text: string
  url: string
}

const getTopLevelChapters = (): string[] => {
  const raw = fs.readFileSync('./chapterLinks3.json', 'utf-8')
  const all = JSON.parse(raw)
  return all.map((c: Chapter) => c.url)
}

const urls: string[] = getTopLevelChapters()

/* --- ITERATE OVER CHAPTERS --- */
const iterate = async (urls: string[], book: string): Promise<void> => {
  let i = 1
  for (const url of urls) {
    try {
      console.log(`⛏️  Scraping ${book} – Chapter ${i}`)
      await scrapeChapter(url, book, i)
      i++
    } catch (error) {
      if (error instanceof Error)
        console.error(`❌ Failed chapter ${i}: ${error.message}`)
    }
  }
}

iterate(urls, 'Book 3')
