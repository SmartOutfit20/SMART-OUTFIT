import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateRefundPlan, buildRefundCompareAndSetFilter, getReturnRefundableAmount } from '../src/services/refundRules.js'

const baseOrder = {
  _id: '507f1f77bcf86cd799439011',
  status: 'partially_returned',
  paymentStatus: 'paid',
  total: 2400,
  subtotal: 2000,
  discount: 100,
  deliveryCharge: 400,
  refundAmount: 0,
  items: [{ quantity: 2, unitPrice: 1000 }],
  returnRequests: [{ status: 'received', items: [{ orderItemIndex: 0, quantity: 1, unitPrice: 1000 }] }]
}

test('partial return refunds are capped at the returned item value after proportional discount', () => {
  assert.equal(getReturnRefundableAmount(baseOrder), 950)
  assert.deepEqual(calculateRefundPlan(baseOrder, 250), {
    paidAmount: 2400, refundableAmount: 950, refundedSoFar: 0,
    nextRefundAmount: 250, paymentStatus: 'partially_refunded'
  })
  assert.throws(() => calculateRefundPlan(baseOrder, 951), /exceeds the net item value/)
})

test('a fully received order return can be fully refunded without refunding delivery charge', () => {
  const order = { ...baseOrder, status: 'returned', returnRequests: [{ status: 'received', items: [{ orderItemIndex: 0, quantity: 2, unitPrice: 1000 }] }] }
  assert.equal(getReturnRefundableAmount(order), 1900)
  assert.equal(calculateRefundPlan(order, 1900).paymentStatus, 'refunded')
})

test('refund planning rejects unpaid, non-returned and invalid orders', () => {
  assert.throws(() => calculateRefundPlan({ ...baseOrder, paymentStatus: 'unpaid' }, 100), /no verified payment/)
  assert.throws(() => calculateRefundPlan({ ...baseOrder, status: 'shipped' }, 100), /only after the store receives/)
  assert.throws(() => calculateRefundPlan(baseOrder, 0), /valid refund amount/)
})

test('compare-and-set permits only partially or fully returned orders and the exact prior refund total', () => {
  const filter = buildRefundCompareAndSetFilter({ ...baseOrder, refundAmount: 125 }, 'RF-12345')
  assert.deepEqual(filter.status, { $in: ['partially_returned', 'returned'] })
  assert.deepEqual(filter.paymentStatus, { $in: ['paid', 'partially_refunded'] })
  assert.deepEqual(filter.$and, [{ refundAmount: 125 }, { 'refunds.reference': { $ne: 'RF-12345' } }])
})

test('zero-refund compare-and-set supports legacy orders without a refundAmount field', () => {
  const filter = buildRefundCompareAndSetFilter(baseOrder, 'RF-NEW')
  assert.deepEqual(filter.$and[0], { $or: [{ refundAmount: 0 }, { refundAmount: { $exists: false } }] })
})
