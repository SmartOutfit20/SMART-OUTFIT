import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeReturnRequest,
  normalizeReturnItems,
  normalizeReturnRestockIndexes,
  calculateReturnProgress,
  normalizeReturnReview,
  assessReturnEligibility,
  buildReturnReviewCompareAndSetFilter,
  buildReturnReviewUpdate,
  isGenericOrderStatusAllowed
} from '../src/services/returnRules.js'

const now = new Date('2026-11-18T03:00:00.000Z')
const deliveredOrder = (overrides = {}) => ({
  status: 'delivered',
  paymentStatus: 'paid',
  items: [
    { product: '507f1f77bcf86cd799439011', name: 'Classic Shirt', sku: 'SH-1', quantity: 2, unitPrice: 1000, size: 'M', color: 'Black' },
    { product: '507f1f77bcf86cd799439012', name: 'Everyday Trousers', sku: 'TR-1', quantity: 1, unitPrice: 1200, size: '32', color: 'Navy' }
  ],
  statusHistory: [{ status: 'delivered', createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) }],
  returnRequests: [],
  ...overrides
})

test('normalizes customer return reasons and removes markup/control characters', () => {
  assert.deepEqual(normalizeReturnRequest({ reason: '  <b>Wrong size</b> — it does not fit.  ' }), { reason: 'Wrong size — it does not fit.' })
})
test('rejects missing, too-short and overlong return reasons', () => {
  assert.throws(() => normalizeReturnRequest({ reason: 'Too short' }), /at least 10 characters/)
  assert.throws(() => normalizeReturnRequest({ reason: 'x'.repeat(1001) }), /1,000 characters or fewer/)
})
test('normalizes only selected order lines and snapshots their purchased variant and price', () => {
  assert.deepEqual(normalizeReturnItems([{ orderItemIndex: 0, quantity: 1 }], deliveredOrder()), [{
    orderItemIndex: 0, product: '507f1f77bcf86cd799439011', name: 'Classic Shirt', sku: 'SH-1',
    quantity: 1, size: 'M', color: 'Black', unitPrice: 1000
  }])
})
test('rejects empty, invalid, duplicate and excessive return item selections', () => {
  const order = deliveredOrder()
  assert.throws(() => normalizeReturnItems([], order), /Select at least one item/)
  assert.throws(() => normalizeReturnItems([{ orderItemIndex: 9, quantity: 1 }], order), /valid ordered item/)
  assert.throws(() => normalizeReturnItems([{ orderItemIndex: 0, quantity: 1 }, { orderItemIndex: 0, quantity: 1 }], order), /only once/)
  assert.throws(() => normalizeReturnItems([{ orderItemIndex: 0, quantity: 3 }], order), /exceeds the remaining quantity/)
})
test('previous active and received requests reserve only their selected quantities', () => {
  const order = deliveredOrder({ returnRequests: [
    { status: 'received', items: [{ orderItemIndex: 0, quantity: 1 }] },
    { status: 'rejected', items: [{ orderItemIndex: 1, quantity: 1 }] }
  ] })
  assert.deepEqual(normalizeReturnItems([{ orderItemIndex: 0, quantity: 1 }, { orderItemIndex: 1, quantity: 1 }], order).map(item => item.orderItemIndex), [0, 1])
  assert.throws(() => normalizeReturnItems([{ orderItemIndex: 0, quantity: 2 }], order), /exceeds the remaining quantity/)
})
test('legacy active return requests without line details reserve the whole order', () => {
  const order = deliveredOrder({ returnRequests: [{ status: 'approved', reason: 'Legacy request' }] })
  assert.throws(() => normalizeReturnItems([{ orderItemIndex: 0, quantity: 1 }], order), /exceeds the remaining quantity/)
})
test('allows a paid delivered order within the seven-day return window', () => {
  const result = assessReturnEligibility(deliveredOrder(), now)
  assert.equal(result.returnWindowDays, 7)
  assert.equal(result.expiresAt.getTime(), now.getTime() + 5 * 24 * 60 * 60 * 1000)
})
test('rejects orders that are not delivered or do not have verified payment', () => {
  assert.throws(() => assessReturnEligibility(deliveredOrder({ status: 'shipped' }), now), /Only delivered orders/)
  assert.throws(() => assessReturnEligibility(deliveredOrder({ paymentStatus: 'unpaid' }), now), /verified payment/)
})
test('rejects a return when the delivered timestamp is missing or the window expires', () => {
  assert.throws(() => assessReturnEligibility(deliveredOrder({ statusHistory: [] }), now), /delivery date is missing/)
  const expired = deliveredOrder({ statusHistory: [{ status: 'delivered', createdAt: new Date(now.getTime() - 8 * 86400000) }] })
  assert.throws(() => assessReturnEligibility(expired, now), /window has expired/)
})
test('prevents concurrent active requests but allows another request after a partial receipt', () => {
  assert.throws(() => assessReturnEligibility(deliveredOrder({ returnRequests: [{ status: 'approved' }] }), now), /awaiting store review/)
  const partial = deliveredOrder({ status: 'partially_returned', returnRequests: [{ status: 'received', items: [{ orderItemIndex: 0, quantity: 1 }] }] })
  assert.doesNotThrow(() => assessReturnEligibility(partial, now))
})
test('calculates whether received quantities complete the whole order return', () => {
  const order = deliveredOrder({ returnRequests: [{ status: 'received', items: [{ orderItemIndex: 0, quantity: 1 }] }] })
  assert.deepEqual(calculateReturnProgress(order), { orderedQuantity: 3, returnedQuantity: 1, allReturned: false })
  order.returnRequests[0].items.push({ orderItemIndex: 0, quantity: 1 }, { orderItemIndex: 1, quantity: 1 })
  assert.deepEqual(calculateReturnProgress(order), { orderedQuantity: 3, returnedQuantity: 3, allReturned: true })
})
test('validates restock choices against only the items in the approved request', () => {
  const items = [{ orderItemIndex: 0, quantity: 1 }, { orderItemIndex: 2, quantity: 1 }]
  assert.deepEqual(normalizeReturnRestockIndexes([2], items), [2])
  assert.throws(() => normalizeReturnRestockIndexes([1], items), /does not match/)
})
test('normalizes return review decisions and customer-visible notes', () => {
  assert.deepEqual(normalizeReturnReview({ status: 'approved', note: '  inspected\ncarefully  ' }), { status: 'approved', note: 'inspected carefully' })
  assert.deepEqual(normalizeReturnReview({ status: 'received', note: '' }), { status: 'received', note: '' })
})
test('requires a useful rejection reason and rejects unsupported review decisions', () => {
  assert.throws(() => normalizeReturnReview({ status: 'rejected', note: 'no' }), /at least 5 characters/)
  assert.throws(() => normalizeReturnReview({ status: 'deleted', note: 'not allowed' }), /Choose approve, reject or mark received/)
  assert.throws(() => normalizeReturnReview({ status: 'approved', note: 'x'.repeat(501) }), /500 characters or fewer/)
})
test('builds compare-and-set filters for only pending approve/reject requests', () => {
  assert.deepEqual(buildReturnReviewCompareAndSetFilter('order-1', 'request-1', 'approved'), {
    _id: 'order-1', returnRequests: { $elemMatch: { _id: 'request-1', status: 'requested' } }
  })
  assert.deepEqual(buildReturnReviewCompareAndSetFilter('order-1', 'request-1', 'rejected'), {
    _id: 'order-1', returnRequests: { $elemMatch: { _id: 'request-1', status: 'requested' } }
  })
})
test('received compare-and-set accepts only delivered or partially returned parent orders', () => {
  assert.deepEqual(buildReturnReviewCompareAndSetFilter('order-1', 'request-1', 'received'), {
    _id: 'order-1',
    returnRequests: { $elemMatch: { _id: 'request-1', status: 'approved' } },
    status: { $in: ['delivered', 'partially_returned'] }
  })
})
test('builds an atomic received update with the calculated parent status', () => {
  const update = buildReturnReviewUpdate({ status: 'received', note: 'Checked at warehouse', reviewerId: 'staff-1', now, orderStatus: 'partially_returned' })
  assert.deepEqual(update, {
    $set: {
      'returnRequests.$.status': 'received',
      'returnRequests.$.reviewedAt': now,
      'returnRequests.$.reviewedBy': 'staff-1',
      'returnRequests.$.adminNote': 'Checked at warehouse',
      status: 'partially_returned'
    },
    $push: { statusHistory: { status: 'partially_returned', note: 'Returned item(s) received and checked by the store.', createdAt: now } }
  })
})
test('generic order updates cannot bypass the return receipt workflow', () => {
  for (const status of ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled']) assert.equal(isGenericOrderStatusAllowed(status), true)
  for (const status of ['pending', 'partially_returned', 'returned', 'unknown']) assert.equal(isGenericOrderStatusAllowed(status), false)
})
