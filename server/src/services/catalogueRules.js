const SORTS = new Set(['recommended', 'newest', 'price-low', 'price-high', 'featured', 'best-seller'])
function first(value) { return Array.isArray(value) ? value[0] : value }
function badRequest(message) { const error = new Error(message); error.status = 400; return error }
function parseOptionalPrice(value, field) {
  if (value === undefined || value === null || value === '') return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0 || number > 100000000) throw badRequest(field + ' must be a valid BDT amount between 0 and 100,000,000.')
  return number
}
export function escapeCatalogueRegex(value) {
  return String(value ?? '').replace(/[.*+?^$()|[\]{}\\]/g, '\\$&')
}
export function normalizeCatalogueQuery(query = {}) {
  const rawPage = Number(first(query.page))
  const rawLimit = Number(first(query.limit))
  const minPrice = parseOptionalPrice(first(query.minPrice), 'Minimum price')
  const maxPrice = parseOptionalPrice(first(query.maxPrice), 'Maximum price')
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) throw badRequest('Minimum price cannot be greater than maximum price.')
  const requestedSort = String(first(query.sort) || 'newest').trim()
  const boolean = value => ['1', 'true', 'yes'].includes(String(first(value) ?? '').toLowerCase())
  return {
    page: Number.isFinite(rawPage) && rawPage >= 1 ? Math.min(100000, Math.floor(rawPage)) : 1,
    limit: Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(48, Math.floor(rawLimit)) : 12,
    q: String(first(query.q ?? query.search) || '').trim().slice(0, 80),
    category: String(first(query.category) || '').trim().slice(0, 80),
    minPrice, maxPrice,
    size: String(first(query.size) || '').trim().slice(0, 30),
    color: String(first(query.color) || '').trim().slice(0, 40),
    tag: String(first(query.tag) || '').trim().slice(0, 40),
    inStock: boolean(query.inStock),
    sale: boolean(query.sale),
    sort: SORTS.has(requestedSort) ? requestedSort : 'newest'
  }
}
export function buildCategoryLookup(value) {
  const raw = String(value || '').trim()
  if (/^[a-f0-9]{24}$/i.test(raw)) return { _id: raw, isActive: true }
  const slug = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const alternatives = []
  if (slug) alternatives.push({ slug })
  alternatives.push({ name: new RegExp('^' + escapeCatalogueRegex(raw) + '$', 'i') })
  return { isActive: true, $or: alternatives }
}
export function buildCatalogueFilter(filters, categoryId) {
  const filter = { isPublished: true }
  if (categoryId !== undefined) filter.category = categoryId
  if (filters.minPrice !== null || filters.maxPrice !== null) {
    filter.price = {}
    if (filters.minPrice !== null) filter.price.$gte = filters.minPrice
    if (filters.maxPrice !== null) filter.price.$lte = filters.maxPrice
  }
  if (filters.inStock) filter.stock = { $gt: 0 }
  if (filters.sale) filter.$expr = { $gt: [{ $ifNull: ['$compareAtPrice', 0] }, '$price'] }
  const conditions = []
  if (filters.q) {
    const search = new RegExp(escapeCatalogueRegex(filters.q), 'i')
    conditions.push({ $or: [{ name: search }, { description: search }, { tags: search }] })
  }
  if (filters.tag) conditions.push({ tags: new RegExp('^' + escapeCatalogueRegex(filters.tag) + '$', 'i') })
  if (filters.size || filters.color) {
    const size = filters.size ? new RegExp('^' + escapeCatalogueRegex(filters.size) + '$', 'i') : null
    const color = filters.color ? new RegExp('^' + escapeCatalogueRegex(filters.color) + '$', 'i') : null
    const variant = {}
    if (size) variant.size = size
    if (color) variant.color = color
    if (filters.inStock) variant.stock = { $gt: 0 }
    const legacy = [{ $or: [{ variantStocks: { $exists: false } }, { variantStocks: { $size: 0 } }] }]
    if (size) legacy.push({ sizes: size })
    if (color) legacy.push({ colors: color })
    conditions.push({ $or: [{ variantStocks: { $elemMatch: variant } }, { $and: legacy }] })
  }
  if (conditions.length) filter.$and = conditions
  return filter
}
export function buildCatalogueSort(sort) {
  const sorts = {
    recommended: { isFeatured: -1, isBestSeller: -1, createdAt: -1, _id: -1 },
    newest: { createdAt: -1, _id: -1 },
    'price-low': { price: 1, _id: 1 },
    'price-high': { price: -1, _id: -1 },
    featured: { createdAt: -1, _id: -1 },
    'best-seller': { createdAt: -1, _id: -1 }
  }
  return sorts[SORTS.has(sort) ? sort : 'newest']
}
