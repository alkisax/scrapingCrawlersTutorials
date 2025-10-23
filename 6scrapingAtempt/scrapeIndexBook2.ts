import playwright from 'playwright'
// import random_useragent from 'random-useragent'
import fs from 'fs'

interface Chapter {
  chNum: number
  text: string | null
  url: string
  subchapters: Subchapter[]
}

interface Subchapter {
  text: string
  subChapterOf: string
  url: string
  subchapters?: Subchapter[]
}

//volume 1
// const BASE_URL='https://www.marxists.org/archive/marx/works/1867-c1/index-l.htm'
//volume 2
const BASE_URL='https://www.marxists.org/archive/marx/works/1885-c2/index.htm'

async function main() {
  try {
    
    /* 1️⃣ create random agent */
    // const agent = random_useragent.getRandom()

    /* 2️⃣ setup browser */
    // Εκκίνηση του browser (σε headless λειτουργία = χωρίς γραφικό περιβάλλον)
    const browser =  await playwright.chromium.launch({ headless: true })
    // Δημιουργία "context" — κάθε context είναι σαν ξεχωριστό παράθυρο/χρήστης
    const context = await browser.newContext({ bypassCSP: true })

    // Δημιουργία νέας σελίδας (tab)
    const page = await context.newPage()
    // ορίζω βασικά settings και εππισκέυτομαι την σελίδα
    await page.setDefaultNavigationTimeout(30000)
    await page.setViewportSize({ width: 800, height: 600 })
    await page.goto(BASE_URL)

    // console.log(agent);    

    /* 3️⃣ Extract chapters & subchapters for Volume 2 */
    const chapterLinks = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('p.toc, p.index'))
      const chapters: any[] = []
      let current: any = null
      let lastSub: any = null

      for (const p of nodes) {
        const tocLink = p.querySelector('a[href*="ch"]')
        const cls = p.className
        const style = p.getAttribute('style') || ''

        // 📘 main chapter
        if (cls.includes('toc') && tocLink) {
          current = {
            chNum: chapters.length,
            text: tocLink.textContent?.trim() ?? '',
            url: (tocLink as HTMLAnchorElement).href,
            subchapters: [] as any[]
          }
          chapters.push(current)
          lastSub = null
          continue
        }

        // 📗 subchapter
        if (cls.includes('index') && current) {
          const links = Array.from(p.querySelectorAll('a'))
          const subs = links.map(a => ({
            text: a.textContent?.trim() ?? '',
            url: (a as HTMLAnchorElement).href,
            subchapters: [] as any[]
          }))

          // 📙 detect indent (a,b,c) → attach to last subchapter
          const isIndented =
            /margin-left/i.test(style) ||
            /^\s*\([a-z]\)/i.test(p.textContent || '')

          if (isIndented && lastSub) {
            lastSub.subchapters.push(...subs)
          } else {
            current.subchapters.push(...subs)
            lastSub = subs[subs.length - 1]
          }
        }
      }
      return chapters
    })


    /* 5️⃣ store Data into file */
    fs.writeFileSync('chapterLinks2.json', JSON.stringify(chapterLinks, null, 2), 'utf-8')


    // console.log(chapterLinks.slice(0, 10));
    console.dir(chapterLinks.slice(0, 20), { depth: null })

    /* close browser */
    await browser.close()

  } catch (error: unknown) {
    if (error instanceof  Error) {
      console.error("Σφάλμα:", error.message)      
    }
  }
}

main()

