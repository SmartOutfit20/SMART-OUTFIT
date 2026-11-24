import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeReviewInput, hasReviewablePurchase, buildReviewEligibility } from '../src/services/reviewRules.js'

const productId = '64a000000000000000000001'
const deliveredOrder = (overrides = {}) => ({
  status: 'delivered',
  paymentStatus: 'paid',
  items: [{ product: productId, quantity: 2 }],
  returnRequests: [],
  ...overrides
})

test('normalizes a valid star rating and trims the customer comment', () => {
  assert.deepEqual(normalizeReviewInput({ rating: '5', comment: '  Great fit and quality.  ' }), {
    rating: 5,
    comment: 'Great fit and quality.'
  })
})

test('rejects fractional, out-of-range and non-numeric ratings', () => {
  for (const rating of [0, 6, 2.5, 'stars', null]) {
    assert.throws(() => normalizeReviewInput({ rating, comment: 'Useful product review' }), { status: 400 })
  }
})

test('requires a trimmed comment between 10 and 1,000 characters', () => {
  assert.throws(() => normalizeReviewInput({ rating: 4, comment: ' short ' }), { status: 400 })
  assert.throws(() => normalizeReviewInput({ rating: 4, comment: 'x'.repeat(1001) }), { status: 400 })
  assert.equal(normalizeReviewInput({ rating: 4, comment: '  Comfortable fabric  ' }).comment, 'Comfortable fabric')
})

test('allows a paid delivered purchase of the reviewed product', () => {
  assert.equal(hasReviewablePurchase([deliveredOrder()], productId), true)
})

test('rejects unpaid or not-yet-delivered orders', () => {
  assert.equal(hasReviewablePurchase([deliveredOrder({ paymentStatus: 'pending' })], productId), false)
  assert.equal(hasReviewablePurchase([deliveredOrder({ status: 'processing' })], productId), false)
})

test('does not allow a review for a different product', () => {
  assert.equal(hasReviewablePurchase([deliveredOrder()], '64a000000000000000000002'), false)
})

test('allows a retained quantity after a partial return', () => {
  const order = deliveredOrder({
    status: 'partially_returned',
    returnRequests: [{ status: 'received', items: [{ orderItemIndex: 0, quantity: 1 }] }]
  })
  assert.equal(hasReviewablePurchase([order], productId), true)
})

test('blocks review while all units are requested, approved or received for return', () => {
  for (const status of ['requested', 'approved', 'received']) {
    const order = deliveredOrder({
      status: status === 'received' ? 'returned' : 'delivered',
      returnRequests: [{ status, items: [{ orderItemIndex: 0, quantity: 2 }] }]
    })
    assert.equal(hasReviewablePurchase([order], productId), false)
  }
})

test('does not reserve quantity for a rejected return', () => {
  const order = deliveredOrder({ returnRequests: [{ status: 'rejected', items: [{ orderItemIndex: 0, quantity: 2 }] }] })
  assert.equal(hasReviewablePurchase([order], productId), true)
})

test('marks an existing review as ineligible', () => {
  assert.deepEqual(buildReviewEligibility({ orders: [deliveredOrder()], productId, alreadyReviewed: true }), {
    eligible: false,
    alreadyReviewed: true
  })
})
