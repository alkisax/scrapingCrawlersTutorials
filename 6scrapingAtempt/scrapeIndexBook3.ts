import playwright from 'playwright'
import fs from 'fs'

interface Chapter {
  chNum: number
  text: string | null
  url: string
  part: string | null
  subchapters: Subchapter[]
}

interface Subchapter {
  text: string
  subChapterOf: string
  url: string
  subchapters?: Subchapter[]
}

// Volume 3
const BASE_URL = 'https://www.marxists.org/archive/marx/works/1894-c3/index.htm'

async function main() {
  try {
    const browser = await playwright.chromium.launch({ headless: true })
    const context = await browser.newContext({ bypassCSP: true })
    const page = await context.newPage()
    await page.setDefaultNavigationTimeout(30000)
    await page.setViewportSize({ width: 800, height: 600 })
    await page.goto(BASE_URL)

    /* 3️⃣ Extract for Volume 3 */
    const chapterLinks = await page.evaluate(() => {
      const chapters: any[] = []
      let currentPart: string | null = null
      let counter = 0

      const all = Array.from(document.querySelectorAll('h5, p.index'))

      for (const el of all) {
        // detect "Part I", "Part II" etc.
        if (el.tagName.toLowerCase() === 'h5') {
          currentPart = el.textContent?.replace(/\s+/g, ' ').trim() || null
          continue
        }

        if (el.tagName.toLowerCase() === 'p' && el.classList.contains('index')) {
          const links = Array.from(el.querySelectorAll('a[href*="ch"]'))
          for (const a of links) {
            chapters.push({
              chNum: counter++,
              text: a.textContent?.trim() ?? '',
              url: (a as HTMLAnchorElement).href,
              part: currentPart,
              subchapters: []
            })
          }
        }
      }
      return chapters
    })

    /* 5️⃣ Save output */
    fs.writeFileSync('chapterLinks3.json', JSON.stringify(chapterLinks, null, 2), 'utf-8')
    console.dir(chapterLinks.slice(0, 20), { depth: null })

    await browser.close()
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Σφάλμα:', error.message)
    }
  }
}

main()
