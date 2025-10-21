import axios from 'axios'
// Cheerio = Fast HTML parsing with jQuery-like syntax, no JS execution
// Puppeteer = Full headless browser that executes JS and renders the real DOM
import * as cheerio from 'cheerio'

// const url = 'https://en.wikipedia.org/wiki/Web_scraping'
const url = 'https://en.wikipedia.org/wiki/Data_scraping'

const scraper = async () => {
  try {
    const res = await axios.get(url)

    // console.log(res.data)

    const $ = cheerio.load(res.data)

    // get the title
    const title = $('h1').text()
    console.log(`Page title: ${title}`);

    // get all links
    // για κάθε <a>
    $('a').each((indexedDB, element) => {
      // αποθηκευω το Link και το κείμενο του Link
      const link = $(element).attr('href')
      const linkText = $(element).text().trim()
      if (link && link.startsWith('/wiki/')) {
        console.log((`${linkText}: https://en.wikipedia.org${link}`));   
      }    
    })

  } catch (error) {
    console.error('Error fetching the page', error);
  }  
}
scraper()

