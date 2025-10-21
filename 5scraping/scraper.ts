import playwright from 'playwright'
import random_useragent from 'random-useragent'
import fs from 'fs'

// ;(async () => {
//   // Ο κώδικας σου εδώ (π.χ. await axios.get(...))
//   console.log("Ξεκινάμε scraping...")
// })()
// .catch((error) => {
//   console.error("Σφάλμα:", error)
//   process.exit(1) // Τερματίζει το πρόγραμμα με κωδικό λάθους
// })

const BASE_URL='https://github.com/topics/playwright'

async function main() {
  try {
    
    /* 1️⃣ create random agent */
    const agent = random_useragent.getRandom()

    /* 2️⃣ setup browser */
    // Εκκίνηση του browser (σε headless λειτουργία = χωρίς γραφικό περιβάλλον)
    const browser =  await playwright.chromium.launch({ headless: true })
    // Δημιουργία "context" — κάθε context είναι σαν ξεχωριστό παράθυρο/χρήστης
    // CSP: Content Security Policy
    // userAgent: μου αλάζει τον χρίστη κάθε φορά που τρέχει
    const context = await browser.newContext({ bypassCSP: true, userAgent: agent })
    // Δημιουργία νέας σελίδας (tab)
    const page = await context.newPage()
    // ορίζω βασικά settings και εππισκέυτομαι την σελίδα
    await page.setDefaultNavigationTimeout(30000)
    await page.setViewportSize({ width: 800, height: 600 })
    await page.goto(BASE_URL)

    // console.log(agent);    

    /* 3️⃣ get data from website */
    // Η $$eval είναι μέθοδος του Playwright/Puppeteer που: Επιλέγει στοιχεία DOM στη σελίδα με CSS selector (όπως querySelectorAll). Τρέχει έναν κώδικα μέσα στη σελίδα (στον browser) πάνω σε αυτά τα στοιχεία. Επιστρέφει το αποτέλεσμα πίσω στο Node.js (στον δικό σου κώδικα)
    // Το “διπλό $” σημαίνει “πολλά στοιχεία” (όπως querySelectorAll). Αν ήταν $eval, θα έπαιρνε μόνο ένα.
    
    // βλέπω οτι στο html της σελίδας κάνοντας inspect οτι κάθε ξεχωριστή δημοσίευση είναι μεσα σε ένα <article class="border etc">. Παίρνω με eval όλα τα article και για καθένα απο αυτά τρέχω ένα (δεύτερο) map. 
    // Θέλω τον χρήστη και το repo του. Μεσω του inspect της σελίδας βλέπω οτι ο χρήστης είναι στο article → div με px-3 → άλλο ένα div με d-flex → άλλο ένα div με flex-1 → h3. αυτό το h3 έχει δύο <a> μέσα το ένα είναι ο χρήστης και το άλλο το repo. Οπότε τα παίρνω με card.querySelectorAll('h3 a') (ολα τα <α> μέσα στο h3)
    const repositories = await page.$$eval('article.border', (repoCards) => {
      return repoCards.map((card) => {
        const [user, repo] = card.querySelectorAll('h3 a') //Τs σημείωση στο τέλος
        const url = (repo as HTMLAnchorElement).href       //Τs σημείωση στο τέλος

        // Μια helper συνάρτηση που μου επιστρέφει το εσωτερικό κείμενο 
        const formatText = (element: Element | null) => {
          if (element && element instanceof HTMLElement) {
              return element.innerText.trim()
          }
          return ''
        }

        return {
          user: formatText(user),
          repo: formatText(repo),
          url: url,
        }

      })
    })

    // console.log(repositories);
    

    /* 4️⃣ store Data into file */
    const logger = fs.createWriteStream('data.txt', { flags: 'w'})
    // (data, replacer(δεν χρείάζετe), beautify με indexetion)
    logger.write(JSON.stringify(repositories, null, 2))

    /* close browser */
    await browser.close()

  } catch (error: unknown) {
    if (error instanceof  Error) {
      console.error("Σφάλμα:", error.message)      
    }
  }
}

main()

/* TS σημείωση:
  η querySelectorAll() επιστρέφει NodeListOf<Element>
  όπότε οταν card.querySelectorAll('h3 a'), τα h3 και a είναι NodeList (Nodelist είναι κάτι που περιέχει Elements). 
  Εlement είναι πράγματα οπως <a> <img> <div> και δεν έχει ιδιότητεσ όπως .href .innerText κλπ
  αυτά τα έχουν οι συγκεκριμένεις υποκλάσεις όπως <a> → HTMLAnchorElement, <img> → HTMLImageElement, <p>, <div> → HTMLElement (.innerText) κλπ.
  Οπότε η ιεραρχια είναι περίπου NodeListOd<Element> > Element > HTMLElement

  οπότε εδώ έπρεπε να κάναμε "as": url = (repo as HTMLAnchorElement).href 
*/