// το ch1 ακολουθούσε διαφορετικό φορματ και του φτιάξαμε δικό του script.

import playwright from 'playwright'
// import random_useragent from 'random-useragent'
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

const BASE_URL='https://www.marxists.org/archive/marx/works/1867-c1/index-l.htm'
const CH1URL='https://www.marxists.org/archive/marx/works/1867-c1/ch01.htm'
const CH3URL='https://www.marxists.org/archive/marx/works/1867-c1/ch03.htm'
const CH15URL='https://www.marxists.org/archive/marx/works/1867-c1/ch15.htm'

const scrapeChapter = async (url:string, book: string,chapterNum: number): Promise<void> => {
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
    await page.goto(url)
    
    // ✅ capture browser logs
    page.on('console', msg => {
      // console.log('[BROWSER]', msg.text())
    })

    // console.log(agent);    

    /* 3️⃣ Extract */
    /*
      <h3> → Τίτλος κεφαλαίου (Section) -index-
      <h4> → Υπότιτλος ενότητας -index-
      <h5> → Υποκεφάλαιο (A., B., C., D.) -indexa-
      <h6> → Μικρότερο υποκεφάλαιο (1., 2., a., κλπ) -indexb-
      <p>  → Κύριο κείμενο παραγράφου
      <sup>[1]</sup> → Αριθμός υποσημείωσης
      <p class="information"> ή <p class="footer"> → Αγνοούνται
      
      -Τα indexc και indexd εμφανίζονται μόνο στη σελίδα του πίνακα περιεχομένων. μέσα στο ίδιο το κεφάλαιο, αυτή η πληροφορία δεν υπάρχει σαν class="indexc" εκεί τα ίδια σημεία αποδίδονται: είτε ως <h6> (αν υπάρχει τέτοιος τίτλος), είτε απλώς ως <p> με inline <b> -
     */
    // στο index κάναμε page.$$eval(selector, callback) αυτό μου επέστρεφε μια λίστα με όλα τα <a> και μας επέτρεπε να κάνουμε map() απευθείας πάνω σε αυτά. Εδώ χρειάζομαι κάτι πιο συνθέτο, πρέπει να διατρέξουμε ολόκληρο το σώμα της σελίδας (h3, h4, h5, h6, p) και για αυτό θα έχω page.evaluate(() => {}) που μου φαίρνει όλο το σώμα του κειμένου και μου επιτρέπει πράγματα όπως current.title, current.subtitleA γιατί έχει μνήμη
    // το page είναι ένα tab του Browser και το document είναι το DOM
    const paragraphs = await page.evaluate(
      ({ book, chapterNum }: { book: string; chapterNum: number }) => {
      const nodes = Array.from(document.body.querySelectorAll('h3, h4, h5, h6, p, blockquote, table'))
      const data = []

      // αυτή είναι μια μεταβλητή που κρατάει σαν χάρτης το που μέσα στο κείμενο βρισκόμαστε. Θα αρχικοποιήσουμε το json της παραγράφου που θα φυλάξουμε αργότερα
      let current: CurrentContext = {
        book: book,
        chapter: chapterNum,
        chapterTitle: '', // τίτλος Κεφαλαίου
        sectionTitle: null, // υπότιτλος ενότητας  
        subsectionTitle: null, // υποκεφάλαιο
        subsubsectionTitle: null, // μικροτερο υποκεφάλαιο
        subtitleD: null  // μικροτερο υποκεφάλαιο2
      }

      // Counter for paragraphs within each <h3>
      let paragraphCount = 0

      // για κάθε element που έχουμε φυλάξει (h3, h4, h5, h6, p)
      for (const el of nodes) {
        // η tag έχει τι είδους είναι το element (h3, h4 κλπ)
        // αν το tag ξεκινάει με 'h' τότε είναι τίτλος. Με μια σειρά if βλεπουμε το μέγεθος του 'h' και βλέπουμε αν είναι κύριος τίτλος, υπότιτλος, υπότιτλος β
        const tag = el.tagName.toLowerCase()

        // --- paragraph numbering ---
        // when we encounter a new h3, reset paragraph numbering
        if (tag === 'h3') {
          paragraphCount = 0 // reset for new section
        }

        // --- TABLE DETECTION ---
        if (tag === 'table') {
          const rows: string[][] = []
          el.querySelectorAll('tr').forEach(tr => {
            const cells = Array.from(tr.querySelectorAll('td')).map(td =>
              td.textContent?.replace(/\s+/g, ' ').trim() || ''
            )
            if (cells.length > 0) rows.push(cells)
          })
          if (rows.length > 0) {
            data.push({
              ...current,
              type: 'table',
              table: rows,
              hasFootnotes: [],
              paragraphNumber: null
            })
            // console.log("found table: ", rows);
            
            continue
          }
        }

        // --- FOOTNOTES ---
        if (tag === 'p' && el.classList.contains('information')) {
          // πιάνουμε το a μέσα στο .info
          const anchor = el.querySelector('.info a')
          const footnoteNum = anchor?.getAttribute('name')?.replace(/^n/i, '') || null
          const text = el.textContent?.replace(/\s+/g, ' ').trim() || ''
          if (text) {
            data.push({
              ...current,
              sectionTitle: null,
              subsectionTitle: null,
              subsubsectionTitle: null,
              subtitleD: null,
              type: 'text-footnote',
              paragraphNumber: footnoteNum,
              text,
              hasFootnotes: []
            })
          }
          continue  // 👈 prevent this element from going further
        }

        // --- PARAGRAPHS ---
        // information = υποσημείωση
        if (tag === 'p' && !el.classList.contains('information') && !el.classList.contains('footer')) {

          // extract footnote numbers
          // <sup>[1]</sup> → Αριθμός υποσημείωσης
          const footnotes: string[] = []
          el.querySelectorAll('sup').forEach(s => {
            // literal '[', ένα ή περισότερα digits, γράμμα ']' πχ [12α]
            const match = s.textContent?.match(/\[(\d+[a-zA-Z]*)\]/)
            if (match) footnotes.push(match[1])
          })

          // --- index ---
          // στην αρχή της σελίδας έχουμε πολλά <p><a></p> αυτά είναι τα περιεχόμενα
          // πολές υποσημείωσεις έχουν λίνκ προς την υποσημείωση στο τέλος της σελίδας. Aυτα που είναι μέσα σε sup πρέπει να αγνοούντε πχ <sup class="enote"><a href="#34">[34]</a></sup>
          // .querySelectorAll(':scope > a')direct children <a>. Και οχι 'a' γιατι θέλουμε να αποφύγουμε τα <p><sup><a></a><sup><p>
          const anchors = Array.from(el.querySelectorAll(':scope > a'))
            .filter(a => 
              a.textContent?.trim() &&
              !/^\[?\d+[a-zA-Z]?\]?$/.test(a.textContent.trim()) &&  // ignore [1], [12a]
              !/^\[\w+\]$/.test(a.textContent.trim()) &&  // ignore [A], [note]
              a.getAttribute('href') &&  // has href (not name)
              !a.closest('sup')   // not inside footnote
            )
            
          if (anchors.length > 0) {
            anchors.forEach((a) => {
              const text = a.textContent?.trim()

              // Αν δεν υπάρχει καθόλου κείμενο - Αν το κείμενο είναι μόνο αριθμοί ή αριθμοί με γράμμα, προαιρετικά μέσα σε αγκύλες [1], [26a], 3, 12b - Αν είναι οποιαδήποτε λέξη μέσα σε αγκύλες [A], [note], [link]
              if (!text || /^\[?\d+[a-zA-Z]?\]?$/.test(text) || /^\[\w+\]$/.test(text)) return

              if (text) {
                data.push({
                  ...current,
                  type: 'index',
                  text,
                  hasFootnotes: [],
                  paragraphNumber: null
                })
              }
            })
            continue
          }

          // .replace(/\s+/g, ' ') → Ενώνει πολλαπλά κενά, tabs, line breaks σε ένα μόνο space.
          const text = el.textContent?.replace(/\s+/g, ' ').trim() || ''
          if (!text) continue
          
          // --- detect paragraph-tables ---
          if (
            el.classList.contains('indentb') &&
            (el.innerHTML.includes('<br') || /text-align|margin-left/i.test(el.getAttribute('style') || ''))
          ) {
            paragraphCount++
            data.push({
              ...current,
              type: 'text-table',
              paragraphNumber: paragraphCount,
              text,
              hasFootnotes: footnotes
            })
            // console.log('found paragraph-like: ', current);
            
            continue
          }

          // --- detect paragraph-quotes ---
          if (
            el.classList.contains('quote') ||
            el.classList.contains('quoteb') ||
            /^["“‘]/.test(text.trim()) // starts with a quote
          ) {
            paragraphCount++
            data.push({
              ...current,
              type: 'text-quote',
              paragraphNumber: paragraphCount,
              text,
              hasFootnotes: footnotes
            })
            // console.log('found quote: ', text.slice(0, 80));
            continue
          }

          // --- regular paragraph ---
          paragraphCount++
          data.push({
            ...current,
            type: 'text',
            paragraphNumber: paragraphCount,
            text,
            hasFootnotes: footnotes
          })
        }

        // --- HEADLINES ---
        // <h6> → Μικρότερο υποκεφάλαιο (1., 2., a., κλπ) -indexb-
        if (tag === 'h6') {
          current.subsubsectionTitle = el.textContent.trim()
          console.log('found h6', current.subsubsectionTitle);
          continue
        }

        // <h5> → Υποκεφάλαιο (A., B., C., D.) -indexa-
        // ξεκινάει με Α-Z, literal '.' case insensitive. 
        // if (tag === 'h5' && el.textContent?.match(/^[A-Z]\./i)) {
        if (tag === 'h5') {
          current.subsectionTitle = el.textContent.trim()
          current.subsubsectionTitle = current.subtitleD = null
          console.log('found h5', current.subsectionTitle);
          continue
        }

        // <h4> → Υπότιτλος ενότητας -index-
        if (tag === 'h4') {
          current.sectionTitle  = el.textContent?.trim()
          current.subsectionTitle  = current.subsubsectionTitle = current.subtitleD = null
          console.log('found h4', current.subsectionTitle);
          continue
        }

        // Αν είναι <h3> αλλά περιέχει τη λέξη “SECTION”, τότε δεν αλλάζεις τον title. Απλώς μηδενίζεις τα subtitles
        if (tag === 'h3' && /SECTION/i.test(el.textContent || '')) {
          paragraphCount = 0
          current.subsectionTitle = current.subsubsectionTitle = current.subtitleD = null
          console.log('found h3 section marker', el.textContent.trim())
        }

        // <h3> → Τίτλος ενότητας (Section) -index-
        // Αν το <h3> περιέχει τη λέξη “Chapter”, τότε ενημερώνει το current.title
        if (tag === 'h3' && el.textContent?.match(/Chapter/i)) {
          current.chapterTitle = el.textContent.trim()
          console.log('found h3', current.chapterTitle);
          continue
        }

        // --- Reset when entering the Footnotes section ---
        if (tag === 'h3' && el.textContent?.match(/Footnotes/i)) {
          current.sectionTitle = current.subsectionTitle = current.subsubsectionTitle = current.subtitleD = null
          console.log('found h3 Footnotes section');
          continue
        }

        // ενα γενικό fallback αν δεν έχει βρεί τίτλο ακόμα
        if (!current.chapterTitle) {
          const titleTag = document.querySelector('title')?.textContent?.trim()
          if (titleTag) current.chapterTitle = titleTag
        }
        
      }

      return data

    },{book, chapterNum})

    /* 5️⃣ store Data into file */
    fs.mkdirSync('book1', { recursive: true })
    fs.writeFileSync(`book1/chapter${chapterNum}.json`, JSON.stringify(paragraphs, null, 2), 'utf-8')

    // // console.log(chapterLinks.slice(0, 10));
    // console.dir(paragraphs.slice(28, 30), { depth: null })

    /* close browser */
    await browser.close()

  } catch (error: unknown) {
    if (error instanceof  Error) {
      console.error("Σφάλμα:", error.message)      
    }
  }

}

// read top lvl chapter links from file created by 6scrapingAtempt\scrapeIndex.ts
interface Chapter {
  chNum: number
  text: string
  url: string
}

const getTopLevelChapters = (): string[] => {
  const raw = fs.readFileSync('./chapterLinks.json', 'utf-8') // 👈👈👈
  const all = JSON.parse(raw)
  return all.map((c: Chapter) => c.url)
}

const urls: string[] = getTopLevelChapters()
// const urls = getTopLevelChapters().slice(3, 6) // 👈 for debug

// iterate
const iterate = async ( urls: string[], book: string): Promise<void> => {
  let i = 1 // 👈👈
  for (const url of urls) {
    // // console.log(`📖 Scraping chapter ${i} book:${book}`)
    try {
      console.log(`⛏️ book: ${book}, chapter ${i}, url: ${url}`);
      
      await scrapeChapter(url, `${book}`, i)
      i++
    } catch (error) {
      if (error instanceof Error)
      console.error(`❌ Failed chapter: ${i}`, error.message)
    }
  }
}

iterate(urls, 'book 1')

