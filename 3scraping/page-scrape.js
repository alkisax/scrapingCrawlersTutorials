import axios from 'axios'
// η βιβλιοθήκη μας επιτρέπει να έχουμε προσβαση στο data το οποίο είναι αυτή τη στιγμή ένα σκέτο string
import { parse } from 'node-html-parser'
// αυτή η βιβλιοθήκη αφήνει την σελίδα να φορτώσε πρώτα και μετά την καλεί
/*
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto('http://localhost:3000/index.html')
  const data = await page.evaluate(() => document.body.innerHTML)
  await browser.close()
*/
import puppeteer from 'puppeteer'

const scraper = async () => {
  // φέρνουμε όλο το html της σελίδας ως string
  const page = await axios.get('http://localhost:3000')

  const data = page.data
  const status = page.status

  console.log('status:', status);
  console.log("\n\n\n", data);

  // κάνουμε την σελίδα να συμπεριφέρετε ως Html απο τον html-parser
  const dom = parse(data)

  // έχουμε προσβαση τώρα στο .text
  const heading = dom.querySelector('h1')
  console.log("\n\n\n", "parsed heading:", heading.text);

  // αποθηκεύω όλα τα <p>
  const content = dom
    .querySelectorAll('p')
    // .reduce() takes all items in the array and combines them into one value.acc:	accumulator → stores the running result. { text }	destructuring → gets the text property of each <p> element
    .reduce((acc, { text }) => acc + text, '')

  console.log("\n\n\n", "content: ", content)

  // Παίρνω την εικόνα με βάση το class
  const img = dom
    .querySelector('.owl')

  console.log("\n\n\n", "img: ", img.getAttribute('src'))

  // δυναμικό περιεχόμενο. (η h2 είναι στο script με .createElement('h2'))
  const h2 = dom.querySelector('h2')

  console.log("\n\n\n", "h2: ", h2) //[h2:  null] δεν λειτουργεί
}

const scraperWithPuppeteer = async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()

  await page.goto('http://localhost:3000/index.html')

  // παίρνω όλο το html του body
  const data = await page.evaluate(() => document.body.innerHTML)

  await browser.close()

  const dom = parse(data)
  const heading = dom.querySelector('h1')
  const content = dom
    .querySelectorAll('p')
    .reduce((acc, { text }) => acc + text, '')
  const img = dom
    .querySelector('.owl')
  const h2 = dom.querySelector('h2')

  console.log("\n\n\n", "data:", data);
  console.log("\n\n\n", "parsed heading:", heading.text);
  console.log("\n\n\n", "content: ", content)
  console.log("\n\n\n", "img: ", img.getAttribute('src'))
  console.log("\n\n\n", "h2: ", h2.text) // τωρα μου το τυπώνει [h2:  Dynamicaly created element]
}

const prntScrn = async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.goto('http://localhost:3000/index.html')

  await page.screenshot({ path: 'site.png'})
  await page.pdf({ path: 'site.pdf'})

  await browser.close()
}

// scraper()
// scraperWithPuppeteer()
prntScrn()