import axios from 'axios'
import  * as cheerio from 'cheerio'
import express from 'express'

const PORT = 8000
const url = 'https://tvxs.gr'

const app = express()

app.get('/', (req, res) => {
  res.send('Hello World!')
})

const scrape = async () => {
  const res = await axios(url)
  const html = res.data
  // console.log(html);

  const $ = cheerio.load(html)

  $('.article-featured-large').each((i, element) => {
    const category = $(element).find('.article-category a').text().trim()
    const title = $(element).find('.post-title').text().trim()
    const link = $(element).find('.post-title-wrapper a.card-link').attr('href')
    const excerpt = $(element).find('.article-excerpt').text().trim()
    const image = $(element).find('img').attr('src')

    console.log(`
      📌 ARTICLE
      • Category: ${category}
      • Title: ${title}
      • Link: ${link}
      • Excerpt: ${excerpt}
      • Image: ${image}
    `)
  })

  const links = []

  $('a').each((i, element) => {
      const link = $(element).attr('href')
      const linkText = $(element).text().trim()

      // Skip junk links
      if (!linkText) return
      if (!link || link.startsWith('#')) return
      if (linkText.length < 3) return // skip tiny labels like #

      links.push({
        link,
        linkText
      })

      // console.log(`link ${link}, text: ${linkText}`);
  })
  console.log(links);
}

scrape()

app.listen(PORT, () => {
  console.log(`server running on  http://localhost:${PORT}`)
})