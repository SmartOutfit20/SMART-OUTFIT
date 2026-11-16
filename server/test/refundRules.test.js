import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateRefundPlan, buildRefundCompareAndSetFilter } from '../src/services/refundRules.js'

const baseOrder = {
  _id: '507f1f77bcf86cd799439011',
  status: 'returned',
  paymentStatus: 'paid',
  total: 2400,
  advancePaymentAmount: 600,
  refundAmount: 0
}

test('refunds are capped at the verified amount received, including advance payments', () => {
  assert.deepEqual(calculateRefundPlan(baseOrder, 250), {
    paidAmount: 600,
    refundedSoFar: 0,
    nextRefundAmount: 250,
    paymentStatus: 'partially_refunded'
  })
  assert.throws(() => calculateRefundPlan(baseOrder, 601), /exceeds the verified amount/)
})

test('full and final refunds mark the order refunded', () => {
  const order = { ...baseOrder, refundAmount: 250, paymentStatus: 'partially_refunded' }
  assert.deepEqual(calculateRefundPlan(order, 350), {
    paidAmount: 600,
    refundedSoFar: 250,
    nextRefundAmount: 600,
    paymentStatus: 'refunded'
  })
})

test('COD orders use the verified delivered order total as the refund ceiling', () => {
  const codOrder = { ...baseOrder, paymentMethod: 'cod', paymentStatus: 'paid', advancePaymentAmount: 0 }
  assert.equal(calculateRefundPlan(codOrder, 2400).paymentStatus, 'refunded')
})

test('refund planning rejects unpaid, non-returned and invalid orders', () => {
  assert.throws(() => calculateRefundPlan({ ...baseOrder, paymentStatus: 'unpaid' }, 100), /no verified payment/)
  assert.throws(() => calculateRefundPlan({ ...baseOrder, status: 'shipped' }, 100), /Returned order not found/)
  assert.throws(() => calculateRefundPlan(baseOrder, 0), /valid refund amount/)
})

test('compare-and-set filter only accepts the exact previous refund total and unused reference', () => {
  const filter = buildRefundCompareAndSetFilter({ ...baseOrder, refundAmount: 125 }, 'RF-12345')
  assert.equal(filter.status, 'returned')
  assert.deepEqual(filter.paymentStatus, { $in: ['paid', 'partially_refunded'] })
  assert.deepEqual(filter.$and, [
    { refundAmount: 125 },
    { 'refunds.reference': { $ne: 'RF-12345' } }
  ])
})

test('zero-refund compare-and-set also supports legacy orders with no refundAmount field', () => {
  const filter = buildRefundCompareAndSetFilter(baseOrder, 'RF-NEW')
  assert.deepEqual(filter.$and[0], { $or: [{ refundAmount: 0 }, { refundAmount: { $exists: false } }] })
})
