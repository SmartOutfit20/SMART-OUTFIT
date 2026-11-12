import { Router } from 'express'
import { Category, Product } from '../models/index.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
const router = Router()
const adminOnly = [requireAuth, requireRole('super_admin', 'admin', 'editor')]
const slugify = value => String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || ('category-' + Date.now().toString(36))
router.get('/', async (req, res, next) => {
  try { res.json(await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean()) }
  catch (e) { next(e) }
})
router.get('/admin/all', ...adminOnly, async (req, res, next) => {
  try {
    const [categories, counts] = await Promise.all([
      Category.find().populate('parent','name').sort({ sortOrder: 1, name: 1 }).lean(),
      Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }])
    ])
    const countMap = new Map(counts.filter(x => x._id).map(x => [String(x._id), x.count]))
    res.json(categories.map(category => ({ ...category, productCount: countMap.get(String(category._id)) || 0 })))
  } catch (e) { next(e) }
})
router.post('/', ...adminOnly, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim().slice(0, 60)
    const slug = slugify(req.body.slug || name).slice(0, 80)
    const parent = req.body.parent || undefined
    const sortOrder = Number(req.body.sortOrder ?? 0)
    const image = String(req.body.image || '')
    if (name.length < 2 || !slug || !Number.isInteger(sortOrder) || sortOrder < 0) return res.status(400).json({ message: 'Enter a valid category name, slug and order.' })
    if (image && image.length > 1200000 && !/^https:\/\//i.test(image)) return res.status(400).json({ message: 'Category image must be under 1.2 MB or use an HTTPS image URL.' })
    if (image && !/^https:\/\//i.test(image) && !/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(image)) return res.status(400).json({ message: 'Category image must be a compressed WebP image or HTTPS URL.' })
    if (parent && !await Category.exists({ _id: parent })) return res.status(400).json({ message: 'Selected parent category does not exist.' })
    const category = await Category.create({ name, slug, parent, image, sortOrder, isActive: req.body.isActive !== false })
    res.status(201).json(category)
  } catch (e) { next(e) }
})
router.patch('/:id', ...adminOnly, async (req, res, next) => {
  try {
    const update = {}
    if (req.body.name !== undefined) update.name = String(req.body.name).trim().slice(0, 60)
    if (req.body.slug !== undefined || req.body.name !== undefined) update.slug = slugify(req.body.slug || req.body.name).slice(0, 80)
    if (req.body.sortOrder !== undefined) {
      update.sortOrder = Number(req.body.sortOrder)
      if (!Number.isInteger(update.sortOrder) || update.sortOrder < 0) return res.status(400).json({ message: 'Sort order must be a non-negative whole number.' })
    }
    if (req.body.isActive !== undefined) update.isActive = Boolean(req.body.isActive)
    if (req.body.image !== undefined) {
      update.image = String(req.body.image || '')
      if (update.image && update.image.length > 1200000 && !/^https:\/\//i.test(update.image)) return res.status(400).json({ message: 'Category image must be under 1.2 MB or use an HTTPS image URL.' })
      if (update.image && !/^https:\/\//i.test(update.image) && !/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(update.image)) return res.status(400).json({ message: 'Category image must be a compressed WebP image or HTTPS URL.' })
    }
    if (req.body.parent !== undefined) {
      const parent = req.body.parent || null
      if (parent && !await Category.exists({ _id: parent })) return res.status(400).json({ message: 'Choose a valid parent category.' })
      let ancestor = parent
      const seen = new Set()
      while (ancestor) {
        if (String(ancestor) === String(req.params.id) || seen.has(String(ancestor))) return res.status(400).json({ message: 'A category cannot be placed inside its own child category.' })
        seen.add(String(ancestor))
        const node = await Category.findById(ancestor).select('parent').lean()
        ancestor = node?.parent || null
      }
      update.parent = parent
    }
    const item = await Category.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }).populate('parent','name')
    if (!item) return res.status(404).json({ message: 'Category not found' })
    res.json(item)
  } catch (e) { next(e) }
})
router.delete('/:id', ...adminOnly, async (req, res, next) => {
  try {
    const item = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true })
    if (!item) return res.status(404).json({ message: 'Category not found' })
    res.json({ message: 'Category deactivated' })
  } catch (e) { next(e) }
})
export default router
