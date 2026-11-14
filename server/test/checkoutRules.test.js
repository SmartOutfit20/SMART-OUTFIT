import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeDeliveryAddress,
  isValidBangladeshPhone,
  deliveryAddressError,
  normalizeRequestedItems,
  calculateCouponDiscount,
  calculateDeliveryCharge
} from '../src/services/checkoutRules.js'

const validId = '507f1f77bcf86cd799439011'

test('accepts Bangladesh mobile numbers in local 01XXXXXXXXX format only', () => {
  assert.equal(isValidBangladeshPhone('01712345678'), true)
  assert.equal(isValidBangladeshPhone('01912345678'), true)
  assert.equal(isValidBangladeshPhone('+8801712345678'), false)
  assert.equal(isValidBangladeshPhone('02123456789'), false)
})

test('normalizes and validates a complete Bangladesh delivery address', () => {
  const address = normalizeDeliveryAddress({ name: '  Ayesha  ', phone: '01712345678', division: ' Dhaka ', district: ' Dhaka ', upazila: ' Dhanmondi ', address: ' Road 4, House 12 ' })
  assert.deepEqual(address, { name: 'Ayesha', phone: '01712345678', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhanmondi', address: 'Road 4, House 12' })
  assert.equal(deliveryAddressError(address), '')
  assert.match(deliveryAddressError({ ...address, phone: '123' }), /valid Bangladesh phone/)
})

test('merges duplicate product variants and blocks quantities above the per-variant limit', () => {
  const items = normalizeRequestedItems([
    { productId: validId, quantity: 2, size: 'M', color: 'Black' },
    { productId: validId.toUpperCase(), quantity: 3, size: 'm', color: 'black' }
  ])
  assert.equal(items.length, 1)
  assert.equal(items[0].quantity, 5)
  assert.throws(() => normalizeRequestedItems([{ productId: validId, quantity: 21 }]), /Invalid cart item/)
  assert.throws(() => normalizeRequestedItems([{ productId: validId, quantity: 11 }, { productId: validId, quantity: 10 }]), /cannot exceed 20/)
  assert.throws(() => normalizeRequestedItems([{ productId: 'bad-id', quantity: 1 }]), /Invalid cart item/)
})

test('calculates fixed and percentage coupon discounts without exceeding subtotal', () => {
  assert.equal(calculateCouponDiscount(1000, { type: 'percentage', value: 15 }), 150)
  assert.equal(calculateCouponDiscount(999, { type: 'percentage', value: 15 }), 149)
  assert.equal(calculateCouponDiscount(500, { type: 'fixed', value: 800 }), 500)
  assert.equal(calculateCouponDiscount(500, { type: 'percentage', value: 150 }), 500)
  assert.equal(calculateCouponDiscount(500, { type: 'unknown', value: 10 }), 0)
})

test('applies the configured free-shipping threshold and validates delivery settings', () => {
  assert.equal(calculateDeliveryCharge(2999, 100, 3000), 100)
  assert.equal(calculateDeliveryCharge(3000, 100, 3000), 0)
  assert.equal(calculateDeliveryCharge(500, 80, 0), 80)
  assert.throws(() => calculateDeliveryCharge(500, -1, 3000), /settings are invalid/)
})
