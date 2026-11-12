import { Router } from 'express'
import { Product, Category, ActivityLog } from '../models/index.js'
import { starterProducts } from '../data/starterProducts.js'
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
  variantStocks: Array.isArray(body.variantStocks) ? body.variantStocks.map(v => ({ size: String(v.size || '').trim(), color: String(v.color || '').trim(), stock: Number(v.stock) })).filter(v => v.size && v.color && Number.isInteger(v.stock) && v.stock >= 0).slice(0, 100) : [],
  stock: Array.isArray(body.variantStocks) && body.variantStocks.length ? body.variantStocks.reduce((n, v) => n + Math.max(0, Number(v.stock) || 0), 0) : Number(body.stock ?? 0),
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

router.post('/admin/import-starter', ...adminOnly, async (req, res, next) => {
  try {
    const categoryCache = new Map()
    let created = 0, skipped = 0
    for (const item of starterProducts) {
      const existing = await Product.findOne({ sku: item.sku }).select('_id').lean()
      if (existing) { skipped++; continue }
      let categoryId
      if (item.categoryName) {
        if (!categoryCache.has(item.categoryName)) {
          const categorySlug = item.categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
          const category = await Category.findOneAndUpdate(
            { slug: categorySlug },
            { $setOnInsert: { name: item.categoryName, slug: categorySlug, isActive: true } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          )
          categoryCache.set(item.categoryName, category._id)
        }
        categoryId = categoryCache.get(item.categoryName)
      }
      const { categoryName, ...product } = item
      await Product.create({ ...product, category: categoryId })
      created++
    }
    res.status(201).json({ message: 'Starter catalogue import complete', created, skipped, total: starterProducts.length })
  } catch (e) { next(e) }
})

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



router.patch('/admin/:id/variant-stock', ...adminOnly, async (req, res, next) => {
  try {
    const size = String(req.body.size || '').trim().slice(0, 30)
    const color = String(req.body.color || '').trim().slice(0, 40)
    const delta = Number(req.body.delta)
    if (!/^[a-f0-9]{24}$/i.test(req.params.id) || !size || !color || !Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000) return res.status(400).json({ message: 'Provide a valid size, colour and whole-number stock adjustment.' })
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found.' })
    const index = product.variantStocks.findIndex(v => v.size.toLowerCase() === size.toLowerCase() && v.color.toLowerCase() === color.toLowerCase())
    if (index < 0) {
      if (delta < 0) return res.status(409).json({ message: 'This variant has no stock record.' })
      product.variantStocks.push({ size, color, stock: delta })
    } else {
      if (product.variantStocks[index].stock + delta < 0) return res.status(409).json({ message: 'Insufficient stock for this variant.' })
      product.variantStocks[index].stock += delta
    }
    product.stock = product.variantStocks.reduce((n, v) => n + Number(v.stock || 0), 0)
    await product.save()
    ActivityLog.create({ actor: req.user.sub, action: 'variant_inventory_adjusted', resource: 'product', resourceId: product._id.toString(), metadata: { size, color, delta } }).catch(() => {})
    res.json(product)
  } catch (e) { next(e) }
})

router.patch('/admin/:id/stock', ...adminOnly, async (req, res, next) => {
  try {
    const delta = Number(req.body.delta)
    const note = String(req.body.note || 'Manual inventory adjustment').trim().slice(0, 200)
    if (!/^[a-f0-9]{24}$/i.test(req.params.id) || !Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000) {
      return res.status(400).json({ message: 'Provide a valid product ID and a non-zero whole-number stock adjustment (maximum 100,000).' })
    }
    const filter = { _id: req.params.id }
    if (delta < 0) filter.stock = { $gte: Math.abs(delta) }
    const product = await Product.findOneAndUpdate(filter, { $inc: { stock: delta } }, { new: true, runValidators: true }).populate('category', 'name')
    if (!product) {
      const exists = await Product.exists({ _id: req.params.id })
      return res.status(exists ? 409 : 404).json({ message: exists ? 'Insufficient stock. Refresh inventory and try again.' : 'Product not found.' })
    }
    ActivityLog.create({ actor: req.user.sub, action: 'inventory_adjusted', resource: 'product', resourceId: product._id.toString(), metadata: { delta, stockAfter: product.stock, note } }).catch(() => {})
    res.json(product)
  } catch (e) { next(e) }
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
