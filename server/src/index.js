import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { Product } from './models/index.js'
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
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, skip: req => !(req.method === 'POST' && ['/login', '/register', '/bootstrap-admin'].includes(req.path)) }))
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

// Social crawlers do not execute the React app, so return product-specific
// Open Graph tags in the initial HTML for shared product URLs.
app.get('/product/:id', async (req, res, next) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(404).send('Product not found')
    const product = await Product.findOne({ _id: req.params.id, isPublished: true }).select('name description price images').lean()
    if (!product) return res.status(404).send('Product not found')

    const origin = `${req.protocol}://${req.get('host')}`
    const productUrl = `${origin}/product/${product._id}`
    const title = plainText(product.name, 180) + ' | SMART OUTFIT'
    const description = plainText(product.description, 280) || `Shop ${plainText(product.name, 120)} at SMART OUTFIT.`
    const imageUrl = product.images?.[0] ? `${origin}/api/products/${product._id}/share-image` : `${origin}/api/storefront/app-icon`
    const htmlPath = path.join(clientDistPath, 'index.html')
    let html = await readFile(htmlPath, 'utf8')
    const tags = [
      `<meta name="description" content="${escapeHtml(description)}">`,
      `<link rel="canonical" href="${escapeHtml(productUrl)}">`,
      '<meta property="og:type" content="product">',
      `<meta property="og:site_name" content="SMART OUTFIT">`,
      `<meta property="og:url" content="${escapeHtml(productUrl)}">`,
      `<meta property="og:title" content="${escapeHtml(title)}">`,
      `<meta property="og:description" content="${escapeHtml(description)}">`,
      `<meta property="og:image" content="${escapeHtml(imageUrl)}">`,
      '<meta property="og:image:width" content="1200">',
      '<meta property="og:image:height" content="630">',
      '<meta name="twitter:card" content="summary_large_image">',
      `<meta name="twitter:title" content="${escapeHtml(title)}">`,
      `<meta name="twitter:description" content="${escapeHtml(description)}">`,
      `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">`,
      `<meta property="product:price:amount" content="${Number(product.price || 0)}">`,
      '<meta property="product:price:currency" content="BDT">'
    ].join('\n')
    html = html.replace(/<title>[\\s\\S]*?<\\/title>/i, `<title>${escapeHtml(title)}</title>`)
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
