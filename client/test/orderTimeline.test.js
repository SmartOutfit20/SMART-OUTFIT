import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ORDER_STATUS_LABELS,
  ORDER_HISTORY_LABELS,
  RETURN_REQUEST_STATUS_LABELS,
  getSortedOrderHistory,
  getSortedReturnRequests,
  getSortedRefunds,
  getRefundTotal
} from '../src/utils/orderTimeline.js'

test('keeps event-only return requests out of the order status filter', () => {
  assert.equal(ORDER_STATUS_LABELS.return_requested, undefined)
  assert.equal(ORDER_HISTORY_LABELS.return_requested, 'Return requested · রিটার্ন অনুরোধ')
  assert.equal(ORDER_STATUS_LABELS.partially_returned, 'Partially returned')
})

test('orders tracking events chronologically without mutating the API response', () => {
  const first = { status: 'pending', createdAt: '2026-11-01T09:00:00Z' }
  const second = { status: 'return_requested', createdAt: '2026-11-03T09:00:00Z' }
  const source = [second, first]
  assert.deepEqual(getSortedOrderHistory({ statusHistory: source }), [first, second])
  assert.deepEqual(source, [second, first])
})

test('orders return requests from oldest to newest and labels every decision', () => {
  const earlier = { status: 'rejected', requestedAt: '2026-11-01T09:00:00Z' }
  const later = { status: 'received', requestedAt: '2026-11-02T09:00:00Z' }
  assert.deepEqual(getSortedReturnRequests({ returnRequests: [later, earlier] }), [earlier, later])
  assert.equal(RETURN_REQUEST_STATUS_LABELS.requested, 'Under review · পর্যালোচনাধীন')
  assert.equal(RETURN_REQUEST_STATUS_LABELS.approved, 'Approved · অনুমোদিত')
  assert.equal(RETURN_REQUEST_STATUS_LABELS.rejected, 'Not approved · অনুমোদিত হয়নি')
  assert.equal(RETURN_REQUEST_STATUS_LABELS.received, 'Items received · পণ্য গ্রহণ করা হয়েছে')
})

test('shows refund ledger entries newest first', () => {
  const older = { reference: 'RF-OLD', processedAt: '2026-11-01T09:00:00Z' }
  const newer = { reference: 'RF-NEW', processedAt: '2026-11-02T09:00:00Z' }
  assert.deepEqual(getSortedRefunds({ refunds: [older, newer] }), [newer, older])
})

test('totals only finite positive refund amounts and rounds to paisa', () => {
  assert.equal(getRefundTotal([{ amount: 100 }, { amount: '20.555' }, { amount: -5 }, { amount: 'bad' }, null]), 120.56)
  assert.equal(getRefundTotal(undefined), 0)
})
