import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { Product, Category, Setting } from './models/index.js'
import { fileURLToPath } from 'node:url'
import { connectDB } from './config/db.js'
import health from './routes/health.js'
import products from './routes/products.js'
import categories from './routes/categories.js'
import auth from './routes/auth.js'
import orders from './routes/orders.js'
import coupons from './routes/coupons.js'
import admin from './routes/admin.js'
import storefront from './routes/storefront.js'
import analytics from './routes/analytics.js'
import { shouldSkipAuthRateLimit } from './config/rateLimits.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDistPath = path.resolve(__dirname, '../../client/dist')

const app = express()
// Render terminates TLS and forwards one proxy hop; trust that hop so
// express-rate-limit can safely identify client IPs from X-Forwarded-For.
app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || 'http://localhost:5173' }))
app.use(express.json({ limit: '8mb' }))
app.use(morgan('dev'))
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, skip: shouldSkipAuthRateLimit }))
app.use('/api/auth', auth)
app.use('/api/health', health)
app.use('/api/products', products)
app.use('/api/categories', categories)
app.use('/api/orders', orders)
app.use('/api/coupons', coupons)
app.use('/api/admin', admin)
app.use('/api/storefront', storefront)
app.use('/api/analytics', analytics)

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
}
function plainText(value, maxLength = 300) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength)
}


