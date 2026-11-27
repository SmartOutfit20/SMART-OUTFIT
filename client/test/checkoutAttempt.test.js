import test from 'node:test'
import assert from 'node:assert/strict'
import { getCheckoutAttempt, clearCheckoutAttempt } from '../src/utils/checkoutAttempt.js'

class MemoryStorage {
  values = new Map()
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null }
  setItem(key, value) { this.values.set(key, String(value)) }
  removeItem(key) { this.values.delete(key) }
}

const payload = {
  items: [{ productId: '507f1f77bcf86cd799439012', quantity: 2, size: 'M', color: 'Black' }],
  deliveryAddress: { name: 'Ayesha', phone: '01712345678', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhanmondi', address: 'Road 4, House 12' },
  paymentMethod: 'cod',
  advancePaymentMethod: 'bkash',
  advancePaymentSender: '01712345678',
  advancePaymentTransactionId: 'ABC123',
  couponCode: 'SAVE10'
}

test('reuses the same random key for an unchanged checkout after a retry', async () => {
  const storage = new MemoryStorage()
  const first = await getCheckoutAttempt(payload, storage)
  const retry = await getCheckoutAttempt(payload, storage)
  assert.match(first.key, /^[0-9a-f-]{36}$/i)
  assert.equal(retry.key, first.key)
  assert.equal(retry.reused, true)
})

test('creates a new key when cart, address or payment evidence changes', async () => {
  const storage = new MemoryStorage()
  const first = await getCheckoutAttempt(payload, storage)
  const changed = await getCheckoutAttempt({ ...payload, items: [{ ...payload.items[0], quantity: 1 }] }, storage)
  assert.notEqual(changed.key, first.key)
  assert.equal(changed.reused, false)
})

test('clears only the matching successful checkout attempt', async () => {
  const storage = new MemoryStorage()
  const first = await getCheckoutAttempt(payload, storage)
  const second = await getCheckoutAttempt({ ...payload, couponCode: 'NEW10' }, storage)
  assert.equal(clearCheckoutAttempt(first.key, storage), false)
  assert.equal(clearCheckoutAttempt(second.key, storage), true)
  assert.equal(storage.getItem('so-checkout-attempt-v1'), null)
})

test('stores only a payload fingerprint and random key, not address or transaction details', async () => {
  const storage = new MemoryStorage()
  await getCheckoutAttempt(payload, storage)
  const saved = storage.getItem('so-checkout-attempt-v1')
  assert.equal(saved.includes('Ayesha'), false)
  assert.equal(saved.includes('01712345678'), false)
  assert.equal(saved.includes('ABC123'), false)
  assert.equal(saved.includes('SAVE10'), false)
})

test('fails closed when secure browser storage or cryptography is unavailable', async () => {
  await assert.rejects(() => getCheckoutAttempt(payload, null), /storage is unavailable/)
  await assert.rejects(() => getCheckoutAttempt(payload, new MemoryStorage(), {}), /protection is unavailable/)
})
