import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeCheckoutIdempotencyKey,
  createCheckoutFingerprint,
  createCheckoutOrderId
} from '../src/services/checkoutIdempotency.js'

const customer = '507f1f77bcf86cd799439011'
const address = { name: 'Ayesha', phone: '01712345678', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhanmondi', address: 'Road 4, House 12' }
const items = [
  { productId: '507f1f77bcf86cd799439012', quantity: 2, size: 'M', color: 'Black' },
  { productId: '507f1f77bcf86cd799439013', quantity: 1, size: 'L', color: 'Navy' }
]

test('accepts bounded opaque checkout idempotency keys', () => {
  assert.equal(normalizeCheckoutIdempotencyKey('checkout:attempt-123'), 'checkout:attempt-123')
  assert.equal(normalizeCheckoutIdempotencyKey('12345678'), '12345678')
})

test('rejects missing, short, oversized and unsafe idempotency keys', () => {
  for (const value of ['', undefined, 'short', 'has spaces', 'x'.repeat(129), 'bad/key']) {
    assert.throws(() => normalizeCheckoutIdempotencyKey(value), error => error.status === 400)
  }
})

test('fingerprints are stable when cart line order and case differ', () => {
  const first = createCheckoutFingerprint({ items, deliveryAddress: address, couponCode: 'save10' })
  const reordered = createCheckoutFingerprint({
    items: [items[1], { ...items[0], size: 'm', color: 'black', productId: items[0].productId.toUpperCase() }],
    deliveryAddress: { ...address, name: ' Ayesha ' },
    couponCode: 'SAVE10'
  })
  assert.equal(first, reordered)
  assert.match(first, /^[a-f0-9]{64}$/)
})

test('fingerprints change when quantity, selected variant or delivery details change', () => {
  const baseline = createCheckoutFingerprint({ items, deliveryAddress: address })
  assert.notEqual(createCheckoutFingerprint({ items: [{ ...items[0], quantity: 3 }, items[1]], deliveryAddress: address }), baseline)
  assert.notEqual(createCheckoutFingerprint({ items: [{ ...items[0], color: 'White' }, items[1]], deliveryAddress: address }), baseline)
  assert.notEqual(createCheckoutFingerprint({ items, deliveryAddress: { ...address, upazila: 'Uttara' } }), baseline)
})

test('fingerprints include advance payment evidence and coupon selection', () => {
  const baseline = createCheckoutFingerprint({ items, deliveryAddress: address })
  assert.notEqual(createCheckoutFingerprint({ items, deliveryAddress: address, advancePaymentMethod: 'bkash', advancePaymentSender: '01712345678', advancePaymentTransactionId: 'ABC123' }), baseline)
  assert.notEqual(createCheckoutFingerprint({ items, deliveryAddress: address, couponCode: 'SAVE10' }), baseline)
})

test('deterministic order IDs are valid, repeatable and customer-scoped', () => {
  const key = 'checkout:attempt-123'
  const id = createCheckoutOrderId(customer, key)
  assert.match(id, /^[a-f0-9]{24}$/)
  assert.equal(createCheckoutOrderId(customer, key), id)
  assert.notEqual(createCheckoutOrderId('507f1f77bcf86cd799439014', key), id)
  assert.notEqual(createCheckoutOrderId(customer, 'checkout:attempt-124'), id)
})
