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

const BASE_URL='https://www.marxists.org/archive/marx/works/1867-c1/index-l.htm'

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

    /* 3️⃣ Extract all main chapter URLs (ch01.htm, ch02.htm, ...)*/
    // “Select all <a> tags that are inside a <p> tag with class index.”
    // ο πρόλογος δεν ήταν της μορφής a.index a αλλα 'p.toc a.
    const chapterLinks  = await page.$$eval('p.toc a, p.index a', (index) => {
      return index.map((a, i) => {
        const url = (a as HTMLAnchorElement).href
        const textUrl = (a as HTMLAnchorElement).textContent

        return {
          chNum: i,
          text: textUrl,
          url: url,
          subchapters: [] as Subchapter[]
        }
      })
    })

    /*
      το πρόβλημα που έχουμε εδώ είναι πως το αρχείο δεν έχει μια ξεκαθαρη ιεραρχία τύπου 
      <idex>
        <indexb>
          <indexc></indexc>
        </indexb>
      </index>
      αλλά οτι όλα τα P elements είναι siblings και διαχωρίζονται με class="indexb". 
      <idex></index>
      <indexb></indexb>
      <indexc></indexc>
      στο 6scrapingAtempt\simpleDomIndexExample.md μια απλοποιημένη μορφή του dom.    
      To αποτέλεσμα είναι οτι δεν μπορούμε να πάρουμε ένα έλεμεντ και να κάνουμε Loop στο εσωτερικό του για να πάρουμε τα υποκεφαλαια
    */
   /* 3A. εξάγουμε τα υποκεφάλαια Α (indexa) */
    //page.$$eval(selector, callback)
    const subchapterALinks = await page.$$eval('p.indexa a', (indexA) => {
      return indexA.map((a) => {
        const url = (a as HTMLAnchorElement).href
        const text = (a as HTMLAnchorElement).textContent?.trim()

        // 🔍 Βρες το πλησιέστερο p.index πάνω από αυτό το link
        // αρχικές συνθήκες του While 👇
        // .previousElementSibling είναι ένα DOM property που σου επιτρέπει να “περπατάς” προς τα πίσω μέσα στο HTML δέντρο, δηλαδή να βρεις το αμέσως προηγούμενο “αδελφό” στοιχείο (sibling element).
        let prev = a.closest('p')?.previousElementSibling
        let fatherText = ''

        // περπατάμε στο dom διαρκώς προς τα πίσω στα αδερφια ωσπου να βρούμε αυτό που έχει class="index" (αν υπάρχει, αν δεν υπαρχει έχουμε το '?' στο prev.classList?). Δηλαδή μιας και τώρα είμαστε στο indexa να βρούμε τον κεφάλαιο στο οποίο ανοίκει το υποκεφάλαιό μας
        while (prev) {
          if (prev.classList?.contains('index')) {
            const anchor = prev.querySelector('a')
            fatherText = anchor?.textContent?.trim() ?? ''
            break
          }
          prev = prev.previousElementSibling
        }

        return {
          text,
          subChapterOf: fatherText,
          url: url,
          subchapters: [] as Subchapter[]
        }
      })
    })

    // 3B. εφαρμόζουμε την ίδια λογικέη για τα indexb, indexc, indexd. θα μπορούσε και το indexa να ήταν εδώ αλλά έχει μήνει για να είναι πιο ευανάγνωστη η λογική του scrape
    const minorSubLet = ['b', 'c', 'd']
    // TS type
    const allMinorSubs: Subchapter[] = []

    for (const subLet of minorSubLet) {
      // υπολογίζει το προηγούμενο γράμμα με ASCII αρηθμητική για να βρεί το indexX του πατέρα
      const parentClass = `index${String.fromCharCode(subLet.charCodeAt(0) - 1)}`

      const subs = await page.$$eval(`p.index${subLet} a`, (indexSubs, parentClass) => {
        return indexSubs.map((a) => {
          const url = (a as HTMLAnchorElement).href
          const text = (a as HTMLAnchorElement).textContent?.trim() ?? ''

          let prev = a.closest('p')?.previousElementSibling
          let fatherText = ''

          // 🧭 ψάξε προς τα πίσω για το σωστό ιεραρχικό parent
          while (prev) {
            if (
              prev.classList?.contains(parentClass) ||
              prev.classList?.contains('toc')
            ) {
              const anchor = prev.querySelector('a')
              fatherText = anchor?.textContent?.trim() ?? ''
              break
            }
            prev = prev.previousElementSibling
          }

          return { text, subChapterOf: fatherText, url }
        })
      }, parentClass)
      allMinorSubs.push(...subs)
    }

    // 4A. merge subchapter A links into their parent chapter
    for (const ch of chapterLinks) {
      for (const sub of subchapterALinks) {
        if (ch.text?.trim() === sub.subChapterOf?.trim()) {
          if (!ch.subchapters) ch.subchapters = []     // make array if missing
          ch.subchapters.push(sub)                     // attach subchapter
        }
      }
    }

    // 4B. ενσωματώνουμε και τα υπόλοιπα στο json
    // merge indexb → indexa
    for (const subA of subchapterALinks) {
      for (const subB of allMinorSubs.filter(s => s.url.includes('#S2a') || s.url.includes('#S2b') || s.subChapterOf === subA.text)) {
        // match by title
        if (subA.text?.trim() === subB.subChapterOf?.trim()) {
          if (!subA.subchapters) subA.subchapters = []
          subA.subchapters.push(subB)
        }
      }
    }

    // merge indexc → indexb
    for (const subB of allMinorSubs) {
      for (const subC of allMinorSubs) {
        if (subB.text?.trim() === subC.subChapterOf?.trim()) {
          if (!subB.subchapters) subB.subchapters = []
          subB.subchapters.push(subC)
        }
      }
    }

    // merge indexd → indexc
    for (const subC of allMinorSubs) {
      for (const subD of allMinorSubs) {
        if (subC.text?.trim() === subD.subChapterOf?.trim()) {
          if (!subC.subchapters) subC.subchapters = []
          subC.subchapters.push(subD)
        }
      }
    }

    
    /* 5️⃣ store Data into file */
    fs.writeFileSync('chapterLinks.json', JSON.stringify(chapterLinks, null, 2), 'utf-8')


    // console.log(chapterLinks.slice(0, 10));
    console.dir(chapterLinks.slice(0, 20), { depth: null })
    // console.log(subchapterALinks.slice(0, 10));
    // console.log(allMinorSubs.slice(5, 15));
    
    

    /* close browser */
    await browser.close()

  } catch (error: unknown) {
    if (error instanceof  Error) {
      console.error("Σφάλμα:", error.message)      
    }
  }
}

main()

