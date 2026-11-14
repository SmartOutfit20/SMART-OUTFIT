import { Router } from 'express'
import mongoose from 'mongoose'
import { randomBytes } from 'node:crypto'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { Order, Product, Coupon, Setting } from '../models/index.js'
import { normalizeDeliveryAddress, deliveryAddressError, normalizeRequestedItems, calculateCouponDiscount, calculateDeliveryCharge } from '../services/checkoutRules.js'

const router = Router()
router.use(requireAuth)
const httpError = (message, status = 400) => Object.assign(new Error(message), { status })

async function restockOrderItems(order, session) {
  for (const line of order.items || []) {
    if (!line.product) continue
    const quantity = Math.max(0, Number(line.quantity) || 0)
    if (!quantity) continue
    const product = await Product.findById(line.product).select('variantStocks').session(session).lean()
    if (!product) continue
    const variant = (product.variantStocks || []).find(item => item.size === line.size && item.color === line.color)
    if (variant) {
      await Product.updateOne({ _id: line.product, variantStocks: { $elemMatch: { size: line.size, color: line.color } } }, { $inc: { stock: quantity, 'variantStocks.$.stock': quantity } }, { session })
    } else {
      // A variant may have been removed after purchase; preserve aggregate stock only.
      await Product.updateOne({ _id: line.product }, { $inc: { stock: quantity } }, { session })
    }
  }
}

async function releaseCouponUsage(order, session) {
  if (!order.couponUsageCounted || !order.coupon) return
  await Coupon.updateOne({ _id: order.coupon, usageCount: { $gt: 0 } }, { $inc: { usageCount: -1 } }, { session })
  order.couponUsageCounted = false
}

router.post('/coupon/validate', async (req, res, next) => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase()
    const subtotal = Number(req.body.subtotal || 0)
    if (!code || !Number.isFinite(subtotal) || subtotal < 0) return res.status(400).json({ message: 'Enter a valid coupon code.' })
    const coupon = await Coupon.findOne({ code, isActive: true }).lean()
    if (!coupon || (coupon.expiresAt && coupon.expiresAt <= new Date()) || (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit)) return res.status(404).json({ message: 'This coupon is invalid, expired or fully used.' })
    if (subtotal < Number(coupon.minimumOrder || 0)) return res.status(400).json({ message: 'Minimum order amount for this coupon is ৳' + Number(coupon.minimumOrder || 0) })
    const discount = calculateCouponDiscount(subtotal, coupon)
    if (discount <= 0) return res.status(400).json({ message: 'This coupon does not provide a valid discount.' })
    res.json({ code: coupon.code, discount, type: coupon.type, value: coupon.value, subtotal, totalAfterDiscount: subtotal - discount })
  } catch (error) { next(error) }
})