function xmlEscape(value) {
  return String(value ?? '').replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char])
}
async function seoSettings() {
  const keys = ['homepageSeoTitle','homepageSeoDescription','homepageSeoKeywords','seoDefaultTitle','seoDefaultDescription','seoOgImage','seoIndexingEnabled','storeName']
  const rows = await Setting.find({ key: { $in: keys } }).lean()
  return Object.fromEntries(rows.map(row => [row.key, row.value]))
}
function setHtmlMeta(html, title, description, canonical, image, indexing = true, keywords = '') {
  const safeTitle = escapeHtml(title)
  const safeDescription = escapeHtml(description)
  const tags = [
    '<meta name="description" content="' + safeDescription + '">',
    keywords ? '<meta name="keywords" content="' + escapeHtml(keywords) + '">' : '',
    '<link rel="canonical" href="' + escapeHtml(canonical) + '">',
    '<meta name="robots" content="' + (indexing ? 'index,follow' : 'noindex,nofollow') + '">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="SMART OUTFIT">',
    '<meta property="og:url" content="' + escapeHtml(canonical) + '">',
    '<meta property="og:title" content="' + safeTitle + '">',
    '<meta property="og:description" content="' + safeDescription + '">',
    image ? '<meta property="og:image" content="' + escapeHtml(image) + '">' : '',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="' + safeTitle + '">',
    '<meta name="twitter:description" content="' + safeDescription + '">',
    image ? '<meta name="twitter:image" content="' + escapeHtml(image) + '">' : ''
  ].filter(Boolean).join('\n')
  const start = html.indexOf('<title>')
  const end = html.indexOf('</title>', start)
  if (start >= 0 && end >= 0) html = html.slice(0, start) + '<title>' + safeTitle + '</title>' + html.slice(end + 8)
  html = html.replace(/<meta\s+name=["']description["'][^>]*>/i, '')
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, '')
  return html.replace('</head>', tags + '\n</head>')
}

// Public technical SEO endpoints. Sitemap is generated from the live catalogue.
app.get('/robots.txt', async (req, res, next) => {
  try {
    const settings = await seoSettings()
    const origin = req.protocol + '://' + req.get('host')
    const rules = settings.seoIndexingEnabled === false
      ? 'User-agent: *\nDisallow: /\n'
      : 'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\n'
    res.type('text/plain').set('Cache-Control', 'public, max-age=300').send(rules + 'Sitemap: ' + origin + '/sitemap.xml\n')
  } catch (e) { next(e) }
})
app.get('/sitemap.xml', async (req, res, next) => {
  try {
    const settings = await seoSettings()
    if (settings.seoIndexingEnabled === false) return res.type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>')
    const origin = req.protocol + '://' + req.get('host')
    const [products, categories] = await Promise.all([
      Product.find({ isPublished: true }).select('_id updatedAt').sort({ updatedAt: -1 }).lean(),
      Category.find({ isActive: true }).select('_id updatedAt').sort({ updatedAt: -1 }).lean()
    ])
    const entries = ['','shop','about','contact','shipping','returns','faq'].map(path => ({ loc: origin + (path ? '/' + path : '/'), lastmod: new Date().toISOString() }))
    for (const category of categories) entries.push({ loc: origin + '/shop?category=' + category._id, lastmod: category.updatedAt })
    for (const product of products) entries.push({ loc: origin + '/product/' + product._id, lastmod: product.updatedAt })
    const body = entries.map(item => '<url><loc>' + xmlEscape(item.loc) + '</loc>' + (item.lastmod ? '<lastmod>' + new Date(item.lastmod).toISOString() + '</lastmod>' : '') + '</url>').join('')
    res.type('application/xml').set('Cache-Control', 'public, max-age=300').send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + body + '</urlset>')
  } catch (e) { next(e) }
})
app.get('/', async (req, res, next) => {
  try {
    const settings = await seoSettings()
    const origin = req.protocol + '://' + req.get('host')
    const title = plainText(settings.homepageSeoTitle || settings.seoDefaultTitle || 'SMART OUTFIT | Your Style, Our Inspiration', 70)
    const description = plainText(settings.homepageSeoDescription || settings.seoDefaultDescription || 'Shop the latest fashion and clothing collections at SMART OUTFIT.', 180)
    const image = /^https:\/\//i.test(String(settings.seoOgImage || '')) ? settings.seoOgImage : ''
    const htmlPath = path.join(clientDistPath, 'index.html')
    const html = setHtmlMeta(await readFile(htmlPath, 'utf8'), title, description, origin + '/', image, settings.seoIndexingEnabled !== false, plainText(settings.homepageSeoKeywords || '', 300))
    res.set({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300, s-maxage=300' }).send(html)
  } catch (e) { next(e) }
})

// Social crawlers do not execute the React app, so return product-specific
// Open Graph tags in the initial HTML for shared product URLs.
app.get('/product/:id', async (req, res, next) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(404).send('Product not found')
    const product = await Product.findOne({ _id: req.params.id, isPublished: true }).select('name description price images').lean()
    const seo = await seoSettings()
    if (!product) return res.status(404).send('Product not found')

    const origin = `${req.protocol}://${req.get('host')}`
    const productUrl = `${origin}/product/${product._id}`
    const title = plainText(product.name, 180) + ' | SMART OUTFIT'
    const description = plainText(product.description, 280) || `Shop ${plainText(product.name, 120)} at SMART OUTFIT.`
    const imageUrl = product.images?.[0] ? `${origin}/api/products/${product._id}/share-image` : (seo.seoOgImage || `${origin}/api/storefront/app-icon`)
    const htmlPath = path.join(clientDistPath, 'index.html')
    let html = await readFile(htmlPath, 'utf8')
    const tags = [
      `<meta name="description" content="${escapeHtml(description)}">`,
      `<link rel="canonical" href="${escapeHtml(productUrl)}">`,
      '<meta property="og:type" content="product">',
      `<meta name="robots" content="${seo.seoIndexingEnabled === false ? 'noindex,nofollow' : 'index,follow'}">`,
      `<meta property="og:site_name" content="SMART OUTFIT">`,
      `<meta property="og:url" content="${escapeHtml(productUrl)}">`,
      `<meta property="og:title" content="${escapeHtml(title)}">`,
      `<meta property="og:description" content="${escapeHtml(description)}">`,
      `<meta property="og:image" content="${escapeHtml(imageUrl)}">`,
      `<meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">`,
      '<meta property="og:image:type" content="image/jpeg">',
      '<meta property="og:image:width" content="1200">',
      '<meta property="og:image:height" content="630">',
      `<meta property="og:image:alt" content="${escapeHtml(title)}">`,
      '<meta name="twitter:card" content="summary_large_image">',
      `<meta name="twitter:title" content="${escapeHtml(title)}">`,
      `<meta name="twitter:description" content="${escapeHtml(description)}">`,
      `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">`,
      `<meta property="product:price:amount" content="${Number(product.price || 0)}">`,
      '<meta property="product:price:currency" content="BDT">'
    ].join('\n')
    const titleStart = html.indexOf('<title>')
    const titleEnd = html.indexOf('</title>', titleStart)
    if (titleStart >= 0 && titleEnd >= 0) html = html.slice(0, titleStart) + `<title>${escapeHtml(title)}</title>` + html.slice(titleEnd + 8)
    html = html.replace('</head>', `${tags}\n</head>`)
    res.set({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300, s-maxage=300' })
    res.send(html)
  } catch (e) { next(e) }
})

// Serve the Vite production build from the same Render web service.
app.use(express.static(clientDistPath))
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api/')) return next()
  res.sendFile(path.join(clientDistPath, 'index.html'))
})

app.use((req, res) => res.status(404).json({ message: 'Route not found' }))
app.use((err, req, res, next) => {
  console.error(err)
  const status = err.status || (err.name === 'ValidationError' ? 400 : err.code === 11000 ? 409 : 500)
  res.status(status).json({ message: process.env.NODE_ENV === 'production' && status === 500 ? 'Something went wrong' : err.message })
})
const port = process.env.PORT || 5000
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured in production')
}
connectDB().then(() => app.listen(port, () => console.log(`SMART OUTFIT API and storefront listening on ${port}`))).catch(err => {
  console.error('Startup failed:', err); process.exit(1)
})
