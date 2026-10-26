import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'

const siteUrl = process.env.SITE_URL?.replace(/\/$/, '')
const indexPath = new URL('../dist/index.html', import.meta.url)
const robotsPath = new URL('../dist/robots.txt', import.meta.url)
const sitemapPath = new URL('../dist/sitemap.xml', import.meta.url)
const sitemapTemplate = new URL('../public/sitemap.xml', import.meta.url)
const robotsTemplate = new URL('../public/robots.txt', import.meta.url)

if (siteUrl) {
  const url = new URL(siteUrl)
  const origin = url.toString().replace(/\/$/, '')
  let html = readFileSync(indexPath, 'utf8')
  html = html.replace('<meta property="og:image" content="/media/v20/social.jpg" />', `<meta property="og:image" content="${origin}/media/v20/social.jpg" /><meta property="og:url" content="${origin}/" /><link rel="canonical" href="${origin}/" />`)
  writeFileSync(indexPath, html)
  writeFileSync(sitemapPath, readFileSync(sitemapTemplate, 'utf8').replaceAll('__SITE_URL__', origin))
  writeFileSync(robotsPath, `${readFileSync(robotsTemplate, 'utf8').trimEnd()}\nSitemap: ${origin}/sitemap.xml\n`)
} else {
  unlinkSync(sitemapPath)
}
