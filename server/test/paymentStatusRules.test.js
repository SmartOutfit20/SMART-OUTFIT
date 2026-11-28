import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getAdvancePaymentApprovalStatus,
  hasVerifiedAdvancePayment,
  getPaymentStatusAfterDelivery
} from '../src/services/paymentStatusRules.js'

test('verified advance delivery charge is recorded as partially paid, not fully paid', () => {
  assert.equal(getAdvancePaymentApprovalStatus('approve'), 'partially_paid')
  assert.equal(getAdvancePaymentApprovalStatus('reject'), 'failed')
})

test('advance payment decision rejects unsupported actions', () => {
  assert.throws(() => getAdvancePaymentApprovalStatus('settle'), error => error.status === 400)
})

test('partially paid and legacy paid orders with an advance amount count as verified', () => {
  assert.equal(hasVerifiedAdvancePayment({ advancePaymentAmount: 120, paymentStatus: 'partially_paid' }), true)
  assert.equal(hasVerifiedAdvancePayment({ advancePaymentAmount: 120, paymentStatus: 'paid' }), true)
})

test('unpaid, pending or zero-advance orders are not treated as verified advance payments', () => {
  assert.equal(hasVerifiedAdvancePayment({ advancePaymentAmount: 120, paymentStatus: 'pending' }), false)
  assert.equal(hasVerifiedAdvancePayment({ advancePaymentAmount: 0, paymentStatus: 'paid' }), false)
  assert.equal(hasVerifiedAdvancePayment({ advancePaymentAmount: 120, paymentStatus: 'failed' }), false)
})

test('COD delivery settles both the remaining balance after an advance and ordinary COD', () => {
  assert.equal(getPaymentStatusAfterDelivery({ paymentMethod: 'cod', paymentStatus: 'partially_paid' }), 'paid')
  assert.equal(getPaymentStatusAfterDelivery({ paymentMethod: 'cod', paymentStatus: 'unpaid' }), 'paid')
})

test('delivery does not rewrite non-COD payment states or already settled refunds', () => {
  assert.equal(getPaymentStatusAfterDelivery({ paymentMethod: 'bkash', paymentStatus: 'partially_paid' }), 'partially_paid')
  assert.equal(getPaymentStatusAfterDelivery({ paymentMethod: 'cod', paymentStatus: 'paid' }), 'paid')
  assert.equal(getPaymentStatusAfterDelivery({ paymentMethod: 'cod', paymentStatus: 'partially_refunded' }), 'partially_refunded')
})

test('verified advance payments are not made cancellable by their partial status', () => {
  assert.equal(hasVerifiedAdvancePayment({ advancePaymentAmount: 150, paymentStatus: 'partially_paid' }), true)
})
