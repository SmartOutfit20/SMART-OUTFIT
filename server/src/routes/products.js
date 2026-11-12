import { Router } from 'express'
import { Product } from '../models/index.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
const adminOnly = [requireAuth, requireRole('super_admin', 'admin', 'editor')]
const cleanProduct = body => ({
  name: String(body.name || '').trim(),
  slug: String(body.slug || body.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
  sku: body.sku ? String(body.sku).trim() : undefined,
  description: body.description || '',
  category: body.category || undefined,
  price: Number(body.price),
  compareAtPrice: body.compareAtPrice === '' || body.compareAtPrice == null ? undefined : Number(body.compareAtPrice),
  images: Array.isArray(body.images) ? body.images.filter(x => typeof x === 'string').slice(0, 8) : [],
  sizes: Array.isArray(body.sizes) ? body.sizes.map(String).slice(0, 20) : [],
  colors: Array.isArray(body.colors) ? body.colors.map(String).slice(0, 20) : [],
  stock: Number(body.stock ?? 0),
  isPublished: Boolean(body.isPublished),
  tags: Array.isArray(body.tags) ? body.tags.map(String).slice(0, 20) : []
})
function validateProduct(p) {
  if (!p.name || !p.slug || !Number.isFinite(p.price) || p.price < 0 || !Number.isFinite(p.stock) || p.stock < 0) {
    const err = new Error('Name, valid price and non-negative stock are required')
    err.status = 400
    throw err
  }
}

router.get('/', async (req, res, next) => {
  try {
    const { q, category, page = 1, limit = 12, sort = 'newest' } = req.query
    const filter = { isPublished: true }
    if (q) filter.name = { $regex: String(q).slice(0, 80), $options: 'i' }
    if (category) filter.category = category
    const p = Math.max(1, Number(page) || 1), l = Math.min(48, Math.max(1, Number(limit) || 12))
    const sortBy = sort === 'price-low' ? { price: 1 } : sort === 'price-high' ? { price: -1 } : { createdAt: -1 }
    const [items, total] = await Promise.all([
      Product.find(filter).populate('category', 'name slug').sort(sortBy).skip((p - 1) * l).limit(l).lean(),
      Product.countDocuments(filter)
    ])
    res.json({ items, total, page: p, pages: Math.ceil(total / l) })
  } catch (e) { next(e) }
})

router.get('/admin/all', ...adminOnly, async (req, res, next) => {
  try { res.json(await Product.find().populate('category', 'name').sort({ createdAt: -1 }).lean()) }
  catch (e) { next(e) }
})

router.post('/', ...adminOnly, async (req, res, next) => {
  try {
    const payload = cleanProduct(req.body); validateProduct(payload)
    const product = await Product.create(payload)
    res.status(201).json(product)
  } catch (e) { next(e) }
})

router.patch('/:id', ...adminOnly, async (req, res, next) => {
  try {
    const payload = cleanProduct(req.body); validateProduct(payload)
    const product = await Product.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json(product)
  } catch (e) { next(e) }
})

router.delete('/:id', ...adminOnly, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json({ message: 'Product deleted' })
  } catch (e) { next(e) }
})

router.get('/:id', async (req, res, next) => {
  try {
    const item = await Product.findOne({ _id: req.params.id, isPublished: true }).populate('category', 'name slug')
    if (!item) return res.status(404).json({ message: 'Product not found' })
    res.json(item)
  } catch (e) { next(e) }
})
export default router