router.post('/', async (req, res, next) => {
  let session
  try {
    const address = normalizeDeliveryAddress(req.body.deliveryAddress)
    const addressError = deliveryAddressError(address)
    if (addressError) return res.status(400).json({ message: addressError })
    const requested = normalizeRequestedItems(req.body.items)
    const advancePaymentMethod = String(req.body.advancePaymentMethod || '').toLowerCase()
    const advancePaymentSender = String(req.body.advancePaymentSender || '').trim()
    const advancePaymentTransactionId = String(req.body.advancePaymentTransactionId || '').trim()
    const couponCode = String(req.body.couponCode || '').trim().toUpperCase()
    const orderNumber = 'SO-' + Date.now() + '-' + randomBytes(3).toString('hex').toUpperCase()
    let order

    session = await mongoose.startSession()
    await session.withTransaction(async () => {
      const lineItems = []
      let subtotal = 0
      for (const line of requested) {
        const current = await Product.findOne({ _id: line.productId, isPublished: true }).session(session)
        if (!current) throw httpError('A product is unavailable. Refresh your cart and try again.', 409)
        const hasVariants = Array.isArray(current.variantStocks) && current.variantStocks.length > 0
        let product
        let selectedSize = line.size
        let selectedColor = line.color
        if (hasVariants) {
          const variant = current.variantStocks.find(item => item.size.toLowerCase() === line.size.toLowerCase() && item.color.toLowerCase() === line.color.toLowerCase())
          if (!variant) throw httpError('This size and colour combination is unavailable. Please choose another variant.', 409)
          selectedSize = variant.size
          selectedColor = variant.color
          product = await Product.findOneAndUpdate(
            { _id: line.productId, isPublished: true, variantStocks: { $elemMatch: { size: variant.size, color: variant.color, stock: { $gte: line.quantity } } } },
            { $inc: { 'variantStocks.$.stock': -line.quantity, stock: -line.quantity } }, { new: true, session }
          )
          if (!product) throw httpError('Insufficient stock for ' + line.size + ' / ' + line.color + '. Refresh your cart and try again.', 409)
        } else {
          product = await Product.findOneAndUpdate(
            { _id: line.productId, isPublished: true, stock: { $gte: line.quantity } },
            { $inc: { stock: -line.quantity } }, { new: true, session }
          )
          if (!product) throw httpError('A product is unavailable or has insufficient stock. Refresh your cart and try again.', 409)
        }
        const unitPrice = Number(product.price)
        if (!Number.isFinite(unitPrice) || unitPrice < 0) throw httpError('A product has an invalid price. Please contact the store.', 503)
        subtotal += unitPrice * line.quantity
        lineItems.push({ product: product._id, name: product.name, sku: product.sku, quantity: line.quantity, unitPrice, size: selectedSize, color: selectedColor })
      }

      let discount = 0
      let coupon = null
      if (couponCode) {
        coupon = await Coupon.findOne({ code: couponCode, isActive: true }).session(session).lean()
        if (!coupon || (coupon.expiresAt && coupon.expiresAt <= new Date()) || (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) || subtotal < Number(coupon.minimumOrder || 0)) throw httpError('Coupon is no longer valid for this order.', 400)
        discount = calculateCouponDiscount(subtotal, coupon)
        if (discount <= 0) throw httpError('Coupon discount is invalid.', 400)
      }

      // MongoDB sessions do not support parallel operations inside a transaction.
      const insideDeliverySetting = await Setting.findOne({ key: 'insideDhakaDeliveryCharge' }).session(session).lean()
      const outsideDeliverySetting = await Setting.findOne({ key: 'outsideDhakaDeliveryCharge' }).session(session).lean()
      const legacyDeliverySetting = await Setting.findOne({ key: 'deliveryCharge' }).session(session).lean()
      const freeThresholdSetting = await Setting.findOne({ key: 'freeShippingThreshold' }).session(session).lean()
      const legacyDelivery = Number(legacyDeliverySetting?.value ?? process.env.DELIVERY_CHARGE_BDT ?? 100)
      const insideDelivery = Number(insideDeliverySetting?.value ?? legacyDelivery)
      const outsideDelivery = Number(outsideDeliverySetting?.value ?? legacyDelivery)
      const freeShippingThreshold = Number(freeThresholdSetting?.value ?? 3000)
      const isInsideDhaka = ['dhaka','ঢাকা'].includes(address.district.trim().toLowerCase())
      const configuredDelivery = isInsideDhaka ? insideDelivery : outsideDelivery
      const deliveryCharge = calculateDeliveryCharge(subtotal, configuredDelivery, freeShippingThreshold)
      // Delivery charge advance payment is mandatory whenever a delivery fee applies.
      const advancePaymentAmount = deliveryCharge
      if (advancePaymentAmount > 0 && (!['bkash', 'nagad'].includes(advancePaymentMethod) || !/^01[3-9]\d{8}$/.test(advancePaymentSender) || advancePaymentTransactionId.length < 6 || advancePaymentTransactionId.length > 80)) {
        throw httpError('Delivery charge advance payment is required. Enter a valid bKash/Nagad sender mobile number and transaction ID.', 400)
      }
      if (advancePaymentAmount > 0) {
        const destinationSetting = await Setting.findOne({ key: advancePaymentMethod + 'Number' }).session(session).lean()
        if (!String(destinationSetting?.value || '').trim()) throw httpError('The selected advance payment number is not configured. Please contact the store.', 503)
      }

      // Coupon usage, inventory decrement and order creation commit or roll back together.
      if (coupon) {
        const couponFilter = { _id: coupon._id, isActive: true }
        if (coupon.usageLimit !== undefined && coupon.usageLimit !== null) couponFilter.usageCount = { $lt: coupon.usageLimit }
        if (coupon.expiresAt) couponFilter.expiresAt = { $gt: new Date() }
        const reservedCoupon = await Coupon.findOneAndUpdate(couponFilter, { $inc: { usageCount: 1 } }, { new: true, session })
        if (!reservedCoupon) throw httpError('Coupon is no longer available. Please remove it and try again.', 409)
      }

      const [created] = await Order.create([{
        orderNumber, customer: req.user.sub, items: lineItems, subtotal, deliveryCharge, discount,
        total: subtotal - discount + deliveryCharge, couponCode: coupon?.code || '', coupon: coupon?._id || undefined, couponUsageCounted: Boolean(coupon),
        statusHistory: [{ status: 'pending', note: 'Order placed successfully.' }],
        paymentMethod: 'cod', paymentStatus: advancePaymentAmount > 0 ? 'pending' : 'unpaid', advancePaymentAmount,
        advancePaymentMethod: advancePaymentAmount > 0 ? advancePaymentMethod : '',
        advancePaymentSender: advancePaymentAmount > 0 ? advancePaymentSender : '',
        advancePaymentTransactionId: advancePaymentAmount > 0 ? advancePaymentTransactionId : '',
        advancePaymentSubmittedAt: advancePaymentAmount > 0 ? new Date() : undefined, deliveryAddress: address
      }], { session })
      order = created
    })

    return res.status(201).json({
      message: order.advancePaymentAmount > 0
        ? 'Order submitted. Delivery charge payment is awaiting manual verification; remaining product amount is Cash on Delivery.'
        : 'Order placed. Product amount is Cash on Delivery.',
      order
    })
  } catch (error) { next(error) }
  finally { if (session) await session.endSession() }
})

