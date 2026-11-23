import test from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { randomUUID } from 'node:crypto'
import { Order } from '../src/models/index.js'
import {
  normalizeReturnItems,
  buildReturnRequestCompareAndSetFilter,
  buildReturnRequestUpdate
} from '../src/services/returnRules.js'

const mongoUri = process.env.MONGODB_TEST_URI

test('MongoDB allows only one concurrent return reservation from the same partial-return snapshot', {
  skip: !mongoUri && 'Set MONGODB_TEST_URI to run the replica-set integration test.'
}, async () => {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 })
  let orderId

  try {
    const customerId = new mongoose.Types.ObjectId()
    const order = await Order.create({
      orderNumber: 'TEST-RETURN-CAS-' + randomUUID(),
      customer: customerId,
      status: 'partially_returned',
      paymentStatus: 'paid',
      subtotal: 2000,
      total: 2000,
      items: [{
        name: 'Integration test shirt',
        sku: 'TEST-SHIRT',
        quantity: 2,
        unitPrice: 1000,
        size: 'M',
        color: 'Black'
      }],
      returnRequestRevision: 1,
      returnRequests: [{
        reason: 'Prior partial return received.',
        items: [{ orderItemIndex: 0, name: 'Integration test shirt', quantity: 1, unitPrice: 1000, size: 'M', color: 'Black' }],
        status: 'received',
        requestedAt: new Date('2026-11-20T00:00:00.000Z'),
        reviewedAt: new Date('2026-11-21T00:00:00.000Z')
      }],
      statusHistory: [{ status: 'delivered', note: 'Integration fixture', createdAt: new Date('2026-11-20T00:00:00.000Z') }]
    })
    orderId = order._id

    // Simulate two browser tabs loading the same remaining quantity before either submits.
    const [firstSnapshot, secondSnapshot] = await Promise.all([
      Order.findById(orderId),
      Order.findById(orderId)
    ])
    const firstItems = normalizeReturnItems([{ orderItemIndex: 0, quantity: 1 }], firstSnapshot)
    const secondItems = normalizeReturnItems([{ orderItemIndex: 0, quantity: 1 }], secondSnapshot)
    assert.equal(firstItems[0].quantity, 1)
    assert.equal(secondItems[0].quantity, 1)

    const now = new Date()
    const submissions = await Promise.all([
      Order.findOneAndUpdate(
        buildReturnRequestCompareAndSetFilter(firstSnapshot, customerId),
        buildReturnRequestUpdate({ reason: 'The first tab requests the remaining item.', items: firstItems, requestedQuantity: 1, now }),
        { new: true, runValidators: true }
      ).lean(),
      Order.findOneAndUpdate(
        buildReturnRequestCompareAndSetFilter(secondSnapshot, customerId),
        buildReturnRequestUpdate({ reason: 'The second tab requests the same item.', items: secondItems, requestedQuantity: 1, now }),
        { new: true, runValidators: true }
      ).lean()
    ])

    assert.equal(submissions.filter(Boolean).length, 1, 'exactly one stale submission must win')
    assert.equal(submissions.filter(value => value === null).length, 1, 'the other submission must receive a compare-and-set miss')

    const saved = await Order.findById(orderId).lean()
    assert.equal(saved.returnRequestRevision, 2)
    assert.equal(saved.returnRequests.filter(request => request.status === 'requested').length, 1)
    const reservedQuantity = saved.returnRequests
      .filter(request => ['requested', 'approved', 'received'].includes(request.status))
      .flatMap(request => request.items || [])
      .filter(item => item.orderItemIndex === 0)
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    assert.equal(reservedQuantity, 2, 'received plus pending quantities must not exceed the two purchased units')
  } finally {
    if (orderId) await Order.deleteOne({ _id: orderId })
    await mongoose.disconnect()
  }
})
