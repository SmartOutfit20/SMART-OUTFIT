import { Router } from 'express'
import mongoose from 'mongoose'
import { Product, Review, Order } from '../models/index.js'
import { requireAuth } from '../middleware/auth.js'
import { isMongoId } from '../config/ids.js'
import { normalizeReviewInput, buildReviewEligibility } from '../services/reviewRules.js'

const router = Router()
const customerOnly = (req, res, next) => {
  if (req.user?.role !== 'customer') return res.status(403).json({ message: 'Only customer accounts can submit product reviews.' })
  next()
}

async function loadReviewableOrders(customerId, productId) {
  return Order.find({
    customer: customerId,
    status: { $in: ['delivered', 'partially_returned'] },
    paymentStatus: 'paid',
    'items.product': productId
  }).select('status paymentStatus items returnRequests').lean()
}

router.get('/:productId/eligibility', requireAuth, customerOnly, async (req, res, next) => {
  try {
    const productId = String(req.params.productId || '')
    if (!isMongoId(productId)) return res.status(400).json({ message: 'Invalid product ID.' })
    const product = await Product.findOne({ _id: productId, isPublished: true }).select('_id').lean()
    if (!product) return res.status(404).json({ message: 'Product not found.' })
    const [orders, existing] = await Promise.all([
      loadReviewableOrders(req.user.sub, productId),
      Review.exists({ product: productId, customer: req.user.sub })
    ])
    res.json(buildReviewEligibility({ orders, productId, alreadyReviewed: Boolean(existing) }))
  } catch (error) { next(error) }
})

router.get('/:productId', async (req, res, next) => {
  try {
    const productId = String(req.params.productId || '')
    if (!isMongoId(productId)) return res.status(400).json({ message: 'Invalid product ID.' })
    const product = await Product.findOne({ _id: productId, isPublished: true }).select('_id').lean()
    if (!product) return res.status(404).json({ message: 'Product not found.' })
    const [items, totals] = await Promise.all([
      Review.find({ product: productId, isApproved: true })
        .populate('customer', 'name')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Review.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true } },
        { $group: { _id: null, averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }
      ])
    ])
    const summary = totals[0] || { averageRating: 0, reviewCount: 0 }
    res.json({
      items: items.map(item => ({
        _id: item._id,
        rating: item.rating,
        comment: item.comment,
        createdAt: item.createdAt,
        customer: { name: item.customer?.name || 'SMART OUTFIT customer' }
      })),
      summary: {
        averageRating: Number(Number(summary.averageRating || 0).toFixed(1)),
        reviewCount: Number(summary.reviewCount || 0)
      }
    })
  } catch (error) { next(error) }
})

router.post('/:productId', requireAuth, customerOnly, async (req, res, next) => {
  try {
    const productId = String(req.params.productId || '')
    if (!isMongoId(productId)) return res.status(400).json({ message: 'Invalid product ID.' })
    const { rating, comment } = normalizeReviewInput(req.body)
    const product = await Product.findOne({ _id: productId, isPublished: true }).select('_id').lean()
    if (!product) return res.status(404).json({ message: 'Product not found.' })
    if (await Review.exists({ product: productId, customer: req.user.sub })) {
      return res.status(409).json({ message: 'You have already reviewed this product.' })
    }
    const orders = await loadReviewableOrders(req.user.sub, productId)
    if (!buildReviewEligibility({ orders, productId }).eligible) {
      return res.status(403).json({ message: 'A review is available after a paid order is delivered. Products reserved for return cannot be reviewed.' })
    }
    let review
    try {
      review = await Review.create({ product: productId, customer: req.user.sub, rating, comment, isApproved: false })
    } catch (error) {
      if (error?.code === 11000) return res.status(409).json({ message: 'You have already reviewed this product.' })
      throw error
    }
    res.status(201).json({
      message: 'Thank you. Your review has been submitted and will appear after store moderation.',
      review: { _id: review._id, rating: review.rating, createdAt: review.createdAt, isApproved: review.isApproved }
    })
  } catch (error) {
    if (error?.status) return res.status(error.status).json({ message: error.message })
    next(error)
  }
})

export default router
