import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeReturnRequest,
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
test('allows a paid delivered order within the seven-day return window', () => {
  const result = assessReturnEligibility(deliveredOrder(), now)
  assert.equal(result.returnWindowDays, 7)
  assert.equal(result.expiresAt.getTime(), now.getTime() + 5 * 24 * 60 * 60 * 1000)
})
test('rejects orders that are not delivered or do not have verified payment', () => {
  assert.throws(() => assessReturnEligibility(deliveredOrder({ status: 'shipped' }), now), /Only delivered orders/)
  assert.throws(() => assessReturnEligibility(deliveredOrder({ paymentStatus: 'unpaid' }), now), /verified payment/)
})
test('rejects a return when the delivered timestamp is missing', () => {
  assert.throws(() => assessReturnEligibility(deliveredOrder({ statusHistory: [] }), now), /delivery date is missing/)
})
test('rejects a request after the return window expires', () => {
  const order = deliveredOrder({ statusHistory: [{ status: 'delivered', createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000) }] })
  assert.throws(() => assessReturnEligibility(order, now), /window has expired/)
})
test('prevents duplicate active requests but permits a new request after rejection', () => {
  assert.throws(() => assessReturnEligibility(deliveredOrder({ returnRequests: [{ status: 'approved' }] }), now), /already active/)
  assert.doesNotThrow(() => assessReturnEligibility(deliveredOrder({ returnRequests: [{ status: 'rejected' }] }), now))
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
    _id: 'order-1',
    returnRequests: { $elemMatch: { _id: 'request-1', status: 'requested' } }
  })
  assert.deepEqual(buildReturnReviewCompareAndSetFilter('order-1', 'request-1', 'rejected'), {
    _id: 'order-1',
    returnRequests: { $elemMatch: { _id: 'request-1', status: 'requested' } }
  })
})
test('received compare-and-set also requires the parent order to remain delivered', () => {
  assert.deepEqual(buildReturnReviewCompareAndSetFilter('order-1', 'request-1', 'received'), {
    _id: 'order-1',
    returnRequests: { $elemMatch: { _id: 'request-1', status: 'approved' } },
    status: 'delivered'
  })
})
test('builds an atomic received update that closes the return and appends order history', () => {
  const update = buildReturnReviewUpdate({ status: 'received', note: 'Checked at warehouse', reviewerId: 'staff-1', now })
  assert.deepEqual(update, {
    $set: {
      'returnRequests.$.status': 'received',
      'returnRequests.$.reviewedAt': now,
      'returnRequests.$.reviewedBy': 'staff-1',
      'returnRequests.$.adminNote': 'Checked at warehouse',
      status: 'returned'
    },
    $push: {
      statusHistory: {
        status: 'returned',
        note: 'Returned item(s) received and checked by the store.',
        createdAt: now
      }
    }
  })
})
test('builds a review update without changing order status for approve/reject', () => {
  const update = buildReturnReviewUpdate({ status: 'rejected', note: 'Outside return policy', reviewerId: 'staff-1', now })
  assert.deepEqual(update, { $set: {
    'returnRequests.$.status': 'rejected',
    'returnRequests.$.reviewedAt': now,
    'returnRequests.$.reviewedBy': 'staff-1',
    'returnRequests.$.adminNote': 'Outside return policy'
  } })
})


test('generic order updates cannot bypass the approved return receipt workflow', () => {
  for (const status of ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled']) {
    assert.equal(isGenericOrderStatusAllowed(status), true)
  }
  assert.equal(isGenericOrderStatusAllowed('returned'), false)
  assert.equal(isGenericOrderStatusAllowed('pending'), false)
  assert.equal(isGenericOrderStatusAllowed('unknown'), false)
})
