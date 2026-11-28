import test from 'node:test'
import assert from 'node:assert/strict'
import { getPaymentStatusLabel } from '../src/utils/paymentStatus.js'

test('labels a verified advance payment while the COD balance is still due', () => {
  assert.equal(getPaymentStatusLabel({
    paymentStatus: 'partially_paid', paymentMethod: 'cod', advancePaymentAmount: 120, status: 'shipped'
  }), 'Advance verified · COD balance due')
})

test('explains legacy orders marked paid before COD delivery', () => {
  assert.equal(getPaymentStatusLabel({
    paymentStatus: 'paid', paymentMethod: 'cod', advancePaymentAmount: 120, status: 'processing'
  }), 'Advance verified · COD balance due')
})

test('shows a delivered COD order as fully paid', () => {
  assert.equal(getPaymentStatusLabel({
    paymentStatus: 'paid', paymentMethod: 'cod', advancePaymentAmount: 120, status: 'delivered'
  }), 'Paid')
})

test('uses explicit labels for unpaid, pending, rejected and refunded states', () => {
  assert.equal(getPaymentStatusLabel('unpaid'), 'Unpaid · Cash on Delivery')
  assert.equal(getPaymentStatusLabel('pending'), 'Advance payment awaiting verification')
  assert.equal(getPaymentStatusLabel('failed'), 'Advance payment rejected')
  assert.equal(getPaymentStatusLabel('partially_refunded'), 'Partially refunded')
  assert.equal(getPaymentStatusLabel('refunded'), 'Refunded')
})