router.patch('/:id/advance-payment-verify', requireRole('super_admin', 'admin'), async (req, res, next) => {
  let session
  try {
    const decision = String(req.body.decision || '')
    if (!['approve', 'reject'].includes(decision)) return res.status(400).json({ message: 'Choose approve or reject.' })
    session = await mongoose.startSession()
    let updatedOrder
    await session.withTransaction(async () => {
      const order = await Order.findById(req.params.id).session(session)
      if (!order) throw httpError('Order not found.', 404)
      if (!order.advancePaymentTransactionId || !order.advancePaymentAmount) throw httpError('This order has no advance delivery payment to verify.', 409)
      if (order.status === 'cancelled') throw httpError('This order has already been cancelled.', 409)
      if (order.paymentStatus === 'paid') throw httpError('Advance payment has already been approved.', 409)
      if (order.paymentStatus !== 'pending') throw httpError('This payment is not awaiting verification.', 409)
      order.paymentStatus = decision === 'approve' ? 'paid' : 'failed'
      order.advancePaymentVerifiedAt = new Date()
      order.advancePaymentVerifiedBy = req.user.sub
      order.advancePaymentNote = String(req.body.note || '').trim().slice(0, 300)
      order.statusHistory = order.statusHistory || []
      if (decision === 'approve') {
        order.status = 'confirmed'
        order.statusHistory.push({ status: 'confirmed', note: 'Delivery charge advance payment manually verified and approved.', createdAt: new Date() })
      } else {
        order.status = 'cancelled'
        order.cancellationReason = 'Advance delivery payment was not verified.'
        order.statusHistory.push({ status: 'cancelled', note: order.cancellationReason, createdAt: new Date() })
        await restockOrderItems(order, session)
        await releaseCouponUsage(order, session)
      }
      await order.save({ session })
      updatedOrder = order
    })
    res.json(updatedOrder)
  } catch (error) { next(error) }
  finally { if (session) await session.endSession() }
})

router.get('/mine', async (req, res, next) => {
  try { res.json(await Order.find({ customer: req.user.sub }).sort({ createdAt: -1 }).lean()) }
  catch (error) { next(error) }
})

router.get('/admin/all', requireRole('super_admin', 'admin', 'support'), async (req, res, next) => {
  try { res.json(await Order.find().populate('customer', 'name email phone').populate('items.product', 'name sku images').sort({ createdAt: -1 }).limit(200).lean()) }
  catch (error) { next(error) }
})

router.patch('/:id/status', requireRole('super_admin', 'admin', 'support', 'editor'), async (req, res, next) => {
  let session
  try {
    const allowed = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: 'Invalid order status' })
    session = await mongoose.startSession()
    let updatedOrder
    await session.withTransaction(async () => {
      const order = await Order.findById(req.params.id).session(session)
      if (!order) throw httpError('Order not found.', 404)
      if (order.paymentStatus === 'pending' && req.body.status !== 'cancelled') throw httpError('Verify the advance delivery payment before confirming or processing this order.', 409)
      if (order.status === 'cancelled' && req.body.status !== 'cancelled') throw httpError('Cancelled orders cannot be reopened; create a new order instead.', 409)
      if (req.body.status === 'cancelled' && order.status !== 'cancelled') {
        if (!['pending', 'confirmed', 'processing'].includes(order.status)) throw httpError('Orders that have shipped or been delivered must use the return workflow.', 409)
        if (order.paymentStatus === 'paid' && Number(order.advancePaymentAmount) > 0) throw httpError('This order has a verified advance payment. Resolve its refund before cancelling.', 409)
        const reason = String(req.body.cancellationReason || '').trim()
        if (reason.length < 5) throw httpError('Please enter a cancellation reason (at least 5 characters) so the customer can see the notice.', 400)
        order.cancellationReason = reason.slice(0, 500)
        await restockOrderItems(order, session)
        await releaseCouponUsage(order, session)
        if (order.paymentStatus === 'pending') {
          order.paymentStatus = 'failed'
          order.advancePaymentVerifiedAt = new Date()
          order.advancePaymentVerifiedBy = req.user.sub
          order.advancePaymentNote = 'Order cancelled before advance payment verification.'
        }
      }
      order.status = req.body.status
      order.statusHistory = order.statusHistory || []
      order.statusHistory.push({
        status: req.body.status,
        note: req.body.status === 'cancelled' ? order.cancellationReason : (req.body.note ? String(req.body.note).slice(0, 300) : 'Order status updated.'),
        createdAt: new Date()
      })
      if (req.body.status === 'delivered' && order.paymentMethod === 'cod') order.paymentStatus = 'paid'
      await order.save({ session })
      updatedOrder = order
    })
    res.json(updatedOrder)
  } catch (error) { next(error) }
  finally { if (session) await session.endSession() }
})

export default router
