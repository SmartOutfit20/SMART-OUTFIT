import { Router } from 'express'
import { Category } from '../models/index.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
const router = Router()
const adminOnly = [requireAuth, requireRole('super_admin', 'admin', 'editor')]
const slugify = value => String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
router.get('/', async (req, res, next) => {
  try { res.json(await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean()) }
  catch (e) { next(e) }
})
router.get('/admin/all', ...adminOnly, async (req, res, next) => {
  try { res.json(await Category.find().sort({ sortOrder: 1, name: 1 }).lean()) }
  catch (e) { next(e) }
})
router.post('/', ...adminOnly, async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim()
    if (!name) return res.status(400).json({ message: 'Category name is required' })
    const category = await Category.create({ name, slug: slugify(req.body.slug || name), parent: req.body.parent || undefined, sortOrder: Number(req.body.sortOrder || 0), isActive: req.body.isActive !== false })
    res.status(201).json(category)
  } catch (e) { next(e) }
})
router.patch('/:id', ...adminOnly, async (req, res, next) => {
  try {
    const update = {}
    if (req.body.name !== undefined) update.name = String(req.body.name).trim()
    if (req.body.slug !== undefined || req.body.name !== undefined) update.slug = slugify(req.body.slug || req.body.name)
    if (req.body.sortOrder !== undefined) update.sortOrder = Number(req.body.sortOrder)
    if (req.body.isActive !== undefined) update.isActive = Boolean(req.body.isActive)
    const item = await Category.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
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
