import { Router } from 'express'
import { Product, Category, ActivityLog, Setting, Review } from '../models/index.js'
import { starterProducts } from '../data/starterProducts.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { hasPermission } from '../config/permissions.js'
import sharp from 'sharp'
import { normalizeCatalogueQuery, buildCategoryLookup, buildCatalogueFilter, buildCatalogueSort } from '../services/catalogueRules.js'

const router = Router()

async function attachReviewSummaries(items) {
  if (!items.length) return items
  const totals = await Review.aggregate([
    { $match: { product: { $in: items.map(item => item._id) }, isApproved: true } },
    { $group: { _id: '$product', averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }
  ])
  const byProduct = new Map(totals.map(row => [String(row._id), row]))
  return items.map(item => {
    const summary = byProduct.get(String(item._id))
    return {
      ...item,
      rating: summary ? Number(Number(summary.averageRating).toFixed(1)) : 0,
      reviewCount: summary?.reviewCount || 0
    }
  })
}
const productWrite = [requireAuth, requirePermission('products.write')]
const productRead = [requireAuth, requirePermission('products.read')]
const productOrInventoryRead = [requireAuth, (req,res,next) => { if (!hasPermission(req.user?.role,'products.read',req.user?.permissions) && !hasPermission(req.user?.role,'inventory.read',req.user?.permissions)) return res.status(403).json({message:'Insufficient permissions'}); next() }]
const inventoryWrite = [requireAuth, requirePermission('inventory.write')]
const cleanProduct = body => ({
  name: String(body.name || '').trim(),
  slug: String(body.slug || body.name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'product',
  sku: body.sku ? String(body.sku).trim() : undefined,
  description: body.description || '',
  category: body.category || undefined,
  price: Number(body.price),
  compareAtPrice: body.compareAtPrice === '' || body.compareAtPrice == null ? undefined : Number(body.compareAtPrice),
  images: Array.isArray(body.images) ? body.images.filter(x => typeof x === 'string').slice(0, 8) : [],
  sizes: Array.isArray(body.sizes) ? body.sizes.map(String).slice(0, 20) : [],
  colors: Array.isArray(body.colors) ? body.colors.map(String).slice(0, 20) : [],
  variantStocks: Array.isArray(body.variantStocks) ? body.variantStocks.map(v => ({ size: String(v.size || '').trim(), color: String(v.color || '').trim(), stock: v.stock === '' || v.stock == null ? NaN : Number(v.stock) })) : [],
  stock: Array.isArray(body.variantStocks) && body.variantStocks.length ? body.variantStocks.reduce((n, v) => n + Math.max(0, Number(v.stock) || 0), 0) : Number(body.stock ?? 0),
  isPublished: Boolean(body.isPublished),
  isFeatured: Boolean(body.isFeatured),
  isBestSeller: Boolean(body.isBestSeller),
  tags: Array.isArray(body.tags) ? body.tags.map(String).slice(0, 20) : []
})
function validateProduct(p) {
  if (!p.name || !p.slug || !Number.isFinite(p.price) || p.price < 0 || !Number.isFinite(p.stock) || p.stock < 0) {
    const err = new Error('Name, valid price and non-negative stock are required')
    err.status = 400
    throw err
  }
  if (p.compareAtPrice != null && (!Number.isFinite(p.compareAtPrice) || p.compareAtPrice < 0)) {
    const err = new Error('Compare-at price must be a valid non-negative amount.')
    err.status = 400
    throw err
  }
  if (p.variantStocks.length > 100 || p.variantStocks.some(v => !v.size || !v.color || v.size.length > 30 || v.color.length > 40 || !Number.isInteger(v.stock) || v.stock < 0 || v.stock > 1000000)) {
    const err = new Error('Each variant needs a size, colour and whole-number stock from 0 to 1,000,000.')
    err.status = 400
    throw err
  }
  const sizeMap = new Map(p.sizes.map(value => [String(value).trim().toLowerCase(), String(value).trim()]))
  const colorMap = new Map(p.colors.map(value => [String(value).trim().toLowerCase(), String(value).trim()]))
  const combinations = new Set()
  p.variantStocks = p.variantStocks.map(v => {
    const size = sizeMap.get(v.size.toLowerCase())
    const color = colorMap.get(v.color.toLowerCase())
    if (!size || !color) {
      const err = new Error('Variant "' + v.size + ' | ' + v.color + '" does not match the available sizes and colours. Check spelling and options.')
      err.status = 400
      throw err
    }
    const key = size.toLowerCase() + '|' + color.toLowerCase()
    if (combinations.has(key)) {
      const err = new Error('Duplicate variant "' + size + ' | ' + color + '". Each size and colour combination can be added only once.')
      err.status = 400
      throw err
    }
    combinations.add(key)
    return { ...v, size, color }
  })
  if (p.variantStocks.length) p.stock = p.variantStocks.reduce((total, variant) => total + variant.stock, 0)
}
function compactSlugBase(value) {
  const words = String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean)
  return words.slice(0, 2).join('-').slice(0, 14).replace(/-+$/g, '') || 'item'
}
async function uniqueProductSlug(base, excludeId) {
  const root = compactSlugBase(base)
  let candidate = root
  let suffix = 2
  while (await Product.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    candidate = root.slice(0, Math.max(1, 19 - String(suffix).length)) + '-' + suffix++
  }
  return candidate
}
let shortSlugMigrationPromise
async function ensureShortProductSlugs() {
  if (!shortSlugMigrationPromise) {
    shortSlugMigrationPromise = (async () => {
      const products = await Product.find({ slug: { $exists: true, $ne: '' } }).select('_id name slug').sort({ createdAt: 1, _id: 1 }).lean()
      for (const product of products) {
        if (String(product.slug || '').length <= 22) continue
        const shortSlug = await uniqueProductSlug(compactSlugBase(product.name), product._id)
        await Product.updateOne(
          { _id: product._id },
          { $set: { slug: shortSlug }, $addToSet: { legacySlugs: product.slug } }
        )
      }
    })().catch(error => {
      shortSlugMigrationPromise = null
      throw error
    })
  }
  return shortSlugMigrationPromise
}
let productSerialMigrationPromise
async function nextProductSerial() {
  const counter = await Setting.findOneAndUpdate(
    { key: 'productSequence' },
    { $inc: { value: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  return Number(counter.value)
}
async function ensureProductSerials() {
  if (!productSerialMigrationPromise) {
    productSerialMigrationPromise = (async () => {
      const products = await Product.find().select('_id serialNumber sku createdAt').sort({ createdAt: 1, _id: 1 })
      const highest = products.reduce((n, product) => Math.max(n, Number(product.serialNumber) || 0), 0)
      await Setting.findOneAndUpdate(
        { key: 'productSequence' },
        { $max: { value: highest } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      for (const product of products) {
        if (Number(product.serialNumber) > 0 && product.sku) continue
        const serialNumber = Number(product.serialNumber) > 0 ? Number(product.serialNumber) : await nextProductSerial()
        const update = { serialNumber }
        if (!product.sku) {
          let sku = 'SO-' + String(serialNumber).padStart(4, '0')
          while (await Product.exists({ sku, _id: { $ne: product._id } })) {
            const next = await nextProductSerial()
            sku = 'SO-' + String(next).padStart(4, '0')
          }
          update.sku = sku
        }
        await Product.updateOne({ _id: product._id }, { $set: update })
      }
    })().catch(error => {
      productSerialMigrationPromise = null
      throw error
    })
  }
  return productSerialMigrationPromise
}
async function assignProductSerial(payload) {
  let serialNumber = await nextProductSerial()
  let sku = 'SO-' + String(serialNumber).padStart(4, '0')
  while (await Product.exists({ sku })) {
    serialNumber = await nextProductSerial()
    sku = 'SO-' + String(serialNumber).padStart(4, '0')
  }
  payload.serialNumber = serialNumber
  payload.sku = sku
}
function productWriteError(error) {
  if (error?.code === 11000 && error?.keyPattern?.slug) {
    const err = new Error('A product with this URL slug already exists. Please try saving again; a unique slug will be assigned automatically.')
    err.status = 409
    return err
  }
  if (error?.code === 11000 && error?.keyPattern?.sku) {
    const err = new Error('This SKU / Product code is already in use. Enter a unique SKU or leave it blank.')
    err.status = 409
    return err
  }
  return error
}

router.post('/admin/import-starter', ...productWrite, async (req, res, next) => {
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
    await ensureShortProductSlugs()
    await ensureProductSerials()
    const filters = normalizeCatalogueQuery(req.query)
    let categoryId
    if (filters.category) {
      const category = await Category.findOne(buildCategoryLookup(filters.category)).select('_id').lean()
      if (!category) return res.json({ items: [], total: 0, page: 1, pages: 0, limit: filters.limit })
      categoryId = category._id
    }
    const filter = buildCatalogueFilter(filters, categoryId)
    if (filters.sort === 'featured') filter.isFeatured = true
    if (filters.sort === 'best-seller') filter.isBestSeller = true
    const total = await Product.countDocuments(filter)
    const pages = Math.ceil(total / filters.limit)
    const page = pages ? Math.min(filters.page, pages) : 1
    const items = await Product.find(filter)
      .populate('category', 'name slug')
      .sort(buildCatalogueSort(filters.sort))
      .skip((page - 1) * filters.limit)
      .limit(filters.limit)
      .lean()
    const ratedItems = await attachReviewSummaries(items)
    res.json({ items: ratedItems, total, page, pages, limit: filters.limit })
  } catch (e) { next(e) }
})

router.get('/admin/all', ...productOrInventoryRead, async (req, res, next) => {
  try { await ensureShortProductSlugs(); await ensureProductSerials(); res.json(await Product.find().populate('category', 'name').sort({ createdAt: -1 }).lean()) }
  catch (e) { next(e) }
})



router.patch('/admin/:id/variant-stock', ...inventoryWrite, async (req, res, next) => {
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
    await product.populate('category', 'name')
    ActivityLog.create({ actor: req.user.sub, action: 'variant_inventory_adjusted', resource: 'product', resourceId: product._id.toString(), metadata: { size, color, delta } }).catch(() => {})
    res.json(product)
  } catch (e) { next(e) }
})

router.patch('/admin/:id/stock', ...inventoryWrite, async (req, res, next) => {
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

router.post('/', ...productWrite, async (req, res, next) => {
  try {
    await ensureProductSerials()
    const payload = cleanProduct(req.body); validateProduct(payload)
    payload.slug = await uniqueProductSlug(payload.slug)
    await assignProductSerial(payload)
    const product = await Product.create(payload)
    ActivityLog.create({actor:req.user.sub,action:'product.created',resource:'product',resourceId:product._id.toString(),ip:String(req.ip||'').slice(0,80),metadata:{name:product.name,sku:product.sku||''}}).catch(()=>{})
    res.status(201).json(product)
  } catch (e) { next(productWriteError(e)) }
})

router.patch('/:id', ...productWrite, async (req, res, next) => {
  try {
    const payload = cleanProduct(req.body); validateProduct(payload)
    payload.slug = await uniqueProductSlug(payload.slug, req.params.id)
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found' })
    if (product.slug && product.slug !== payload.slug) product.legacySlugs.addToSet(product.slug)
    product.set(payload)
    await product.save()
    ActivityLog.create({actor:req.user.sub,action:'product.updated',resource:'product',resourceId:product._id.toString(),ip:String(req.ip||'').slice(0,80),metadata:{name:product.name,sku:product.sku||''}}).catch(()=>{})
    res.json(product)
  } catch (e) { next(productWriteError(e)) }
})

router.delete('/:id', ...productWrite, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id)
    if (!product) return res.status(404).json({ message: 'Product not found' })
    ActivityLog.create({actor:req.user.sub,action:'product.deleted',resource:'product',resourceId:product._id.toString(),ip:String(req.ip||'').slice(0,80),metadata:{name:product.name,sku:product.sku||''}}).catch(()=>{})
    res.json({ message: 'Product deleted' })
  } catch (e) { next(e) }
})

router.get('/:id/share-image', async (req, res, next) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(404).end()
    const product = await Product.findOne({ _id: req.params.id, isPublished: true }).select('images').lean()
    const image = product?.images?.[0]
    if (!image || typeof image !== 'string') return res.status(404).end()

    let source
    const dataMatch = image.match(/^data:image\/(?:jpeg|jpg|png|webp|gif);base64,([A-Za-z0-9+/=]+)$/i)
    if (dataMatch) {
      source = Buffer.from(dataMatch[1], 'base64')
    } else if (/^https?:\/\//i.test(image) || image.startsWith('/')) {
      const sourceUrl = image.startsWith('/') ? `${req.protocol}://${req.get('host')}${image}` : image
      const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'SMART-OUTFIT-ImagePreview/1.0' } })
      if (!response.ok) return res.status(404).end()
      const contentType = response.headers.get('content-type') || ''
      if (!contentType.toLowerCase().startsWith('image/')) return res.status(415).end()
      const declaredLength = Number(response.headers.get('content-length') || 0)
      if (declaredLength > 12 * 1024 * 1024) return res.status(413).end()
      const bytes = Buffer.from(await response.arrayBuffer())
      if (!bytes.length || bytes.length > 12 * 1024 * 1024) return res.status(413).end()
      source = bytes
    } else {
      return res.status(404).end()
    }

    // WhatsApp is less tolerant of modern image formats and oversized originals.
    // Normalize every product preview to a compact, crawler-friendly JPEG.
    const jpeg = await sharp(source, { failOn: 'none', limitInputPixels: 40000000 })
      .rotate()
      .resize(1200, 630, { fit: 'contain', background: '#ffffff', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer()

    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Length': String(jpeg.length),
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline; filename="product-preview.jpg"'
    })
    res.send(jpeg)
  } catch (e) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') return res.status(504).end()
    next(e)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    await ensureShortProductSlugs()
    const identifier = String(req.params.id || '')
    const filter = /^[a-f0-9]{24}$/i.test(identifier)
      ? { _id: identifier, isPublished: true }
      : { $or: [{ slug: identifier }, { legacySlugs: identifier }], isPublished: true }
    const item = await Product.findOne(filter).populate('category', 'name slug').lean()
    if (!item) return res.status(404).json({ message: 'Product not found' })
    const [ratedItem] = await attachReviewSummaries([item])
    res.json(ratedItem)
  } catch (e) { next(e) }
})
export default router
