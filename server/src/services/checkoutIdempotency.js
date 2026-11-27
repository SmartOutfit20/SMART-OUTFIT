import { createHash } from 'node:crypto'

const KEY_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/

function text(value) {
  return String(value ?? '').trim()
}

export function normalizeCheckoutIdempotencyKey(value) {
  const key = text(value)
  if (!KEY_PATTERN.test(key)) {
    throw Object.assign(new Error('A valid Idempotency-Key header is required for checkout.'), { status: 400 })
  }
  return key
}

export function createCheckoutFingerprint({ items = [], deliveryAddress = {}, paymentMethod = 'cod', advancePaymentMethod = '', advancePaymentSender = '', advancePaymentTransactionId = '', couponCode = '' } = {}) {
  const normalizedItems = items.map(item => ({
    productId: text(item.productId).toLowerCase(),
    quantity: Number(item.quantity),
    size: text(item.size).toLowerCase(),
    color: text(item.color).toLowerCase()
  })).sort((a, b) => {
    const left = [a.productId, a.size, a.color].join('|')
    const right = [b.productId, b.size, b.color].join('|')
    return left < right ? -1 : left > right ? 1 : 0
  })
  const canonical = {
    items: normalizedItems,
    deliveryAddress: {
      name: text(deliveryAddress.name),
      phone: text(deliveryAddress.phone),
      division: text(deliveryAddress.division),
      district: text(deliveryAddress.district),
      upazila: text(deliveryAddress.upazila),
      address: text(deliveryAddress.address)
    },
    paymentMethod: text(paymentMethod).toLowerCase() || 'cod',
    advancePaymentMethod: text(advancePaymentMethod).toLowerCase(),
    advancePaymentSender: text(advancePaymentSender),
    advancePaymentTransactionId: text(advancePaymentTransactionId),
    couponCode: text(couponCode).toUpperCase()
  }
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
}

export function createCheckoutOrderId(customerId, idempotencyKey) {
  const customer = text(customerId).toLowerCase()
  const key = normalizeCheckoutIdempotencyKey(idempotencyKey)
  if (!customer) throw new Error('A customer ID is required to scope checkout idempotency.')
  // A deterministic ObjectId provides a uniqueness backstop even before the compound index is built.
  return createHash('sha256').update(customer + '|' + key).digest('hex').slice(0, 24)
}
