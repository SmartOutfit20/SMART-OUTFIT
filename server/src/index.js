import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { connectDB } from './config/db.js'
import health from './routes/health.js'
import products from './routes/products.js'
import categories from './routes/categories.js'
import auth from './routes/auth.js'
import orders from './routes/orders.js'
import coupons from './routes/coupons.js'
import admin from './routes/admin.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDistPath = path.resolve(__dirname, '../../client/dist')

const app = express()
// Render terminates TLS and forwards one proxy hop; trust that hop so
// express-rate-limit can safely identify client IPs from X-Forwarded-For.
app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))
app.use(morgan('dev'))
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }))
app.use('/api/auth', auth)
app.use('/api/health', health)
app.use('/api/products', products)
app.use('/api/categories', categories)
app.use('/api/orders', orders)
app.use('/api/coupons', coupons)
app.use('/api/admin', admin)

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
