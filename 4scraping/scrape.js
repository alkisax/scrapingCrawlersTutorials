  /*
    Εδω αποθηκεύουμε στην books ολοκληρα τα elements του κάθε βιβλίου με όλες τις πληροφορίες (τιτλος περιγραφή βαθμολογία τιμή κλπ). 

    Στοχεύουμε κάθε βιβλίο που βρίσκεται μέσα σε αυτό το HTML block:

    <li class="col-xs-6 col-sm-4 col-md-3 col-lg-3">
        <article class="product_pod">      ← όλο το βιβλίο (container)
            <div class="image_container">
                <a href="catalogue/a-light-in-the-attic_1000/index.html">     ← LINK
                    <img src="media/cache/2c/da/2cdad67c44b002e7ead0cc35693c0e8b.jpg"    ← IMAGE
                        alt="A Light in the Attic"
                        class="thumbnail">
                </a>
            </div>

            <p class="star-rating Three"></p>    ← RATING (η λέξη Three = 3/5)
            <h3>
              <a href="catalogue/a-light-in-the-attic_1000/index.html"
                  title="A Light in the Attic">        ← TITLE (το πλήρες στο title="")
                  A Light in the ...
              </a>
            </h3>

            <div class="product_price">
                <p class="price_color">£51.77</p>    ← PRICE
                <p class="instock availability">In stock</p>
            </div>
        </article>
    </li>

    Κάθε βιβλίο έχει:
    ✅ τίτλο → book.querySelector('h3 a').getAttribute('title')

    ✅ link → book.querySelector('h3 a').getAttribute('href')

    ✅ εικόνα → book.querySelector('.image_container img').getAttribute('src')

    ✅ βαθμολογία (star-rating) → book.querySelector('.star-rating').classList[1]

    ✅ τιμή → book.querySelector('.price_color').textContent.trim()
  */


import puppeteer from "puppeteer";
import fs from 'fs'

const scrape = async () => {
  let currentPage = 1
  const url = `https://books.toscrape.com/catalogue/page-${currentPage}.html`

  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto(url)

  // const title = await page.title()
  // console.log(`Page title ${title}`);

  const allBooks = []
   const maxPages = 10

  while (currentPage <= maxPages) {
    const books = await page.evaluate(() => {
      // 1. Επιλέγουμε όλα τα elements του κάθε βιβλίου
      const bookElements = document.querySelectorAll('.product_pod')
      // 2. Τα μετατρέπουμε από NodeList σε κανονικό Array ώστε να μπορούμε να χρησιμοποιήσουμε map()
      return Array.from(bookElements).map((book) => {

        // Παίρνουμε τον τίτλο του βιβλίου
        // ➤ Βρίσκεται στο <h3><a title="A Light in the Attic">...</a></h3>
        // ➤ Δεν παίρνουμε το κείμενο (A Light in the ...), αλλά το πλήρες "title" attribute
        // ➤ Γι' αυτό χρησιμοποιούμε getAttribute('title')
        const title = book.querySelector('h3 a').getAttribute('title')

        // Παίρνουμε την τιμή του βιβλίου
        // ➤ Βρίσκεται μέσα σε <p class="price_color">£51.77</p>
        // ➤ Χρησιμοποιούμε textContent γιατί η τιμή είναι κείμενο μέσα στο στοιχείο
        const price = book.querySelector('.price_color').textContent.trim()

        // Παίρνουμε την διαθεσιμότητα
        // ➤ Βρίσκεται στο <p class="instock availability">In stock</p>
        // ➤ Αν υπάρχει αυτό το element → In stock, αλλιώς → out of stock
        const stock = book.querySelector('.instock.availability')
          ? 'In stock'
          : 'Out of stock'

        // Παίρνουμε το rating (βαθμολογία)
        // ➤ Βρίσκεται σε αυτό το tag: <p class="star-rating Three"></p>
        // ➤ H λέξη (One, Two, Three, Four, Five) δείχνει τα αστέρια
        // ➤ Παίρνουμε την κλάση και κόβουμε τη δεύτερη λέξη
        const rating = book.querySelector('.star-rating').className.split(' ')[1]

        // Παίρνουμε το link του βιβλίου
        // ➤ Βρίσκεται στο ίδιο <a> στοιχείο με τον τίτλο: <h3><a href="..."></a></h3>
        // ➤ Από το attribute "href"
        const link = book.querySelector('h3 a').getAttribute('href')
        
        return {
          title,
          price,
          stock,
          rating,
          link
        } 
      }) // τέλος map
    })
    // console.log(books);
    allBooks.push(...books)
    console.log(`Books on page ${currentPage}: `, books)
    currentPage++
  }

  //👇 δημιουργεία αρχείου
  // writeFileSync(ονομα αρχείου, δεδομένα) .stringify(data, replacer(δεν χρείάζετ), space(indentation 2))
  fs.writeFileSync('books.json', JSON.stringify(allBooks, null, 2))
  
  console.log('data sved to books.json');
  
  await browser.close()

}

scrape()